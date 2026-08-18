export interface RecipeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  videoUrl: string;
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

function decodeHtmlEntities(text: string): string {
  return text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, (match) => HTML_ENTITIES[match]);
}

export async function searchRecipeVideo(
  dishName: string,
): Promise<RecipeVideo | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY environment variable is not set");
  }

  const params = new URLSearchParams({
    part: "snippet",
    q: `${dishName} 레시피`,
    type: "video",
    maxResults: "1",
    videoEmbeddable: "true",
    relevanceLanguage: "ko",
    safeSearch: "strict",
    key: apiKey,
  });

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
  );

  if (!res.ok) {
    throw new Error(`YouTube search failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const item = data.items?.[0];
  if (!item) return null;

  const thumbnail =
    item.snippet.thumbnails?.medium?.url ??
    item.snippet.thumbnails?.default?.url;

  return {
    videoId: item.id.videoId,
    title: decodeHtmlEntities(item.snippet.title),
    channelTitle: decodeHtmlEntities(item.snippet.channelTitle),
    thumbnailUrl: thumbnail,
    videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  };
}
