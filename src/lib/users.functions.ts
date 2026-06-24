import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InviteSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  telefone: z.string().trim().max(40).optional().nullable(),
  cpf: z.string().trim().max(20).optional().nullable(),
  senha: z.string().min(6).max(72),
  role: z.enum(["admin", "gerente", "vendedor"]),
});

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

async function getCompanyId(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.from("profiles").select("company_id").eq("id", ctx.userId).maybeSingle();
  if (!data?.company_id) throw new Error("Sem empresa vinculada");
  return data.company_id as string;
}

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InviteSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const companyId = await getCompanyId(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome, telefone: data.telefone ?? null, cpf: data.cpf ?? null },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar usuário");

    const uid = created.user.id;
    // The handle_new_user trigger creates its own company for a fresh signup — undo that and attach to ours.
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin.from("profiles").upsert({
      id: uid,
      company_id: companyId,
      nome: data.nome,
      email: data.email,
      telefone: data.telefone ?? null,
      cpf: data.cpf ?? null,
      ativo: true,
    });
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, company_id: companyId, role: data.role });

    return { ok: true, userId: uid };
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), ativo: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const companyId = await getCompanyId(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("profiles").update({ ativo: data.ativo }).eq("id", data.userId).eq("company_id", companyId);
    // Block sign-in by banning/unbanning at the Auth level.
    await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.ativo ? "none" : "876000h",
    });
    return { ok: true };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    userId: z.string().uuid(),
    nome: z.string().trim().min(2).max(120),
    telefone: z.string().trim().max(40).optional().nullable(),
    cpf: z.string().trim().max(20).optional().nullable(),
    role: z.enum(["admin", "gerente", "vendedor"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const companyId = await getCompanyId(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("profiles").update({
      nome: data.nome, telefone: data.telefone ?? null, cpf: data.cpf ?? null,
    }).eq("id", data.userId).eq("company_id", companyId);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("company_id", companyId);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, company_id: companyId, role: data.role });
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Você não pode excluir o próprio usuário");
    const companyId = await getCompanyId(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Confirm the user is in our company before deleting at the Auth level.
    const { data: prof } = await supabaseAdmin.from("profiles").select("company_id").eq("id", data.userId).maybeSingle();
    if (!prof || prof.company_id !== companyId) throw new Error("Usuário não pertence à empresa");

    await supabaseAdmin.auth.admin.deleteUser(data.userId);
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), senha: z.string().min(6).max(72) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const companyId = await getCompanyId(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin.from("profiles").select("company_id").eq("id", data.userId).maybeSingle();
    if (!prof || prof.company_id !== companyId) throw new Error("Usuário não pertence à empresa");
    await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.senha });
    return { ok: true };
  });
