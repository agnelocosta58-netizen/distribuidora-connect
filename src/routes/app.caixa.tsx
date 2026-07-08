import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { brl, formatDateTime } from "@/lib/format";
import { ArrowDownToLine, ArrowUpFromLine, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/caixa")({ component: CaixaPage });

function CaixaPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [openAbrir, setOpenAbrir] = useState(false);
  const [openMov, setOpenMov] = useState<"suprimento" | "sangria" | null>(null);

  const { data: caixa } = useQuery({
    queryKey: ["caixa-aberto", auth.user?.id],
    enabled: !!auth.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_registers")
        .select("*")
        .eq("user_id", auth.user!.id)
        .eq("status", "aberto")
        .order("aberto_em", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const { data: movs = [] } = useQuery({
    queryKey: ["caixa-movs", caixa?.id],
    enabled: !!caixa?.id,
    queryFn: async () => (await supabase.from("cash_movements").select("*").eq("cash_register_id", caixa!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const saldo = (movs as any[]).reduce((s, m) => {
    if (["abertura", "suprimento", "venda", "recebimento"].includes(m.tipo)) return s + Number(m.valor);
    return s - Number(m.valor);
  }, 0);

  async function fechar() {
    if (!confirm(`Fechar caixa com saldo ${brl(saldo)}?`)) return;
    await supabase.from("cash_movements").insert({ company_id: auth.company?.id!, cash_register_id: caixa!.id, tipo: "fechamento", valor: saldo, descricao: "Fechamento", user_id: auth.user?.id });
    await supabase.from("cash_registers").update({ status: "fechado", valor_fechamento: saldo, fechado_em: new Date().toISOString() }).eq("id", caixa!.id);
    toast.success("Caixa fechado");
    qc.invalidateQueries({ queryKey: ["caixa-aberto"] });
  }

  return (
    <PageContainer>
      <PageHeader title="Caixa" subtitle={caixa ? "Caixa aberto" : "Nenhum caixa aberto"}
        actions={
          caixa ? (
            <Button variant="outline" onClick={fechar}><Lock className="h-4 w-4 mr-1" />Fechar caixa</Button>
          ) : (
            <Button onClick={() => setOpenAbrir(true)}><Unlock className="h-4 w-4 mr-1" />Abrir caixa</Button>
          )
        }
      />

      {!caixa ? (
        <Card className="shadow-card"><EmptyState title="Sem caixa aberto" description="Abra o caixa para começar a registrar vendas e movimentações." /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Card className="p-4 shadow-card">
              <div className="text-xs text-muted-foreground">Saldo atual</div>
              <div className="text-xl font-bold text-primary">{brl(saldo)}</div>
            </Card>
            <Card className="p-4 shadow-card">
              <div className="text-xs text-muted-foreground">Abertura</div>
              <div className="text-xl font-bold">{brl(caixa.valor_abertura)}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{formatDateTime(caixa.aberto_em)}</div>
            </Card>
            <Card className="p-4 shadow-card">
              <Button variant="outline" className="w-full" onClick={() => setOpenMov("suprimento")}>
                <ArrowDownToLine className="h-4 w-4 mr-1" />Suprimento
              </Button>
            </Card>
            <Card className="p-4 shadow-card">
              <Button variant="outline" className="w-full" onClick={() => setOpenMov("sangria")}>
                <ArrowUpFromLine className="h-4 w-4 mr-1" />Sangria
              </Button>
            </Card>
          </div>

          <Card className="p-5 shadow-card">
            <h3 className="font-semibold mb-3">Movimentações</h3>
            <div className="space-y-1">
              {(movs as any[]).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma movimentação</p>}
              {(movs as any[]).map((m) => {
                const isPos = ["abertura", "suprimento", "venda", "recebimento"].includes(m.tipo);
                return (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <Badge variant="secondary" className="capitalize text-[10px]">{m.tipo}</Badge>
                      <div className="text-sm mt-1 truncate">{m.descricao ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{formatDateTime(m.created_at)}</div>
                    </div>
                    <div className={`font-semibold ${isPos ? "text-success" : "text-destructive"}`}>
                      {isPos ? "+" : "−"} {brl(m.valor)}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      <AbrirDialog open={openAbrir} onClose={() => setOpenAbrir(false)} companyId={auth.company?.id ?? ""} userId={auth.user?.id ?? ""}
        onSaved={() => qc.invalidateQueries({ queryKey: ["caixa-aberto"] })} />

      <MovDialog open={!!openMov} tipo={openMov} onClose={() => setOpenMov(null)} caixa={caixa} companyId={auth.company?.id ?? ""} userId={auth.user?.id ?? ""}
        onSaved={() => qc.invalidateQueries({ queryKey: ["caixa-movs"] })} />
    </PageContainer>
  );
}

function AbrirDialog({ open, onClose, companyId, userId, onSaved }: any) {
  const [valor, setValor] = useState(0);
  async function abrir() {
    const { data, error } = await supabase.from("cash_registers").insert({ company_id: companyId, user_id: userId, valor_abertura: Number(valor) }).select().single();
    if (error || !data) return toast.error(error?.message);
    await supabase.from("cash_movements").insert({ company_id: companyId, cash_register_id: data.id, tipo: "abertura", valor: Number(valor), descricao: "Abertura de caixa", user_id: userId });
    toast.success("Caixa aberto");
    onSaved(); onClose();
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Abrir caixa</DialogTitle></DialogHeader>
        <div className="space-y-1.5"><Label>Valor de abertura</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(Number(e.target.value))} /></div>
        <DialogFooter><Button onClick={abrir}>Abrir</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MovDialog({ open, tipo, onClose, caixa, companyId, userId, onSaved }: any) {
  const [valor, setValor] = useState(0);
  const [desc, setDesc] = useState("");
  async function save() {
    const { error } = await supabase.from("cash_movements").insert({
      company_id: companyId, cash_register_id: caixa.id, tipo, valor: Number(valor), descricao: desc, user_id: userId,
    });
    if (error) return toast.error(error.message);
    toast.success("Registrado");
    setValor(0); setDesc(""); onSaved(); onClose();
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="capitalize">{tipo}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Valor</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(Number(e.target.value))} /></div>
          <div className="space-y-1.5"><Label>Descrição</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={save}>Registrar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
