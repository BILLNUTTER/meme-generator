import { Router, type IRouter } from "express";
import https from "https";
import { SettingsModel, PaymentModel, UserModel } from "../lib/mongodb";
import { requireUserAuth } from "../middlewares/auth";
import pino from "pino";

const log = pino({ level: "info" });

const router: IRouter = Router();

async function getSetting(key: string): Promise<string | boolean | null> {
  const doc = await SettingsModel.findOne({ key });
  return doc ? (doc.value as string | boolean) : null;
}

async function getPesapalConfig() {
  const consumerKey    = await getSetting("pesapalConsumerKey");
  const consumerSecret = await getSetting("pesapalConsumerSecret");
  const isSandbox      = await getSetting("pesapalSandbox");
  const useSandbox     = isSandbox === true;
  const hostname = useSandbox ? "cybqa.pesapal.com" : "pay.pesapal.com";
  const base     = useSandbox ? "/pesapalv3/api"    : "/v3/api";
  return { consumerKey, consumerSecret, useSandbox, hostname, base };
}

function pesapalPost(hostname: string, path: string, body: unknown, token?: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Content-Length": String(Buffer.byteLength(payload)),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const req = https.request({ hostname, path, method: "POST", headers }, (resp) => {
      let data = "";
      resp.on("data", chunk => (data += chunk));
      resp.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error("Invalid JSON from Pesapal: " + data.slice(0, 200))); }
      });
    });
    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error("Pesapal request timed out")); });
    req.write(payload);
    req.end();
  });
}

function pesapalGet(hostname: string, path: string, token: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname, path, method: "GET", headers: { "Accept": "application/json", "Authorization": `Bearer ${token}` } },
      (resp) => {
        let data = "";
        resp.on("data", chunk => (data += chunk));
        resp.on("end", () => {
          try { resolve(JSON.parse(data)); }
          catch { reject(new Error("Invalid JSON from Pesapal: " + data.slice(0, 200))); }
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error("Pesapal request timed out")); });
    req.end();
  });
}

async function getPesapalToken(hostname: string, base: string, key: string, secret: string): Promise<string> {
  const tokenRes = await pesapalPost(hostname, `${base}/Auth/RequestToken`, {
    consumer_key: key, consumer_secret: secret,
  }) as { token?: string; message?: string };
  if (!tokenRes.token) throw new Error(tokenRes.message || "Failed to get Pesapal token");
  return tokenRes.token;
}

router.post("/pesapal/initiate", requireUserAuth, async (req, res): Promise<void> => {
  const { consumerKey, consumerSecret, hostname, base } = await getPesapalConfig();

  if (!consumerKey || !consumerSecret) {
    res.status(503).json({ error: "Payment not configured yet. Contact admin." });
    return;
  }

  const { amount, currency = "KES", email, phone, description, merchantRef, callbackUrl } = req.body as {
    amount: number; currency?: string; email?: string; phone?: string;
    description?: string; merchantRef?: string; callbackUrl?: string;
  };

  if (!amount || amount <= 0) { res.status(400).json({ error: "Valid amount is required" }); return; }

  try {
    log.info({ hostname, base }, "Pesapal: requesting token");
    const token = await getPesapalToken(hostname, base, consumerKey as string, consumerSecret as string);

    let ipnId = "";
    try {
      const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:3000");
      const ipnRes = await pesapalPost(hostname, `${base}/URLSetup/RegisterIPN`, {
        url: `${appUrl}/api/pesapal/ipn`, ipn_notification_type: "POST",
      }, token) as { ipn_id?: string };
      ipnId = ipnRes.ipn_id || "";
    } catch { /* IPN registration is best-effort */ }

    const ref = merchantRef || `AW-${Date.now()}`;
    const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:3000");
    const finalCallbackUrl = callbackUrl || `${appUrl}/pay/success`;

    log.info({ ref, amount, currency, email, finalCallbackUrl }, "Pesapal: submitting order");
    const orderRes = await pesapalPost(hostname, `${base}/Transactions/SubmitOrderRequest`, {
      id: ref, currency, amount,
      description: description || "AESTHETICS Subscription",
      callback_url: finalCallbackUrl,
      notification_id: ipnId,
      billing_address: { email_address: email || "", phone_number: phone || "", first_name: "Customer" },
    }, token) as { redirect_url?: string; order_tracking_id?: string; message?: string };

    if (!orderRes.redirect_url) throw new Error(orderRes.message || "No redirect URL returned");

    await PaymentModel.create({
      userId: (req as { user?: { id?: string } }).user?.id || null,
      email: email || null, phone: phone || null, amount, currency,
      description: description || "AESTHETICS Subscription",
      orderTrackingId: orderRes.order_tracking_id || null,
      merchantRef: ref, status: "initiated",
    } as any).catch(() => {});

    res.json({ redirectUrl: orderRes.redirect_url, orderTrackingId: orderRes.order_tracking_id });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Payment initiation failed" });
  }
});

