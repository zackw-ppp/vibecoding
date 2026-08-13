import {
  ImportResultSchema,
  PlatformSchema,
  SourceBundleSchema,
  SourceContentTypeSchema,
  type ImportResult,
  type SourceBundle,
} from "@mise/platform-contracts";
import {
  RecipeSchema,
  ReviewIssueSchema,
  type EvidenceReference,
  type LocalizedText,
  type MediaAssetReference,
  type Recipe,
  type ReviewIssue,
} from "@mise/recipe-domain";
import { z } from "zod";

const scenarioId = z.enum([
  "zh-short-ocr-led",
  "zh-short-narration-led",
  "en-tiktok-style",
  "xiaohongshu-image-post",
  "missing-quantities",
  "multiple-recipes",
  "rapid-cuts-repeated-scenes",
  "long-form-video",
]);
export type FixtureScenarioId = z.infer<typeof scenarioId>;

export const FixtureScenarioDescriptorSchema = z
  .object({
    id: scenarioId,
    title: z
      .object({
        zhCN: z.string().trim().min(1),
        enUS: z.string().trim().min(1),
      })
      .strict(),
    platform: PlatformSchema,
    contentType: SourceContentTypeSchema,
    primarySignal: z.enum([
      "ocr",
      "narration",
      "native_caption",
      "post_text",
      "mixed",
    ]),
    durationSeconds: z.number().int().positive().nullable(),
    expectedReviewIssues: z.array(z.string().trim().min(1)),
    exercises: z.array(z.string().trim().min(1)).min(1),
    fixtureUri: z.string().startsWith("fixture://"),
  })
  .strict();
export type FixtureScenarioDescriptor = z.infer<
  typeof FixtureScenarioDescriptorSchema
>;

export const fixtureScenarioDescriptors = freezeFixture(
  z.array(FixtureScenarioDescriptorSchema)
    .length(8)
    .parse([
      {
        id: "zh-short-ocr-led",
        title: {
          zhCN: "中文短视频：画面字幕主导",
          enUS: "Chinese short video: OCR-led",
        },
        platform: "douyin",
        contentType: "video",
        primarySignal: "ocr",
        durationSeconds: 42,
        expectedReviewIssues: ["missing_visual_match"],
        exercises: ["dense on-screen text", "OCR timing", "step alignment"],
        fixtureUri: "fixture://scenarios/zh-short-ocr-led",
      },
      {
        id: "zh-short-narration-led",
        title: {
          zhCN: "中文短视频：旁白主导",
          enUS: "Chinese short video: narration-led",
        },
        platform: "bilibili",
        contentType: "video",
        primarySignal: "narration",
        durationSeconds: 78,
        expectedReviewIssues: ["low_confidence_step_boundary"],
        exercises: ["ASR fallback", "mixed-language ingredient names"],
        fixtureUri: "fixture://scenarios/zh-short-narration-led",
      },
      {
        id: "en-tiktok-style",
        title: {
          zhCN: "英文 TikTok 风格视频",
          enUS: "English TikTok-style video",
        },
        platform: "tiktok",
        contentType: "video",
        primarySignal: "mixed",
        durationSeconds: 55,
        expectedReviewIssues: ["translation_warning"],
        exercises: ["English source", "Chinese translation", "imperial units"],
        fixtureUri: "fixture://scenarios/en-tiktok-style",
      },
      {
        id: "xiaohongshu-image-post",
        title: {
          zhCN: "小红书多图笔记",
          enUS: "Xiaohongshu multi-image post",
        },
        platform: "xiaohongshu",
        contentType: "image_post",
        primarySignal: "post_text",
        durationSeconds: null,
        expectedReviewIssues: ["missing_visual_match"],
        exercises: ["image ordering", "post text", "no video timeline"],
        fixtureUri: "fixture://scenarios/xiaohongshu-image-post",
      },
      {
        id: "missing-quantities",
        title: {
          zhCN: "没有明确用量",
          enUS: "Recipe without explicit quantities",
        },
        platform: "youtube",
        contentType: "video",
        primarySignal: "native_caption",
        durationSeconds: 310,
        expectedReviewIssues: ["missing_quantity", "ambiguous_unit"],
        exercises: ["null quantities", "source wording preservation"],
        fixtureUri: "fixture://scenarios/missing-quantities",
      },
      {
        id: "multiple-recipes",
        title: {
          zhCN: "一条内容包含两道菜",
          enUS: "Two recipes in one post",
        },
        platform: "bilibili",
        contentType: "video",
        primarySignal: "mixed",
        durationSeconds: 480,
        expectedReviewIssues: ["multiple_recipes"],
        exercises: ["candidate split", "blocking review issue"],
        fixtureUri: "fixture://scenarios/multiple-recipes",
      },
      {
        id: "rapid-cuts-repeated-scenes",
        title: {
          zhCN: "快速剪辑和重复场景",
          enUS: "Rapid cuts and repeated scenes",
        },
        platform: "douyin",
        contentType: "video",
        primarySignal: "mixed",
        durationSeconds: 36,
        expectedReviewIssues: ["low_confidence_step_boundary"],
        exercises: ["frame deduplication", "nonlinear edit order"],
        fixtureUri: "fixture://scenarios/rapid-cuts-repeated-scenes",
      },
      {
        id: "long-form-video",
        title: {
          zhCN: "二十七分钟长视频",
          enUS: "Twenty-seven-minute long-form video",
        },
        platform: "youtube",
        contentType: "video",
        primarySignal: "native_caption",
        durationSeconds: 1_620,
        expectedReviewIssues: ["possible_missing_ingredient"],
        exercises: ["sparse sampling", "caption-led segment selection"],
        fixtureUri: "fixture://scenarios/long-form-video",
      },
    ]),
);

