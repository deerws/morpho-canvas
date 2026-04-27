import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MASTER_EMAIL = "prof.admin@admin.com";
const MASTER_PASSWORD = "admin123";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verificar se já existe um admin
    const { data: existingAdmin } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();

    if (existingAdmin) {
      return new Response(
        JSON.stringify({ ok: true, alreadyExists: true, message: "Admin já existe." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar usuário master
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: MASTER_EMAIL,
      password: MASTER_PASSWORD,
      email_confirm: true,
      user_metadata: { name: "Professor Administrador", role: "admin" },
    });

    if (createErr) {
      // Pode já existir em auth.users mas sem role
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users.find((u) => u.email === MASTER_EMAIL);
      if (existing) {
        await admin.from("user_roles").upsert(
          { user_id: existing.id, role: "admin" },
          { onConflict: "user_id" }
        );
        return new Response(
          JSON.stringify({ ok: true, message: "Papel de admin garantido para usuário existente." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw createErr;
    }

    // Garantir role admin (trigger pode ter colocado student por padrão)
    if (created?.user) {
      await admin
        .from("user_roles")
        .upsert({ user_id: created.user.id, role: "admin" }, { onConflict: "user_id" });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Admin criado: ${MASTER_EMAIL} / ${MASTER_PASSWORD}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("bootstrap-admin error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