// Verify payment status and activate user subscription
router.get("/pesapal/confirm", requireUserAuth, async (req, res): Promise<void> => {
  const { orderTrackingId } = req.query as { orderTrackingId?: string };
  if (!orderTrackingId) { res.status(400).json({ error: "orderTrackingId required" }); return; }

  const { consumerKey, consumerSecret, hostname, base } = await getPesapalConfig();
  if (!consumerKey || !consumerSecret) { res.status(503).json({ error: "Payment not configured." }); return; }

  try {
    const token = await getPesapalToken(hostname, base, consumerKey as string, consumerSecret as string);

    const statusRes = await pesapalGet(
      hostname,
      `${base}/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
      token
    ) as {
      status_code?: number;
      payment_status_description?: string;
      amount?: number; currency?: string;
      payment_method?: string; confirmation_code?: string;
    };

    log.info({ statusRes, orderTrackingId }, "Pesapal: transaction status");

    // status_code 1 = COMPLETED / paid
    const paid = statusRes.status_code === 1;

    if (paid) {
      // Mark payment completed
      await PaymentModel.findOneAndUpdate({ orderTrackingId }, { status: "completed" }).catch(() => {});

      // Activate 30-day TikTok subscription
      const userId = (req as { user?: { id?: string } }).user?.id;
      if (userId) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        await UserModel.findByIdAndUpdate(userId, { tiktokExpiry: expiry }).catch(() => {});
        log.info({ userId, expiry }, "TikTok subscription activated");
      }
    }

    res.json({
      paid,
      status: statusRes.payment_status_description || (paid ? "COMPLETED" : "PENDING"),
      amount: statusRes.amount,
      currency: statusRes.currency,
      paymentMethod: statusRes.payment_method,
      confirmationCode: statusRes.confirmation_code,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Status check failed" });
  }
});

// IPN webhook — Pesapal notifies us on payment events
router.post("/pesapal/ipn", async (req, res): Promise<void> => {
  const { OrderTrackingId, OrderNotificationType } = req.body as Record<string, string>;
  log.info({ OrderTrackingId, OrderNotificationType }, "Pesapal IPN received");

  if (OrderTrackingId && OrderNotificationType === "IPNCHANGE") {
    try {
      const { consumerKey, consumerSecret, hostname, base } = await getPesapalConfig();
      if (consumerKey && consumerSecret) {
        const token = await getPesapalToken(hostname, base, consumerKey as string, consumerSecret as string);
        const statusRes = await pesapalGet(
          hostname,
          `${base}/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(OrderTrackingId)}`,
          token
        ) as { status_code?: number; };
        if (statusRes.status_code === 1) {
          await PaymentModel.findOneAndUpdate({ orderTrackingId: OrderTrackingId }, { status: "completed" }).catch(() => {});
        }
      }
    } catch { /* best-effort */ }
  }

  res.json({ orderNotificationType: OrderNotificationType, orderTrackingId: OrderTrackingId, status: "200" });
});

export default router;
