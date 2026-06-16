import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ valid: false, error: "Email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const masterEmail = "prof.admin@admin.com";
    if (email.toLowerCase() === masterEmail) {
      return new Response(JSON.stringify({ valid: true, role: "admin" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await admin
      .from("student_invitations")
      .select("id, class_id, team_id, status")
      .ilike("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (error) throw error;

    if (data) {
      let teams: Array<{ id: string; name: string; number: number }> = [];
      if (!data.team_id) {
        const { data: t } = await admin
          .from("teams")
          .select("id, name, number")
          .eq("class_id", data.class_id)
          .order("number");
        teams = t || [];
      }
      return new Response(
        JSON.stringify({
          valid: true,
          classId: data.class_id,
          teamId: data.team_id,
          requiresTeamSelection: !data.team_id && teams.length > 0,
          teams,
          role: "student",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        valid: false,
        error: "E-mail não autorizado. Solicite ao seu professor que adicione seu e-mail à turma.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("validate-invitation error:", err);
    return new Response(JSON.stringify({ valid: false, error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
