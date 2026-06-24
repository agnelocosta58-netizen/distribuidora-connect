import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader, EmptyState } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { brl, num, formatDate, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Pencil, History, Snowflake, Flame, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/app/estoque")({ component: EstoquePage });

type Product = { id: string; nome: string; codigo_barras: string | null; estoque: number; estoque_minimo: number; preco_custo: number; preco_venda: number; validade: string | null; imagem_url: string | null; categoria?: { nome: string; cor: string } | null; updated_at: string };
type Variant = { id: string; product_id: string; tipo: "unidade" | "fardo" | "caixa"; temperatura: "quente" | "gelado"; unidades_por_pacote: number; codigo_barras: string | null; estoque: number; estoque_minimo: number; preco_custo: number; preco_venda: number; ativo: boolean };

function EstoquePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [movProduct, setMovProduct] = useState<Product | null>(null);
  const [variantsProduct, setVariantsProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: v }] = await Promise.all([
      supabase.from("products").select("id, nome, codigo_barras, estoque, estoque_minimo, preco_custo, preco_venda, validade, imagem_url, updated_at, categoria:categories(nome, cor)").order("nome"),
      supabase.from("product_variants").select("*").order("tipo"),
    ]);
    setProducts((p as any) ?? []);
    setVariants((v as any) ?? []);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.nome.toLowerCase().includes(q) || (p.codigo_barras ?? "").includes(q));
  }, [products, busca]);

  function margin(custo: number, venda: number) {
    if (!custo || custo <= 0) return null;
    return ((venda - custo) / custo) * 100;
  }

  return (
    <PageContainer>
      <PageHeader title="Estoque" subtitle="Visão detalhada com margens, validades e variantes" />
      <Card className="p-3 mb-4">
        <Input placeholder="Buscar por nome ou código de barras…" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </Card>

      <Card className="shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Venda</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9}><EmptyState title="Nenhum produto" description="Cadastre produtos para visualizar o estoque" /></TableCell></TableRow>
              ) : filtered.map((p) => {
                const m = margin(Number(p.preco_custo), Number(p.preco_venda));
                const baixo = Number(p.estoque) <= Number(p.estoque_minimo) && Number(p.estoque_minimo) > 0;
                const vencido = p.validade && new Date(p.validade) < new Date();
                const variantes = variants.filter((v) => v.product_id === p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        {p.imagem_url && <img src={p.imagem_url} className="h-9 w-9 rounded object-cover shrink-0" alt="" />}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{p.nome}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{p.codigo_barras ?? "—"} {p.categoria?.nome && <>· <span style={{ color: p.categoria.cor }}>{p.categoria.nome}</span></>}</div>
                          {variantes.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {variantes.map((v) => (
                                <Badge key={v.id} variant="outline" className="text-[10px] gap-1">
                                  {v.temperatura === "gelado" ? <Snowflake className="h-2.5 w-2.5" /> : <Flame className="h-2.5 w-2.5" />}
                                  {v.tipo} · {num(v.estoque, 0)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${baixo ? "text-destructive font-semibold" : ""}`}>
                      {baixo && <AlertTriangle className="inline h-3 w-3 mr-1" />}
                      {num(p.estoque, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{num(p.estoque_minimo, 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(p.preco_custo)}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(p.preco_venda)}</TableCell>
                    <TableCell className="text-right tabular-nums">{m === null ? "—" : <span className={m < 10 ? "text-destructive" : m > 30 ? "text-emerald-600" : ""}>{m.toFixed(1)}%</span>}</TableCell>
                    <TableCell className={vencido ? "text-destructive" : ""}>{formatDate(p.validade)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(p.updated_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setVariantsProduct(p)} title="Variantes"><Plus className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setMovProduct(p)} title="Movimento"><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setHistoryProduct(p)} title="Histórico"><History className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {movProduct && <MovementDialog product={movProduct} onClose={() => { setMovProduct(null); void load(); }} />}
      {variantsProduct && <VariantsDialog product={variantsProduct} variants={variants.filter((v) => v.product_id === variantsProduct.id)} onClose={() => { setVariantsProduct(null); void load(); }} />}
      {historyProduct && <HistorySheet product={historyProduct} onClose={() => setHistoryProduct(null)} />}
    </PageContainer>
  );
}

function MovementDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const [tipo, setTipo] = useState<"entrada" | "saida" | "ajuste">("entrada");
  const [quantidade, setQuantidade] = useState("");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const q = Number(quantidade);
    if (!q || q <= 0) return toast.error("Quantidade inválida");
    setSaving(true);
    const { data: prof } = await supabase.from("profiles").select("company_id").eq("id", (await supabase.auth.getUser()).data.user!.id).maybeSingle();
    const { error } = await supabase.from("stock_movements").insert({
      company_id: prof!.company_id!, product_id: product.id, tipo, quantidade: q, observacao: obs || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Movimento registrado");
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Movimentar estoque — {product.nome}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
                <SelectItem value="ajuste">Ajuste (define o valor)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Quantidade</Label><Input type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} /></div>
          <div><Label>Observação</Label><Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Confirmar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VariantsDialog({ product, variants, onClose }: { product: Product; variants: Variant[]; onClose: () => void }) {
  const PACK = ["unidade", "fardo", "caixa"] as const;
  const TEMP = ["quente", "gelado"] as const;
  const [items, setItems] = useState<Record<string, Partial<Variant>>>(() => {
    const map: Record<string, Partial<Variant>> = {};
    for (const v of variants) map[`${v.tipo}:${v.temperatura}`] = v;
    return map;
  });
  const [saving, setSaving] = useState(false);

  function key(t: string, te: string) { return `${t}:${te}`; }
  function patch(t: string, te: string, p: Partial<Variant>) {
    setItems((s) => ({ ...s, [key(t, te)]: { ...s[key(t, te)], tipo: t as any, temperatura: te as any, ...p } }));
  }

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("company_id").eq("id", user!.id).maybeSingle();
    const upserts: any[] = [];
    const deletes: string[] = [];
    for (const k of Object.keys(items)) {
      const it = items[k];
      if (!it.ativo && it.id) { deletes.push(it.id); continue; }
      if (!it.ativo) continue;
      upserts.push({
        id: it.id, company_id: prof!.company_id!, product_id: product.id,
        tipo: it.tipo, temperatura: it.temperatura,
        unidades_por_pacote: Number(it.unidades_por_pacote ?? 1),
        codigo_barras: it.codigo_barras || null,
        estoque: Number(it.estoque ?? 0),
        estoque_minimo: Number(it.estoque_minimo ?? 0),
        preco_custo: Number(it.preco_custo ?? 0),
        preco_venda: Number(it.preco_venda ?? 0),
        ativo: true,
      });
    }
    if (deletes.length) await supabase.from("product_variants").delete().in("id", deletes);
    if (upserts.length) {
      const { error } = await supabase.from("product_variants").upsert(upserts, { onConflict: "product_id,tipo,temperatura" });
      if (error) { setSaving(false); return toast.error(error.message); }
    }
    setSaving(false);
    toast.success("Variantes salvas");
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Variantes — {product.nome}</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {PACK.map((t) => TEMP.map((te) => {
            const it = items[key(t, te)] ?? {};
            return (
              <Card key={`${t}-${te}`} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium capitalize flex items-center gap-2">
                    {te === "gelado" ? <Snowflake className="h-4 w-4 text-sky-500" /> : <Flame className="h-4 w-4 text-orange-500" />}
                    {t} {te}
                  </div>
                  <div className="flex items-center gap-2"><Label className="text-xs">Ativo</Label><Switch checked={!!it.ativo} onCheckedChange={(c) => patch(t, te, { ativo: c })} /></div>
                </div>
                {it.ativo && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div><Label className="text-xs">Estoque</Label><Input type="number" value={it.estoque ?? 0} onChange={(e) => patch(t, te, { estoque: Number(e.target.value) })} /></div>
                    <div><Label className="text-xs">Mínimo</Label><Input type="number" value={it.estoque_minimo ?? 0} onChange={(e) => patch(t, te, { estoque_minimo: Number(e.target.value) })} /></div>
                    <div><Label className="text-xs">Custo</Label><Input type="number" step="0.01" value={it.preco_custo ?? 0} onChange={(e) => patch(t, te, { preco_custo: Number(e.target.value) })} /></div>
                    <div><Label className="text-xs">Venda</Label><Input type="number" step="0.01" value={it.preco_venda ?? 0} onChange={(e) => patch(t, te, { preco_venda: Number(e.target.value) })} /></div>
                    <div><Label className="text-xs">Un./pacote</Label><Input type="number" value={it.unidades_por_pacote ?? 1} onChange={(e) => patch(t, te, { unidades_por_pacote: Number(e.target.value) })} /></div>
                    <div className="col-span-2 sm:col-span-3"><Label className="text-xs">Código de barras</Label><Input value={it.codigo_barras ?? ""} onChange={(e) => patch(t, te, { codigo_barras: e.target.value })} /></div>
                  </div>
                )}
              </Card>
            );
          }))}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistorySheet({ product, onClose }: { product: Product; onClose: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("stock_movements").select("*").eq("product_id", product.id).order("created_at", { ascending: false }).limit(100).then(({ data }) => setRows((data as any) ?? []));
  }, [product.id]);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>Histórico — {product.nome}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-2">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">Sem movimentos.</p>}
          {rows.map((r) => (
            <Card key={r.id} className="p-3 text-sm">
              <div className="flex justify-between"><Badge variant="outline" className="capitalize">{r.tipo}</Badge><span className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</span></div>
              <div className="mt-1">Quantidade: <span className="font-medium tabular-nums">{num(r.quantidade, 3)}</span></div>
              {r.observacao && <div className="text-xs text-muted-foreground mt-1">{r.observacao}</div>}
            </Card>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
