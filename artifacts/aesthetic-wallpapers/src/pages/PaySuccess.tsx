import { useEffect } from "react";
import { useSearch } from "wouter";
import { CheckCircle2, Loader2 } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function PaySuccess() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const orderTrackingId =
    params.get("OrderTrackingId") ||
    params.get("orderTrackingId") ||
    params.get("order_tracking_id") ||
    "";

  useEffect(() => {
    const isInIframe = window !== window.top;
    if (isInIframe && orderTrackingId) {
      // Notify the parent PesapalPayment page so it can close the iframe and confirm
      try {
        window.parent.postMessage(
          { type: "PESAPAL_SUCCESS", orderTrackingId },
          window.location.origin
        );
      } catch {
        // Cross-origin fallback — try wildcard
        window.parent.postMessage({ type: "PESAPAL_SUCCESS", orderTrackingId }, "*");
      }
    }

    if (!isInIframe && orderTrackingId) {
      // Loaded at top level — call confirm and stay on this page
      const token = localStorage.getItem("userToken");
      if (token) {
        fetch(`${BASE_URL}/api/pesapal/confirm?orderTrackingId=${encodeURIComponent(orderTrackingId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    }
  }, [orderTrackingId]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#0a0a0a",
        fontFamily: "system-ui, sans-serif",
        padding: "24px",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        {orderTrackingId ? (
          <>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "rgba(34,197,94,0.15)",
                border: "2px solid rgba(34,197,94,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <CheckCircle2 style={{ width: 36, height: 36, color: "#22c55e" }} />
            </div>
            <h2 style={{ color: "#fff", margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>
              Payment Received!
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: 14 }}>
              Activating your subscription…
            </p>
          </>
        ) : (
          <>
            <Loader2 style={{ width: 36, height: 36, color: "rgba(255,255,255,0.4)", margin: "0 auto 16px", display: "block" }} />
            <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: 14 }}>
              Processing your payment…
            </p>
          </>
        )}
      </div>
    </div>
  );
}