const ids = {
  owner: "20000000-0000-4000-8000-000000000001",
  recipe: "20000000-0000-4000-8000-000000000002",
  source: "20000000-0000-4000-8000-000000000003",
  snapshot: "20000000-0000-4000-8000-000000000004",
  working: "20000000-0000-4000-8000-000000000005",
  cover: "20000000-0000-4000-8000-000000000400",
  keyframe1: "20000000-0000-4000-8000-000000000401",
  keyframe2: "20000000-0000-4000-8000-000000000402",
  keyframe3: "20000000-0000-4000-8000-000000000403",
  clip1: "20000000-0000-4000-8000-000000000501",
  clip2: "20000000-0000-4000-8000-000000000502",
  clip3: "20000000-0000-4000-8000-000000000503",
  proxy: "20000000-0000-4000-8000-000000000599",
  caption1: "20000000-0000-4000-8000-000000000601",
  caption2: "20000000-0000-4000-8000-000000000602",
  caption3: "20000000-0000-4000-8000-000000000603",
  ocr1: "20000000-0000-4000-8000-000000000611",
  visual1: "20000000-0000-4000-8000-000000000621",
  visual2: "20000000-0000-4000-8000-000000000622",
  visual3: "20000000-0000-4000-8000-000000000623",
  issue1: "20000000-0000-4000-8000-000000000701",
  issue2: "20000000-0000-4000-8000-000000000702",
} as const;

const importedAt = "2026-08-12T12:00:00Z";
const updatedAt = "2026-08-12T12:05:00Z";

function localized(
  original: string,
  enUS: string,
  zhCN?: string,
): LocalizedText {
  return {
    original,
    originalLocale: "zh-CN",
    zhCN: zhCN ?? original,
    enUS,
  };
}

