import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader, EmptyState } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2, Star, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/app/pix")({ component: PixPage });

type Key = { id: string; tipo: string; chave: string; banco: string | null; titular: string | null; padrao: boolean; ativa: boolean };
type Tx = { id: string; sale_id: string | null; valor: number; status: string; txid: string | null; pago_em: string | null; created_at: string; provider: string | null };

function PixPage() {
  const [keys, setKeys] = useState<Key[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    const [{ data: k }, { data: t }] = await Promise.all([
      supabase.from("pix_keys").select("*").order("padrao", { ascending: false }),
      supabase.from("pix_transactions").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setKeys((k as any) ?? []); setTxs((t as any) ?? []);
  }
  useEffect(() => { void load(); }, []);

  async function setDefault(id: string) {
    await supabase.from("pix_keys").update({ padrao: false }).neq("id", id);
    await supabase.from("pix_keys").update({ padrao: true }).eq("id", id);
    toast.success("Chave padrão definida"); load();
  }
  async function toggleActive(k: Key) {
    await supabase.from("pix_keys").update({ ativa: !k.ativa }).eq("id", k.id); load();
  }
  async function remove(id: string) {
    if (!confirm("Excluir chave?")) return;
    await supabase.from("pix_keys").delete().eq("id", id); load();
  }

  return (
    <PageContainer>
      <PageHeader title="Pix" subtitle="Chaves, recebimentos e confirmações" actions={<Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-1" /> Nova chave</Button>} />

      <Card className="p-3 mb-4 border-amber-200 bg-amber-50 text-amber-900 text-sm flex items-start gap-2">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <b>Confirmação automática em tempo real</b> requer um provedor Pix (Mercado Pago, Asaas ou Efí). Quando você escolher, configuramos o webhook e o QR dinâmico. Por enquanto, é possível cadastrar chaves, gerar QR estático no PDV e marcar pagamentos manualmente.
        </div>
      </Card>

      <Tabs defaultValue="keys">
        <TabsList>
          <TabsTrigger value="keys">Chaves</TabsTrigger>
          <TabsTrigger value="tx">Transações</TabsTrigger>
        </TabsList>
        <TabsContent value="keys" className="mt-4">
          {keys.length === 0 ? (
            <EmptyState title="Sem chaves cadastradas" description="Adicione a primeira chave Pix para recebimentos." action={<Button onClick={() => setOpenNew(true)}>Adicionar</Button>} />
          ) : (
            <Card className="shadow-card overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead>Chave</TableHead><TableHead>Tipo</TableHead><TableHead>Banco</TableHead><TableHead>Titular</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {keys.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-mono text-sm">{k.chave}{k.padrao && <Badge className="ml-2 bg-amber-500/15 text-amber-700 border-amber-200"><Star className="h-3 w-3 mr-1" />Padrão</Badge>}</TableCell>
                      <TableCell className="capitalize">{k.tipo}</TableCell>
                      <TableCell>{k.banco ?? "—"}</TableCell>
                      <TableCell>{k.titular ?? "—"}</TableCell>
                      <TableCell><Switch checked={k.ativa} onCheckedChange={() => toggleActive(k)} /></TableCell>
                      <TableCell className="text-right">
                        {!k.padrao && <Button variant="ghost" size="sm" onClick={() => setDefault(k.id)}>Definir padrão</Button>}
                        <Button variant="ghost" size="sm" onClick={() => remove(k.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="tx" className="mt-4">
          <Card className="shadow-card overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Venda</TableHead><TableHead>TXID</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Status</TableHead><TableHead>Pago em</TableHead></TableRow></TableHeader>
              <TableBody>
                {txs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhuma transação ainda.</TableCell></TableRow>}
                {txs.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{formatDateTime(t.created_at)}</TableCell>
                    <TableCell className="font-mono text-xs">{t.sale_id?.slice(0, 8) ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{t.txid ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(t.valor)}</TableCell>
                    <TableCell><StatusBadge s={t.status} /></TableCell>
                    <TableCell className="text-xs">{formatDateTime(t.pago_em)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
      {openNew && <NewKeyDialog onClose={() => { setOpenNew(false); load(); }} />}
    </PageContainer>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    pago: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
    pendente: "bg-amber-500/15 text-amber-700 border-amber-200",
    cancelado: "bg-muted text-muted-foreground",
    expirado: "bg-muted text-muted-foreground",
  };
  return <Badge variant="outline" className={map[s] ?? ""}>{s}</Badge>;
}

function NewKeyDialog({ onClose }: { onClose: () => void }) {
  const [tipo, setTipo] = useState<"cpf" | "cnpj" | "email" | "telefone" | "aleatoria">("cpf");
  const [chave, setChave] = useState("");
  const [banco, setBanco] = useState("");
  const [titular, setTitular] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!chave.trim()) return toast.error("Informe a chave");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("company_id").eq("id", user!.id).maybeSingle();
    const { count } = await supabase.from("pix_keys").select("id", { count: "exact", head: true });
    const { error } = await supabase.from("pix_keys").insert({
      company_id: prof!.company_id, tipo, chave: chave.trim(),
      banco: banco || null, titular: titular || null, padrao: !count, ativa: true,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Chave adicionada"); onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova chave Pix</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="telefone">Telefone</SelectItem>
                <SelectItem value="aleatoria">Aleatória</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Chave</Label><Input value={chave} onChange={(e) => setChave(e.target.value)} /></div>
          <div><Label>Banco</Label><Input value={banco} onChange={(e) => setBanco(e.target.value)} /></div>
          <div><Label>Titular</Label><Input value={titular} onChange={(e) => setTitular(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
