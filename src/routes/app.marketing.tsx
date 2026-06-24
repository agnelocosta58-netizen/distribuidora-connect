import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brl } from "@/lib/format";
import { Download, Share2, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/marketing")({ component: MarketingPage });

type Tmpl = "promo" | "destaque" | "combo";

function MarketingPage() {
  const auth = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [preco, setPreco] = useState("");
  const [titulo, setTitulo] = useState("OFERTA IMPERDÍVEL");
  const [tmpl, setTmpl] = useState<Tmpl>("promo");
  const [caption, setCaption] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    supabase.from("products").select("id, nome, preco_venda, imagem_url").eq("ativo", true).order("nome").then(({ data }) => setProducts(data ?? []));
  }, []);

  const product = products.find((p) => p.id === productId);

  useEffect(() => {
    if (product) {
      setPreco(String(product.preco_venda));
      setCaption(`🍻 ${titulo}!\n\n${product.nome} por apenas ${brl(Number(product.preco_venda))}\n\n📍 ${auth.company?.nome ?? ""}\n📞 ${auth.company?.telefone ?? ""}\n\n#promoção #distribuidora`);
    }
  }, [productId, titulo, product, auth.company]);

  useEffect(() => { void render(); /* eslint-disable-next-line */ }, [product, preco, titulo, tmpl, auth.company]);

  async function render() {
    const cv = canvasRef.current;
    if (!cv || !product) return;
    cv.width = 1080; cv.height = 1080;
    const ctx = cv.getContext("2d")!;
    const palettes: Record<Tmpl, [string, string, string]> = {
      promo: ["#ef4444", "#7c1d1d", "#fef3c7"],
      destaque: ["#1e40af", "#0c2461", "#fbbf24"],
      combo: ["#059669", "#064e3b", "#fde68a"],
    };
    const [c1, c2, accent] = palettes[tmpl];
    const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
    grad.addColorStop(0, c1); grad.addColorStop(1, c2);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 1080, 1080);

    // header
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, 0, 1080, 140);
    ctx.fillStyle = "#fff"; ctx.font = "bold 56px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(titulo.toUpperCase().slice(0, 24), 540, 90);

    // product image
    if (product.imagem_url) {
      try {
        const img = await loadImg(product.imagem_url);
        const size = 520;
        ctx.drawImage(img, (1080 - size) / 2, 180, size, size);
      } catch {}
    }

    // price box
    ctx.fillStyle = accent;
    ctx.fillRect(80, 740, 920, 200);
    ctx.fillStyle = "#0f172a"; ctx.font = "bold 42px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(product.nome.toUpperCase().slice(0, 32), 540, 800);
    ctx.font = "bold 110px sans-serif";
    ctx.fillText(brl(Number(preco)), 540, 910);

    // footer
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 970, 1080, 110);
    ctx.fillStyle = "#fff"; ctx.font = "bold 32px sans-serif";
    ctx.fillText((auth.company?.nome ?? "Distribuidora").slice(0, 40), 540, 1015);
    ctx.font = "26px sans-serif";
    ctx.fillText(auth.company?.telefone ?? "", 540, 1055);
  }

  function loadImg(src: string): Promise<HTMLImageElement> {
    return new Promise((res, rej) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => res(img); img.onerror = rej; img.src = src;
    });
  }

  function download() {
    const cv = canvasRef.current; if (!cv) return;
    const a = document.createElement("a");
    a.download = `post-${Date.now()}.png`;
    a.href = cv.toDataURL("image/png"); a.click();
  }
  function copyCaption() { navigator.clipboard.writeText(caption); toast.success("Legenda copiada"); }
  function shareWA() { window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, "_blank"); }

  return (
    <PageContainer>
      <PageHeader title="Gerador de posts" subtitle="Crie artes promocionais e legendas prontas para o WhatsApp" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        <Card className="p-3 grid place-items-center bg-muted/30">
          <canvas ref={canvasRef} className="w-full max-w-md aspect-square rounded shadow-card bg-black" />
        </Card>
        <Card className="p-4 space-y-3">
          <div><Label>Produto</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Título</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
          <div><Label>Preço promocional</Label><Input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} /></div>
          <div><Label>Template</Label>
            <Select value={tmpl} onValueChange={(v: any) => setTmpl(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="promo">Promo (vermelho)</SelectItem>
                <SelectItem value="destaque">Destaque (azul)</SelectItem>
                <SelectItem value="combo">Combo (verde)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Legenda</Label><Textarea rows={6} value={caption} onChange={(e) => setCaption(e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={download} disabled={!product}><Download className="h-4 w-4 mr-1" /> Baixar</Button>
            <Button variant="outline" onClick={copyCaption}><Copy className="h-4 w-4 mr-1" /> Copiar</Button>
            <Button variant="outline" onClick={shareWA}><Share2 className="h-4 w-4 mr-1" /> WhatsApp</Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
