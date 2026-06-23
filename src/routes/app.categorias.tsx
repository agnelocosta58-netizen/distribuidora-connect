import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/categorias")({ component: CategoriasPage });

function CategoriasPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [openCat, setOpenCat] = useState(false);
  const [openBrand, setOpenBrand] = useState(false);
  const [openSup, setOpenSup] = useState(false);

  const cats = useQuery({ queryKey: ["categories", auth.company?.id], enabled: !!auth.company?.id,
    queryFn: async () => (await supabase.from("categories").select("*").order("nome")).data ?? [] });
  const brands = useQuery({ queryKey: ["brands", auth.company?.id], enabled: !!auth.company?.id,
    queryFn: async () => (await supabase.from("brands").select("*").order("nome")).data ?? [] });
  const sups = useQuery({ queryKey: ["suppliers", auth.company?.id], enabled: !!auth.company?.id,
    queryFn: async () => (await supabase.from("suppliers").select("*").order("nome")).data ?? [] });

  async function del(table: string, id: string, key: string) {
    if (!confirm("Excluir?")) return;
    const { error } = await (supabase.from as any)(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: [key] });
  }

  return (
    <PageContainer>
      <PageHeader title="Categorias, marcas & fornecedores" subtitle="Organize seu catálogo" />
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Categorias</h3>
            <Button size="sm" onClick={() => setOpenCat(true)}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-1.5">
            {(cats.data ?? []).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c.cor }} />{c.nome}</div>
                <button onClick={() => del("categories", c.id, "categories")}><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Marcas</h3>
            <Button size="sm" onClick={() => setOpenBrand(true)}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-1.5">
            {(brands.data ?? []).map((b: any) => (
              <div key={b.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                <span>{b.nome}</span>
                <button onClick={() => del("brands", b.id, "brands")}><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Fornecedores</h3>
            <Button size="sm" onClick={() => setOpenSup(true)}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-1.5">
            {(sups.data ?? []).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                <div className="min-w-0">
                  <div className="truncate">{s.nome}</div>
                  {s.telefone && <div className="text-xs text-muted-foreground">{s.telefone}</div>}
                </div>
                <button onClick={() => del("suppliers", s.id, "suppliers")}><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <SimpleDialog open={openCat} onClose={() => setOpenCat(false)} title="Nova categoria"
        fields={[{ key: "nome", label: "Nome", required: true }, { key: "cor", label: "Cor (hex)", default: "#64748B" }]}
        onSubmit={async (v: any) => { const { error } = await supabase.from("categories").insert({ ...v, company_id: auth.company?.id }); if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["categories"] }); }} />

      <SimpleDialog open={openBrand} onClose={() => setOpenBrand(false)} title="Nova marca"
        fields={[{ key: "nome", label: "Nome", required: true }]}
        onSubmit={async (v: any) => { const { error } = await supabase.from("brands").insert({ ...v, company_id: auth.company?.id }); if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["brands"] }); }} />

      <SimpleDialog open={openSup} onClose={() => setOpenSup(false)} title="Novo fornecedor"
        fields={[
          { key: "nome", label: "Nome", required: true },
          { key: "cnpj", label: "CNPJ" }, { key: "telefone", label: "Telefone" },
          { key: "email", label: "E-mail" }, { key: "endereco", label: "Endereço" },
        ]}
        onSubmit={async (v: any) => { const { error } = await supabase.from("suppliers").insert({ ...v, company_id: auth.company?.id }); if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["suppliers"] }); }} />
    </PageContainer>
  );
}

function SimpleDialog({ open, onClose, title, fields, onSubmit }: any) {
  const init = Object.fromEntries(fields.map((f: any) => [f.key, f.default ?? ""]));
  const [form, setForm] = useState<any>(init);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(form);
    toast.success("Salvo");
    setForm(init); onClose();
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && (setForm(init), onClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {fields.map((f: any) => (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}{f.required && " *"}</Label>
              <Input required={f.required} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            </div>
          ))}
          <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
