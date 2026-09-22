import { NextResponse } from "next/server";
import { isGoogleAuthConfigured } from "@/lib/auth";

/** Public auth capability flags for the sign-in UI. */
export async function GET() {
  return NextResponse.json({
    google: isGoogleAuthConfigured,
    emailPassword: true,
  });
}
