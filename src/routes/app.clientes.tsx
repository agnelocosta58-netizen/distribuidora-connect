import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Edit, Trash2, Phone, MapPin } from "lucide-react";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/clientes")({ component: ClientesPage });

function ClientesPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", auth.company?.id],
    enabled: !!auth.company?.id,
    queryFn: async () => (await supabase.from("customers").select("*").order("nome")).data ?? [],
  });

  const filtered = (customers as any[]).filter((c) =>
    c.nome.toLowerCase().includes(q.toLowerCase()) ||
    (c.cpf_cnpj ?? "").includes(q) || (c.telefone ?? "").includes(q),
  );

  async function remove(id: string) {
    if (!confirm("Excluir cliente?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["customers"] });
  }

  return (
    <PageContainer>
      <PageHeader title="Clientes" subtitle={`${customers.length} cadastrados`}
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Novo</Button>}
      />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome, CPF/CNPJ ou telefone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <Card className="shadow-card"><EmptyState title="Nenhum cliente" description="Cadastre seu primeiro cliente." /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((c) => (
            <Card key={c.id} className="p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{c.nome}</div>
                  {c.cpf_cnpj && <div className="text-xs text-muted-foreground">{c.cpf_cnpj}</div>}
                  {c.telefone && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Phone className="h-3 w-3" />{c.telefone}</div>}
                  {(c.endereco || c.bairro || c.cidade) && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{[c.endereco, c.bairro, c.cidade].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              {Number(c.limite_credito) > 0 && (
                <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                  Limite de crédito: <span className="font-semibold text-foreground">{brl(c.limite_credito)}</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <CustomerDialog open={open} onOpenChange={setOpen} editing={editing} companyId={auth.company?.id ?? ""}
        onSaved={() => qc.invalidateQueries({ queryKey: ["customers"] })} />
    </PageContainer>
  );
}

function CustomerDialog({ open, onOpenChange, editing, companyId, onSaved }: any) {
  const empty = { nome: "", cpf_cnpj: "", telefone: "", endereco: "", cidade: "", bairro: "", limite_credito: 0, observacoes: "" };
  const [form, setForm] = useState<any>(empty);
  if (open && editing && form.nome === "") setForm({ ...empty, ...editing });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, company_id: companyId, limite_credito: Number(form.limite_credito) };
    const { error } = editing
      ? await supabase.from("customers").update(payload).eq("id", editing.id)
      : await supabase.from("customers").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    onSaved(); onOpenChange(false); setForm(empty);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setForm(empty); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5"><Label>Nome *</Label><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>CPF / CNPJ</Label><Input value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Endereço</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Bairro</Label><Input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Limite de crédito</Label><Input type="number" step="0.01" value={form.limite_credito} onChange={(e) => setForm({ ...form, limite_credito: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Observações</Label><Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
