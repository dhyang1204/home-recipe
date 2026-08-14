"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, type CategoryId } from "@/lib/categories";
import type { Recipe, NearMissRecipe, IngredientAmount } from "@/lib/anthropic";

interface Ingredient {
  id: string;
  name: string;
  category: string;
  created_at: string;
}

interface SuggestResponse {
  fullMatches: Recipe[];
  nearMisses: NearMissRecipe[];
}

type Tab = "ingredients" | "recipes";

export default function Home() {
  const [tab, setTab] = useState<Tab>("ingredients");

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<CategoryId>("veggie");
  const [addError, setAddError] = useState<string | null>(null);

  const [servings, setServings] = useState(2);
  const [suggestions, setSuggestions] = useState<SuggestResponse | null>(
    null,
  );
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [resultView, setResultView] = useState<"full" | "near">("full");

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
      body: JSON.stringify({ name, category: newCategory }),
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
    setResultView("full");
    setTab("recipes");

    const res = await fetch("/api/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ servings }),
    });
    const data = await res.json();

    if (res.ok) {
      setSuggestions(data);
    } else {
      setSuggestError(data?.error ?? "추천을 받지 못했습니다.");
    }
    setSuggestLoading(false);
  }

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: ingredients.filter((i) => i.category === cat.id),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-orange-100 bg-white/80 px-4 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <h1 className="flex items-center gap-2 text-xl font-bold text-orange-900 dark:text-orange-100">
          <span className="text-2xl">🍚</span> 집밥 레시피
        </h1>
        <p className="mt-0.5 text-sm text-orange-700/70 dark:text-orange-200/50">
          지금 있는 재료로 뭘 만들 수 있을까요?
        </p>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-5">
        {tab === "ingredients" ? (
          <IngredientsView
            grouped={grouped}
            totalCount={ingredients.length}
            loading={loadingIngredients}
            newName={newName}
            setNewName={setNewName}
            newCategory={newCategory}
            setNewCategory={setNewCategory}
            addError={addError}
            onAdd={handleAdd}
            onRemove={handleRemove}
            servings={servings}
            setServings={setServings}
            onSuggest={handleSuggest}
            suggestLoading={suggestLoading}
          />
        ) : (
          <RecipesView
            servings={servings}
            setServings={setServings}
            onSuggest={handleSuggest}
            suggestLoading={suggestLoading}
            suggestError={suggestError}
            suggestions={suggestions}
            hasIngredients={ingredients.length > 0}
            resultView={resultView}
            setResultView={setResultView}
          />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-orange-100 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-2xl">
          <TabButton
            active={tab === "ingredients"}
            emoji="🥬"
            label="내 재료"
            onClick={() => setTab("ingredients")}
          />
          <TabButton
            active={tab === "recipes"}
            emoji="🍳"
            label="레시피 추천"
            onClick={() => setTab("recipes")}
          />
        </div>
      </nav>
    </div>
  );
}

