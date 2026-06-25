import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface CreateInput {
  sale_id?: string | null;
  valor: number;
  descricao: string;
  payer_email?: string;
}

/**
 * Cria cobrança Pix dinâmica no Mercado Pago e registra em pix_transactions.
 * Retorna QR code (base64) + copia-e-cola + id da transação.
 */
export const createPixCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CreateInput) => {
    if (!data || typeof data.valor !== "number" || data.valor <= 0) {
      throw new Error("Valor inválido");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!token) throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado");

    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("company_id, email, nome")
      .eq("id", userId)
      .maybeSingle();
    const companyId = prof?.company_id;
    if (!companyId) throw new Error("Empresa não encontrada");

    const idempotency = crypto.randomUUID();
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotency,
      },
      body: JSON.stringify({
        transaction_amount: Number(data.valor.toFixed(2)),
        description: data.descricao || "Venda",
        payment_method_id: "pix",
        date_of_expiration: expires,
        payer: { email: data.payer_email || prof?.email || "comprador@example.com" },
      }),
    });

    const payload: any = await mpRes.json().catch(() => ({}));
    if (!mpRes.ok) {
      throw new Error(payload?.message || `Mercado Pago ${mpRes.status}`);
    }

    const txid = String(payload.id);
    const qr_code = payload?.point_of_interaction?.transaction_data?.qr_code ?? null;
    const qr_code_base64 = payload?.point_of_interaction?.transaction_data?.qr_code_base64 ?? null;
    const ticket_url = payload?.point_of_interaction?.transaction_data?.ticket_url ?? null;

    const { data: tx, error } = await supabase
      .from("pix_transactions")
      .insert({
        company_id: companyId,
        sale_id: data.sale_id ?? null,
        valor: data.valor,
        status: "pendente",
        provider: "mercado_pago",
        txid,
        qr_code,
        qr_code_base64,
        expires_at: expires,
        provider_payload: payload,
      })
      .select("id, txid, qr_code, qr_code_base64, status, expires_at")
      .single();

    if (error) throw new Error(error.message);
    return { ...tx, ticket_url };
  });

/**
 * Consulta status (fallback de polling caso o webhook ainda não tenha chegado).
 */
export const checkPixStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { transaction_id: string }) => {
    if (!data?.transaction_id) throw new Error("transaction_id obrigatório");
    return data;
  })
  .handler(async ({ data, context }) => {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!token) throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado");
    const { supabase } = context;

    const { data: tx } = await supabase
      .from("pix_transactions")
      .select("*")
      .eq("id", data.transaction_id)
      .maybeSingle();
    if (!tx?.txid) throw new Error("Transação não encontrada");

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${tx.txid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload: any = await res.json().catch(() => ({}));
    const status: string = (payload?.status ?? "").toLowerCase();

    if (status === "approved" && tx.status !== "pago") {
      const pago_em = new Date().toISOString();
      await supabase
        .from("pix_transactions")
        .update({ status: "pago", pago_em, provider_payload: payload })
        .eq("id", tx.id);
      if (tx.sale_id) {
        await supabase.from("sales").update({ status: "concluida", pago_em }).eq("id", tx.sale_id);
      }
      return { status: "pago", pago_em };
    }
    return { status: tx.status, pago_em: tx.pago_em };
  });
