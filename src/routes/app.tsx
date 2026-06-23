import { createFileRoute, Outlet, useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, signOut } from "@/lib/auth";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Wallet,
  Settings, LogOut, Menu, X, BarChart3, Tags, UserCog, Beer, Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

type NavItem = { to: string; label: string; icon: any; roles?: ("admin" | "gerente" | "vendedor")[] };

const NAV: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "gerente"] },
  { to: "/app/pdv", label: "PDV", icon: ShoppingCart },
  { to: "/app/produtos", label: "Produtos", icon: Package },
  { to: "/app/categorias", label: "Categorias", icon: Tags, roles: ["admin", "gerente"] },
  { to: "/app/clientes", label: "Clientes", icon: Users },
  { to: "/app/caixa", label: "Caixa", icon: Wallet },
  { to: "/app/financeiro", label: "Financeiro", icon: Receipt, roles: ["admin", "gerente"] },
  { to: "/app/relatorios", label: "Relatórios", icon: BarChart3, roles: ["admin", "gerente"] },
  { to: "/app/usuarios", label: "Usuários", icon: UserCog, roles: ["admin"] },
  { to: "/app/configuracoes", label: "Configurações", icon: Settings, roles: ["admin"] },
];

function AppLayout() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!auth.loading && !auth.session) navigate({ to: "/auth" });
  }, [auth.loading, auth.session, navigate]);

  if (auth.loading || !auth.session) {
    return (
      <div className="min-h-screen p-6 grid place-items-center">
        <div className="space-y-3 w-full max-w-sm">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  const visibleNav = NAV.filter((n) => !n.roles || auth.hasAnyRole(n.roles));

  async function handleLogout() {
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-72 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="px-5 py-5 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Beer className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">{auth.company?.nome ?? "Distribuidora"}</div>
              <div className="text-[11px] text-muted-foreground truncate">{auth.profile?.nome}</div>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to || (item.to !== "/app" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" style={{ width: 18, height: 18 }} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 pb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            {auth.roles.join(", ") || "—"}
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-20 bg-surface border-b border-border px-4 h-14 flex items-center justify-between">
          <button onClick={() => setOpen(true)}><Menu className="h-6 w-6" /></button>
          <div className="font-semibold truncate">{auth.company?.nome ?? "Distribuidora"}</div>
          <div className="w-6" />
        </header>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
