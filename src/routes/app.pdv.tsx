import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Minus, Trash2, ShoppingCart, X, ScanLine, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { createPixCharge, checkPixStatus } from "@/lib/pix-mp.functions";

export const Route = createFileRoute("/app/pdv")({ component: PdvPage });

interface CartItem {
  product_id: string;
  variant_id?: string | null;
  nome: string;
  preco: number;
  qtd: number;
}

function PdvPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [desconto, setDesconto] = useState(0);
  const [acrescimo, setAcrescimo] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [variantPick, setVariantPick] = useState<any | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["products-pdv", auth.company?.id],
    enabled: !!auth.company?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("products")
        .select("id, nome, preco_venda, codigo_barras, estoque, unidade, imagem_url, product_variants(id, tipo, temperatura, unidades_por_pacote, codigo_barras, preco_venda, estoque, ativo)")
        .eq("ativo", true).order("nome");
      if (error) { toast.error("Erro ao carregar produtos: " + error.message); return []; }
      return data ?? [];
    },
  });

  function variantLabel(v: any) {
    const parts = [v.tipo, v.temperatura].filter(Boolean);
    if (v.unidades_por_pacote && Number(v.unidades_por_pacote) > 1) parts.push(`${v.unidades_por_pacote}un`);
    return parts.join(" · ") || "Variação";
  }

  const filtered = useMemo(() => {
    if (!q) return (products as any[]).slice(0, 40);
    const term = q.toLowerCase();
    return (products as any[]).filter((p) => {
      if (p.nome.toLowerCase().includes(term)) return true;
      if ((p.codigo_barras ?? "").includes(q)) return true;
      const vs = (p.product_variants ?? []) as any[];
      return vs.some((v) => v.ativo && (
        (v.codigo_barras ?? "").includes(q) ||
        variantLabel(v).toLowerCase().includes(term)
      ));
    }).slice(0, 40);
  }, [products, q]);

  function activeVariants(p: any) {
    return ((p.product_variants ?? []) as any[]).filter((v) => v.ativo);
  }

  function clickProduct(p: any) {
    const vars = activeVariants(p);
    if (vars.length > 0) { setVariantPick(p); return; }
    addCart({ product_id: p.id, variant_id: null, nome: p.nome, preco: Number(p.preco_venda), qtd: 1 });
  }

  function addCart(item: CartItem) {
    setCart((c) => {
      const k = (i: CartItem) => `${i.product_id}|${i.variant_id ?? ""}`;
      const ex = c.find((i) => k(i) === k(item));
      if (ex) return c.map((i) => k(i) === k(item) ? { ...i, qtd: i.qtd + item.qtd } : i);
      return [...c, item];
    });
  }

  function updateQty(key: string, delta: number) {
    setCart((c) => c.map((i) => keyOf(i) === key ? { ...i, qtd: Math.max(0, i.qtd + delta) } : i).filter((i) => i.qtd > 0));
  }
  function setQty(key: string, q: number) { setCart((c) => c.map((i) => keyOf(i) === key ? { ...i, qtd: q } : i)); }
  function removeItem(key: string) { setCart((c) => c.filter((i) => keyOf(i) !== key)); }
  function keyOf(i: CartItem) { return `${i.product_id}|${i.variant_id ?? ""}`; }

  function cancelSale() {
    if (!cart.length) return;
    if (!confirm("Cancelar venda?")) return;
    setCart([]); setDesconto(0); setAcrescimo(0);
  }

  function handleScannedCode(code: string) {
    for (const p of products as any[]) {
      if (p.codigo_barras === code) { clickProduct(p); toast.success(`Adicionado: ${p.nome}`); return; }
      const v = ((p.product_variants ?? []) as any[]).find((vv) => vv.codigo_barras === code && vv.ativo);
      if (v) {
        const label = variantLabel(v);
        addCart({ product_id: p.id, variant_id: v.id, nome: `${p.nome} — ${label}`, preco: Number(v.preco_venda), qtd: 1 });
        toast.success(`Adicionado: ${p.nome} — ${label}`);
        return;
      }
    }
    toast.error(`Produto não encontrado: ${code}`);
  }

  const subtotal = cart.reduce((s, i) => s + i.preco * i.qtd, 0);
  const total = subtotal - Number(desconto || 0) + Number(acrescimo || 0);

  return (
    <div className="lg:grid lg:grid-cols-[1fr_400px] h-[calc(100vh-3.5rem)] lg:h-screen">
      <div className="flex flex-col min-h-0">
        <div className="p-4 border-b border-border bg-surface flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar produto..." value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
          <Button variant="outline" size="icon" onClick={() => setScanOpen(true)} title="Código de barras"><ScanLine className="h-4 w-4" /></Button>
          <Button className="lg:hidden relative" onClick={() => setShowCart(true)}>
            <ShoppingCart className="h-4 w-4" />
            {cart.length > 0 && <span className="ml-1 text-xs">{cart.length}</span>}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((p: any) => {
              const variants = activeVariants(p);
              const totalEstoque = variants.length > 0 ? variants.reduce((s, v) => s + Number(v.estoque || 0), 0) : Number(p.estoque || 0);
              return (
                <button key={p.id} onClick={() => clickProduct(p)} disabled={totalEstoque <= 0}
                  className="text-left p-3 rounded-xl bg-surface border border-border hover:border-primary hover:shadow-card transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {p.imagem_url && <img src={p.imagem_url} alt="" className="w-full h-20 object-cover rounded-md mb-2" loading="lazy" />}
                  <div className="text-xs text-muted-foreground">{p.unidade}{variants.length > 0 && ` · ${variants.length} variações`}</div>
                  <div className="font-medium text-sm line-clamp-2 min-h-[2.5em]">{p.nome}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-primary font-bold">
                      {variants.length > 0
                        ? `a partir de ${brl(Math.min(...variants.map((v) => Number(v.preco_venda) || Infinity)))}`
                        : brl(p.preco_venda)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">est. {totalEstoque}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <aside className={`bg-surface border-l border-border flex-col ${showCart ? "fixed inset-0 z-50 flex" : "hidden"} lg:flex lg:relative lg:inset-auto`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="font-semibold flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Carrinho</div>
          <button className="lg:hidden" onClick={() => setShowCart(false)}><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">Adicione produtos</p>}
          {cart.map((i) => {
            const k = keyOf(i);
            return (
              <div key={k} className="p-3 rounded-lg border border-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{i.nome}</div>
                    <div className="text-xs text-muted-foreground">{brl(i.preco)} cada</div>
                  </div>
                  <button onClick={() => removeItem(k)}><Trash2 className="h-4 w-4 text-destructive" /></button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center border border-border rounded-md">
                    <button className="p-1.5" onClick={() => updateQty(k, -1)}><Minus className="h-3 w-3" /></button>
                    <input type="number" className="w-12 text-center bg-transparent text-sm" value={i.qtd} onChange={(e) => setQty(k, Math.max(0, Number(e.target.value)))} />
                    <button className="p-1.5" onClick={() => updateQty(k, 1)}><Plus className="h-3 w-3" /></button>
                  </div>
                  <span className="font-semibold">{brl(i.preco * i.qtd)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-border space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Desconto</Label><Input type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(Number(e.target.value) || 0)} /></div>
            <div><Label className="text-xs">Acréscimo</Label><Input type="number" step="0.01" value={acrescimo} onChange={(e) => setAcrescimo(Number(e.target.value) || 0)} /></div>
          </div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{brl(subtotal)}</span></div>
          <div className="flex justify-between text-xl font-bold"><span>Total</span><span className="text-primary">{brl(total)}</span></div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" disabled={!cart.length} onClick={cancelSale}>Cancelar</Button>
            <Button disabled={!cart.length} onClick={() => setShowCheckout(true)}>Finalizar</Button>
          </div>
        </div>
      </aside>

      <CheckoutDialog
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        cart={cart}
        total={total} subtotal={subtotal}
        desconto={Number(desconto)} acrescimo={Number(acrescimo)}
        companyId={auth.company?.id ?? ""}
        userId={auth.user?.id ?? ""}
        onDone={() => { setCart([]); setDesconto(0); setAcrescimo(0); setShowCheckout(false); setShowCart(false); qc.invalidateQueries({ queryKey: ["products-pdv"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); }}
      />

      <BarcodeScanner open={scanOpen} onOpenChange={setScanOpen} onDetected={handleScannedCode} title="Adicionar produto ao carrinho" />

      <VariantPickDialog product={variantPick} onClose={() => setVariantPick(null)} onPick={(v) => {
        const label = variantLabel(v);
        addCart({ product_id: variantPick.id, variant_id: v.id, nome: `${variantPick.nome} — ${label}`, preco: Number(v.preco_venda), qtd: 1 });
        setVariantPick(null);
      }} variantLabel={variantLabel} />
    </div>
  );
}

function VariantPickDialog({ product, onClose, onPick, variantLabel }: { product: any; onClose: () => void; onPick: (v: any) => void; variantLabel: (v: any) => string }) {
  if (!product) return null;
  const variants = (product.product_variants ?? []).filter((v: any) => v.ativo);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Escolha a variação — {product.nome}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {variants.map((v: any) => (
            <button key={v.id} disabled={Number(v.estoque) <= 0} onClick={() => onPick(v)}
              className="p-3 rounded-lg border border-border hover:border-primary text-left disabled:opacity-50">
              <div className="font-medium">{variantLabel(v)}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-primary font-bold">{brl(v.preco_venda)}</span>
                <span className="text-xs text-muted-foreground">est. {Number(v.estoque)}</span>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CheckoutDialog({ open, onClose, cart, total, subtotal, desconto, acrescimo, companyId, userId, onDone }: any) {
  const auth = useAuth();
  const [metodo, setMetodo] = useState<"dinheiro" | "pix" | "debito" | "credito" | "fiado">("dinheiro");
  const [recebido, setRecebido] = useState(0);
  const [customerId, setCustomerId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<any | null>(null);

  // Pix MP state
  const createCharge = useServerFn(createPixCharge);
  const pollStatus = useServerFn(checkPixStatus);
  const [pixTx, setPixTx] = useState<any | null>(null);
  const [paid, setPaid] = useState(false);
  const [saleId, setSaleId] = useState<string | null>(null);

  useEffect(() => {
    if (!pixTx?.id) return;
    const channel = supabase.channel(`pix-${pixTx.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pix_transactions", filter: `id=eq.${pixTx.id}` }, (payload) => {
        const status = (payload.new as any).status;
        if (status === "pago") { setPaid(true); toast.success("Pagamento Pix aprovado!"); }
      })
      .subscribe();
    const poll = setInterval(async () => {
      try { const r: any = await pollStatus({ data: { transaction_id: pixTx.id } }); if (r.status === "pago") { setPaid(true); } } catch {}
    }, 5000);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [pixTx?.id, pollStatus]);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-min", companyId],
    enabled: !!companyId && open,
    queryFn: async () => (await supabase.from("customers").select("id, nome").order("nome")).data ?? [],
  });

  const troco = metodo === "dinheiro" ? Math.max(0, Number(recebido) - total) : 0;

  async function createSale(status: "concluida" | "aberta" = "concluida") {
    const { data: sale, error: e1 } = await supabase.from("sales").insert({
      company_id: companyId, user_id: userId, customer_id: customerId || null,
      subtotal, desconto, acrescimo, total, status,
    }).select().single();
    if (e1 || !sale) throw new Error(e1?.message ?? "Erro ao criar venda");
    const items = cart.map((i: CartItem) => ({
      company_id: companyId, sale_id: sale.id, product_id: i.product_id, variant_id: i.variant_id ?? null,
      nome_produto: i.nome, quantidade: i.qtd, preco_unitario: i.preco, total: i.preco * i.qtd,
    }));
    const { error: e2 } = await supabase.from("sale_items").insert(items);
    if (e2) throw new Error(e2.message);
    return sale;
  }

  async function startPix() {
    setLoading(true);
    try {
      const sale = await createSale("aberta");
      setSaleId(sale.id);
      const tx: any = await createCharge({ data: { sale_id: sale.id, valor: total, descricao: `Venda #${sale.numero}` } });
      setPixTx(tx);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }

  function buildReceipt(sale: any, pagamento: { metodo: string; recebido?: number; troco?: number }) {
    const cust = (customers as any[]).find((c) => c.id === customerId);
    return {
      numero: sale.numero,
      data: new Date().toISOString(),
      company: { nome: auth.company?.nome ?? "", telefone: (auth.company as any)?.telefone ?? "", endereco: (auth.company as any)?.endereco ?? "", cnpj: (auth.company as any)?.cnpj ?? "" },
      vendedor: auth.profile?.nome ?? "",
      cliente: cust?.nome ?? null,
      itens: cart.map((i: CartItem) => ({ nome: i.nome, qtd: i.qtd, preco: i.preco, total: i.preco * i.qtd })),
      subtotal, desconto, acrescimo, total,
      pagamento,
    };
  }

  async function finalize() {
    if (metodo === "fiado" && !customerId) return toast.error("Selecione um cliente para venda fiada");

    if (metodo === "pix") {
      if (!pixTx) return startPix();
      if (!paid) return toast.error("Aguardando confirmação do pagamento Pix");
      await supabase.from("sale_payments").insert({ company_id: companyId, sale_id: saleId!, metodo: "pix", valor: total, troco: 0 });
      const { data: sale } = await supabase.from("sales").select("numero").eq("id", saleId!).maybeSingle();
      toast.success(`Venda Pix concluída!`);
      setReceipt(buildReceipt({ numero: sale?.numero }, { metodo: "pix" }));
      return;
    }

    setLoading(true);
    try {
      const sale = await createSale("concluida");
      await supabase.from("sale_payments").insert({ company_id: companyId, sale_id: sale.id, metodo, valor: total, troco });
      if (metodo === "fiado") {
        const v = new Date(); v.setDate(v.getDate() + 30);
        await supabase.from("accounts_receivable").insert({
          company_id: companyId, customer_id: customerId, sale_id: sale.id,
          descricao: `Venda fiada #${sale.numero}`, valor: total, vencimento: v.toISOString().slice(0, 10),
        });
      }
      toast.success(`Venda #${sale.numero} concluída!`);
      setReceipt(buildReceipt(sale, { metodo, recebido: metodo === "dinheiro" ? Number(recebido) : undefined, troco: metodo === "dinheiro" ? troco : undefined }));
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }

  function copyCode() {
    if (pixTx?.qr_code) { navigator.clipboard.writeText(pixTx.qr_code); toast.success("Código copiado"); }
  }

  function close() {
    setPixTx(null); setPaid(false); setSaleId(null); setMetodo("dinheiro"); setRecebido(0); setCustomerId(""); setReceipt(null);
    onClose();
  }

  function finishReceipt() {
    setReceipt(null);
    onDone();
  }

  if (receipt) {
    return <ReceiptDialog data={receipt} onClose={finishReceipt} />;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Finalizar venda</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="text-xs text-muted-foreground">Total a pagar</div>
            <div className="text-3xl font-bold text-primary">{brl(total)}</div>
          </Card>

          <div className="space-y-1.5">
            <Label>Forma de pagamento</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["dinheiro", "pix", "debito", "credito", "fiado"] as const).map((m) => (
                <button key={m} type="button" onClick={() => { setMetodo(m); setPixTx(null); setPaid(false); }}
                  className={`p-2.5 rounded-lg border text-sm font-medium capitalize transition-all ${
                    metodo === m ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                  }`}>{m}</button>
              ))}
            </div>
          </div>

          {metodo === "dinheiro" && (
            <>
              <div className="space-y-1.5">
                <Label>Valor recebido</Label>
                <Input type="number" step="0.01" value={recebido} onChange={(e) => setRecebido(Number(e.target.value))} />
              </div>
              {troco > 0 && <div className="flex justify-between text-success font-semibold"><span>Troco</span><span>{brl(troco)}</span></div>}
            </>
          )}

          {metodo === "pix" && pixTx && (
            <Card className="p-3 space-y-3 text-center">
              {pixTx.qr_code_base64 && <img src={`data:image/png;base64,${pixTx.qr_code_base64}`} alt="QR Pix" className="mx-auto w-56 h-56" />}
              <Button type="button" variant="outline" size="sm" onClick={copyCode} className="w-full"><Copy className="h-4 w-4 mr-1" /> Copiar Pix copia-e-cola</Button>
              <div className={`flex items-center justify-center gap-2 text-sm font-medium ${paid ? "text-emerald-600" : "text-amber-600"}`}>
                {paid ? <><CheckCircle2 className="h-4 w-4" /> Pagamento aprovado</> : <><Loader2 className="h-4 w-4 animate-spin" /> Aguardando pagamento...</>}
              </div>
            </Card>
          )}

          {metodo === "fiado" && (
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{(customers as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Voltar</Button>
          {metodo === "pix" && !pixTx
            ? <Button onClick={startPix} disabled={loading}>{loading ? "Gerando QR..." : "Gerar QR Pix"}</Button>
            : <Button onClick={finalize} disabled={loading || (metodo === "pix" && !paid)}>{loading ? "Processando..." : metodo === "pix" ? "Concluir" : "Confirmar venda"}</Button>
          }
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReceiptDialog({ data, onClose }: { data: any; onClose: () => void }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  function buildReceiptHtml() {
    const itens = data.itens.map((i: any) =>
      `<tr><td>${i.qtd}x ${escapeHtml(i.nome)}</td><td style="text-align:right">${brl(i.total)}</td></tr>`
    ).join("");
    const pg = data.pagamento || {};
    return `<!doctype html><html><head><meta charset="utf-8"><title>Comprovante #${data.numero ?? ""}</title>
      <style>
        @page { size: 58mm auto; margin: 0; }
        html,body{width:58mm}
        body{font-family:ui-monospace,Menlo,monospace;font-size:11px;padding:2mm;color:#000;margin:0;background:#fff}
        h1,h2,h3{margin:2px 0;font-size:12px}
        table{width:100%;border-collapse:collapse;margin:4px 0;table-layout:fixed}
        td{padding:1px 0;vertical-align:top;word-break:break-word}
        .center{text-align:center}
        .row{display:flex;justify-content:space-between;gap:4px}
        hr{border:none;border-top:1px dashed #000;margin:4px 0}
        .tot{font-weight:700;font-size:13px}
        @media print { @page { size: 58mm auto; margin: 0; } body{padding:2mm} }
      </style></head><body>
      <div class="center">
        <h2>${escapeHtml(data.company.nome || "Distribuidora")}</h2>
        ${data.company.cnpj ? `<div>CNPJ: ${escapeHtml(data.company.cnpj)}</div>` : ""}
        ${data.company.endereco ? `<div>${escapeHtml(data.company.endereco)}</div>` : ""}
        ${data.company.telefone ? `<div>Tel: ${escapeHtml(data.company.telefone)}</div>` : ""}
      </div>
      <hr/>
      <div class="center"><strong>COMPROVANTE NÃO FISCAL</strong></div>
      <div class="row"><span>Venda #${data.numero ?? "-"}</span><span>${new Date(data.data).toLocaleString("pt-BR")}</span></div>
      ${data.vendedor ? `<div>Vendedor: ${escapeHtml(data.vendedor)}</div>` : ""}
      ${data.cliente ? `<div>Cliente: ${escapeHtml(data.cliente)}</div>` : ""}
      <hr/>
      <table>${itens}</table>
      <hr/>
      <div class="row"><span>Subtotal</span><span>${brl(data.subtotal)}</span></div>
      ${Number(data.desconto) ? `<div class="row"><span>Desconto</span><span>- ${brl(data.desconto)}</span></div>` : ""}
      ${Number(data.acrescimo) ? `<div class="row"><span>Acréscimo</span><span>${brl(data.acrescimo)}</span></div>` : ""}
      <div class="row tot"><span>TOTAL</span><span>${brl(data.total)}</span></div>
      <hr/>
      <div class="row"><span>Pagamento</span><span style="text-transform:capitalize">${escapeHtml(pg.metodo || "")}</span></div>
      ${pg.recebido ? `<div class="row"><span>Recebido</span><span>${brl(pg.recebido)}</span></div>` : ""}
      ${pg.troco ? `<div class="row"><span>Troco</span><span>${brl(pg.troco)}</span></div>` : ""}
      <hr/>
      <div class="center">Obrigado pela preferência!</div>
      </body></html>`;
  }

  useEffect(() => {
    if (!previewOpen) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(buildReceiptHtml());
    doc.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOpen]);

  function printFromPreview() {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  }

  function openPrintWindow() {
    const w = window.open("", "_blank", "width=320,height=640");
    if (!w) return;
    w.document.write(buildReceiptHtml().replace("</body></html>", `<script>window.onload=()=>{window.print();}</script></body></html>`));
    w.document.close();
  }



  function shareWhats() {
    const lines: string[] = [];
    lines.push(`*${data.company.nome || "Distribuidora"}*`);
    lines.push(`Comprovante de venda #${data.numero ?? "-"}`);
    lines.push(new Date(data.data).toLocaleString("pt-BR"));
    if (data.cliente) lines.push(`Cliente: ${data.cliente}`);
    lines.push("");
    for (const i of data.itens) lines.push(`${i.qtd}x ${i.nome} — ${brl(i.total)}`);
    lines.push("");
    if (Number(data.desconto)) lines.push(`Desconto: -${brl(data.desconto)}`);
    if (Number(data.acrescimo)) lines.push(`Acréscimo: ${brl(data.acrescimo)}`);
    lines.push(`*TOTAL: ${brl(data.total)}*`);
    lines.push(`Pagamento: ${data.pagamento?.metodo ?? ""}`);
    const url = `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(url, "_blank");
  }

  const pg = data.pagamento || {};
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Comprovante de venda</DialogTitle></DialogHeader>
        <div className="rounded-lg border border-border bg-surface p-4 font-mono text-xs space-y-2">
          <div className="text-center">
            <div className="font-bold text-sm">{data.company.nome || "Distribuidora"}</div>
            {data.company.cnpj && <div>CNPJ: {data.company.cnpj}</div>}
            {data.company.endereco && <div>{data.company.endereco}</div>}
            {data.company.telefone && <div>Tel: {data.company.telefone}</div>}
          </div>
          <div className="border-t border-dashed border-border" />
          <div className="text-center font-semibold">COMPROVANTE NÃO FISCAL</div>
          <div className="flex justify-between"><span>Venda #{data.numero ?? "-"}</span><span>{new Date(data.data).toLocaleString("pt-BR")}</span></div>
          {data.vendedor && <div>Vendedor: {data.vendedor}</div>}
          {data.cliente && <div>Cliente: {data.cliente}</div>}
          <div className="border-t border-dashed border-border" />
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {data.itens.map((i: any, idx: number) => (
              <div key={idx} className="flex justify-between gap-2"><span className="truncate">{i.qtd}x {i.nome}</span><span>{brl(i.total)}</span></div>
            ))}
          </div>
          <div className="border-t border-dashed border-border" />
          <div className="flex justify-between"><span>Subtotal</span><span>{brl(data.subtotal)}</span></div>
          {Number(data.desconto) > 0 && <div className="flex justify-between"><span>Desconto</span><span>- {brl(data.desconto)}</span></div>}
          {Number(data.acrescimo) > 0 && <div className="flex justify-between"><span>Acréscimo</span><span>{brl(data.acrescimo)}</span></div>}
          <div className="flex justify-between text-sm font-bold"><span>TOTAL</span><span>{brl(data.total)}</span></div>
          <div className="border-t border-dashed border-border" />
          <div className="flex justify-between capitalize"><span>Pagamento</span><span>{pg.metodo}</span></div>
          {pg.recebido ? <div className="flex justify-between"><span>Recebido</span><span>{brl(pg.recebido)}</span></div> : null}
          {pg.troco ? <div className="flex justify-between"><span>Troco</span><span>{brl(pg.troco)}</span></div> : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={shareWhats}>WhatsApp</Button>
          <Button variant="outline" onClick={printReceipt}>Imprimir</Button>
          <Button onClick={onClose}>Concluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function escapeHtml(s: string) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
