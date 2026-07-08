import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/configuracoes")({ component: ConfigPage });

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

function ConfigPage() {
  const auth = useAuth();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!auth.company?.id) return;
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", auth.company.id)
        .maybeSingle();
      if (error) toast.error(error.message);
      else setForm(data ?? {});
      setLoading(false);
    }
    load();
  }, [auth.company?.id]);

  function set(key: string, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (!auth.company?.id) return;
    setSaving(true);
    const payload = {
      nome: form.nome,
      razao_social: form.razao_social,
      nome_fantasia: form.nome_fantasia,
      cnpj: form.cnpj,
      inscricao_estadual: form.inscricao_estadual,
      inscricao_municipal: form.inscricao_municipal,
      regime_tributario: form.regime_tributario,
      responsavel: form.responsavel,
      email: form.email,
      telefone: form.telefone,
      whatsapp: form.whatsapp,
      site: form.site,
      cep: form.cep,
      endereco: form.endereco,
      numero: form.numero,
      complemento: form.complemento,
      bairro: form.bairro,
      cidade: form.cidade,
      estado: form.estado,
      pix_chave: form.pix_chave,
    };
    const { error } = await supabase.from("companies").update(payload).eq("id", auth.company.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
  }

  async function buscarCep() {
    const cep = (form.cep ?? "").replace(/\D/g, "");
    if (cep.length !== 8) return toast.error("CEP inválido");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) return toast.error("CEP não encontrado");
      setForm((f: any) => ({
        ...f,
        endereco: data.logradouro || f.endereco,
        bairro: data.bairro || f.bairro,
        cidade: data.localidade || f.cidade,
        estado: data.uf || f.estado,
      }));
      toast.success("Endereço preenchido");
    } catch {
      toast.error("Falha ao consultar CEP");
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="Configurações" subtitle="Dados da sua empresa" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Configurações" subtitle="Dados da sua empresa" />

      <div className="max-w-3xl space-y-5">
        <Card className="p-5 shadow-card space-y-4">
          <h3 className="font-semibold">Identificação</h3>
          <div className="space-y-1.5">
            <Label>Nome fantasia *</Label>
            <Input value={form.nome ?? ""} onChange={(e) => set("nome", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Razão social</Label>
            <Input value={form.razao_social ?? ""} onChange={(e) => set("razao_social", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input value={form.cnpj ?? ""} onChange={(e) => set("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-1.5">
              <Label>Regime tributário</Label>
              <Select value={form.regime_tributario ?? ""} onValueChange={(v) => set("regime_tributario", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mei">MEI</SelectItem>
                  <SelectItem value="simples">Simples Nacional</SelectItem>
                  <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                  <SelectItem value="lucro_real">Lucro Real</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Inscrição estadual</Label>
              <Input value={form.inscricao_estadual ?? ""} onChange={(e) => set("inscricao_estadual", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Inscrição municipal</Label>
              <Input value={form.inscricao_municipal ?? ""} onChange={(e) => set("inscricao_municipal", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Input value={form.responsavel ?? ""} onChange={(e) => set("responsavel", e.target.value)} placeholder="Nome do proprietário/responsável" />
          </div>
        </Card>

        <Card className="p-5 shadow-card space-y-4">
          <h3 className="font-semibold">Contato</h3>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Site</Label>
            <Input value={form.site ?? ""} onChange={(e) => set("site", e.target.value)} placeholder="https://" />
          </div>
        </Card>

        <Card className="p-5 shadow-card space-y-4">
          <h3 className="font-semibold">Endereço</h3>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="space-y-1.5">
              <Label>CEP</Label>
              <Input value={form.cep ?? ""} onChange={(e) => set("cep", e.target.value)} placeholder="00000-000" />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="secondary" onClick={buscarCep}>Buscar</Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Endereço</Label>
            <Input value={form.endereco ?? ""} onChange={(e) => set("endereco", e.target.value)} placeholder="Rua, avenida..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input value={form.numero ?? ""} onChange={(e) => set("numero", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Complemento</Label>
              <Input value={form.complemento ?? ""} onChange={(e) => set("complemento", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Bairro</Label>
            <Input value={form.bairro ?? ""} onChange={(e) => set("bairro", e.target.value)} />
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={form.cidade ?? ""} onChange={(e) => set("cidade", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <Select value={form.estado ?? ""} onValueChange={(v) => set("estado", v)}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>
                  {UFS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-5 shadow-card space-y-4">
          <h3 className="font-semibold">Pagamento</h3>
          <div className="space-y-1.5">
            <Label>Chave Pix</Label>
            <Input value={form.pix_chave ?? ""} onChange={(e) => set("pix_chave", e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" />
            <p className="text-xs text-muted-foreground">Usada no PDV para exibir os dados de pagamento via Pix.</p>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} size="lg">
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
