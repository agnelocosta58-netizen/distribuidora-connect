import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader, EmptyState } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, RefreshCw, Calculator, Save } from "lucide-react";
import { brl, formatDate, num } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/rateio")({ component: RateioPage });

const CATEGORIAS = [
  "Energia elétrica", "Água", "Internet", "Aluguel", "Salários",
  "Impostos", "Combustível", "Fretes", "Taxas bancárias", "Outras",
];

function periodoPreset(p: "diario" | "semanal" | "mensal") {
  const hoje = new Date();
  const fim = hoje.toISOString().slice(0, 10);
  const ini = new Date(hoje);
  if (p === "diario") ini.setDate(hoje.getDate());
  if (p === "semanal") ini.setDate(hoje.getDate() - 6);
  if (p === "mensal") ini.setDate(1);
  return { ini: ini.toISOString().slice(0, 10), fim };
}

function RateioPage() {
  return (
    <PageContainer>
      <PageHeader title="Rateio de custos" subtitle="Distribua despesas operacionais sobre os produtos para apurar custo real e lucro líquido" />
      <Tabs defaultValue="despesas">
        <TabsList>
          <TabsTrigger value="despesas">Despesas</TabsTrigger>
          <TabsTrigger value="apuracao">Apuração</TabsTrigger>
        </TabsList>
        <TabsContent value="despesas" className="mt-4"><DespesasTab /></TabsContent>
        <TabsContent value="apuracao" className="mt-4"><ApuracaoTab /></TabsContent>
      </Tabs>
    </PageContainer>
  );
}

