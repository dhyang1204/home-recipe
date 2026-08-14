import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { suggestRecipes } from "@/lib/anthropic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rawServings = Number(body?.servings);
  const servings =
    Number.isInteger(rawServings) && rawServings >= 1 && rawServings <= 6
      ? rawServings
      : 2;

  const supabase = getSupabaseServerClient();
  const { data: ingredients, error } = await supabase
    .from("ingredients")
    .select("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pantry = (ingredients ?? []).map((row) => row.name);

  if (pantry.length === 0) {
    return NextResponse.json(
      { error: "먼저 재료를 추가해주세요." },
      { status: 400 },
    );
  }

  try {
    const result = await suggestRecipes(pantry, servings);
    return NextResponse.json({ pantry, servings, ...result });
  } catch (err) {
    console.error("Claude suggestion failed:", err);
    return NextResponse.json(
      { error: "레시피를 생성하는 중 오류가 발생했습니다." },
      { status: 502 },
    );
  }
}
