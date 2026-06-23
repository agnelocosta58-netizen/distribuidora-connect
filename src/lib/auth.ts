import { useEffect, useState, useCallback } from "react";
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

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    company: null,
    roles: [],
    loading: true,
  });

  const loadProfile = useCallback(async (userId: string) => {
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
  }, []);

  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState((s) => ({ ...s, session, user: session?.user ?? null }));
      if (session?.user) {
        setTimeout(async () => {
          const extras = await loadProfile(session.user.id);
          if (mounted) setState((s) => ({ ...s, ...extras, loading: false }));
        }, 0);
      } else {
        setState((s) => ({ ...s, profile: null, company: null, roles: [], loading: false }));
      }
    });
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setState((s) => ({ ...s, session, user: session?.user ?? null }));
      if (session?.user) {
        const extras = await loadProfile(session.user.id);
        if (mounted) setState((s) => ({ ...s, ...extras, loading: false }));
      } else if (mounted) {
        setState((s) => ({ ...s, loading: false }));
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  return {
    ...state,
    hasRole: (r: AppRole) => state.roles.includes(r),
    hasAnyRole: (rs: AppRole[]) => rs.some((r) => state.roles.includes(r)),
    isAdmin: state.roles.includes("admin"),
    isGerente: state.roles.includes("admin") || state.roles.includes("gerente"),
    isVendedor: state.roles.length > 0,
  };
}

export async function signOut() {
  await supabase.auth.signOut();
}
