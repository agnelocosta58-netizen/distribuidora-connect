import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/configuracoes")({ component: ConfigPage });

function ConfigPage() {
  const auth = useAuth();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (auth.company) setForm(auth.company);
  }, [auth.company]);

  async function save() {
    if (!auth.company?.id) return;
    setSaving(true);
    const { error } = await supabase.from("companies").update({
      nome: form.nome, cnpj: form.cnpj, telefone: form.telefone, email: form.email, pix_chave: form.pix_chave,
    }).eq("id", auth.company.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
  }

  return (
    <PageContainer>
      <PageHeader title="Configurações" subtitle="Dados da sua empresa" />
      <Card className="p-5 shadow-card max-w-2xl space-y-3">
        <div className="space-y-1.5"><Label>Nome da empresa</Label><Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>CNPJ</Label><Input value={form.cnpj ?? ""} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Telefone</Label><Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5"><Label>E-mail</Label><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="space-y-1.5">
          <Label>Chave Pix</Label>
          <Input value={form.pix_chave ?? ""} onChange={(e) => setForm({ ...form, pix_chave: e.target.value })} placeholder="CPF, e-mail, telefone ou chave aleatória" />
          <p className="text-xs text-muted-foreground">Usada no PDV para exibir os dados de pagamento via Pix.</p>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
      </Card>
    </PageContainer>
  );
}
