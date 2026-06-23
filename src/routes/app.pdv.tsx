import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Minus, Trash2, ShoppingCart, X, ScanLine } from "lucide-react";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/pdv")({
  component: PdvPage,
});

interface CartItem {
  product_id: string;
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

  const { data: products = [] } = useQuery({
    queryKey: ["products-pdv", auth.company?.id],
    enabled: !!auth.company?.id,
    queryFn: async () => (await supabase.from("products").select("id, nome, preco_venda, codigo_barras, estoque, unidade").eq("ativo", true).order("nome")).data ?? [],
  });

  const filtered = useMemo(() => {
    if (!q) return (products as any[]).slice(0, 40);
    const term = q.toLowerCase();
    return (products as any[]).filter((p) => p.nome.toLowerCase().includes(term) || (p.codigo_barras ?? "").includes(q)).slice(0, 40);
  }, [products, q]);

  function addProduct(p: any) {
    setCart((c) => {
      const ex = c.find((i) => i.product_id === p.id);
      if (ex) return c.map((i) => i.product_id === p.id ? { ...i, qtd: i.qtd + 1 } : i);
      return [...c, { product_id: p.id, nome: p.nome, preco: Number(p.preco_venda), qtd: 1 }];
    });
  }

  function updateQty(id: string, delta: number) {
    setCart((c) => c.map((i) => i.product_id === id ? { ...i, qtd: Math.max(0, i.qtd + delta) } : i).filter((i) => i.qtd > 0));
  }

  function setQty(id: string, q: number) {
    setCart((c) => c.map((i) => i.product_id === id ? { ...i, qtd: q } : i));
  }

  function removeItem(id: string) {
    setCart((c) => c.filter((i) => i.product_id !== id));
  }

  function cancelSale() {
    if (!cart.length) return;
    if (!confirm("Cancelar venda?")) return;
    setCart([]); setDesconto(0); setAcrescimo(0);
  }

  function scanBarcode() {
    const code = prompt("Bipe ou digite o código de barras:");
    if (!code) return;
    const p = (products as any[]).find((x) => x.codigo_barras === code);
    if (!p) return toast.error("Produto não encontrado");
    addProduct(p);
  }

  const subtotal = cart.reduce((s, i) => s + i.preco * i.qtd, 0);
  const total = subtotal - Number(desconto || 0) + Number(acrescimo || 0);

