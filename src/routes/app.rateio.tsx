import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader, EmptyState } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { brl, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2, Check, X } from "lucide-react";

export const Route = createFileRoute("/app/rateio")({ component: RateioPage });

type Group = { id: string; titulo: string; descricao: string | null; valor_total: number; status: string; created_at: string };
type Part = { id: string; group_id: string; nome: string; valor_devido: number; valor_pago: number; pago_em: string | null; observacao: string | null };

function RateioPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    const [{ data: g }, { data: p }] = await Promise.all([
      supabase.from("rateio_groups").select("*").order("created_at", { ascending: false }),
      supabase.from("rateio_participants").select("*"),
    ]);
    setGroups((g as any) ?? []);
    setParts((p as any) ?? []);
  }
  useEffect(() => { void load(); }, []);

  return (
    <PageContainer>
      <PageHeader title="Rateio" subtitle="Divida custos entre pessoas e acompanhe os pagamentos" actions={<Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-1" /> Novo grupo</Button>} />
      {groups.length === 0 ? (
        <EmptyState title="Nenhum rateio" description="Crie um grupo para dividir uma despesa." action={<Button onClick={() => setOpenNew(true)}>Criar primeiro</Button>} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {groups.map((g) => <GroupCard key={g.id} group={g} parts={parts.filter((p) => p.group_id === g.id)} onChange={load} />)}
        </div>
      )}
      {openNew && <NewGroupDialog onClose={() => { setOpenNew(false); void load(); }} />}
    </PageContainer>
  );
}

function GroupCard({ group, parts, onChange }: { group: Group; parts: Part[]; onChange: () => void }) {
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const totalPago = parts.reduce((s, p) => s + Number(p.valor_pago), 0);
  const totalDevido = parts.reduce((s, p) => s + Number(p.valor_devido), 0);

  async function addPart() {
    if (!nome.trim() || !valor) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("company_id").eq("id", user!.id).maybeSingle();
    const { error } = await supabase.from("rateio_participants").insert({
      company_id: prof!.company_id!, group_id: group.id, nome: nome.trim(), valor_devido: Number(valor),
    });
    if (error) return toast.error(error.message);
    setNome(""); setValor(""); onChange();
  }

  async function togglePaid(p: Part) {
    const paid = Number(p.valor_pago) >= Number(p.valor_devido);
    const { error } = await supabase.from("rateio_participants").update({
      valor_pago: paid ? 0 : p.valor_devido, pago_em: paid ? null : new Date().toISOString(),
    }).eq("id", p.id);
    if (error) return toast.error(error.message);
    onChange();
  }

  async function removePart(id: string) {
    await supabase.from("rateio_participants").delete().eq("id", id);
    onChange();
  }

  async function removeGroup() {
    if (!confirm("Excluir o grupo e todos os participantes?")) return;
    await supabase.from("rateio_groups").delete().eq("id", group.id);
    onChange();
  }

  function shareWhatsApp(p: Part) {
    const txt = `Olá ${p.nome}! Sua parte do "${group.titulo}" é ${brl(Number(p.valor_devido))}.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, "_blank");
  }

  return (
    <Card className="p-4 shadow-card">
      <div className="flex justify-between items-start mb-2">
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{group.titulo}</h3>
          {group.descricao && <p className="text-xs text-muted-foreground">{group.descricao}</p>}
          <p className="text-xs text-muted-foreground mt-1">Total: <span className="font-medium">{brl(group.valor_total)}</span> · Devido: {brl(totalDevido)} · Pago: <span className="text-emerald-600">{brl(totalPago)}</span></p>
        </div>
        <Button variant="ghost" size="sm" onClick={removeGroup}><Trash2 className="h-4 w-4" /></Button>
      </div>

      <div className="space-y-1.5 mt-3">
        {parts.length === 0 && <p className="text-xs text-muted-foreground">Sem participantes ainda.</p>}
        {parts.map((p) => {
          const paid = Number(p.valor_pago) >= Number(p.valor_devido) && Number(p.valor_devido) > 0;
          return (
            <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded border bg-muted/30">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{p.nome}</div>
                <div className="text-xs text-muted-foreground">{brl(p.valor_devido)} {paid && p.pago_em && <>· pago em {formatDateTime(p.pago_em)}</>}</div>
              </div>
              {paid && <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">Pago</Badge>}
              <Button size="sm" variant="ghost" onClick={() => shareWhatsApp(p)} title="WhatsApp">WA</Button>
              <Button size="sm" variant="ghost" onClick={() => togglePaid(p)} title={paid ? "Marcar como não pago" : "Marcar como pago"}>{paid ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}</Button>
              <Button size="sm" variant="ghost" onClick={() => removePart(p.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-[1fr_120px_auto] gap-2 mt-3">
        <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Input type="number" step="0.01" placeholder="Valor" value={valor} onChange={(e) => setValor(e.target.value)} />
        <Button onClick={addPart}><Plus className="h-4 w-4" /></Button>
      </div>
    </Card>
  );
}

function NewGroupDialog({ onClose }: { onClose: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!titulo.trim()) return toast.error("Informe o título");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("company_id").eq("id", user!.id).maybeSingle();
    const { error } = await supabase.from("rateio_groups").insert({
      company_id: prof!.company_id!, titulo: titulo.trim(), descricao: descricao || null,
      valor_total: Number(valor || 0), created_by: user!.id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Grupo criado");
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo grupo de rateio</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Churrasco da firma" /></div>
          <div><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
          <div><Label>Valor total (opcional)</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Criar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
