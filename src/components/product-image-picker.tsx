import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Camera, Globe, X } from "lucide-react";
import { toast } from "sonner";
import { searchProductImages, saveProductImageFromUrl } from "@/lib/product-images.functions";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  productId?: string | null;
  productName: string;
  companyId: string;
}

export function ProductImagePicker({ value, onChange, productId, productName, companyId }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const search = useServerFn(searchProductImages);
  const saveFromUrl = useServerFn(saveProductImageFromUrl);

  async function uploadFile(f: File) {
    if (!companyId) return toast.error("Empresa não carregada");
    if (f.size > 8 * 1024 * 1024) return toast.error("Imagem maior que 8MB");
    setBusy(true);
    try {
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${companyId}/${productId ?? "tmp"}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, f, {
        contentType: f.type || "image/jpeg",
      });
      if (error) throw error;
      const { data: signed } = await supabase.storage
        .from("product-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      onChange(signed?.signedUrl ?? path);
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function pickFromSearch(url: string) {
    if (!productId) {
      // Sem produto salvo ainda: usa URL direto temporariamente
      onChange(url);
      setSearchOpen(false);
      return;
    }
    setBusy(true);
    try {
      const r: any = await saveFromUrl({ data: { product_id: productId, image_url: url } });
      onChange(r.url);
      setSearchOpen(false);
      toast.success("Imagem salva");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <div className="w-24 h-24 rounded-lg border border-border bg-muted overflow-hidden grid place-items-center relative">
          {value ? (
            <>
              <img src={value} alt="" className="object-cover w-full h-full" />
              <button
                type="button"
                onClick={() => onChange(null)}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/90 grid place-items-center shadow"
                aria-label="Remover"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <span className="text-[11px] text-muted-foreground text-center px-1">Sem imagem</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
          <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-1" /> Enviar imagem
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => camRef.current?.click()}>
            <Camera className="h-3.5 w-3.5 mr-1" /> Tirar foto
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={busy || !productName} onClick={() => setSearchOpen(true)}>
            <Globe className="h-3.5 w-3.5 mr-1" /> Buscar na internet
          </Button>
        </div>
      </div>
      {busy && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Processando...</p>}

      <ImageSearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        initialQuery={productName}
        onPick={pickFromSearch}
        search={(q: string) => search({ data: { query: q } })}
      />
    </div>
  );
}

function ImageSearchDialog({ open, onClose, initialQuery, onPick, search }: { open: boolean; onClose: () => void; initialQuery: string; onPick: (url: string) => void; search: (q: string) => Promise<any> }) {
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<Array<{ url: string; thumb: string; title: string }>>([]);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const r = await search(q);
      setResults(r?.results ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Buscar imagem na internet</DialogTitle></DialogHeader>
        <div className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome do produto..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), run())} />
          <Button onClick={run} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}</Button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
          {results.map((r, i) => (
            <button key={i} type="button" onClick={() => onPick(r.url)} className="aspect-square overflow-hidden rounded-md border border-border hover:border-primary hover:shadow-md transition" title={r.title}>
              <img src={r.thumb} alt={r.title} className="object-cover w-full h-full" loading="lazy" referrerPolicy="no-referrer" />
            </button>
          ))}
          {!loading && results.length === 0 && <p className="col-span-full text-sm text-muted-foreground text-center py-6">Pesquise pelo nome do produto.</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