  return (
    <div className="lg:grid lg:grid-cols-[1fr_400px] h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* Products */}
      <div className="flex flex-col min-h-0">
        <div className="p-4 border-b border-border bg-surface flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar produto..." value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
          <Button variant="outline" size="icon" onClick={scanBarcode} title="Código de barras"><ScanLine className="h-4 w-4" /></Button>
          <Button className="lg:hidden relative" onClick={() => setShowCart(true)}>
            <ShoppingCart className="h-4 w-4" />
            {cart.length > 0 && <span className="ml-1 text-xs">{cart.length}</span>}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((p: any) => (
              <button key={p.id} onClick={() => addProduct(p)} disabled={Number(p.estoque) <= 0}
                className="text-left p-3 rounded-xl bg-surface border border-border hover:border-primary hover:shadow-card transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <div className="text-xs text-muted-foreground">{p.unidade}</div>
                <div className="font-medium text-sm line-clamp-2 min-h-[2.5em]">{p.nome}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-primary font-bold">{brl(p.preco_venda)}</span>
                  <span className="text-[11px] text-muted-foreground">est. {Number(p.estoque)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart (sidebar on desktop, sheet on mobile) */}
      <aside className={`bg-surface border-l border-border flex-col ${showCart ? "fixed inset-0 z-50 flex" : "hidden"} lg:flex lg:relative lg:inset-auto`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="font-semibold flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Carrinho</div>
          <button className="lg:hidden" onClick={() => setShowCart(false)}><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">Adicione produtos</p>}
          {cart.map((i) => (
            <div key={i.product_id} className="p-3 rounded-lg border border-border">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{i.nome}</div>
                  <div className="text-xs text-muted-foreground">{brl(i.preco)} cada</div>
                </div>
                <button onClick={() => removeItem(i.product_id)}><Trash2 className="h-4 w-4 text-destructive" /></button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center border border-border rounded-md">
                  <button className="p-1.5" onClick={() => updateQty(i.product_id, -1)}><Minus className="h-3 w-3" /></button>
                  <input type="number" className="w-12 text-center bg-transparent text-sm" value={i.qtd} onChange={(e) => setQty(i.product_id, Math.max(0, Number(e.target.value)))} />
                  <button className="p-1.5" onClick={() => updateQty(i.product_id, 1)}><Plus className="h-3 w-3" /></button>
                </div>
                <span className="font-semibold">{brl(i.preco * i.qtd)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Desconto</Label>
              <Input type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label className="text-xs">Acréscimo</Label>
              <Input type="number" step="0.01" value={acrescimo} onChange={(e) => setAcrescimo(Number(e.target.value) || 0)} />
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span><span>{brl(subtotal)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold">
            <span>Total</span><span className="text-primary">{brl(total)}</span>
          </div>
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
        total={total}
        subtotal={subtotal}
        desconto={Number(desconto)}
        acrescimo={Number(acrescimo)}
        companyId={auth.company?.id ?? ""}
        userId={auth.user?.id ?? ""}
        pixChave={auth.company?.pix_chave ?? null}
        onDone={() => { setCart([]); setDesconto(0); setAcrescimo(0); setShowCheckout(false); setShowCart(false); qc.invalidateQueries({ queryKey: ["products-pdv"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); }}
      />
    </div>
  );
}

function CheckoutDialog({ open, onClose, cart, total, subtotal, desconto, acrescimo, companyId, userId, pixChave, onDone }: any) {
  const [metodo, setMetodo] = useState<"dinheiro" | "pix" | "debito" | "credito" | "fiado">("dinheiro");
  const [recebido, setRecebido] = useState(0);
  const [customerId, setCustomerId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-min", companyId],
    enabled: !!companyId && open,
    queryFn: async () => (await supabase.from("customers").select("id, nome").order("nome")).data ?? [],
  });

  const troco = metodo === "dinheiro" ? Math.max(0, Number(recebido) - total) : 0;

  async function finalize() {
    if (metodo === "fiado" && !customerId) return toast.error("Selecione um cliente para venda fiada");
    setLoading(true);
    const { data: sale, error: e1 } = await supabase.from("sales").insert({
      company_id: companyId, user_id: userId, customer_id: customerId || null,
      subtotal, desconto, acrescimo, total, status: "concluida",
    }).select().single();
    if (e1 || !sale) { setLoading(false); return toast.error(e1?.message ?? "Erro"); }

    const items = cart.map((i: CartItem) => ({
      company_id: companyId, sale_id: sale.id, product_id: i.product_id,
      nome_produto: i.nome, quantidade: i.qtd, preco_unitario: i.preco, total: i.preco * i.qtd,
    }));
    const { error: e2 } = await supabase.from("sale_items").insert(items);
    if (e2) { setLoading(false); return toast.error(e2.message); }

    await supabase.from("sale_payments").insert({
      company_id: companyId, sale_id: sale.id, metodo, valor: total, troco,
    });

    if (metodo === "fiado") {
      const v = new Date(); v.setDate(v.getDate() + 30);
      await supabase.from("accounts_receivable").insert({
        company_id: companyId, customer_id: customerId, sale_id: sale.id,
        descricao: `Venda fiada #${sale.numero}`, valor: total, vencimento: v.toISOString().slice(0, 10),
      });
    }

    setLoading(false);
    toast.success(`Venda #${sale.numero} concluída!`);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
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
                <button key={m} onClick={() => setMetodo(m)}
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
              {troco > 0 && (
                <div className="flex justify-between text-success font-semibold">
                  <span>Troco</span><span>{brl(troco)}</span>
                </div>
              )}
            </>
          )}

          {metodo === "pix" && (
            <Card className="p-3 bg-muted/40">
              <div className="text-xs text-muted-foreground mb-1">Chave Pix</div>
              <div className="text-sm font-mono break-all">{pixChave || "Configure a chave Pix em Configurações"}</div>
              <p className="text-xs text-muted-foreground mt-2">Confirme manualmente o recebimento antes de finalizar.</p>
            </Card>
          )}

          {metodo === "fiado" && (
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(customers as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Voltar</Button>
          <Button onClick={finalize} disabled={loading}>{loading ? "Processando..." : "Confirmar venda"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
