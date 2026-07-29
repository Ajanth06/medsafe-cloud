import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/market-intelligence/api/auth";
import {
  getUserTerminalPreferences,
  updateUserTerminalPreferences,
} from "@/lib/market-intelligence/user/preferences-store";
import type { UserTerminalPreferences } from "@/lib/market-intelligence/user/preferences-types";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  const preferences = await getUserTerminalPreferences(auth.userId);
  return NextResponse.json({ preferences });
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => ({}))) as Partial<UserTerminalPreferences>;
  const preferences = await updateUserTerminalPreferences(auth.userId, body);
  return NextResponse.json({ preferences });
}
