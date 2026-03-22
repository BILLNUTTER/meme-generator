import { Router, type IRouter } from "express";
import https from "https";
import { SettingsModel, PaymentModel } from "../lib/mongodb";
import { requireUserAuth } from "../middlewares/auth";
import pino from "pino";

const log = pino({ level: "info" });

const router: IRouter = Router();

async function getSetting(key: string): Promise<string | boolean | null> {
  const doc = await SettingsModel.findOne({ key });
  return doc ? (doc.value as string | boolean) : null;
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

router.post("/pesapal/initiate", requireUserAuth, async (req, res): Promise<void> => {
  const consumerKey    = await getSetting("pesapalConsumerKey");
  const consumerSecret = await getSetting("pesapalConsumerSecret");
  const isSandbox      = await getSetting("pesapalSandbox");

  if (!consumerKey || !consumerSecret) {
    res.status(503).json({ error: "Payment not configured yet. Contact admin." });
    return;
  }

  const useSandbox = isSandbox === true;
  // Live:    pay.pesapal.com      /v3/api/...
  // Sandbox: cybqa.pesapal.com    /pesapalv3/api/...
  const hostname = useSandbox ? "cybqa.pesapal.com" : "pay.pesapal.com";
  const base = useSandbox ? "/pesapalv3/api" : "/v3/api";

  const { amount, currency = "KES", email, phone, description, merchantRef } = req.body as {
    amount: number;
    currency?: string;
    email?: string;
    phone?: string;
    description?: string;
    merchantRef?: string;
  };

  if (!amount || amount <= 0) {
    res.status(400).json({ error: "Valid amount is required" });
    return;
  }

  try {
    log.info({ hostname, base, useSandbox }, "Pesapal: requesting token");
    const tokenRes = await pesapalPost(hostname, `${base}/Auth/RequestToken`, {
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    }) as { token?: string; error?: string; message?: string; status?: string };
    log.info({ tokenRes }, "Pesapal: token response");

    if (!tokenRes.token) {
      const msg = tokenRes.message || (tokenRes as Record<string,unknown>)["error"] as string || JSON.stringify(tokenRes);
      throw new Error(`Pesapal token error: ${msg}`);
    }
    const token = tokenRes.token;

    let ipnId: string;
    try {
      const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:3000");
      const ipnUrl = `${appUrl}/api/pesapal/ipn`;
      const ipnRes = await pesapalPost(hostname, `${base}/URLSetup/RegisterIPN`, {
        url: ipnUrl,
        ipn_notification_type: "POST",
      }, token) as { ipn_id?: string };
      ipnId = ipnRes.ipn_id || "";
    } catch {
      ipnId = "";
    }

    const ref = merchantRef || `AW-${Date.now()}`;
    const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:3000");
    log.info({ ref, amount, currency, email }, "Pesapal: submitting order");
    const orderRes = await pesapalPost(hostname, `${base}/Transactions/SubmitOrderRequest`, {
      id: ref,
      currency,
      amount,
      description: description || "Aesthetic Wallpapers Subscription",
      callback_url: `${appUrl}/pay/success`,
      notification_id: ipnId,
      billing_address: {
        email_address: email || "",
        phone_number: phone || "",
        first_name: "Customer",
      },
    }, token) as { redirect_url?: string; order_tracking_id?: string; error?: string; message?: string };

    if (!orderRes.redirect_url) throw new Error(orderRes.message || "No redirect URL returned");

    await PaymentModel.create({
      userId: (req as { user?: { id?: string } }).user?.id || null,
      email: email || null,
      phone: phone || null,
      amount,
      currency,
      description: description || "Aesthetic Wallpapers Subscription",
      orderTrackingId: orderRes.order_tracking_id || null,
      merchantRef: ref,
      status: "initiated",
    } as any).catch(() => {});

    res.json({
      redirectUrl: orderRes.redirect_url,
      orderTrackingId: orderRes.order_tracking_id,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Payment initiation failed" });
  }
});

router.post("/pesapal/ipn", async (req, res): Promise<void> => {
  res.json({ status: "received" });
});

export default router;