function DespesasTab() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const { ini, fim } = periodoPreset("mensal");
  const [filter, setFilter] = useState({ ini, fim, categoria: "todas" });

  const { data: rows = [] } = useQuery({
    queryKey: ["expenses", auth.company?.id, filter],
    enabled: !!auth.company?.id,
    queryFn: async () => {
      let q = supabase.from("expenses").select("*")
        .gte("competencia", filter.ini).lte("competencia", filter.fim)
        .order("competencia", { ascending: false });
      if (filter.categoria !== "todas") q = q.eq("categoria", filter.categoria);
      const { data } = await q;
      return data ?? [];
    },
  });

  const total = (rows as any[]).reduce((s, r) => s + Number(r.valor || 0), 0);

  async function remove(id: string) {
    if (!confirm("Excluir despesa?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removida");
    qc.invalidateQueries({ queryKey: ["expenses"] });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3"><Label className="text-xs">De</Label><Input type="date" value={filter.ini} onChange={(e) => setFilter({ ...filter, ini: e.target.value })} /></Card>
        <Card className="p-3"><Label className="text-xs">Até</Label><Input type="date" value={filter.fim} onChange={(e) => setFilter({ ...filter, fim: e.target.value })} /></Card>
        <Card className="p-3">
          <Label className="text-xs">Categoria</Label>
          <Select value={filter.categoria} onValueChange={(v) => setFilter({ ...filter, categoria: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </Card>
        <Card className="p-3 flex flex-col justify-center">
          <div className="text-xs text-muted-foreground">Total no período</div>
          <div className="text-2xl font-bold text-primary">{brl(total)}</div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-1" /> Nova despesa</Button>
      </div>

      {rows.length === 0 ? (
        <Card className="shadow-card"><EmptyState title="Sem despesas" description="Cadastre as despesas operacionais (aluguel, salários, etc.) para apurar o custo real." action={<Button onClick={() => setOpenNew(true)}>Cadastrar despesa</Button>} /></Card>
      ) : (
        <Card className="shadow-card overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(rows as any[]).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{formatDate(r.competencia)}</TableCell>
                  <TableCell className="font-medium">{r.descricao}{r.recorrente && <Badge variant="outline" className="ml-2 text-[10px]">recorrente</Badge>}</TableCell>
                  <TableCell><Badge variant="secondary">{r.categoria}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{brl(r.valor)}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {openNew && <ExpenseDialog companyId={auth.company?.id ?? ""} userId={auth.user?.id ?? ""} onClose={() => { setOpenNew(false); qc.invalidateQueries({ queryKey: ["expenses"] }); }} />}
    </div>
  );
}

function ExpenseDialog({ companyId, userId, onClose }: { companyId: string; userId: string; onClose: () => void }) {
  const [form, setForm] = useState({
    descricao: "", categoria: "Energia elétrica",
    valor: 0, competencia: new Date().toISOString().slice(0, 10),
    recorrente: false, observacao: "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.descricao.trim()) return toast.error("Descrição obrigatória");
    if (!form.valor || form.valor <= 0) return toast.error("Valor inválido");
    setSaving(true);
    const { error } = await supabase.from("expenses").insert({
      company_id: companyId, descricao: form.descricao.trim(), categoria: form.categoria,
      valor: Number(form.valor), competencia: form.competencia,
      recorrente: form.recorrente, observacao: form.observacao || null, created_by: userId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Despesa registrada");
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova despesa</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Descrição *</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Valor *</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Competência</Label><Input type="date" value={form.competencia} onChange={(e) => setForm({ ...form, competencia: e.target.value })} /></div>
            <div className="flex items-end gap-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.recorrente} onChange={(e) => setForm({ ...form, recorrente: e.target.checked })} /> Recorrente</label></div>
          </div>
          <div><Label>Observação</Label><Input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApuracaoTab() {
  const auth = useAuth();
  const qc = useQueryClient();
  const { ini, fim } = periodoPreset("mensal");
  const [params, setParams] = useState({ ini, fim, metodo: "quantidade" as "quantidade" | "faturamento" | "categoria" | "percentual" });
  const [allocationId, setAllocationId] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  const { data: results = [] } = useQuery({
    queryKey: ["pca", allocationId],
    enabled: !!allocationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_cost_allocations")
        .select("*, products(nome, preco_custo, preco_venda, unidade)")
        .eq("allocation_id", allocationId!)
        .order("valor_rateado", { ascending: false });
      return data ?? [];
    },
  });

  const { data: alloc } = useQuery({
    queryKey: ["alloc", allocationId],
    enabled: !!allocationId,
    queryFn: async () => (await supabase.from("cost_allocations").select("*").eq("id", allocationId!).maybeSingle()).data,
  });

  async function calcular() {
    if (!auth.company?.id) return;
    setCalculating(true);
    const { data: created, error } = await supabase.from("cost_allocations").insert({
      company_id: auth.company.id,
      periodo_inicio: params.ini, periodo_fim: params.fim, metodo: params.metodo,
    }).select("id").single();
    if (error || !created) { setCalculating(false); return toast.error(error?.message ?? "Erro"); }
    const { error: e2 } = await supabase.rpc("recompute_cost_allocation", { _allocation_id: created.id });
    setCalculating(false);
    if (e2) return toast.error(e2.message);
    setAllocationId(created.id);
    qc.invalidateQueries({ queryKey: ["pca"] });
    qc.invalidateQueries({ queryKey: ["alloc"] });
    toast.success("Apuração calculada");
  }

  async function aplicarCustoReal() {
    if (!results.length) return;
    const updates = (results as any[]).filter((r) => Number(r.custo_real) > 0).map((r) =>
      supabase.from("products").update({ custo_real: Number(r.custo_real) }).eq("id", r.product_id),
    );
    await Promise.all(updates);
    toast.success("Custo real aplicado aos produtos");
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div><Label>Período de</Label><Input type="date" value={params.ini} onChange={(e) => setParams({ ...params, ini: e.target.value })} /></div>
          <div><Label>até</Label><Input type="date" value={params.fim} onChange={(e) => setParams({ ...params, fim: e.target.value })} /></div>
          <div>
            <Label>Método de rateio</Label>
            <Select value={params.metodo} onValueChange={(v: any) => setParams({ ...params, metodo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="quantidade">Por quantidade vendida</SelectItem>
                <SelectItem value="faturamento">Por faturamento</SelectItem>
                <SelectItem value="categoria">Por categoria</SelectItem>
                <SelectItem value="percentual">Percentual definido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={calcular} disabled={calculating}>{calculating ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Calculator className="h-4 w-4 mr-1" />}Calcular</Button>
          <Button variant="outline" onClick={aplicarCustoReal} disabled={!results.length}><Save className="h-4 w-4 mr-1" /> Aplicar custo real</Button>
        </div>
        {alloc && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><div className="text-xs text-muted-foreground">Total despesas</div><div className="text-lg font-semibold">{brl(alloc.total_despesas)}</div></div>
            <div><div className="text-xs text-muted-foreground">Produtos</div><div className="text-lg font-semibold">{results.length}</div></div>
            <div><div className="text-xs text-muted-foreground">Método</div><div className="text-lg font-semibold capitalize">{alloc.metodo}</div></div>
            <div><div className="text-xs text-muted-foreground">Período</div><div className="text-sm">{formatDate(alloc.periodo_inicio)} → {formatDate(alloc.periodo_fim)}</div></div>
          </div>
        )}
      </Card>

      {!allocationId ? (
        <Card><EmptyState title="Sem apuração" description="Escolha o período e método e clique em Calcular." /></Card>
      ) : (
        <Card className="shadow-card overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Qtd vendida</TableHead>
              <TableHead className="text-right">Custo compra</TableHead>
              <TableHead className="text-right">Rateio</TableHead>
              <TableHead className="text-right">Custo real</TableHead>
              <TableHead className="text-right">Preço venda</TableHead>
              <TableHead className="text-right">Margem real</TableHead>
              <TableHead className="text-right">Lucro líquido</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(results as any[]).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.products?.nome}</TableCell>
                  <TableCell className="text-right">{num(r.quantidade_vendida, 3)}</TableCell>
                  <TableCell className="text-right">{brl(r.products?.preco_custo)}</TableCell>
                  <TableCell className="text-right">{brl(r.valor_rateado)}</TableCell>
                  <TableCell className="text-right font-semibold">{brl(r.custo_real)}</TableCell>
                  <TableCell className="text-right">{brl(r.products?.preco_venda)}</TableCell>
                  <TableCell className="text-right">{(Number(r.margem_real) * 100).toFixed(1)}%</TableCell>
                  <TableCell className={`text-right tabular-nums font-semibold ${Number(r.lucro_liquido) < 0 ? "text-destructive" : "text-emerald-600"}`}>{brl(r.lucro_liquido)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
