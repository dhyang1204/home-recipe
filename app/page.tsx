"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CATEGORIES } from "@/lib/categories";
import type { Dish, NearMissDish } from "@/lib/anthropic";
import type { RecipeVideo } from "@/lib/youtube";

interface Ingredient {
  id: string;
  name: string;
  category: string;
  created_at: string;
}

type DishWithVideo = Dish & { video: RecipeVideo | null };
type NearMissDishWithVideo = NearMissDish & { video: RecipeVideo | null };

interface SuggestResponse {
  fullMatches: DishWithVideo[];
  nearMisses: NearMissDishWithVideo[];
}

type Tab = "home" | "recipes" | "ingredients";

export default function Home() {
  const [tab, setTab] = useState<Tab>("home");

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [newName, setNewName] = useState("");
  const [addingIngredient, setAddingIngredient] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

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
    setAddingIngredient(true);
    const res = await fetch("/api/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (res.ok) {
      setNewName("");
      await loadIngredients();
    } else {
      const data = await res.json().catch(() => null);
      setAddError(data?.error ?? "재료를 추가하지 못했습니다.");
    }
    setAddingIngredient(false);
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

    const res = await fetch("/api/suggest", { method: "POST" });
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
        {tab === "home" && (
          <HomeView
            ingredientCount={ingredients.length}
            onSuggest={handleSuggest}
            suggestLoading={suggestLoading}
            goToIngredients={() => setTab("ingredients")}
          />
        )}
        {tab === "ingredients" && (
          <IngredientsView
            grouped={grouped}
            totalCount={ingredients.length}
            loading={loadingIngredients}
            newName={newName}
            setNewName={setNewName}
            addingIngredient={addingIngredient}
            addError={addError}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onSuggest={handleSuggest}
            suggestLoading={suggestLoading}
          />
        )}
        {tab === "recipes" && (
          <RecipesView
            onSuggest={handleSuggest}
            suggestLoading={suggestLoading}
            suggestError={suggestError}
            suggestions={suggestions}
            hasIngredients={ingredients.length > 0}
            resultView={resultView}
            setResultView={setResultView}
            goToIngredients={() => setTab("ingredients")}
          />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-orange-100 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-2xl gap-1.5 p-1.5">
          <TabButton
            active={tab === "home"}
            emoji="🏠"
            label="홈"
            onClick={() => setTab("home")}
          />
          <TabButton
            active={tab === "recipes"}
            emoji="🍳"
            label="레시피 추천"
            onClick={() => setTab("recipes")}
          />
          <TabButton
            active={tab === "ingredients"}
            emoji="🥬"
            label="내 재료"
            onClick={() => setTab("ingredients")}
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
      className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-orange-600 text-white shadow-sm"
          : "text-zinc-400 hover:bg-orange-50 dark:text-zinc-500 dark:hover:bg-zinc-800"
      }`}
    >
      <span className="text-xl">{emoji}</span>
      {label}
    </button>
  );
}

function HomeView({
  ingredientCount,
  onSuggest,
  suggestLoading,
  goToIngredients,
}: {
  ingredientCount: number;
  onSuggest: () => void;
  suggestLoading: boolean;
  goToIngredients: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-orange-100 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-5xl">🍚</div>
        <h2 className="mt-3 text-lg font-bold text-orange-950 dark:text-orange-50">
          집에 있는 재료로, 오늘 뭐 해먹지?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          냉장고 속 재료를 등록해두면 AI가 지금 바로 만들 수 있는 요리와,
          한두 가지만 더 사면 만들 수 있는 요리를 골라주고, 실제 유튜브
          레시피 영상까지 바로 찾아드려요.
        </p>
      </div>

      <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500">
          현재 등록된 재료{" "}
          <span className="font-semibold text-orange-700 dark:text-orange-300">
            {ingredientCount}개
          </span>
        </p>

        {ingredientCount === 0 ? (
          <button
            onClick={goToIngredients}
            className="mt-4 w-full rounded-xl bg-orange-600 py-3.5 text-base font-semibold text-white shadow-md"
          >
            재료부터 등록하기
          </button>
        ) : (
          <button
            onClick={onSuggest}
            disabled={suggestLoading}
            className="mt-4 w-full rounded-xl bg-orange-600 py-3.5 text-base font-semibold text-white shadow-md disabled:opacity-40"
          >
            {suggestLoading ? "레시피 찾는 중..." : "레시피 추천받기"}
          </button>
        )}
      </div>
    </div>
  );
}

function IngredientsView({
  grouped,
  totalCount,
  loading,
  newName,
  setNewName,
  addingIngredient,
  addError,
  onAdd,
  onRemove,
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
  addingIngredient: boolean;
  addError: string | null;
  onAdd: (e: React.FormEvent) => void;
  onRemove: (id: string) => void;
  onSuggest: () => void;
  suggestLoading: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={onAdd}
        className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="예: 계란"
            className="min-w-0 flex-1 rounded-lg border border-orange-100 bg-transparent px-4 py-2.5 text-base outline-none focus:border-orange-400 dark:border-zinc-700 dark:focus:border-orange-500"
          />
          <button
            type="submit"
            disabled={newName.trim().length === 0 || addingIngredient}
            className="shrink-0 whitespace-nowrap rounded-lg bg-orange-600 px-5 py-2.5 font-medium text-white disabled:opacity-40"
          >
            {addingIngredient ? "분류 중..." : "추가"}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          카테고리는 재료 이름을 보고 자동으로 분류돼요.
        </p>
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

      <button
        onClick={onSuggest}
        disabled={totalCount === 0 || suggestLoading}
        className="w-full rounded-xl bg-orange-600 py-3.5 text-base font-semibold text-white shadow-md disabled:opacity-40"
      >
        {suggestLoading ? "레시피 찾는 중..." : "레시피 추천받기"}
      </button>
    </div>
  );
}

function RecipesView({
  onSuggest,
  suggestLoading,
  suggestError,
  suggestions,
  hasIngredients,
  resultView,
  setResultView,
  goToIngredients,
}: {
  onSuggest: () => void;
  suggestLoading: boolean;
  suggestError: string | null;
  suggestions: SuggestResponse | null;
  hasIngredients: boolean;
  resultView: "full" | "near";
  setResultView: (v: "full" | "near") => void;
  goToIngredients: () => void;
}) {
  if (!suggestions && !suggestLoading) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-orange-100 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-4xl">🍳</div>
        {suggestError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {suggestError}
          </p>
        )}
        {hasIngredients ? (
          <>
            <p className="text-sm text-zinc-500">
              아직 추천받은 레시피가 없어요.
            </p>
            <button
              onClick={onSuggest}
              className="w-full rounded-xl bg-orange-600 py-3.5 text-base font-semibold text-white shadow-md"
            >
              레시피 추천받기
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-zinc-500">
              먼저 &apos;내 재료&apos; 탭에서 재료를 추가해주세요.
            </p>
            <button
              onClick={goToIngredients}
              className="w-full rounded-xl bg-orange-600 py-3.5 text-base font-semibold text-white shadow-md"
            >
              재료 등록하러 가기
            </button>
          </>
        )}
      </div>
    );
  }

  if (suggestLoading) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-orange-100 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-4xl animate-bounce">🍳</div>
        <p className="text-sm text-zinc-500">레시피 찾는 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onSuggest}
        className="self-end text-xs font-medium text-orange-600 underline-offset-2 hover:underline dark:text-orange-400"
      >
        ↻ 다시 추천받기
      </button>

      {suggestions && (
        <>
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
              {suggestions.fullMatches.map((dish, i) => (
                <RecipeCard key={i} dish={dish} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {suggestions.nearMisses.map((dish, i) => (
                <RecipeCard
                  key={i}
                  dish={dish}
                  missing={dish.missingIngredients}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RecipeCard({
  dish,
  missing,
}: {
  dish: DishWithVideo;
  missing?: string[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="p-4 pb-2">
        <h3 className="font-semibold text-orange-950 dark:text-orange-50">
          {dish.name}
        </h3>
        {missing && missing.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {missing.map((item) => (
              <span
                key={item}
                className="rounded-full bg-orange-200 px-2.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/50 dark:text-orange-300"
              >
                장보기: {item}
              </span>
            ))}
          </div>
        )}
      </div>

      {dish.video ? (
        <a
          href={dish.video.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-800">
            <Image
              src={dish.video.thumbnailUrl}
              alt={dish.video.title}
              fill
              sizes="(max-width: 640px) 100vw, 640px"
              className="object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/20">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-xl text-white">
                ▶
              </div>
            </div>
          </div>
          <div className="p-3">
            <p className="line-clamp-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {dish.video.title}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {dish.video.channelTitle}
            </p>
          </div>
        </a>
      ) : (
        <a
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
            dish.name + " 레시피",
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block px-4 pb-4 text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
        >
          유튜브에서 &quot;{dish.name}&quot; 검색하기 →
        </a>
      )}
    </div>
  );
}
