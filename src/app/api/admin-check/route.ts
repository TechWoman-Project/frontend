import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get("admin_session");

  if (!sessionCookie) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // In a production app, you'd validate the session token properly
  // For now, we just check if the cookie exists
  return NextResponse.json({
    authenticated: true,
  });
}
