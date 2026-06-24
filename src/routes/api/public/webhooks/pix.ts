import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook público de confirmação Pix.
 * Aceita POST do provedor (Mercado Pago / Asaas / Efí) e atualiza a transação.
 * IMPORTANTE: valide a assinatura HMAC do provedor quando configurar o secret.
 *
 * URL pública: https://project--{project-id}.lovable.app/api/public/webhooks/pix
 */
export const Route = createFileRoute("/api/public/webhooks/pix")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        let payload: any;
        try { payload = JSON.parse(body); } catch { return new Response("Invalid JSON", { status: 400 }); }

        // TODO: validar assinatura do provedor (HMAC com PIX_WEBHOOK_SECRET)
        // const sig = request.headers.get("x-signature") ?? "";
        // const expected = createHmac("sha256", process.env.PIX_WEBHOOK_SECRET!).update(body).digest("hex");
        // if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return new Response("Invalid", { status: 401 });

        const txid = payload?.txid ?? payload?.pix?.[0]?.txid ?? payload?.data?.id ?? null;
        const status: string = (payload?.status ?? payload?.data?.status ?? "pago").toLowerCase();
        if (!txid) return new Response("Missing txid", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const update: any = { provider_payload: payload, updated_at: new Date().toISOString() };
        if (status === "pago" || status === "approved" || status === "received") {
          update.status = "pago"; update.pago_em = new Date().toISOString();
        } else if (status === "cancelado" || status === "cancelled") {
          update.status = "cancelado";
        }
        const { error } = await supabaseAdmin.from("pix_transactions").update(update).eq("txid", txid);
        if (error) return new Response(error.message, { status: 500 });
        return new Response("ok");
      },
    },
  },
});
