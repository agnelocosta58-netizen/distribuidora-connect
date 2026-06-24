import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { suggestPromotions, type AISuggestion } from "@/lib/ai-promotions.functions";
import { PageContainer, PageHeader, EmptyState } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brl } from "@/lib/format";
import { Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/inteligencia")({ component: AIPage });

function AIPage() {
  const fn = useServerFn(suggestPromotions);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<AISuggestion[]>([]);

  async function generate() {
    setLoading(true);
    try {
      const out = await fn({ data: {} } as any);
      setList(out.suggestions ?? []);
      if (!out.suggestions?.length) toast.info("Sem sugestões no momento — estoque está saudável.");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar");
    } finally { setLoading(false); }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Inteligência de promoções"
        subtitle="A IA analisa estoque, validade e margens para sugerir ações"
        actions={<Button onClick={generate} disabled={loading}><Sparkles className="h-4 w-4 mr-1" /> {loading ? "Analisando…" : "Gerar sugestões"}</Button>}
      />
      {list.length === 0 ? (
        <EmptyState title="Clique em ‘Gerar sugestões’" description="A IA vai propor descontos, metas e legendas prontas." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((s, i) => (
            <Card key={i} className="p-4 shadow-card">
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-semibold">{s.produto}</h3>
                <Badge variant="outline">-{s.desconto_sugerido_pct}%</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{s.motivo}</p>
              <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                <Stat label="Preço promo" value={brl(s.preco_promocional)} />
                <Stat label="Meta" value={`${s.meta_unidades} un`} />
                <Stat label="Prazo" value={`${s.prazo_dias}d`} />
                <Stat label="Lucro est." value={brl(s.lucro_estimado)} />
              </div>
              <div className="mt-3 p-2 rounded bg-muted/40 text-xs whitespace-pre-line">{s.legenda}</div>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => { navigator.clipboard.writeText(s.legenda); toast.success("Legenda copiada"); }}>
                <Copy className="h-3 w-3 mr-1" /> Copiar legenda
              </Button>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded bg-muted/40">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}
