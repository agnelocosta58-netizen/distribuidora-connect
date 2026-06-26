import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader, EmptyState } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PasswordInput } from "@/components/password-input";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Banknote, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/integracoes-bancarias")({ component: IntegracoesPage });

type Integ = {
  id: string;
  nome: string;
  provider: string;
  access_token: string | null;
  api_key: string | null;
  public_key: string | null;
  client_id: string | null;
  client_secret: string | null;
  webhook_secret: string | null;
  ambiente: "producao" | "sandbox";
  ativo: boolean;
};

function IntegracoesPage() {
  const auth = useAuth();
  const [items, setItems] = useState<Integ[]>([]);
  const [editing, setEditing] = useState<Integ | null>(null);
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    const { data } = await supabase.from("bank_integrations").select("*").order("created_at", { ascending: false });
    setItems((data as any) ?? []);
  }
  useEffect(() => { void load(); }, []);

  async function toggleActive(it: Integ) {
    const { error } = await supabase.from("bank_integrations").update({ ativo: !it.ativo }).eq("id", it.id);
    if (error) return toast.error(error.message);
    load();
  }
  async function remove(id: string) {
    if (!confirm("Excluir integração?")) return;
    const { error } = await supabase.from("bank_integrations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Integração removida"); load();
  }

  if (!auth.loading && !auth.roles.includes("admin")) {
    return (
      <PageContainer>
        <PageHeader title="Integrações bancárias" subtitle="Configurações financeiras" />
        <EmptyState title="Acesso restrito" description="Apenas administradores podem gerenciar integrações bancárias." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Integrações bancárias"
        subtitle="Credenciais das APIs financeiras para confirmação automática de pagamentos"
        actions={<Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-1" /> Nova integração</Button>}
      />

      <Card className="p-3 mb-4 border-emerald-200 bg-emerald-50 text-emerald-900 text-sm flex items-start gap-2">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          Suporte inicial: <b>Mercado Pago</b>. Cadastre o <b>Access Token</b> da sua conta e (opcional) o <b>Webhook Secret</b> para validar as notificações. Configure no painel do Mercado Pago a URL <code className="font-mono text-xs">/api/public/webhooks/pix</code> deste app.
        </div>
      </Card>

      {items.length === 0 ? (
        <EmptyState
          title="Nenhuma integração cadastrada"
          description="Cadastre as credenciais da API bancária para receber pagamentos."
          action={<Button onClick={() => setOpenNew(true)}>Cadastrar agora</Button>}
        />
      ) : (
        <Card className="shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Provedor</TableHead>
                <TableHead>Ambiente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.nome}</TableCell>
                  <TableCell className="capitalize">{it.provider.replace("_", " ")}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={it.ambiente === "producao" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-amber-200 text-amber-700 bg-amber-50"}>
                      {it.ambiente === "producao" ? "Produção" : "Sandbox"}
                    </Badge>
                  </TableCell>
                  <TableCell><Switch checked={it.ativo} onCheckedChange={() => toggleActive(it)} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(it)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(it.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {(openNew || editing) && (
        <IntegrationDialog
          item={editing}
          onClose={() => { setOpenNew(false); setEditing(null); load(); }}
        />
      )}
    </PageContainer>
  );
}

function IntegrationDialog({ item, onClose }: { item: Integ | null; onClose: () => void }) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    nome: item?.nome ?? "Mercado Pago",
    provider: item?.provider ?? "mercado_pago",
    access_token: item?.access_token ?? "",
    api_key: item?.api_key ?? "",
    public_key: item?.public_key ?? "",
    client_id: item?.client_id ?? "",
    client_secret: item?.client_secret ?? "",
    webhook_secret: item?.webhook_secret ?? "",
    ambiente: (item?.ambiente ?? "producao") as "producao" | "sandbox",
    ativo: item?.ativo ?? true,
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.nome.trim()) return toast.error("Informe o nome do banco");
    if (!form.access_token.trim() && !form.api_key.trim()) return toast.error("Informe ao menos um Access Token ou API Key");

    setSaving(true);
    try {
      if (isEdit) {
        const { error } = await supabase.from("bank_integrations").update(form).eq("id", item!.id);
        if (error) throw error;
        toast.success("Integração atualizada");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from("profiles").select("company_id").eq("id", user!.id).maybeSingle();
        const { error } = await supabase.from("bank_integrations").insert({ ...form, company_id: prof!.company_id });
        if (error) throw error;
        toast.success("Integração cadastrada");
      }
      onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Editar integração" : "Nova integração bancária"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome do banco *</Label>
              <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Mercado Pago" />
            </div>
            <div>
              <Label>Provedor</Label>
              <Select value={form.provider} onValueChange={(v) => set("provider", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mercado_pago">Mercado Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Access Token *</Label>
            <PasswordInput value={form.access_token} onChange={(e) => set("access_token", e.target.value)} placeholder="APP_USR-..." />
            <p className="text-xs text-muted-foreground mt-1">Mercado Pago → Suas integrações → Credenciais de produção.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>API Key</Label>
              <PasswordInput value={form.api_key} onChange={(e) => set("api_key", e.target.value)} />
            </div>
            <div>
              <Label>Public Key</Label>
              <Input value={form.public_key} onChange={(e) => set("public_key", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Client ID</Label>
              <Input value={form.client_id} onChange={(e) => set("client_id", e.target.value)} />
            </div>
            <div>
              <Label>Client Secret</Label>
              <PasswordInput value={form.client_secret} onChange={(e) => set("client_secret", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Webhook Secret</Label>
            <PasswordInput value={form.webhook_secret} onChange={(e) => set("webhook_secret", e.target.value)} placeholder="Assinatura para validar notificações" />
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <Label>Ambiente</Label>
              <Select value={form.ambiente} onValueChange={(v: any) => set("ambiente", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="producao">Produção</SelectItem>
                  <SelectItem value="sandbox">Sandbox (testes)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => set("ativo", v)} />
              <Label className="!m-0">{form.ativo ? "Ativo" : "Inativo"}</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