function media(
  id: string,
  kind: MediaAssetReference["kind"],
  storagePath: string,
  mimeType: string,
  sourceTimestampSeconds: number | null,
  durationSeconds: number | null = null,
): MediaAssetReference {
  return {
    id,
    kind,
    storagePath,
    mimeType,
    width: kind === "step_clip" || kind === "review_proxy" ? 480 : 960,
    height: kind === "step_clip" || kind === "review_proxy" ? 270 : 540,
    durationSeconds,
    sourceTimestampSeconds,
    alt:
      kind === "step_clip" || kind === "review_proxy"
        ? null
        : localized("番茄炒蛋步骤画面", "Tomato and egg cooking step"),
    expiresAt:
      kind === "review_proxy" ? "2026-08-13T12:00:00Z" : null,
  };
}

const cover = media(
  ids.cover,
  "cover",
  `${ids.owner}/${ids.recipe}/cover/cover.svg`,
  "image/svg+xml",
  22,
);
const keyframes: [
  MediaAssetReference,
  MediaAssetReference,
  MediaAssetReference,
] = [
  media(
    ids.keyframe1,
    "keyframe",
    `${ids.owner}/${ids.recipe}/keyframe/01.svg`,
    "image/svg+xml",
    8,
  ),
  media(
    ids.keyframe2,
    "keyframe",
    `${ids.owner}/${ids.recipe}/keyframe/02.svg`,
    "image/svg+xml",
    22,
  ),
  media(
    ids.keyframe3,
    "keyframe",
    `${ids.owner}/${ids.recipe}/keyframe/03.svg`,
    "image/svg+xml",
    36,
  ),
];
const clips: [
  MediaAssetReference,
  MediaAssetReference,
  MediaAssetReference,
] = [
  media(
    ids.clip1,
    "step_clip",
    `${ids.owner}/${ids.recipe}/step_clip/01.fixture.json`,
    "application/vnd.mise.fixture-clip+json",
    7,
    5,
  ),
  media(
    ids.clip2,
    "step_clip",
    `${ids.owner}/${ids.recipe}/step_clip/02.fixture.json`,
    "application/vnd.mise.fixture-clip+json",
    20,
    7,
  ),
  media(
    ids.clip3,
    "step_clip",
    `${ids.owner}/${ids.recipe}/step_clip/03.fixture.json`,
    "application/vnd.mise.fixture-clip+json",
    34,
    6,
  ),
];

function evidence(
  id: string,
  text: string,
  startSeconds: number,
  endSeconds: number,
): EvidenceReference {
  return {
    id,
    type: "native_caption",
    text,
    startSeconds,
    endSeconds,
    relation: "supports",
  };
}

function versionContent(
  prefix: "1" | "2",
): Pick<
  Recipe["versions"][number],
  "ingredientGroups" | "ingredients" | "steps"