function TabButton({
  active,
  emoji,
  label,
  onClick,
}: {
  active: boolean;
  emoji: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
        active
          ? "text-orange-600 dark:text-orange-400"
          : "text-zinc-400 dark:text-zinc-500"
      }`}
    >
      <span className="text-xl">{emoji}</span>
      {label}
    </button>
  );
}

function IngredientsView({
  grouped,
  totalCount,
  loading,
  newName,
  setNewName,
  newCategory,
  setNewCategory,
  addError,
  onAdd,
  onRemove,
  servings,
  setServings,
  onSuggest,
  suggestLoading,
}: {
  grouped: Array<{
    id: string;
    label: string;
    emoji: string;
    items: Ingredient[];
  }>;
  totalCount: number;
  loading: boolean;
  newName: string;
  setNewName: (v: string) => void;
  newCategory: CategoryId;
  setNewCategory: (v: CategoryId) => void;
  addError: string | null;
  onAdd: (e: React.FormEvent) => void;
  onRemove: (id: string) => void;
  servings: number;
  setServings: (n: number) => void;
  onSuggest: () => void;
  suggestLoading: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={onAdd}
        className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="예: 계란"
          className="w-full rounded-lg border border-orange-100 bg-transparent px-4 py-2.5 text-base outline-none focus:border-orange-400 dark:border-zinc-700 dark:focus:border-orange-500"
        />
        <div className="mt-2 flex gap-2">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as CategoryId)}
            className="min-w-0 flex-1 rounded-lg border border-orange-100 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-orange-400 dark:border-zinc-700 dark:focus:border-orange-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={newName.trim().length === 0}
            className="shrink-0 whitespace-nowrap rounded-lg bg-orange-600 px-5 py-2.5 font-medium text-white disabled:opacity-40"
          >
            추가
          </button>
        </div>
        {addError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {addError}
          </p>
        )}
      </form>

      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-500">
          내 재료 ({totalCount})
        </h2>

        {loading ? (
          <p className="text-sm text-zinc-400">불러오는 중...</p>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-zinc-400">
            아직 등록된 재료가 없어요. 위에서 재료를 추가해보세요.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {grouped.map((group) => (
              <div key={group.id}>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-orange-700/80 dark:text-orange-300/70">
                  <span>{group.emoji}</span>
                  {group.label}
                  <span className="text-zinc-400">({group.items.length})</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((ing) => (
                    <span
                      key={ing.id}
                      className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-sm text-orange-900 dark:bg-zinc-800 dark:text-orange-100"
                    >
                      {ing.name}
                      <button
                        onClick={() => onRemove(ing.id)}
                        aria-label={`${ing.name} 삭제`}
                        className="text-orange-400 hover:text-orange-700 dark:hover:text-orange-200"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ServingsAndSuggestButton
        servings={servings}
        setServings={setServings}
        onSuggest={onSuggest}
        disabled={totalCount === 0}
        loading={suggestLoading}
      />
    </div>
  );
}

function ServingsAndSuggestButton({
  servings,
  setServings,
  onSuggest,
  disabled,
  loading,
}: {
  servings: number;
  setServings: (n: number) => void;
  onSuggest: () => void;
  disabled: boolean;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-2 text-sm font-medium text-zinc-500">인분 수</p>
      <div className="mb-4 flex gap-2">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <button
            key={n}
            onClick={() => setServings(n)}
            className={`h-10 w-10 shrink-0 rounded-full text-sm font-medium transition-colors ${
              servings === n
                ? "bg-orange-600 text-white"
                : "bg-orange-50 text-orange-800 dark:bg-zinc-800 dark:text-orange-200"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <button
        onClick={onSuggest}
        disabled={disabled || loading}
        className="w-full rounded-xl bg-orange-600 py-3.5 text-base font-semibold text-white shadow-md disabled:opacity-40"
      >
        {loading ? "레시피 생각 중..." : `${servings}인분 레시피 추천받기`}
      </button>
    </div>
  );
}

function RecipesView({
  servings,
  setServings,
  onSuggest,
  suggestLoading,
  suggestError,
  suggestions,
  hasIngredients,
  resultView,
  setResultView,
}: {
  servings: number;
  setServings: (n: number) => void;
  onSuggest: () => void;
  suggestLoading: boolean;
  suggestError: string | null;
  suggestions: SuggestResponse | null;
  hasIngredients: boolean;
  resultView: "full" | "near";
  setResultView: (v: "full" | "near") => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <ServingsAndSuggestButton
        servings={servings}
        setServings={setServings}
        onSuggest={onSuggest}
        disabled={!hasIngredients}
        loading={suggestLoading}
      />

      {!hasIngredients && !suggestions && (
        <p className="text-center text-sm text-zinc-400">
          먼저 &apos;내 재료&apos; 탭에서 재료를 추가해주세요.
        </p>
      )}

      {suggestError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {suggestError}
        </p>
      )}

      {suggestions && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 rounded-xl bg-orange-100/60 p-1 dark:bg-zinc-800">
            <button
              onClick={() => setResultView("full")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                resultView === "full"
                  ? "bg-white text-orange-900 shadow-sm dark:bg-zinc-900 dark:text-orange-100"
                  : "text-orange-700/60 dark:text-orange-200/50"
              }`}
            >
              🍳 지금 바로 ({suggestions.fullMatches.length})
            </button>
            <button
              onClick={() => setResultView("near")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                resultView === "near"
                  ? "bg-white text-orange-900 shadow-sm dark:bg-zinc-900 dark:text-orange-100"
                  : "text-orange-700/60 dark:text-orange-200/50"
              }`}
            >
              🛒 조금만 더 사면 ({suggestions.nearMisses.length})
            </button>
          </div>

          {resultView === "full" ? (
            <div className="flex flex-col gap-4">
              {suggestions.fullMatches.map((recipe, i) => (
                <RecipeCard key={i} recipe={recipe} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {suggestions.nearMisses.map((recipe, i) => (
                <RecipeCard
                  key={i}
                  recipe={recipe}
                  missing={recipe.missingIngredients}
                />
              ))}
            </div>
          )}
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
  missing?: IngredientAmount[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3 bg-orange-50 p-4 dark:bg-zinc-800">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-3xl dark:bg-zinc-900">
          {recipe.emoji}
        </div>
        <div>
          <h3 className="font-semibold text-orange-950 dark:text-orange-50">
            {recipe.name}
          </h3>
          {missing && missing.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {missing.map((item) => (
                <span
                  key={item.name}
                  className="rounded-full bg-orange-200 px-2.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/50 dark:text-orange-300"
                >
                  장보기: {item.name} {item.amount}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {recipe.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recipe.ingredientsUsed.map((item) => (
            <span
              key={item.name}
              className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {item.name} {item.amount}
            </span>
          ))}
        </div>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          {recipe.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
