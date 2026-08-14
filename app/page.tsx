"use client";

import { useEffect, useState } from "react";
import type { Recipe, NearMissRecipe } from "@/lib/anthropic";

interface Ingredient {
  id: string;
  name: string;
  created_at: string;
}

interface SuggestResponse {
  fullMatches: Recipe[];
  nearMisses: NearMissRecipe[];
}

export default function Home() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<SuggestResponse | null>(
    null,
  );
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  useEffect(() => {
    loadIngredients();
  }, []);

  async function loadIngredients() {
    setLoadingIngredients(true);
    const res = await fetch("/api/ingredients");
    const data = await res.json();
    setIngredients(data.ingredients ?? []);
    setLoadingIngredients(false);
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setAddError(null);
    const res = await fetch("/api/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (res.ok) {
      setNewName("");
      loadIngredients();
    } else {
      const data = await res.json().catch(() => null);
      setAddError(data?.error ?? "재료를 추가하지 못했습니다.");
    }
  }

  async function handleRemove(id: string) {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/ingredients?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  async function handleSuggest() {
    setSuggestLoading(true);
    setSuggestError(null);
    setSuggestions(null);

    const res = await fetch("/api/suggest", { method: "POST" });
    const data = await res.json();

    if (res.ok) {
      setSuggestions(data);
    } else {
      setSuggestError(data?.error ?? "추천을 받지 못했습니다.");
    }
    setSuggestLoading(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold">집밥 레시피</h1>
        <p className="mt-1 text-sm text-zinc-500">
          지금 있는 재료로 뭘 만들 수 있을까요?
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-500">
          내 재료 ({ingredients.length})
        </h2>
        <form onSubmit={handleAdd} className="mb-3 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="예: 계란"
            className="flex-1 rounded-lg border border-black/10 bg-transparent px-4 py-2.5 text-base outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40"
          />
          <button
            type="submit"
            disabled={newName.trim().length === 0}
            className="rounded-lg bg-black px-5 py-2.5 font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            추가
          </button>
        </form>
        {addError && (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">
            {addError}
          </p>
        )}

        {loadingIngredients ? (
          <p className="text-sm text-zinc-400">불러오는 중...</p>
        ) : ingredients.length === 0 ? (
          <p className="text-sm text-zinc-400">
            아직 등록된 재료가 없어요. 재료를 추가해보세요.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {ingredients.map((ing) => (
              <span
                key={ing.id}
                className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 text-sm dark:bg-zinc-800"
              >
                {ing.name}
                <button
                  onClick={() => handleRemove(ing.id)}
                  aria-label={`${ing.name} 삭제`}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      <button
        onClick={handleSuggest}
        disabled={suggestLoading || ingredients.length === 0}
        className="sticky top-4 z-10 w-full rounded-xl bg-black py-3.5 text-base font-semibold text-white shadow-md disabled:opacity-40 dark:bg-white dark:text-black"
      >
        {suggestLoading ? "레시피 생각 중..." : "레시피 추천받기"}
      </button>

      {suggestError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {suggestError}
        </p>
      )}

      {suggestions && (
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold">
              🍳 지금 바로 만들 수 있어요
            </h2>
            <div className="flex flex-col gap-4">
              {suggestions.fullMatches.map((recipe, i) => (
                <RecipeCard key={i} recipe={recipe} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">
              🛒 조금만 더 사면 만들 수 있어요
            </h2>
            <div className="flex flex-col gap-4">
              {suggestions.nearMisses.map((recipe, i) => (
                <RecipeCard key={i} recipe={recipe} missing={recipe.missingIngredients} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function RecipeCard({
  recipe,
  missing,
}: {
  recipe: Recipe;
  missing?: string[];
}) {
  return (
    <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
      <h3 className="font-semibold">{recipe.name}</h3>
      {missing && missing.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {missing.map((item) => (
            <span
              key={item}
              className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
            >
              장보기: {item}
            </span>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-zinc-500">
        사용 재료: {recipe.ingredientsUsed.join(", ")}
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
        {recipe.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
