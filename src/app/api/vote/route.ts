import { NextResponse } from "next/server";

// Basic in-memory placeholder (ephemeral). Replace with database logic later.
let votes: { option: string; createdAt: string }[] = [];

export async function GET() {
  return NextResponse.json({ count: votes.length, votes });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data || typeof data.option !== "string") {
      return NextResponse.json(
        { error: "Missing 'option' in body" },
        { status: 400 }
      );
    }
    const record = { option: data.option, createdAt: new Date().toISOString() };
    votes.push(record);
    return NextResponse.json({ ok: true, record });
  } catch (e: unknown) {
    const message =
      e && typeof e === "object" && "message" in e
        ? (e as { message?: string }).message || "Invalid JSON"
        : "Invalid JSON";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  votes = [];
  return NextResponse.json({ ok: true });
}
