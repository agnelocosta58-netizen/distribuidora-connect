import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "gerente" | "vendedor";

export interface Profile {
  id: string;
  company_id: string | null;
  nome: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
}

export interface Company {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  logo_url: string | null;
  pix_chave: string | null;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  company: Company | null;
  roles: AppRole[];
  loading: boolean;
}

export interface AuthValue extends AuthState {
  hasRole: (r: AppRole) => boolean;
  hasAnyRole: (rs: AppRole[]) => boolean;
  isAdmin: boolean;
  isGerente: boolean;
  isVendedor: boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

async function loadExtras(userId: string) {
  const [{ data: profile }, { data: rolesData }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  let company: Company | null = null;
  if (profile?.company_id) {
    const { data } = await supabase
      .from("companies")
      .select("id, nome, cnpj, telefone, email, logo_url, pix_chave")
      .eq("id", profile.company_id)
      .maybeSingle();
    company = (data as Company) ?? null;
  }
  return {
    profile: (profile as Profile) ?? null,
    company,
    roles: (rolesData ?? []).map((r: any) => r.role as AppRole),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    company: null,
    roles: [],
    loading: true,
  });
  const loadedForUserRef = useRef<string | null>(null);

  const hydrate = useCallback(async (userId: string) => {
    if (loadedForUserRef.current === userId) return;
    loadedForUserRef.current = userId;
    const extras = await loadExtras(userId);
    setState((s) => ({ ...s, ...extras, loading: false }));
  }, []);

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      // Ignore no-op events that would otherwise thrash consumers.
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED" && event !== "INITIAL_SESSION") return;

      setState((s) => ({ ...s, session, user: session?.user ?? null }));
      if (session?.user) {
        setTimeout(() => {
          if (mounted) hydrate(session.user.id);
        }, 0);
      } else {
        loadedForUserRef.current = null;
        setState((s) => ({ ...s, profile: null, company: null, roles: [], loading: false }));
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setState((s) => ({ ...s, session, user: session?.user ?? null }));
      if (session?.user) {
        await hydrate(session.user.id);
      } else if (mounted) {
        setState((s) => ({ ...s, loading: false }));
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrate]);

  const value = useMemo<AuthValue>(
    () => ({
      ...state,
      hasRole: (r) => state.roles.includes(r),
      hasAnyRole: (rs) => rs.some((r) => state.roles.includes(r)),
      isAdmin: state.roles.includes("admin"),
      isGerente: state.roles.includes("admin") || state.roles.includes("gerente"),
      isVendedor: state.roles.length > 0,
    }),
    [state],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (ctx) return ctx;
  // Fallback for any consumer rendered outside the provider: a stable, loading-only value.
  // This avoids crashes but callers should be wrapped in <AuthProvider>.
  return {
    user: null,
    session: null,
    profile: null,
    company: null,
    roles: [],
    loading: true,
    hasRole: () => false,
    hasAnyRole: () => false,
    isAdmin: false,
    isGerente: false,
    isVendedor: false,
  };
}

export async function signOut() {
  await supabase.auth.signOut();
}
