import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader, EmptyState } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Lock, Unlock, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { inviteUser, setUserActive, updateUser, deleteUser, resetUserPassword } from "@/lib/users.functions";

export const Route = createFileRoute("/app/vendedores")({ component: VendedoresPage });

function VendedoresPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [pwUser, setPwUser] = useState<any | null>(null);

  const inviteFn = useServerFn(inviteUser);
  const updateFn = useServerFn(updateUser);
  const setActiveFn = useServerFn(setUserActive);
  const deleteFn = useServerFn(deleteUser);
  const resetPwFn = useServerFn(resetUserPassword);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["company-users", auth.company?.id],
    enabled: !!auth.company?.id,
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles").select("id, nome, email, telefone, cpf, ativo, created_at")
        .eq("company_id", auth.company!.id).order("nome");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").eq("company_id", auth.company!.id);
      const byUser: Record<string, string[]> = {};
      (roles ?? []).forEach((r: any) => { byUser[r.user_id] ??= []; byUser[r.user_id].push(r.role); });
      return (profiles ?? []).map((p: any) => ({ ...p, roles: byUser[p.id] ?? [] }));
    },
  });

  async function toggleActive(u: any) {
    try { await setActiveFn({ data: { userId: u.id, ativo: !u.ativo } }); toast.success(u.ativo ? "Usuário bloqueado" : "Usuário reativado"); qc.invalidateQueries({ queryKey: ["company-users"] }); }
    catch (e: any) { toast.error(e.message); }
  }

  async function remove(u: any) {
    if (!confirm(`Excluir ${u.nome}? Esta ação não pode ser desfeita.`)) return;
    try { await deleteFn({ data: { userId: u.id } }); toast.success("Usuário excluído"); qc.invalidateQueries({ queryKey: ["company-users"] }); }
    catch (e: any) { toast.error(e.message); }
  }

  if (!auth.isAdmin) {
    return (
      <PageContainer>
        <PageHeader title="Vendedores" />
        <Card className="p-6"><EmptyState title="Acesso restrito" description="Apenas administradores podem gerenciar vendedores." /></Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Vendedores e Equipe"
        subtitle={`${users.length} usuário(s) cadastrado(s)`}
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Novo</Button>}
      />

      {isLoading ? <Card className="p-6 text-sm text-muted-foreground">Carregando…</Card> : users.length === 0 ? (
        <Card><EmptyState title="Nenhum usuário ainda" description="Cadastre seus vendedores para começarem a operar o PDV." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Novo vendedor</Button>} /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {(users as any[]).map((u) => (
            <Card key={u.id} className={`p-4 shadow-card ${!u.ativo ? "opacity-60" : ""}`}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{u.nome}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.telefone ?? "—"} {u.cpf ? `• CPF ${u.cpf}` : ""}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {u.roles.map((r: string) => <Badge key={r} variant="secondary" className="capitalize">{r}</Badge>)}
                    {!u.ativo && <Badge variant="destructive">Bloqueado</Badge>}
                    {u.id === auth.user?.id && <Badge>Você</Badge>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(u); setOpen(true); }} title="Editar"><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setPwUser(u)} title="Alterar senha"><KeyRound className="h-4 w-4" /></Button>
                  {u.id !== auth.user?.id && (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => toggleActive(u)} title={u.ativo ? "Bloquear" : "Reativar"}>
                        {u.ativo ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(u)} title="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <UserDialog
        open={open}
        onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}
        editing={editing}
        onSubmit={async (form) => {
          try {
            if (editing) {
              await updateFn({ data: { userId: editing.id, nome: form.nome, telefone: form.telefone, cpf: form.cpf, role: form.role } });
              toast.success("Usuário atualizado");
            } else {
              await inviteFn({ data: form });
              toast.success("Vendedor cadastrado");
            }
            qc.invalidateQueries({ queryKey: ["company-users"] });
            return true;
          } catch (e: any) { toast.error(e.message ?? "Erro"); return false; }
        }}
      />

      <PasswordDialog
        user={pwUser}
        onClose={() => setPwUser(null)}
        onSubmit={async (senha) => {
          try { await resetPwFn({ data: { userId: pwUser.id, senha } }); toast.success("Senha alterada"); return true; }
          catch (e: any) { toast.error(e.message); return false; }
        }}
      />
    </PageContainer>
  );
}

function UserDialog({ open, onOpenChange, editing, onSubmit }: any) {
  const empty = { nome: "", email: "", telefone: "", cpf: "", senha: "", role: "vendedor" as const };
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);

  // reset form when dialog opens
  if (open && form === empty && editing) setForm({ ...empty, ...editing, senha: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok) { setForm(empty); onOpenChange(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setForm(empty); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Editar usuário" : "Novo vendedor"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5"><Label>Nome completo *</Label><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div className="col-span-2 space-y-1.5"><Label>E-mail *</Label><Input required type="email" disabled={!!editing} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Telefone</Label><Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>CPF</Label><Input value={form.cpf ?? ""} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
          {!editing && (
            <div className="col-span-2 space-y-1.5"><Label>Senha inicial *</Label><Input required type="text" minLength={6} value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} placeholder="Mínimo 6 caracteres" /></div>
          )}
          <div className="col-span-2 space-y-1.5">
            <Label>Perfil de acesso</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vendedor">Vendedor (PDV)</SelectItem>
                <SelectItem value="gerente">Gerente (PDV + estoque + financeiro)</SelectItem>
                <SelectItem value="admin">Administrador (acesso total)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="col-span-2"><Button type="submit" disabled={saving}>{saving ? "Salvando…" : editing ? "Salvar" : "Cadastrar"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({ user, onClose, onSubmit }: any) {
  const [senha, setSenha] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit(senha);
    setSaving(false);
    if (ok) { setSenha(""); onClose(); }
  }
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Alterar senha — {user?.nome}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5"><Label>Nova senha</Label><Input required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
          <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