> {
  const groupId = `20000000-0000-4000-8000-000000000${prefix}00`;
  const tomatoId = `20000000-0000-4000-8000-000000000${prefix}01`;
  const eggId = `20000000-0000-4000-8000-000000000${prefix}02`;
  const saltId = `20000000-0000-4000-8000-000000000${prefix}03`;
  const step1Id = `20000000-0000-4000-8000-000000000${prefix}11`;
  const step2Id = `20000000-0000-4000-8000-000000000${prefix}12`;
  const step3Id = `20000000-0000-4000-8000-000000000${prefix}13`;

  return {
    ingredientGroups: [
      {
        id: groupId,
        sortOrder: 0,
        name: localized("主料", "Main ingredients"),
      },
    ],
    ingredients: [
      {
        id: tomatoId,
        groupId,
        sortOrder: 0,
        originalText: "番茄 2 个",
        canonicalKey: "tomato",
        name: localized("番茄", "tomato"),
        quantity: {
          minimum: 2,
          maximum: 2,
          originalText: "2 个",
          unitOriginal: "个",
          unitNormalized: "piece",
          approximate: false,
          suggestedValue: null,
        },
        preparation: localized("切块", "cut into wedges"),
        optional: false,
        evidenceState: "explicit",
        evidence: [evidence(ids.caption1, "两个番茄切块", 3, 8)],
      },
      {
        id: eggId,
        groupId,
        sortOrder: 1,
        originalText: "鸡蛋 3 个",
        canonicalKey: "egg",
        name: localized("鸡蛋", "egg"),
        quantity: {
          minimum: 3,
          maximum: 3,
          originalText: "3 个",
          unitOriginal: "个",
          unitNormalized: "piece",
          approximate: false,
          suggestedValue: null,
        },
        preparation: localized("打散", "beaten"),
        optional: false,
        evidenceState: "corroborated",
        evidence: [evidence(ids.caption2, "三个鸡蛋打散", 10, 15)],
      },
      {
        id: saltId,
        groupId,
        sortOrder: 2,
        originalText: "盐适量",
        canonicalKey: "salt",
        name: localized("盐", "salt"),
        quantity: {
          minimum: null,
          maximum: null,
          originalText: "适量",
          unitOriginal: null,
          unitNormalized: null,
          approximate: true,
          suggestedValue: null,
        },
        preparation: null,
        optional: false,
        evidenceState: "explicit",
        evidence: [evidence(ids.caption3, "最后加盐调味", 37, 40)],
      },
    ],
    steps: [
      {
        id: step1Id,
        sortOrder: 0,
        instruction: localized("番茄切块，鸡蛋打散。", "Cut the tomatoes and beat the eggs."),
        ingredientIds: [tomatoId, eggId],
        sourceRange: { startSeconds: 3, endSeconds: 15 },
        durationSeconds: null,
        temperature: null,
        tools: [localized("菜刀", "knife"), localized("碗", "bowl")],
        evidenceState: "corroborated",
        evidence: [
          evidence(ids.caption1, "两个番茄切块", 3, 8),
          evidence(ids.caption2, "三个鸡蛋打散", 10, 15),
        ],
        hasReliableVisual: true,
        media: [keyframes[0], clips[0]],
      },
      {
        id: step2Id,
        sortOrder: 1,
        instruction: localized(
          "锅热后炒鸡蛋，凝固时盛出。",
          "Scramble the eggs in a hot wok and remove when just set.",
        ),
        ingredientIds: [eggId],
        sourceRange: { startSeconds: 17, endSeconds: 28 },
        durationSeconds: 75,
        temperature: null,
        tools: [localized("炒锅", "wok")],
        evidenceState: "explicit",
        evidence: [evidence(ids.caption2, "鸡蛋炒到刚凝固就盛出", 18, 27)],
        hasReliableVisual: true,
        media: [keyframes[1], clips[1]],
      },
      {
        id: step3Id,
        sortOrder: 2,
        instruction: localized(
          "炒软番茄，倒回鸡蛋，加盐翻匀。",
          "Soften the tomatoes, return the eggs, season with salt, and toss.",
        ),
        ingredientIds: [tomatoId, eggId, saltId],
        sourceRange: { startSeconds: 29, endSeconds: 42 },
        durationSeconds: 120,
        temperature: null,
        tools: [localized("炒锅", "wok")],
        evidenceState: "corroborated",
        evidence: [evidence(ids.caption3, "最后加盐调味", 37, 40)],
        hasReliableVisual: true,
        media: [keyframes[2], clips[2]],
      },
    ],
  };
}

export const richRecipeFixture: Recipe = freezeFixture(
  RecipeSchema.parse({
    id: ids.recipe,
    ownerId: ids.owner,
    sourceId: ids.source,
    title: localized("家常番茄炒蛋", "Home-style tomato and eggs"),
    status: "needs_review",
    cover,
    servings: { value: 2, label: "2 人份" },
    prepMinutes: 8,
    cookMinutes: 7,
    tags: ["家常菜", "快手", "stovetop"],
    favorite: true,
    currentVersionId: ids.working,
    revision: 3,
    versions: [
      {
        id: ids.snapshot,
        recipeId: ids.recipe,
        kind: "source_snapshot",
        parentVersionId: null,
        label: localized("来源快照", "Source snapshot"),
        immutable: true,
        description: localized(
          "来源中的番茄炒蛋做法，保留原始模糊用量。",
          "The source method with its imprecise seasoning amount preserved.",
        ),
        ...versionContent("1"),
        createdAt: importedAt,
        updatedAt: importedAt,
      },
      {
        id: ids.working,
        recipeId: ids.recipe,
        kind: "working",
        parentVersionId: ids.snapshot,
        label: localized("当前版本", "Working version"),
        immutable: false,
        description: localized(
          "待确认盐的用量和步骤温度。",
          "Salt quantity and cooking temperature still need review.",
        ),
        ...versionContent("2"),
        createdAt: importedAt,
        updatedAt,
      },
    ],
    createdAt: importedAt,
    updatedAt,
  }),
);

