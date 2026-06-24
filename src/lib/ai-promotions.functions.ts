import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AISuggestion = {
  produto: string;
  motivo: string;
  desconto_sugerido_pct: number;
  preco_promocional: number;
  meta_unidades: number;
  prazo_dias: number;
  lucro_estimado: number;
  legenda: string;
};

export const suggestPromotions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ suggestions: AISuggestion[]; raw?: string }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const { supabase } = context;

    // Pick low-rotation, near-expiry or overstocked products
    const { data: products } = await supabase
      .from("products")
      .select("id, nome, estoque, estoque_minimo, preco_custo, preco_venda, validade")
      .eq("ativo", true)
      .gt("estoque", 0)
      .limit(80);

    if (!products || products.length === 0) return { suggestions: [] };

    const today = new Date();
    const candidates = products
      .map((p: any) => {
        const dias = p.validade ? Math.floor((new Date(p.validade).getTime() - today.getTime()) / 86400000) : null;
        const sobre = Number(p.estoque) - Number(p.estoque_minimo);
        return { ...p, dias, sobre };
      })
      .filter((p: any) => (p.dias !== null && p.dias < 90) || p.sobre > 30)
      .slice(0, 12);

    const list = candidates.map((p: any) =>
      `- ${p.nome} | estoque: ${p.estoque} | custo: R$${p.preco_custo} | venda: R$${p.preco_venda}` +
      (p.validade ? ` | validade em ${p.dias} dias` : "") +
      (p.sobre > 0 ? ` | sobre estoque: ${p.sobre}` : "")
    ).join("\n");

    const prompt = `Você é um especialista em gestão de distribuidora de bebidas. Analise os produtos abaixo (baixo giro, sobre-estoque ou perto do vencimento) e sugira promoções inteligentes.

Produtos:
${list}

Retorne APENAS JSON válido no formato:
{"suggestions":[{"produto":"...","motivo":"...","desconto_sugerido_pct":15,"preco_promocional":12.5,"meta_unidades":50,"prazo_dias":15,"lucro_estimado":250.0,"legenda":"texto para WhatsApp"}]}

Máximo 6 sugestões. Priorize produtos com validade curta. Preço promocional deve ficar acima do custo. Use valores realistas.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 429) throw new Error("Limite de IA atingido. Tente novamente em alguns minutos.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos nas configurações.");
      throw new Error(`Erro IA (${res.status}): ${txt.slice(0, 200)}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    try {
      const parsed = JSON.parse(content);
      return { suggestions: parsed.suggestions ?? [] };
    } catch {
      return { suggestions: [], raw: content };
    }
  });
