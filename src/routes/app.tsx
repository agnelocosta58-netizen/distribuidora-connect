import { createFileRoute, Outlet, useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, signOut } from "@/lib/auth";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Wallet, Boxes,
  Settings, LogOut, BarChart3, Tags, UserCog, Beer, Receipt,
  Sparkles, Image as ImageIcon, Split, QrCode, Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";

export const Route = createFileRoute("/app")({ component: AppLayout });

type NavItem = { to: string; label: string; icon: any; roles?: ("admin" | "gerente" | "vendedor")[] };

const NAV: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "gerente"] },
  { to: "/app/pdv", label: "PDV", icon: ShoppingCart },
  { to: "/app/produtos", label: "Produtos", icon: Package },
  { to: "/app/estoque", label: "Estoque", icon: Boxes, roles: ["admin", "gerente"] },
  { to: "/app/categorias", label: "Categorias", icon: Tags, roles: ["admin", "gerente"] },
  { to: "/app/clientes", label: "Clientes", icon: Users },
  { to: "/app/caixa", label: "Caixa", icon: Wallet },
  { to: "/app/financeiro", label: "Financeiro", icon: Receipt, roles: ["admin", "gerente"] },
  { to: "/app/rateio", label: "Rateio", icon: Split },
  { to: "/app/marketing", label: "Marketing", icon: ImageIcon, roles: ["admin", "gerente"] },
  { to: "/app/inteligencia", label: "IA & Promoções", icon: Sparkles, roles: ["admin", "gerente"] },
  { to: "/app/relatorios", label: "Relatórios", icon: BarChart3, roles: ["admin", "gerente"] },
  { to: "/app/pix", label: "Pix", icon: QrCode, roles: ["admin", "gerente"] },
  { to: "/app/vendedores", label: "Vendedores", icon: UserCog, roles: ["admin"] },
  { to: "/app/configuracoes", label: "Configurações", icon: Settings, roles: ["admin"] },
];

function AppLayout() {
  const navigate = useNavigate();
  const auth = useAuth();

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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar auth={auth} />
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-30 h-14 bg-surface/95 backdrop-blur border-b border-border flex items-center gap-2 px-3 sm:px-4">
            <SidebarTrigger className="h-10 w-10 shrink-0" />
            <div className="min-w-0 flex-1 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <div className="font-semibold truncate text-sm sm:text-base">{auth.company?.nome ?? "Distribuidora"}</div>
              <div className="hidden sm:block text-xs text-muted-foreground truncate">{auth.profile?.nome}</div>
            </div>
          </header>
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppSidebar({ auth }: { auth: ReturnType<typeof useAuth> }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { setOpenMobile, isMobile } = useSidebar();
  const navigate = useNavigate();

  const visible = NAV.filter((n) => !n.roles || auth.hasAnyRole(n.roles));

  const isActive = (to: string) => pathname === to || (to !== "/app" && pathname.startsWith(to));

  async function handleLogout() {
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <Beer className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate">{auth.company?.nome ?? "Distribuidora"}</div>
            <div className="text-[11px] text-muted-foreground truncate">{auth.profile?.nome}</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive(item.to)} onClick={() => { if (isMobile) setOpenMobile(false); }}>
                      <Link to={item.to} className="flex items-center gap-3">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-3 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground truncate">
          {auth.roles.join(", ") || "—"}
        </div>
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
