import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, AlertTriangle, PackagePlus } from "lucide-react";
import { BarcodeInput } from "@/components/barcode-scanner";
import { brl, num } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/produtos")({
  component: ProdutosPage,
});

function ProdutosPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState<any | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["products", auth.company?.id],
    enabled: !!auth.company?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(nome, cor), brands(nome)")
        .order("nome");
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", auth.company?.id],
    enabled: !!auth.company?.id,
    queryFn: async () => (await supabase.from("categories").select("*").order("nome")).data ?? [],
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands", auth.company?.id],
    enabled: !!auth.company?.id,
    queryFn: async () => (await supabase.from("brands").select("*").order("nome")).data ?? [],
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", auth.company?.id],
    enabled: !!auth.company?.id,
    queryFn: async () => (await supabase.from("suppliers").select("*").order("nome")).data ?? [],
  });

  const filtered = (products as any[]).filter(
    (p) =>
      p.nome.toLowerCase().includes(q.toLowerCase()) ||
      (p.codigo_barras ?? "").includes(q),
  );

  async function remove(id: string) {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Produto removido");
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <PageContainer>
      <PageHeader
        title="Produtos"
        subtitle={`${filtered.length} de ${products.length} produtos`}
        actions={
          auth.isGerente && (
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Novo
            </Button>
          )
        }
      />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome ou código de barras" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <Card className="shadow-card">
          <EmptyState title="Nenhum produto" description="Cadastre seu primeiro produto para começar." />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => {
            const low = Number(p.estoque) <= Number(p.estoque_minimo);
            return (
              <Card key={p.id} className="p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{p.nome}</div>
                    <div className="text-xs text-muted-foreground flex gap-2 mt-0.5 flex-wrap">
                      {p.categories?.nome && <Badge variant="secondary">{p.categories.nome}</Badge>}
                      {p.brands?.nome && <span>{p.brands.nome}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{brl(p.preco_venda)}</div>
                    <div className="text-[11px] text-muted-foreground">custo {brl(p.preco_custo)}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div className={`flex items-center gap-1 ${low ? "text-destructive" : "text-foreground"}`}>
                    {low && <AlertTriangle className="h-3.5 w-3.5" />}
                    <span className="font-medium">{num(p.estoque, 3)}</span>
                    <span className="text-muted-foreground text-xs">{p.unidade}</span>
                  </div>
                  {auth.isGerente && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setMoveOpen(p)} title="Movimentar estoque">
                        <PackagePlus className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ProductDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        categories={categories}
        brands={brands}
        suppliers={suppliers}
        companyId={auth.company?.id ?? ""}
        onSaved={() => qc.invalidateQueries({ queryKey: ["products"] })}
      />

      <StockMoveDialog
        product={moveOpen}
        onClose={() => setMoveOpen(null)}
        companyId={auth.company?.id ?? ""}
        onSaved={() => qc.invalidateQueries({ queryKey: ["products"] })}
      />
    </PageContainer>
  );
}

function ProductDialog({ open, onOpenChange, editing, categories, brands, suppliers, companyId, onSaved }: any) {
  const isEdit = !!editing;
  const empty = {
    nome: "", codigo_barras: "", category_id: "", brand_id: "", supplier_id: "",
    unidade: "un", tamanho: "", volume: "",
    estoque: 0, estoque_minimo: 0, preco_custo: 0, preco_venda: 0,
    validade: "", descricao: "",
  };
  const [form, setForm] = useState<any>(empty);

  function reset() { setForm(editing ? { ...empty, ...editing, validade: editing.validade ?? "" } : empty); }

  // Reset when dialog opens
  if (open && form.nome === "" && editing) reset();
  if (!open && form !== empty && !editing) {/* noop */ }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      company_id: companyId,
      category_id: form.category_id || null,
      brand_id: form.brand_id || null,
      supplier_id: form.supplier_id || null,
      validade: form.validade || null,
      estoque: Number(form.estoque),
      estoque_minimo: Number(form.estoque_minimo),
      preco_custo: Number(form.preco_custo),
      preco_venda: Number(form.preco_venda),
    };
    const { error } = isEdit
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(isEdit ? "Atualizado" : "Criado");
    onSaved();
    onOpenChange(false);
    setForm(empty);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setForm(empty); else reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5"><Label>Nome *</Label><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Código de barras</Label><BarcodeInput value={form.codigo_barras ?? ""} onChange={(v) => setForm({ ...form, codigo_barras: v })} /></div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={form.category_id ?? ""} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Marca</Label>
            <Select value={form.brand_id ?? ""} onValueChange={(v) => setForm({ ...form, brand_id: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{brands.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fornecedor</Label>
            <Select value={form.supplier_id ?? ""} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Unidade</Label><Input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} placeholder="un, cx, lt" /></div>
          <div className="space-y-1.5"><Label>Tamanho</Label><Input value={form.tamanho ?? ""} onChange={(e) => setForm({ ...form, tamanho: e.target.value })} placeholder="600ml" /></div>
          <div className="space-y-1.5"><Label>Volume / pack</Label><Input value={form.volume ?? ""} onChange={(e) => setForm({ ...form, volume: e.target.value })} placeholder="12un" /></div>
          <div className="space-y-1.5"><Label>Estoque</Label><Input type="number" step="0.001" value={form.estoque} onChange={(e) => setForm({ ...form, estoque: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Estoque mínimo</Label><Input type="number" step="0.001" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Preço de custo</Label><Input type="number" step="0.01" value={form.preco_custo} onChange={(e) => setForm({ ...form, preco_custo: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Preço de venda *</Label><Input required type="number" step="0.01" value={form.preco_venda} onChange={(e) => setForm({ ...form, preco_venda: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Validade</Label><Input type="date" value={form.validade ?? ""} onChange={(e) => setForm({ ...form, validade: e.target.value })} /></div>
          <div className="col-span-2 space-y-1.5"><Label>Descrição</Label><Textarea rows={2} value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
          <DialogFooter className="col-span-2"><Button type="submit">Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StockMoveDialog({ product, onClose, companyId, onSaved }: any) {
  const [tipo, setTipo] = useState<"entrada" | "saida" | "ajuste">("entrada");
  const [qtd, setQtd] = useState(0);
  const [obs, setObs] = useState("");

  async function save() {
    if (!product) return;
    const { error } = await supabase.from("stock_movements").insert({
      company_id: companyId, product_id: product.id, tipo, quantidade: Number(qtd), observacao: obs,
    });
    if (error) return toast.error(error.message);
    toast.success("Movimentação registrada");
    onSaved(); onClose(); setQtd(0); setObs("");
  }

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Movimentar estoque — {product?.nome}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
                <SelectItem value="ajuste">Ajuste (define estoque)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Quantidade</Label><Input type="number" step="0.001" value={qtd} onChange={(e) => setQtd(Number(e.target.value))} /></div>
          <div className="space-y-1.5"><Label>Observação</Label><Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={save}>Registrar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
