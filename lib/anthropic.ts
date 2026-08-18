import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod/v4";
import { CATEGORY_IDS, type CategoryId } from "./categories";

const DishSchema = z.object({
  name: z.string(),
});

const NearMissDishSchema = z.object({
  name: z.string(),
  missingIngredients: z.array(z.string()),
});

const DishSuggestionSchema = z.object({
  fullMatches: z.array(DishSchema),
  nearMisses: z.array(NearMissDishSchema),
});

export type Dish = z.infer<typeof DishSchema>;
export type NearMissDish = z.infer<typeof NearMissDishSchema>;
export type DishSuggestionResult = z.infer<typeof DishSuggestionSchema>;

const SYSTEM_PROMPT = `당신은 한국 가정식(집밥)을 잘 아는 요리 도우미입니다.
사용자는 지금 집에 있는 재료의 "이름"만 알려줍니다 (수량이나 유통기한 정보는 없음).
목록에 없는 재료는 절대 가지고 있다고 가정하지 마세요. 소금, 식용유, 물 같은 기본 조미료도 목록에 없으면 없는 것으로 취급하세요.

두 종류의 추천을 만드세요:
1. fullMatches: 지금 가진 재료만으로 바로 만들 수 있는 요리 이름 2~4개
2. nearMisses: 재료가 1~2개만 더 있으면 만들 수 있는 요리 이름 2~4개 (missingIngredients에 부족한 재료를 정확히 1~2개 적을 것)

요리 이름은 유튜브에서 검색했을 때 실제 레시피 영상이 잘 나올 만한, 널리 알려진 한국 가정식 요리명으로 짧고 명확하게 적으세요 (예: "김치찌개", "계란말이"). 조리법이나 재료 설명은 적지 마세요, 이름만 필요합니다.

실제로 맛있고 한국 가정에서 흔히 해먹는 요리로만 추천하세요.`;

export async function suggestDishNames(
  pantry: string[],
): Promise<DishSuggestionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.parse({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    output_config: {
      format: zodOutputFormat(DishSuggestionSchema),
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `현재 집에 있는 재료: ${pantry.join(", ")}\n\n위 재료로 fullMatches와 nearMisses 요리 이름을 추천해줘.`,
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
      "sauce(조미료/소스), etc(그 외 분류하기 애매한 재료).\n\n" +
      "이름만 보고 색깔이나 브랜드명을 재료 종류로 착각하지 마세요. " +
      "예: '연두'(순/진 등 표기 포함)는 액상 조미료 브랜드이므로 sauce로 분류하세요 " +
      "(연두색이라는 색상이 아닙니다). 마찬가지로 '맛술', '참치액', '굴소스', '쯔유' 같은 " +
      "액상·병입 조미료류는 채소나 수산물이 아니라 sauce로 분류하세요.",
    messages: [{ role: "user", content: `재료 이름: ${name}` }],
  });

  return message.parsed_output?.category ?? "etc";
}
