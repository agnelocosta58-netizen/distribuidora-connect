import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, AlertTriangle, PackagePlus, Layers, Snowflake, Flame, FileSpreadsheet, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { BarcodeInput } from "@/components/barcode-scanner";
import { ProductImagePicker } from "@/components/product-image-picker";
import { brl, num } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/produtos")({
  component: ProdutosPage,
});

function ProdutosPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);
  const [importingXml, setImportingXml] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const xmlRef = useRef<HTMLInputElement>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["products", auth.company?.id],
    enabled: !!auth.company?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(nome, cor), brands(nome)")
        .order("nome");
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", auth.company?.id],
    enabled: !!auth.company?.id,
    queryFn: async () => (await supabase.from("categories").select("*").order("nome")).data ?? [],
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands", auth.company?.id],
    enabled: !!auth.company?.id,
    queryFn: async () => (await supabase.from("brands").select("*").order("nome")).data ?? [],
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", auth.company?.id],
    enabled: !!auth.company?.id,
    queryFn: async () => (await supabase.from("suppliers").select("*").order("nome")).data ?? [],
  });

  const filtered = (products as any[]).filter(
    (p) =>
      p.nome.toLowerCase().includes(q.toLowerCase()) ||
      (p.codigo_barras ?? "").includes(q),
  );

  async function remove(id: string) {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Produto removido");
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  function exportToExcel() {
    const rows = (filtered.length ? filtered : products).map((p: any) => ({
      Nome: p.nome,
      "Código de barras": p.codigo_barras ?? "",
      Categoria: p.categories?.nome ?? "",
      Marca: p.brands?.nome ?? "",
      Unidade: p.unidade,
      Tamanho: p.tamanho ?? "",
      Volume: p.volume ?? "",
      Estoque: Number(p.estoque ?? 0),
      "Estoque mínimo": Number(p.estoque_minimo ?? 0),
      "Preço de custo": Number(p.preco_custo ?? 0),
      "Preço de venda": Number(p.preco_venda ?? 0),
      Validade: p.validade ?? "",
      Descrição: p.descricao ?? "",
      Ativo: p.ativo ? "Sim" : "Não",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, "produtos.xlsx");
    toast.success("Planilha exportada");
  }

  function norm(s: any) {
    return String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  async function handleImportFile(file: File) {
    if (!auth.company?.id) return;
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (!rows.length) { toast.error("Planilha vazia"); return; }

      const catMap = new Map((categories as any[]).map((c) => [norm(c.nome), c.id]));
      const brandMap = new Map((brands as any[]).map((b) => [norm(b.nome), b.id]));
      const supMap = new Map((suppliers as any[]).map((s) => [norm(s.nome), s.id]));
      const prodByBarcode = new Map(
        (products as any[]).filter((p) => p.codigo_barras).map((p) => [String(p.codigo_barras), p.id]),
      );
      const prodByName = new Map((products as any[]).map((p) => [norm(p.nome), p.id]));

      const pick = (r: any, ...keys: string[]) => {
        for (const k of Object.keys(r)) {
          const nk = norm(k);
          if (keys.some((kk) => nk === norm(kk))) return r[k];
        }
        return "";
      };
      const numOr = (v: any, d = 0) => {
        const n = Number(String(v ?? "").replace(",", "."));
        return isNaN(n) ? d : n;
      };

      const newCats: string[] = [];
      const newBrands: string[] = [];
      const newSups: string[] = [];
      for (const r of rows) {
        const c = String(pick(r, "Categoria") ?? "").trim();
        if (c && !catMap.has(norm(c)) && !newCats.includes(c)) newCats.push(c);
        const b = String(pick(r, "Marca") ?? "").trim();
        if (b && !brandMap.has(norm(b)) && !newBrands.includes(b)) newBrands.push(b);
        const s = String(pick(r, "Fornecedor") ?? "").trim();
        if (s && !supMap.has(norm(s)) && !newSups.includes(s)) newSups.push(s);
      }

      if (newCats.length) {
        const { data } = await supabase.from("categories")
          .insert(newCats.map((nome) => ({ company_id: auth.company!.id, nome })))
          .select("id, nome");
        for (const c of data ?? []) catMap.set(norm(c.nome), c.id);
      }
      if (newBrands.length) {
        const { data } = await supabase.from("brands")
          .insert(newBrands.map((nome) => ({ company_id: auth.company!.id, nome })))
          .select("id, nome");
        for (const b of data ?? []) brandMap.set(norm(b.nome), b.id);
      }
      if (newSups.length) {
        const { data } = await supabase.from("suppliers")
          .insert(newSups.map((nome) => ({ company_id: auth.company!.id, nome })))
          .select("id, nome");
        for (const s of data ?? []) supMap.set(norm(s.nome), s.id);
      }

      let created = 0, updated = 0, skipped = 0;
      const errors: string[] = [];
      for (const r of rows) {
        const nome = String(pick(r, "Nome", "Produto") ?? "").trim();
        if (!nome) { skipped++; continue; }
        const codigo = String(pick(r, "Código de barras", "Codigo de barras", "Codigo", "EAN") ?? "").trim();
        const catNome = String(pick(r, "Categoria") ?? "").trim();
        const brandNome = String(pick(r, "Marca") ?? "").trim();
        const supNome = String(pick(r, "Fornecedor") ?? "").trim();
        const ativoRaw = String(pick(r, "Ativo") ?? "").trim().toLowerCase();
        const validade = String(pick(r, "Validade") ?? "").trim();

        const payload: any = {
          company_id: auth.company!.id,
          nome,
          codigo_barras: codigo || null,
          category_id: catNome ? catMap.get(norm(catNome)) ?? null : null,
          brand_id: brandNome ? brandMap.get(norm(brandNome)) ?? null : null,
          supplier_id: supNome ? supMap.get(norm(supNome)) ?? null : null,
          unidade: String(pick(r, "Unidade") ?? "un").trim() || "un",
          tamanho: String(pick(r, "Tamanho") ?? "").trim() || null,
          volume: String(pick(r, "Volume", "Volume / pack") ?? "").trim() || null,
          estoque: numOr(pick(r, "Estoque")),
          estoque_minimo: numOr(pick(r, "Estoque mínimo", "Estoque minimo")),
          preco_custo: numOr(pick(r, "Preço de custo", "Preco de custo", "Custo")),
          preco_venda: numOr(pick(r, "Preço de venda", "Preco de venda", "Venda", "Preço")),
          descricao: String(pick(r, "Descrição", "Descricao") ?? "").trim() || null,
          validade: /^\d{4}-\d{2}-\d{2}$/.test(validade) ? validade : null,
          ativo: ativoRaw ? !["nao", "não", "no", "false", "0"].includes(ativoRaw) : true,
        };

        const existingId = (codigo && prodByBarcode.get(codigo)) || prodByName.get(norm(nome));
        const res = existingId
          ? await supabase.from("products").update(payload).eq("id", existingId)
          : await supabase.from("products").insert(payload);
        if (res.error) { errors.push(`${nome}: ${res.error.message}`); continue; }
        if (existingId) updated++; else created++;
      }

      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["brands"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(`Importação concluída: ${created} criados, ${updated} atualizados${skipped ? `, ${skipped} ignorados` : ""}`);
      if (errors.length) toast.error(`${errors.length} erro(s). Primeiro: ${errors[0]}`);
    } catch (e: any) {
      toast.error("Falha ao importar: " + (e?.message ?? String(e)));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
  }

  async function handleImportXml(file: File) {
    if (!auth.company?.id) return;
    setImportingXml(true);
    try {
      const text = await file.text();
      const doc = new DOMParser().parseFromString(text, "text/xml");
      if (doc.getElementsByTagName("parsererror").length) {
        toast.error("XML inválido");
        return;
      }
      const T = (el: Element | null | undefined, tag: string) =>
        el?.getElementsByTagName(tag)?.[0]?.textContent?.trim() ?? "";

      // Supplier from <emit>
      const emit = doc.getElementsByTagName("emit")[0] ?? null;
      const supNome = T(emit, "xNome") || T(emit, "xFant");
      const supCnpj = T(emit, "CNPJ");
      const supMap = new Map((suppliers as any[]).map((s) => [norm(s.nome), s.id]));
      let supplierId: string | null = supNome ? supMap.get(norm(supNome)) ?? null : null;
      if (supNome && !supplierId) {
        const { data } = await supabase.from("suppliers")
          .insert({ company_id: auth.company!.id, nome: supNome, cnpj: supCnpj || null })
          .select("id").single();
        supplierId = data?.id ?? null;
      }

      const dets = Array.from(doc.getElementsByTagName("det"));
      if (!dets.length) { toast.error("Nenhum item encontrado no XML"); return; }

      const prodByBarcode = new Map(
        (products as any[]).filter((p) => p.codigo_barras).map((p) => [String(p.codigo_barras), p]),
      );
      const prodByName = new Map((products as any[]).map((p) => [norm(p.nome), p]));

      let created = 0, updated = 0;
      const errors: string[] = [];
      for (const det of dets) {
        const prod = det.getElementsByTagName("prod")[0];
        if (!prod) continue;
        const nome = T(prod, "xProd");
        if (!nome) continue;
        const eanRaw = T(prod, "cEAN") || T(prod, "cEANTrib");
        const codigo = eanRaw && eanRaw.toUpperCase() !== "SEM GTIN" ? eanRaw : "";
        const qCom = Number(T(prod, "qCom")) || 0;
        const vUnCom = Number(T(prod, "vUnCom")) || 0;
        const uCom = (T(prod, "uCom") || "un").toLowerCase();

        const existing = (codigo && prodByBarcode.get(codigo)) || prodByName.get(norm(nome));
        if (existing) {
          const novoEstoque = Number(existing.estoque ?? 0) + qCom;
          const upd: any = { estoque: novoEstoque };
          if (vUnCom > 0) upd.preco_custo = vUnCom;
          if (supplierId && !existing.supplier_id) upd.supplier_id = supplierId;
          if (codigo && !existing.codigo_barras) upd.codigo_barras = codigo;
          const { error } = await supabase.from("products").update(upd).eq("id", existing.id);
          if (error) { errors.push(`${nome}: ${error.message}`); continue; }
          if (qCom > 0) {
            await supabase.from("stock_movements").insert({
              company_id: auth.company!.id,
              product_id: existing.id,
              tipo: "entrada",
              quantidade: qCom,
              preco_unitario: vUnCom || null,
              observacao: `NF-e ${supNome || ""}`.trim(),
            });
          }
          updated++;
        } else {
          const payload = {
            company_id: auth.company!.id,
            nome,
            codigo_barras: codigo || null,
            supplier_id: supplierId,
            unidade: uCom || "un",
            estoque: qCom,
            estoque_minimo: 0,
            preco_custo: vUnCom,
            preco_venda: vUnCom,
            ativo: true,
          };
          const { data, error } = await supabase.from("products").insert(payload).select("id").single();
          if (error) { errors.push(`${nome}: ${error.message}`); continue; }
          if (data?.id && qCom > 0) {
            await supabase.from("stock_movements").insert({
              company_id: auth.company!.id,
              product_id: data.id,
              tipo: "entrada",
              quantidade: qCom,
              preco_unitario: vUnCom || null,
              observacao: `NF-e ${supNome || ""}`.trim(),
            });
          }
          created++;
        }
      }

      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(`NF-e importada: ${created} criados, ${updated} atualizados`);
      if (errors.length) toast.error(`${errors.length} erro(s). Primeiro: ${errors[0]}`);
    } catch (e: any) {
      toast.error("Falha ao importar XML: " + (e?.message ?? String(e)));
    } finally {
      setImportingXml(false);
      if (xmlRef.current) xmlRef.current.value = "";
    }
  }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Produtos"
        subtitle={`${filtered.length} de ${products.length} produtos`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }}
            />
            {auth.isGerente && (
              <Button variant="outline" disabled={importing} onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> {importing ? "Importando…" : "Importar Excel"}
              </Button>
            )}
            {products.length > 0 && (
              <Button variant="outline" onClick={exportToExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Exportar Excel
              </Button>
            )}
            {auth.isGerente && (
              <Button onClick={() => { setEditing(null); setOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Novo
              </Button>
            )}
          </div>
        }
      />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome ou código de barras" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <Card className="shadow-card">
          <EmptyState title="Nenhum produto" description="Cadastre seu primeiro produto para começar." />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => {
            const low = Number(p.estoque) <= Number(p.estoque_minimo);
            return (
              <Card key={p.id} className="p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{p.nome}</div>
                    <div className="text-xs text-muted-foreground flex gap-2 mt-0.5 flex-wrap">
                      {p.categories?.nome && <Badge variant="secondary">{p.categories.nome}</Badge>}
                      {p.brands?.nome && <span>{p.brands.nome}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{brl(p.preco_venda)}</div>
                    <div className="text-[11px] text-muted-foreground">custo {brl(p.preco_custo)}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div className={`flex items-center gap-1 ${low ? "text-destructive" : "text-foreground"}`}>
                    {low && <AlertTriangle className="h-3.5 w-3.5" />}
                    <span className="font-medium">{num(p.estoque, 3)}</span>
                    <span className="text-muted-foreground text-xs">{p.unidade}</span>
                  </div>
                  {auth.isGerente && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setMoveOpen(p)} title="Movimentar estoque">
                        <PackagePlus className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ProductDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        categories={categories}
        brands={brands}
        suppliers={suppliers}
        companyId={auth.company?.id ?? ""}
        onSaved={() => qc.invalidateQueries({ queryKey: ["products"] })}
      />

      <StockMoveDialog
        product={moveOpen}
        onClose={() => setMoveOpen(null)}
        companyId={auth.company?.id ?? ""}
        onSaved={() => qc.invalidateQueries({ queryKey: ["products"] })}
      />
    </PageContainer>
  );
}

function ProductDialog({ open, onOpenChange, editing, categories, brands, suppliers, companyId, onSaved }: any) {
  const isEdit = !!editing;
  const empty = {
    nome: "", codigo_barras: "", category_id: "", brand_id: "", supplier_id: "",
    unidade: "un", tamanho: "", volume: "",
    estoque: 0, estoque_minimo: 0, preco_custo: 0, preco_venda: 0,
    validade: "", descricao: "", imagem_url: "",
  };
  const [form, setForm] = useState<any>(empty);

  function reset() { setForm(editing ? { ...empty, ...editing, validade: editing.validade ?? "" } : empty); }

  // Reset when dialog opens
  if (open && form.nome === "" && editing) reset();
  if (!open && form !== empty && !editing) {/* noop */ }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { categories: _c, brands: _b, suppliers: _s, id: _id, created_at: _ca, updated_at: _ua, ...rest } = form as any;
    const payload = {
      ...rest,
      company_id: companyId,
      category_id: form.category_id || null,
      brand_id: form.brand_id || null,
      supplier_id: form.supplier_id || null,
      validade: form.validade || null,
      estoque: Number(form.estoque),
      estoque_minimo: Number(form.estoque_minimo),
      preco_custo: Number(form.preco_custo),
      preco_venda: Number(form.preco_venda),
    };
    const { error } = isEdit
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(isEdit ? "Atualizado" : "Criado");
    onSaved();
    onOpenChange(false);
    setForm(empty);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setForm(empty); else reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5"><Label>Nome *</Label><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div className="col-span-2"><Label className="mb-1.5 block">Imagem do produto</Label>
            <ProductImagePicker value={form.imagem_url || null} onChange={(url) => setForm({ ...form, imagem_url: url ?? "" })}
              productId={editing?.id ?? null} productName={form.nome} companyId={companyId} />
          </div>
          <div className="space-y-1.5"><Label>Código de barras</Label><BarcodeInput value={form.codigo_barras ?? ""} onChange={(v) => setForm({ ...form, codigo_barras: v })} /></div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={form.category_id ?? ""} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Marca</Label>
            <Select value={form.brand_id ?? ""} onValueChange={(v) => setForm({ ...form, brand_id: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{brands.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fornecedor</Label>
            <Select value={form.supplier_id ?? ""} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Unidade</Label><Input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} placeholder="un, cx, lt" /></div>
          <div className="space-y-1.5"><Label>Tamanho</Label><Input value={form.tamanho ?? ""} onChange={(e) => setForm({ ...form, tamanho: e.target.value })} placeholder="600ml" /></div>
          <div className="space-y-1.5"><Label>Volume / pack</Label><Input value={form.volume ?? ""} onChange={(e) => setForm({ ...form, volume: e.target.value })} placeholder="12un" /></div>
          <div className="space-y-1.5"><Label>Estoque</Label><Input type="number" step="0.001" value={form.estoque} onChange={(e) => setForm({ ...form, estoque: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Estoque mínimo</Label><Input type="number" step="0.001" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Preço de custo</Label><Input type="number" step="0.01" value={form.preco_custo} onChange={(e) => setForm({ ...form, preco_custo: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Preço de venda *</Label><Input required type="number" step="0.01" value={form.preco_venda} onChange={(e) => setForm({ ...form, preco_venda: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Validade</Label><Input type="date" value={form.validade ?? ""} onChange={(e) => setForm({ ...form, validade: e.target.value })} /></div>
          <div className="col-span-2 space-y-1.5"><Label>Descrição</Label><Textarea rows={2} value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
          {isEdit && (
            <div className="col-span-2 border-t pt-3 mt-1">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="h-4 w-4 text-primary" />
                <Label className="text-base">Variações (embalagem & temperatura)</Label>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Cada variação tem estoque, preço e código de barras independentes. A baixa de estoque na venda ocorre apenas na variação escolhida.</p>
              <VariantsSection productId={editing.id} companyId={companyId} />
            </div>
          )}
          <DialogFooter className="col-span-2"><Button type="submit">Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StockMoveDialog({ product, onClose, companyId, onSaved }: any) {
  const [tipo, setTipo] = useState<"entrada" | "saida" | "ajuste">("entrada");
  const [qtd, setQtd] = useState(0);
  const [obs, setObs] = useState("");

  async function save() {
    if (!product) return;
    const { error } = await supabase.from("stock_movements").insert({
      company_id: companyId, product_id: product.id, tipo, quantidade: Number(qtd), observacao: obs,
    });
    if (error) return toast.error(error.message);
    toast.success("Movimentação registrada");
    onSaved(); onClose(); setQtd(0); setObs("");
  }

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Movimentar estoque — {product?.nome}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
                <SelectItem value="ajuste">Ajuste (define estoque)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Quantidade</Label><Input type="number" step="0.001" value={qtd} onChange={(e) => setQtd(Number(e.target.value))} /></div>
          <div className="space-y-1.5"><Label>Observação</Label><Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={save}>Registrar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Variant = {
  id?: string;
  product_id?: string;
  company_id?: string;
  tipo: "unidade" | "fardo" | "caixa";
  temperatura: "quente" | "gelado";
  unidades_por_pacote?: number;
  codigo_barras?: string | null;
  estoque?: number;
  estoque_minimo?: number;
  preco_custo?: number;
  preco_venda?: number;
  ativo?: boolean;
};

function VariantsSection({ productId, companyId }: { productId: string; companyId: string }) {
  const PACK = ["unidade", "fardo", "caixa"] as const;
  const TEMP = ["quente", "gelado"] as const;
  const [items, setItems] = useState<Record<string, Variant>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("product_variants").select("*").eq("product_id", productId);
    const map: Record<string, Variant> = {};
    for (const v of (data ?? []) as Variant[]) map[`${v.tipo}:${v.temperatura}`] = v;
    setItems(map);
    setLoading(false);
  }
  useEffect(() => { void load(); }, [productId]);

  const key = (t: string, te: string) => `${t}:${te}`;
  function patch(t: string, te: string, p: Partial<Variant>) {
    setItems((s) => ({ ...s, [key(t, te)]: { ...(s[key(t, te)] ?? {} as Variant), tipo: t as any, temperatura: te as any, ...p } }));
  }

  async function save() {
    setSaving(true);
    const upserts: any[] = [];
    const deletes: string[] = [];
    for (const k of Object.keys(items)) {
      const it = items[k];
      if (!it.ativo && it.id) { deletes.push(it.id); continue; }
      if (!it.ativo) continue;
      const row: any = {
        company_id: companyId,
        product_id: productId,
        tipo: it.tipo,
        temperatura: it.temperatura,
        unidades_por_pacote: Number(it.unidades_por_pacote ?? 1),
        codigo_barras: it.codigo_barras || null,
        estoque: Number(it.estoque ?? 0),
        estoque_minimo: Number(it.estoque_minimo ?? 0),
        preco_custo: Number(it.preco_custo ?? 0),
        preco_venda: Number(it.preco_venda ?? 0),
        ativo: true,
      };
      if (it.id) row.id = it.id;
      upserts.push(row);
    }
    if (deletes.length) {
      const { error } = await supabase.from("product_variants").delete().in("id", deletes);
      if (error) { setSaving(false); return toast.error(error.message); }
    }
    if (upserts.length) {
      const { error } = await supabase.from("product_variants").upsert(upserts, { onConflict: "product_id,tipo,temperatura" });
      if (error) { setSaving(false); return toast.error(error.message); }
    }
    setSaving(false);
    toast.success("Variações salvas");
    await load();
  }

  if (loading) return <div className="text-sm text-muted-foreground">Carregando variações…</div>;

  return (
    <div className="space-y-2">
      {PACK.map((t) => TEMP.map((te) => {
        const it = items[key(t, te)] ?? ({} as Variant);
        return (
          <Card key={`${t}-${te}`} className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium capitalize flex items-center gap-2 text-sm">
                {te === "gelado" ? <Snowflake className="h-4 w-4 text-sky-500" /> : <Flame className="h-4 w-4 text-orange-500" />}
                {t} — {te}
              </div>
              <div className="flex items-center gap-2"><Label className="text-xs">Ativo</Label><Switch checked={!!it.ativo} onCheckedChange={(c) => patch(t, te, { ativo: c })} /></div>
            </div>
            {it.ativo && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                <div><Label className="text-xs">Estoque</Label><Input type="number" step="0.001" value={it.estoque ?? 0} onChange={(e) => patch(t, te, { estoque: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">Mínimo</Label><Input type="number" step="0.001" value={it.estoque_minimo ?? 0} onChange={(e) => patch(t, te, { estoque_minimo: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">Un./pacote</Label><Input type="number" value={it.unidades_por_pacote ?? 1} onChange={(e) => patch(t, te, { unidades_por_pacote: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">Custo</Label><Input type="number" step="0.01" value={it.preco_custo ?? 0} onChange={(e) => patch(t, te, { preco_custo: Number(e.target.value) })} /></div>
                <div><Label className="text-xs">Venda</Label><Input type="number" step="0.01" value={it.preco_venda ?? 0} onChange={(e) => patch(t, te, { preco_venda: Number(e.target.value) })} /></div>
                <div className="col-span-2 sm:col-span-1"><Label className="text-xs">Cód. barras</Label><Input value={it.codigo_barras ?? ""} onChange={(e) => patch(t, te, { codigo_barras: e.target.value })} /></div>
              </div>
            )}
          </Card>
        );
      }))}
      <div className="flex justify-end">
        <Button type="button" variant="secondary" onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar variações"}</Button>
      </div>
    </div>
  );
}
