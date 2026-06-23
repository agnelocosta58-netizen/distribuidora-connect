import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl, num, formatDateTime } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/relatorios")({ component: RelatoriosPage });

function RelatoriosPage() {
  const auth = useAuth();
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: sales = [] } = useQuery({
    queryKey: ["rel-sales", auth.company?.id, from, to],
    enabled: !!auth.company?.id,
    queryFn: async () => (await supabase.from("sales").select("*, customers(nome), profiles!sales_user_id_fkey(nome)")
      .gte("created_at", from + "T00:00:00").lte("created_at", to + "T23:59:59")
      .eq("status", "concluida").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: items = [] } = useQuery({
    queryKey: ["rel-items", auth.company?.id, from, to],
    enabled: !!auth.company?.id,
    queryFn: async () => (await supabase.from("sale_items").select("nome_produto, quantidade, total")
      .gte("created_at", from + "T00:00:00").lte("created_at", to + "T23:59:59")).data ?? [],
  });

  const total = (sales as any[]).reduce((s, r) => s + Number(r.total), 0);
  const qtdVendas = (sales as any[]).length;
  const ticket = qtdVendas ? total / qtdVendas : 0;

  const byProduct: Record<string, { qtd: number; total: number }> = {};
  (items as any[]).forEach((i) => {
    const k = i.nome_produto;
    byProduct[k] ??= { qtd: 0, total: 0 };
    byProduct[k].qtd += Number(i.quantidade);
    byProduct[k].total += Number(i.total);
  });
  const top = Object.entries(byProduct).sort((a, b) => b[1].total - a[1].total).slice(0, 10);

  return (
    <PageContainer>
      <PageHeader title="Relatórios" subtitle="Análise de vendas" />
      <div className="grid grid-cols-2 gap-3 mb-4 max-w-md">
        <div className="space-y-1.5"><Label>De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <Card className="p-4 shadow-card"><div className="text-xs text-muted-foreground">Faturamento</div><div className="text-xl font-bold text-primary">{brl(total)}</div></Card>
        <Card className="p-4 shadow-card"><div className="text-xs text-muted-foreground">Vendas</div><div className="text-xl font-bold">{num(qtdVendas)}</div></Card>
        <Card className="p-4 shadow-card col-span-2 lg:col-span-1"><div className="text-xs text-muted-foreground">Ticket médio</div><div className="text-xl font-bold">{brl(ticket)}</div></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5 shadow-card">
          <h3 className="font-semibold mb-3">Produtos mais vendidos</h3>
          <div className="space-y-1">
            {top.length === 0 && <p className="text-sm text-muted-foreground">Sem dados</p>}
            {top.map(([nome, v]) => (
              <div key={nome} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="min-w-0"><div className="text-sm truncate">{nome}</div><div className="text-xs text-muted-foreground">{num(v.qtd, 2)} un</div></div>
                <div className="font-semibold text-sm">{brl(v.total)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-card">
          <h3 className="font-semibold mb-3">Vendas no período</h3>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {(sales as any[]).slice(0, 50).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium">#{s.numero} · {s.customers?.nome ?? "Consumidor"}</div>
                  <div className="text-[11px] text-muted-foreground">{formatDateTime(s.created_at)} · {s.profiles?.nome ?? ""}</div>
                </div>
                <div className="font-semibold text-primary">{brl(s.total)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground mt-4">Exportação para PDF e Excel será adicionada na próxima atualização.</p>
    </PageContainer>
  );
}
