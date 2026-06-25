import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Busca imagens públicas relacionadas ao nome do produto.
 * Usa DuckDuckGo Images (sem chave). Retorna [{ url, thumb, title }].
 */
export const searchProductImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { query: string }) => {
    if (!data?.query || data.query.trim().length < 2) throw new Error("Termo curto demais");
    return { query: data.query.trim().slice(0, 100) };
  })
  .handler(async ({ data }) => {
    // Step 1: obter vqd
    const homeRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(data.query)}&iar=images&iax=images&ia=images`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    const html = await homeRes.text();
    const match = html.match(/vqd=["']?([\d-]+)["']?/);
    const vqd = match?.[1];
    if (!vqd) return { results: [] as Array<{ url: string; thumb: string; title: string }> };

    const apiRes = await fetch(
      `https://duckduckgo.com/i.js?l=br-pt&o=json&q=${encodeURIComponent(data.query)}&vqd=${vqd}&f=,,,,,&p=1`,
      { headers: { "User-Agent": "Mozilla/5.0", Referer: "https://duckduckgo.com/" } },
    );
    const json: any = await apiRes.json().catch(() => ({}));
    const results = (json?.results ?? []).slice(0, 24).map((r: any) => ({
      url: r.image as string,
      thumb: r.thumbnail as string,
      title: (r.title ?? "") as string,
    }));
    return { results };
  });

/**
 * Baixa uma URL de imagem externa, salva no bucket product-images da empresa
 * e atualiza products.imagem_url. Retorna a nova URL assinada/pública.
 */
export const saveProductImageFromUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { product_id: string; image_url: string }) => {
    if (!data?.product_id || !data?.image_url) throw new Error("Parâmetros faltando");
    if (!/^https?:\/\//i.test(data.image_url)) throw new Error("URL inválida");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();
    const companyId = prof?.company_id;
    if (!companyId) throw new Error("Empresa não encontrada");

    // Verifica que o produto pertence à empresa
    const { data: prod } = await supabase
      .from("products")
      .select("id, company_id")
      .eq("id", data.product_id)
      .maybeSingle();
    if (!prod || prod.company_id !== companyId) throw new Error("Produto não encontrado");

    const imgRes = await fetch(data.image_url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!imgRes.ok) throw new Error(`Falha ao baixar imagem (${imgRes.status})`);
    const ct = imgRes.headers.get("content-type") || "image/jpeg";
    if (!ct.startsWith("image/")) throw new Error("URL não é uma imagem");
    const buf = new Uint8Array(await imgRes.arrayBuffer());
    if (buf.byteLength > 8 * 1024 * 1024) throw new Error("Imagem maior que 8MB");

    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
    const path = `${companyId}/${data.product_id}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("product-images").upload(path, buf, {
      contentType: ct,
      upsert: false,
    });
    if (upErr) throw new Error(upErr.message);

    const { data: signed } = await supabase.storage
      .from("product-images")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    const finalUrl = signed?.signedUrl ?? path;

    await supabase
      .from("products")
      .update({ imagem_url: finalUrl })
      .eq("id", data.product_id);

    return { url: finalUrl, path };
  });
