import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/usuarios")({ component: UsuariosPage });

function UsuariosPage() {
  const auth = useAuth();
  const qc = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ["users", auth.company?.id],
    enabled: !!auth.company?.id,
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").eq("company_id", auth.company!.id).order("nome");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").eq("company_id", auth.company!.id);
      const rolesByUser: Record<string, string[]> = {};
      (roles ?? []).forEach((r: any) => { rolesByUser[r.user_id] ??= []; rolesByUser[r.user_id].push(r.role); });
      return (profiles ?? []).map((p: any) => ({ ...p, roles: rolesByUser[p.id] ?? [] }));
    },
  });

  async function updateRole(userId: string, role: string, currentRoles: string[]) {
    // Remove existing roles for this user/company then add the new one
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("company_id", auth.company!.id);
    await supabase.from("user_roles").insert({ user_id: userId, company_id: auth.company!.id, role: role as any });
    toast.success("Papel atualizado");
    qc.invalidateQueries({ queryKey: ["users"] });
  }

  return (
    <PageContainer>
      <PageHeader title="Usuários" subtitle="Gerencie quem acessa o sistema" />
      <Card className="p-5 shadow-card mb-4 bg-primary/5 border-primary/20">
        <h3 className="font-semibold mb-1">Convidar usuários</h3>
        <p className="text-sm text-muted-foreground">
          Para adicionar um novo usuário, peça que ele crie a conta pela tela de cadastro com o e-mail da empresa.
          Depois, você poderá ajustar o papel dele aqui.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          (Convites por e-mail diretos serão adicionados em breve.)
        </p>
      </Card>

      <div className="space-y-3">
        {(users as any[]).map((u: any) => (
          <Card key={u.id} className="p-4 shadow-card flex flex-wrap items-center gap-3 justify-between">
            <div className="min-w-0">
              <div className="font-semibold truncate">{u.nome}</div>
              <div className="text-xs text-muted-foreground truncate">{u.email}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {u.roles.map((r: string) => <Badge key={r} variant="secondary" className="capitalize">{r}</Badge>)}
              </div>
            </div>
            {u.id !== auth.user?.id ? (
              <Select defaultValue={u.roles[0] ?? "vendedor"} onValueChange={(v) => updateRole(u.id, v, u.roles)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge>Você</Badge>
            )}
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
