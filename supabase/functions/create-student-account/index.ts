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
    console.error("Student account creation environment is incomplete.");
    return respond({ error: "Account creation is temporarily unavailable." }, 500);
  }

  const authorization = request.headers.get("Authorization") || "";
  const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return respond({ error: "Sign in as an administrator to create student accounts." }, 401);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return respond({ error: "Your session is invalid or expired. Sign in again." }, 401);
  }
  if (authData.user.app_metadata?.role !== "admin") {
    return respond({ error: "Only administrators can create student accounts." }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return respond({ error: "Invalid request." }, 400);
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const rawStudentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const gender = typeof body.gender === "string" ? body.gender.trim() : "";
  const yearLevel = typeof body.yearLevel === "string" ? body.yearLevel.trim() : "";

  if (fullName.length < 2 || fullName.length > 120) {
    return respond({ error: "Enter a student name between 2 and 120 characters." }, 400);
  }
  if (!/^(?:\d{8}|\d{4}-\d{4})$/.test(rawStudentId)) {
    return respond({ error: "Student ID must be 8 digits or use YYYY-#### format." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return respond({ error: "Enter a valid email address." }, 400);
  }
  if (!["Male", "Female", "Prefer not to say"].includes(gender)) {
    return respond({ error: "Select a valid gender option." }, 400);
  }
  if (!["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"].includes(yearLevel)) {
    return respond({ error: "Select a valid year level." }, 400);
  }

  const studentId = rawStudentId.replace(/\D/g, "");
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: existingAccount, error: lookupError } = await serviceClient
    .from("student_accounts")
    .select("user_id")
    .eq("student_id", studentId)
    .maybeSingle();

  if (lookupError) {
    console.error("Student account lookup failed.", lookupError.message);
    return respond({ error: "Student account could not be checked. Verify the student login database setup." }, 500);
  }
  if (existingAccount) {
    return respond({ error: "An account already exists for this Student ID." }, 409);
  }

  const { data: createdUser, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password: rawStudentId,
    email_confirm: true,
    app_metadata: { role: "voter" },
    user_metadata: {
      full_name: fullName,
      student_id: rawStudentId,
      gender,
      year_level: yearLevel
    }
  });

  if (createError) {
    console.error("Student account creation failed.", createError.message);
    const status = /already|duplicate|unique/i.test(createError.message) ? 409 : 400;
    const error = status === 409
      ? "An account already exists with this email or Student ID."
      : "Student account could not be created. Check the information and Supabase setup.";
    return respond({ error }, status);
  }

  return respond({
    id: createdUser.user.id,
    message: "Student account created. The initial password is the Student ID."
  }, 201);
});