const reviewProxy = media(
  ids.proxy,
  "review_proxy",
  `${ids.owner}/${ids.recipe}/review_proxy/proxy.fixture.json`,
  "application/vnd.mise.fixture-timeline+json",
  null,
  45,
);

export const richSourceBundleFixture: SourceBundle = freezeFixture(
  SourceBundleSchema.parse({
    schemaVersion: 1,
    source: {
      id: ids.source,
      platform: "fixture",
      contentType: "fixture",
      originalUrl: "fixture://scenarios/zh-short-ocr-led",
      canonicalUrl: "fixture://scenarios/zh-short-ocr-led",
      platformPostId: "fixture-tomato-eggs-v1",
      authorName: "Mise Fixture Kitchen",
      authorUrl: null,
      title: localized("家常番茄炒蛋", "Home-style tomato and eggs"),
      sourceLanguage: "zh-CN",
      publishedAt: "2026-08-01T08:00:00Z",
      importedAt,
      metadata: {
        fixture: true,
        rawMediaPersisted: false,
        scenario: "zh-short-ocr-led",
      },
    },
    postText: localized(
      "家常番茄炒蛋：番茄两个，鸡蛋三个，盐适量。",
      "Home-style tomato and eggs: two tomatoes, three eggs, salt to taste.",
    ),
    nativeCaptions: [
      {
        id: ids.caption1,
        startSeconds: 3,
        endSeconds: 8,
        text: "两个番茄切块",
        language: "zh-CN",
        confidence: 0.99,
      },
      {
        id: ids.caption2,
        startSeconds: 10,
        endSeconds: 27,
        text: "三个鸡蛋打散，炒到刚凝固就盛出",
        language: "zh-CN",
        confidence: 0.97,
      },
      {
        id: ids.caption3,
        startSeconds: 29,
        endSeconds: 40,
        text: "番茄炒软，倒回鸡蛋，最后加盐调味",
        language: "zh-CN",
        confidence: 0.98,
      },
    ],
    asrTranscript: [],
    ocrSegments: [
      {
        id: ids.ocr1,
        timestampSeconds: 4,
        text: "番茄 2个 / 鸡蛋 3个",
        language: "zh-CN",
        confidence: 0.96,
        bbox: [110, 70, 520, 95],
        keyframeAssetId: ids.keyframe1,
      },
    ],
    visualObservations: [
      {
        id: ids.visual1,
        startSeconds: 3,
        endSeconds: 15,
        observation: localized(
          "番茄被切成块，鸡蛋在碗中打散。",
          "Tomatoes are cut into wedges and eggs are beaten in a bowl.",
        ),
        confidence: 0.94,
        keyframeAssetIds: [ids.keyframe1],
      },
      {
        id: ids.visual2,
        startSeconds: 17,
        endSeconds: 28,
        observation: localized(
          "鸡蛋在炒锅中凝固后被盛出。",
          "Eggs set in a wok and are removed.",
        ),
        confidence: 0.91,
        keyframeAssetIds: [ids.keyframe2],
      },
      {
        id: ids.visual3,
        startSeconds: 29,
        endSeconds: 42,
        observation: localized(
          "番茄出汁后与鸡蛋混合。",
          "Tomatoes release juice before the eggs are folded back in.",
        ),
        confidence: 0.93,
        keyframeAssetIds: [ids.keyframe3],
      },
    ],
    sourceImages: [],
    keyframes,
    reviewProxy,
    generatedAt: updatedAt,
  }),
);

