import { supabaseServer as supabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { quizId, optionId, userName } = await request.json();

  if (!quizId || !optionId || !userName) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const { error } = await supabase.from("votes").insert({
      quiz_id: quizId,
      option_id: optionId,
      user_name: userName,
    });

    // Ignore duplicate errors, but log others
    if (error && error.code !== "23505") {
      console.error("Error inserting vote:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("Failed to insert vote:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
