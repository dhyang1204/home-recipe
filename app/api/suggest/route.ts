import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { suggestDishNames } from "@/lib/anthropic";
import { searchRecipeVideo, type RecipeVideo } from "@/lib/youtube";

async function withVideo<T extends { name: string }>(
  dish: T,
): Promise<T & { video: RecipeVideo | null }> {
  const video = await searchRecipeVideo(dish.name).catch((err) => {
    console.error(`YouTube search failed for "${dish.name}":`, err);
    return null;
  });
  return { ...dish, video };
}

export async function POST() {
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
    const dishes = await suggestDishNames(pantry);
    const [fullMatches, nearMisses] = await Promise.all([
      Promise.all(dishes.fullMatches.map(withVideo)),
      Promise.all(dishes.nearMisses.map(withVideo)),
    ]);

    return NextResponse.json({ pantry, fullMatches, nearMisses });
  } catch (err) {
    console.error("Dish suggestion failed:", err);
    return NextResponse.json(
      { error: "레시피를 생성하는 중 오류가 발생했습니다." },
      { status: 502 },
    );
  }
}