const workingSaltId = "20000000-0000-4000-8000-000000000203";
const workingStep2Id = "20000000-0000-4000-8000-000000000212";

export const richReviewIssuesFixture: readonly ReviewIssue[] = freezeFixture([
  ReviewIssueSchema.parse({
    id: ids.issue1,
    recipeId: ids.recipe,
    recipeVersionId: ids.working,
    type: "missing_quantity",
    severity: "warning",
    target: { entityType: "ingredient", entityId: workingSaltId },
    message: localized(
      "来源只写了“盐适量”，未提供精确用量。",
      'The source says "salt to taste" without an exact amount.',
    ),
    evidence: [evidence(ids.caption3, "最后加盐调味", 37, 40)],
    payload: {
      originalQuantityText: "适量",
      suggestedValue: null,
    },
    status: "open",
    resolution: null,
    createdAt: updatedAt,
    resolvedAt: null,
  }),
  ReviewIssueSchema.parse({
    id: ids.issue2,
    recipeId: ids.recipe,
    recipeVersionId: ids.working,
    type: "conflicting_temperature",
    severity: "info",
    target: { entityType: "step", entityId: workingStep2Id },
    message: localized(
      "来源没有明确说明火力或温度。",
      "The source does not explicitly state heat level or temperature.",
    ),
    evidence: [],
    payload: {
      sourceValue: null,
      visualInference: "medium-high heat",
      acceptedAsSourceFact: false,
    },
    status: "open",
    resolution: null,
    createdAt: updatedAt,
    resolvedAt: null,
  }),
]);

export const richImportResultFixture: ImportResult = freezeFixture(
  ImportResultSchema.parse({
    sourceBundle: richSourceBundleFixture,
    recipe: richRecipeFixture,
    reviewIssues: richReviewIssuesFixture,
  }),
);

/**
 * Text-only stand-ins let fixture consumers render deterministic media cards
 * without shipping videos. They are explicitly fixture manifests, not claims
 * that platform media was acquired.
 */
export const fixtureMediaTextByPath = freezeFixture({
  [`${ids.owner}/${ids.recipe}/cover/cover.svg`]:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><rect width="960" height="540" fill="#F5E4C8"/><text x="60" y="270" font-size="48">番茄炒蛋 · Fixture</text></svg>',
  [`${ids.owner}/${ids.recipe}/keyframe/01.svg`]:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><text x="60" y="270" font-size="44">01 · 切番茄 / 打鸡蛋</text></svg>',
  [`${ids.owner}/${ids.recipe}/keyframe/02.svg`]:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><text x="60" y="270" font-size="44">02 · 炒鸡蛋</text></svg>',
  [`${ids.owner}/${ids.recipe}/keyframe/03.svg`]:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><text x="60" y="270" font-size="44">03 · 合炒调味</text></svg>',
  [`${ids.owner}/${ids.recipe}/step_clip/01.fixture.json`]:
    '{"fixture":true,"startSeconds":3,"endSeconds":15,"frames":["01"]}',
  [`${ids.owner}/${ids.recipe}/step_clip/02.fixture.json`]:
    '{"fixture":true,"startSeconds":17,"endSeconds":28,"frames":["02"]}',
  [`${ids.owner}/${ids.recipe}/step_clip/03.fixture.json`]:
    '{"fixture":true,"startSeconds":29,"endSeconds":42,"frames":["03"]}',
  [`${ids.owner}/${ids.recipe}/review_proxy/proxy.fixture.json`]:
    '{"fixture":true,"durationSeconds":45,"rawMediaPersisted":false}',
});

function freezeFixture<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const key of Reflect.ownKeys(value)) {
      freezeFixture((value as Record<PropertyKey, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}
