import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { brl, num, formatDateTime } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import {
  TrendingUp, DollarSign, ShoppingCart, AlertTriangle,
  Package, ArrowDownToLine, ArrowUpFromLine,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const auth = useAuth();
  const companyId = auth.company?.id;

  const { data: stats } = useQuery({
    queryKey: ["dashboard", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
      const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);
      const start7 = new Date(); start7.setDate(start7.getDate() - 6); start7.setHours(0, 0, 0, 0);

      const [today, month, recent, lowStock, topProducts, ar, ap] = await Promise.all([
        supabase.from("sales").select("total").eq("status", "concluida").gte("created_at", startToday.toISOString()),
        supabase.from("sales").select("total, created_at").eq("status", "concluida").gte("created_at", start7.toISOString()),
        supabase.from("sales").select("id, numero, total, created_at, customer_id, customers(nome)").eq("status", "concluida").order("created_at", { ascending: false }).limit(5),
        supabase.from("products").select("id, nome, estoque, estoque_minimo").lte("estoque", 5).order("estoque").limit(5),
        supabase.from("sale_items").select("nome_produto, quantidade").gte("created_at", startMonth.toISOString()),
        supabase.from("accounts_receivable").select("valor, valor_pago").in("status", ["pendente", "parcial"]),
        supabase.from("accounts_payable").select("valor, valor_pago").in("status", ["pendente", "parcial"]),
      ]);

      const totalToday = (today.data ?? []).reduce((s: number, r: any) => s + Number(r.total), 0);
      const totalMonth = (month.data ?? []).reduce((s: number, r: any) => s + Number(r.total), 0);
      const countToday = (today.data ?? []).length;
      const totalAR = (ar.data ?? []).reduce((s: number, r: any) => s + (Number(r.valor) - Number(r.valor_pago)), 0);
      const totalAP = (ap.data ?? []).reduce((s: number, r: any) => s + (Number(r.valor) - Number(r.valor_pago)), 0);

      // chart: last 7 days
      const buckets: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
        buckets[d.toISOString().slice(0, 10)] = 0;
      }
      (month.data ?? []).forEach((r: any) => {
        const k = r.created_at.slice(0, 10);
        if (k in buckets) buckets[k] += Number(r.total);
      });
      const chart = Object.entries(buckets).map(([k, v]) => ({
        dia: new Date(k).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        valor: v,
      }));

      // top products by qty
      const agg: Record<string, number> = {};
      (topProducts.data ?? []).forEach((r: any) => {
        agg[r.nome_produto] = (agg[r.nome_produto] ?? 0) + Number(r.quantidade);
      });
      const top = Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 5);

      return { totalToday, totalMonth, countToday, recent: recent.data ?? [], lowStock: lowStock.data ?? [], chart, top, totalAR, totalAP };
    },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Olá, {auth.profile?.nome?.split(" ")[0] ?? "—"}</h1>
        <p className="text-sm text-muted-foreground">Resumo do seu negócio</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi icon={<DollarSign className="h-4 w-4" />} label="Faturamento hoje" value={brl(stats?.totalToday)} accent="primary" />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Faturamento mês" value={brl(stats?.totalMonth)} accent="success" />
        <Kpi icon={<ShoppingCart className="h-4 w-4" />} label="Vendas hoje" value={num(stats?.countToday)} accent="warning" />
        <Kpi icon={<AlertTriangle className="h-4 w-4" />} label="Estoque baixo" value={num(stats?.lowStock?.length)} accent="destructive" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Vendas dos últimos 7 dias</h3>
              <p className="text-xs text-muted-foreground">Faturamento diário</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={stats?.chart ?? []} margin={{ left: -10, right: 0, top: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.546 0.215 262)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.546 0.215 262)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.012 255)" vertical={false} />
                <XAxis dataKey="dia" stroke="oklch(0.52 0.022 257)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.52 0.022 257)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: any) => brl(v)} contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.92 0.012 255)" }} />
                <Area type="monotone" dataKey="valor" stroke="oklch(0.546 0.215 262)" strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 shadow-card">
          <h3 className="font-semibold mb-1">Financeiro</h3>
          <p className="text-xs text-muted-foreground mb-4">Em aberto</p>
          <div className="space-y-3">
            <FinRow icon={<ArrowDownToLine className="h-4 w-4 text-success" />} label="A receber" value={brl(stats?.totalAR)} />
            <FinRow icon={<ArrowUpFromLine className="h-4 w-4 text-destructive" />} label="A pagar" value={brl(stats?.totalAP)} />
            <div className="pt-3 border-t border-border">
              <div className="text-xs text-muted-foreground">Saldo previsto</div>
              <div className="text-xl font-bold">{brl((stats?.totalAR ?? 0) - (stats?.totalAP ?? 0))}</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5 shadow-card">
          <h3 className="font-semibold mb-4">Últimas vendas</h3>
          <div className="space-y-2">
            {(stats?.recent ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma venda ainda</p>}
            {(stats?.recent ?? []).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">#{r.numero} · {r.customers?.nome ?? "Consumidor"}</div>
                  <div className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</div>
                </div>
                <div className="font-semibold text-sm text-primary">{brl(r.total)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-card">
          <h3 className="font-semibold mb-4">Estoque baixo</h3>
          <div className="space-y-2">
            {(stats?.lowStock ?? []).length === 0 && <p className="text-sm text-muted-foreground">Tudo em ordem</p>}
            {(stats?.lowStock ?? []).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm truncate">{p.nome}</span>
                </div>
                <div className="text-sm font-semibold text-destructive">{num(p.estoque, 2)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: "primary" | "success" | "warning" | "destructive" }) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <Card className="p-4 shadow-card">
      <div className={`h-9 w-9 rounded-lg grid place-items-center ${colors[accent]}`}>{icon}</div>
      <div className="mt-3 text-xs text-muted-foreground">{label}</div>
      <div className="text-lg sm:text-xl font-bold truncate">{value}</div>
    </Card>
  );
}

function FinRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">{icon}<span className="text-sm">{label}</span></div>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
