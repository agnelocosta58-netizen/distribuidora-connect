import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Check } from "lucide-react";
import { brl, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/financeiro")({ component: FinanceiroPage });

function FinanceiroPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [openAR, setOpenAR] = useState(false);
  const [openAP, setOpenAP] = useState(false);

  const ar = useQuery({
    queryKey: ["ar", auth.company?.id], enabled: !!auth.company?.id,
    queryFn: async () => (await supabase.from("accounts_receivable").select("*, customers(nome)").order("vencimento")).data ?? [],
  });
  const ap = useQuery({
    queryKey: ["ap", auth.company?.id], enabled: !!auth.company?.id,
    queryFn: async () => (await supabase.from("accounts_payable").select("*, suppliers(nome)").order("vencimento")).data ?? [],
  });
  const sups = useQuery({
    queryKey: ["suppliers", auth.company?.id], enabled: !!auth.company?.id,
    queryFn: async () => (await supabase.from("suppliers").select("id, nome").order("nome")).data ?? [],
  });
  const custs = useQuery({
    queryKey: ["customers-min", auth.company?.id], enabled: !!auth.company?.id,
    queryFn: async () => (await supabase.from("customers").select("id, nome").order("nome")).data ?? [],
  });

  async function baixarAR(item: any) {
    await supabase.from("accounts_receivable").update({ status: "pago", valor_pago: item.valor, pago_em: new Date().toISOString() }).eq("id", item.id);
    toast.success("Baixa registrada");
    qc.invalidateQueries({ queryKey: ["ar"] });
  }
  async function baixarAP(item: any) {
    await supabase.from("accounts_payable").update({ status: "pago", valor_pago: item.valor, pago_em: new Date().toISOString() }).eq("id", item.id);
    toast.success("Baixa registrada");
    qc.invalidateQueries({ queryKey: ["ap"] });
  }

  const totalARPend = (ar.data ?? []).filter((x: any) => x.status !== "pago" && x.status !== "cancelado").reduce((s: number, x: any) => s + (Number(x.valor) - Number(x.valor_pago)), 0);
  const totalAPPend = (ap.data ?? []).filter((x: any) => x.status !== "pago" && x.status !== "cancelado").reduce((s: number, x: any) => s + (Number(x.valor) - Number(x.valor_pago)), 0);

  return (
    <PageContainer>
      <PageHeader title="Financeiro" subtitle="Contas a receber e a pagar" />

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="p-4 shadow-card">
          <div className="text-xs text-muted-foreground">Total a receber</div>
          <div className="text-xl font-bold text-success">{brl(totalARPend)}</div>
        </Card>
        <Card className="p-4 shadow-card">
          <div className="text-xs text-muted-foreground">Total a pagar</div>
          <div className="text-xl font-bold text-destructive">{brl(totalAPPend)}</div>
        </Card>
      </div>

      <Tabs defaultValue="ar">
        <TabsList className="grid grid-cols-2 w-full max-w-sm mb-4">
          <TabsTrigger value="ar">Receber</TabsTrigger>
          <TabsTrigger value="ap">Pagar</TabsTrigger>
        </TabsList>

        <TabsContent value="ar" className="space-y-2">
          <div className="flex justify-end mb-2"><Button onClick={() => setOpenAR(true)}><Plus className="h-4 w-4 mr-1" />Nova conta</Button></div>
          {(ar.data ?? []).map((x: any) => (
            <Card key={x.id} className="p-4 shadow-card flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{x.descricao}</div>
                <div className="text-xs text-muted-foreground">{x.customers?.nome ?? "—"} · vence {formatDate(x.vencimento)}</div>
                <StatusBadge status={x.status} />
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold">{brl(x.valor)}</div>
                {x.status !== "pago" && (
                  <Button size="sm" variant="outline" className="mt-1" onClick={() => baixarAR(x)}>
                    <Check className="h-3 w-3 mr-1" />Baixar
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="ap" className="space-y-2">
          <div className="flex justify-end mb-2"><Button onClick={() => setOpenAP(true)}><Plus className="h-4 w-4 mr-1" />Nova despesa</Button></div>
          {(ap.data ?? []).map((x: any) => (
            <Card key={x.id} className="p-4 shadow-card flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{x.descricao}</div>
                <div className="text-xs text-muted-foreground">{x.suppliers?.nome ?? x.categoria ?? "—"} · vence {formatDate(x.vencimento)}</div>
                <StatusBadge status={x.status} />
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold">{brl(x.valor)}</div>
                {x.status !== "pago" && (
                  <Button size="sm" variant="outline" className="mt-1" onClick={() => baixarAP(x)}>
                    <Check className="h-3 w-3 mr-1" />Baixar
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <ArDialog open={openAR} onClose={() => setOpenAR(false)} companyId={auth.company?.id ?? ""} customers={custs.data ?? []}
        onSaved={() => qc.invalidateQueries({ queryKey: ["ar"] })} />
      <ApDialog open={openAP} onClose={() => setOpenAP(false)} companyId={auth.company?.id ?? ""} suppliers={sups.data ?? []}
        onSaved={() => qc.invalidateQueries({ queryKey: ["ap"] })} />
    </PageContainer>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pendente: "bg-warning/10 text-warning",
    parcial: "bg-primary/10 text-primary",
    pago: "bg-success/10 text-success",
    cancelado: "bg-muted text-muted-foreground",
  };
  return <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded mt-1 capitalize ${map[status] ?? ""}`}>{status}</span>;
}

function ArDialog({ open, onClose, companyId, customers, onSaved }: any) {
  const [form, setForm] = useState({ descricao: "", valor: 0, vencimento: "", customer_id: "" });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("accounts_receivable").insert({
      company_id: companyId, descricao: form.descricao, valor: Number(form.valor),
      vencimento: form.vencimento, customer_id: form.customer_id || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Criada"); setForm({ descricao: "", valor: 0, vencimento: "", customer_id: "" }); onSaved(); onClose();
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova conta a receber</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5"><Label>Descrição *</Label><Input required value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Valor *</Label><Input required type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>Vencimento *</Label><Input required type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ApDialog({ open, onClose, companyId, suppliers, onSaved }: any) {
  const [form, setForm] = useState({ descricao: "", valor: 0, vencimento: "", supplier_id: "", categoria: "" });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("accounts_payable").insert({
      company_id: companyId, descricao: form.descricao, valor: Number(form.valor),
      vencimento: form.vencimento, supplier_id: form.supplier_id || null, categoria: form.categoria || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Criada"); setForm({ descricao: "", valor: 0, vencimento: "", supplier_id: "", categoria: "" }); onSaved(); onClose();
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova despesa</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5"><Label>Descrição *</Label><Input required value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Valor *</Label><Input required type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>Vencimento *</Label><Input required type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {["Água", "Energia", "Internet", "Funcionários", "Fornecedores", "Outras"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fornecedor</Label>
            <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
