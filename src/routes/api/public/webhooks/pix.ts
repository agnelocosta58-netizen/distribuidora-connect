import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook do Mercado Pago — confirma pagamentos Pix em tempo real.
 *
 * Configure em https://www.mercadopago.com.br/developers/panel/notifications
 * URL: https://project--{project-id}.lovable.app/api/public/webhooks/pix
 * Evento: payment
 */
export const Route = createFileRoute("/api/public/webhooks/pix")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
        if (!token) return new Response("Missing token", { status: 500 });

        const body = await request.text();
        let payload: any;
        try { payload = JSON.parse(body); } catch { return new Response("Invalid JSON", { status: 400 }); }

        // Validação de assinatura (formato Mercado Pago: ts=...,v1=...)
        if (webhookSecret) {
          try {
            const sig = request.headers.get("x-signature") ?? "";
            const reqId = request.headers.get("x-request-id") ?? "";
            const parts = Object.fromEntries(sig.split(",").map((p) => p.trim().split("=")));
            const ts = parts.ts; const v1 = parts.v1;
            const dataId = payload?.data?.id ?? "";
            if (ts && v1 && dataId) {
              const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
              const { createHmac, timingSafeEqual } = await import("crypto");
              const expected = createHmac("sha256", webhookSecret).update(manifest).digest("hex");
              const a = Buffer.from(v1); const b = Buffer.from(expected);
              if (a.length !== b.length || !timingSafeEqual(a, b)) {
                return new Response("Invalid signature", { status: 401 });
              }
            }
          } catch {
            return new Response("Signature error", { status: 401 });
          }
        }

        const type = payload?.type ?? payload?.action?.split(".")[0];
        const paymentId = payload?.data?.id;
        if (type !== "payment" || !paymentId) return new Response("ignored", { status: 200 });

        // Consulta detalhes do pagamento
        const detRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const det: any = await detRes.json().catch(() => ({}));
        if (!detRes.ok) return new Response("MP fetch failed", { status: 502 });

        const status: string = (det?.status ?? "").toLowerCase();
        const txid = String(paymentId);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const update: any = { provider_payload: det, updated_at: new Date().toISOString() };
        if (status === "approved") {
          update.status = "pago";
          update.pago_em = new Date().toISOString();
        } else if (status === "cancelled" || status === "rejected") {
          update.status = "cancelado";
        } else if (status === "refunded" || status === "charged_back") {
          update.status = "estornado";
        }

        const { data: tx, error } = await supabaseAdmin
          .from("pix_transactions")
          .update(update)
          .eq("txid", txid)
          .select("id, sale_id")
          .maybeSingle();
        if (error) return new Response(error.message, { status: 500 });

        if (tx?.sale_id && update.status === "pago") {
          await supabaseAdmin
            .from("sales")
            .update({ status: "concluida", pago_em: update.pago_em })
            .eq("id", tx.sale_id);
        }

        return new Response("ok");
      },
    },
  },
});
