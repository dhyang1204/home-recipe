import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod/v4";
import { CATEGORY_IDS, type CategoryId } from "./categories";

const IngredientAmountSchema = z.object({
  name: z.string(),
  amount: z.string(),
});

const RecipeSchema = z.object({
  emoji: z.string(),
  name: z.string(),
  description: z.string(),
  ingredientsUsed: z.array(IngredientAmountSchema),
  steps: z.array(z.string()),
});

const NearMissRecipeSchema = RecipeSchema.extend({
  missingIngredients: z.array(IngredientAmountSchema),
});

const SuggestionResultSchema = z.object({
  fullMatches: z.array(RecipeSchema),
  nearMisses: z.array(NearMissRecipeSchema),
});

export type IngredientAmount = z.infer<typeof IngredientAmountSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type NearMissRecipe = z.infer<typeof NearMissRecipeSchema>;
export type SuggestionResult = z.infer<typeof SuggestionResultSchema>;

const SYSTEM_PROMPT = `당신은 한국 가정식(집밥)을 잘 아는 요리 도우미입니다.
사용자는 지금 집에 있는 재료의 "이름"만 알려줍니다 (수량이나 유통기한 정보는 없음).
목록에 없는 재료는 절대 가지고 있다고 가정하지 마세요. 소금, 식용유, 물 같은 기본 조미료도 목록에 없으면 없는 것으로 취급하세요.

두 종류의 추천을 만드세요:
1. fullMatches: 지금 가진 재료만으로 바로 만들 수 있는 요리 2~4개
2. nearMisses: 재료가 1~2개만 더 있으면 만들 수 있는 요리 2~4개 (missingIngredients에 부족한 재료를 정확히 1~2개 적을 것)

각 요리에 대해 다음을 지켜서 작성하세요:
- emoji: 그 요리를 가장 잘 나타내는 이모지 1개
- description: 이 요리가 어떤 맛인지, 어떤 상황에 잘 어울리는지 2~3문장으로 소개
- ingredientsUsed / missingIngredients: 각 재료마다 "name"과 "amount"를 채우세요. amount는 반드시 사용자가 지정한 인분 수에 정확히 맞춘 실제 분량(예: "2개", "300ml", "1큰술", "반 개")으로 적으세요. 물, 육수 등 목록에 없던 재료라도 조리에 필요하면 missingIngredients(또는 이미 있는 조미료라면 ingredientsUsed)에 분량과 함께 포함하세요.
- steps: 최소 5단계 이상, 각 단계마다 시간·불 세기·써는 크기 등 구체적인 요령을 포함해 조리 초보자도 따라할 수 있을 만큼 자세히 작성 (번호는 붙이지 말 것)

실제로 맛있고 한국 가정에서 흔히 해먹는 요리로만 추천하세요.`;

export async function suggestRecipes(
  pantry: string[],
  servings: number,
): Promise<SuggestionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.parse({
    model: "claude-sonnet-5",
    max_tokens: 8192,
    output_config: {
      effort: "medium",
      format: zodOutputFormat(SuggestionResultSchema),
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `현재 집에 있는 재료: ${pantry.join(", ")}\n\n${servings}인분 기준으로 fullMatches와 nearMisses를 추천해줘. 모든 재료 분량은 반드시 ${servings}인분에 맞게 계산해줘.`,
      },
    ],
  });

  if (!message.parsed_output) {
    throw new Error("Claude did not return a parseable structured output");
  }

  return message.parsed_output;
}

const CategorySchema = z.object({
  category: z.enum(CATEGORY_IDS as [CategoryId, ...CategoryId[]]),
});

export async function categorizeIngredient(
  name: string,
): Promise<CategoryId> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.parse({
    model: "claude-haiku-4-5",
    max_tokens: 100,
    output_config: {
      format: zodOutputFormat(CategorySchema),
    },
    system:
      "식재료 이름을 보고 다음 카테고리 중 가장 알맞은 하나를 고르세요: " +
      "veggie(채소/과일), meat(육류/수산), dairy(난류/유제품), grain(곡물/면류), " +
      "sauce(조미료/소스), etc(그 외 분류하기 애매한 재료).",
    messages: [{ role: "user", content: `재료 이름: ${name}` }],
  });

  return message.parsed_output?.category ?? "etc";
}
