export const CATEGORIES = [
  { id: "veggie", label: "채소/과일", emoji: "🥬" },
  { id: "meat", label: "육류/수산", emoji: "🥩" },
  { id: "dairy", label: "난류/유제품", emoji: "🥚" },
  { id: "grain", label: "곡물/면류", emoji: "🍚" },
  { id: "sauce", label: "조미료/소스", emoji: "🧂" },
  { id: "etc", label: "기타", emoji: "🧺" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as CategoryId[];

export function getCategory(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
