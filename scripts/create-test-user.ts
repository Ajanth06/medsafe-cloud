/**
 * Create a confirmed test user via Supabase Admin API (login-only mode).
 *
 *   npx tsx scripts/create-test-user.ts
 *   npx tsx scripts/create-test-user.ts --email you@example.com --password 'YourPass123!'
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createServiceClient } from "../lib/supabase/admin";

function loadEnvLocal(): void {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function readArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx === -1 ? undefined : process.argv[idx + 1];
}

async function main() {
  loadEnvLocal();

  const supabase = createServiceClient();
  if (!supabase) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env.local");
    process.exit(1);
  }

  const email = readArg("--email") ?? "dev@medsafe.cloud";
  const password = readArg("--password") ?? "MedSafe-Dev-2026!";
  const fullName = readArg("--name") ?? "Dev User";

  const { data: existing } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const found = existing.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (found) {
    const { error } = await supabase.auth.admin.updateUserById(found.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) {
      console.error("Failed to update existing user:", error.message);
      process.exit(1);
    }
    console.log("Updated existing test user (password reset, email confirmed).");
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    return;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    console.error("Failed to create user:", error.message);
    process.exit(1);
  }

  console.log("Test user created.");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  User ID:  ${data.user.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
