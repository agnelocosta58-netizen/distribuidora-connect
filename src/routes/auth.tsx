import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Beer, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Entrar — Distribuidora" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-card">
            <Beer className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Distribuidora</h1>
            <p className="text-xs text-muted-foreground">Sistema de gestão</p>
          </div>
        </div>

        <Card className="p-6 shadow-elevated">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="login"><LoginForm loading={loading} setLoading={setLoading} /></TabsContent>
            <TabsContent value="signup"><SignupForm loading={loading} setLoading={setLoading} /></TabsContent>
          </Tabs>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Acesso interno da distribuidora
        </p>
      </div>
    </div>
  );
}

function LoginForm({ loading, setLoading }: { loading: boolean; setLoading: (b: boolean) => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return toast.error("Falha ao entrar", { description: error.message });
    toast.success("Bem-vindo!");
    navigate({ to: "/app" });
  }

  async function recuperar() {
    if (!email.trim()) return toast.error("Informe o e-mail primeiro");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("E-mail de recuperação enviado");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button type="button" onClick={recuperar} className="text-xs text-primary hover:underline">Esqueci minha senha</button>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Entrar
      </Button>
    </form>
  );
}

function SignupForm({ loading, setLoading }: { loading: boolean; setLoading: (b: boolean) => void }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nome: "", email: "", password: "", telefone: "",
    company_nome: "", company_cnpj: "", company_telefone: "",
    company_endereco: "", company_cidade: "", company_estado: "", company_cep: "",
  });
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) return toast.error("Senha precisa ter ao menos 6 caracteres");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          nome: form.nome, telefone: form.telefone,
          company_nome: form.company_nome, company_cnpj: form.company_cnpj,
          company_telefone: form.company_telefone, company_endereco: form.company_endereco,
          company_cidade: form.company_cidade, company_estado: form.company_estado,
          company_cep: form.company_cep,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error("Falha ao cadastrar", { description: error.message });
    toast.success("Conta criada!", { description: "Você já pode entrar." });
    navigate({ to: "/app" });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="text-sm font-semibold text-foreground">Dados da empresa</div>
      <div className="space-y-2">
        <Label>Nome da empresa *</Label>
        <Input required value={form.company_nome} onChange={(e) => set("company_nome", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>CNPJ</Label><Input value={form.company_cnpj} onChange={(e) => set("company_cnpj", e.target.value)} /></div>
        <div className="space-y-2"><Label>Telefone</Label><Input value={form.company_telefone} onChange={(e) => set("company_telefone", e.target.value)} /></div>
      </div>
      <div className="space-y-2"><Label>Endereço</Label><Input value={form.company_endereco} onChange={(e) => set("company_endereco", e.target.value)} /></div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2 col-span-2"><Label>Cidade</Label><Input value={form.company_cidade} onChange={(e) => set("company_cidade", e.target.value)} /></div>
        <div className="space-y-2"><Label>UF</Label><Input maxLength={2} value={form.company_estado} onChange={(e) => set("company_estado", e.target.value.toUpperCase())} /></div>
      </div>
      <div className="space-y-2"><Label>CEP</Label><Input value={form.company_cep} onChange={(e) => set("company_cep", e.target.value)} /></div>

      <div className="text-sm font-semibold text-foreground pt-2 border-t">Seus dados (administrador)</div>
      <div className="space-y-2"><Label>Seu nome *</Label><Input required value={form.nome} onChange={(e) => set("nome", e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>E-mail *</Label><Input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
        <div className="space-y-2"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} /></div>
      </div>
      <div className="space-y-2"><Label>Senha *</Label><Input type="password" required minLength={6} value={form.password} onChange={(e) => set("password", e.target.value)} /></div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar conta
      </Button>
    </form>
  );
}
