import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function respond(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return respond({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Student ID login environment is incomplete.");
    return respond({ error: "Login is temporarily unavailable." }, 500);
  }

  let body: { studentId?: unknown };
  try {
    body = await request.json();
  } catch {
    return respond({ error: "Invalid request." }, 400);
  }

  const rawStudentId = String(body.studentId || "").trim();
  if (!/^(?:\d{8}|\d{4}-\d{4})$/.test(rawStudentId)) {
    return respond({ error: "Student ID or password is incorrect." }, 401);
  }
  const studentId = rawStudentId.replace(/\D/g, "");

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: account, error: lookupError } = await serviceClient
    .from("student_accounts")
    .select("user_id")
    .eq("student_id", studentId)
    .maybeSingle();

  if (lookupError) {
    console.error("Student ID lookup failed.", lookupError.message);
    return respond({ error: "Login is temporarily unavailable." }, 500);
  }

  if (!account) {
    return respond({ error: "Student ID or password is incorrect." }, 401);
  }

  const { data: userResult, error: userError } = await serviceClient.auth.admin.getUserById(account.user_id);
  const user = userResult?.user;
  const email = user?.email;
  const password = String(user?.user_metadata?.student_id || "").trim();
  if (userError || !email || !/^(?:\d{8}|\d{4}-\d{4})$/.test(password)) {
    console.error("Student account lookup failed.", userError?.message || "Email not found.");
    return respond({ error: "Student ID or password is incorrect." }, 401);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: authResult, error: authError } = await authClient.auth.signInWithPassword({ email, password });
  if (authError || !authResult.session) {
    return respond({ error: "Student ID or password is incorrect." }, 401);
  }

  return respond({
    access_token: authResult.session.access_token,
    refresh_token: authResult.session.refresh_token
  }, 200);
});