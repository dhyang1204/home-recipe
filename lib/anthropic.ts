import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod/v4";

const RecipeSchema = z.object({
  name: z.string(),
  ingredientsUsed: z.array(z.string()),
  steps: z.array(z.string()),
});

const NearMissRecipeSchema = RecipeSchema.extend({
  missingIngredients: z.array(z.string()),
});

const SuggestionResultSchema = z.object({
  fullMatches: z.array(RecipeSchema),
  nearMisses: z.array(NearMissRecipeSchema),
});

export type Recipe = z.infer<typeof RecipeSchema>;
export type NearMissRecipe = z.infer<typeof NearMissRecipeSchema>;
export type SuggestionResult = z.infer<typeof SuggestionResultSchema>;

const SYSTEM_PROMPT = `당신은 한국 가정식(집밥)을 잘 아는 요리 도우미입니다.
사용자는 지금 집에 있는 재료의 "이름"만 알려줍니다 (수량이나 유통기한 정보는 없음).
목록에 없는 재료는 절대 가지고 있다고 가정하지 마세요. 소금, 식용유, 물 같은 기본 조미료도 목록에 없으면 없는 것으로 취급하세요.

두 종류의 추천을 만드세요:
1. fullMatches: 지금 가진 재료만으로 바로 만들 수 있는 요리 2~4개
2. nearMisses: 재료가 1~2개만 더 있으면 만들 수 있는 요리 2~4개 (missingIngredients에 부족한 재료를 정확히 1~2개 적을 것)

각 요리는 실제로 맛있고 한국 가정에서 흔히 해먹는 요리로 추천하고, steps는 조리 순서를 번호 없이 간결한 한국어 문장으로 나열하세요.`;

export async function suggestRecipes(
  pantry: string[],
): Promise<SuggestionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.parse({
    model: "claude-sonnet-5",
    max_tokens: 4096,
    output_config: {
      effort: "medium",
      format: zodOutputFormat(SuggestionResultSchema),
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `현재 집에 있는 재료: ${pantry.join(", ")}\n\n위 재료를 바탕으로 fullMatches와 nearMisses를 추천해줘.`,
      },
    ],
  });

  if (!message.parsed_output) {
    throw new Error("Claude did not return a parseable structured output");
  }

  return message.parsed_output;
}
