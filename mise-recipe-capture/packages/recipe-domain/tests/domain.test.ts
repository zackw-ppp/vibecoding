import { describe, expect, it } from "vitest";

import {
  EvidenceReferenceSchema,
  IngredientSchema,
  LocalizedTextSchema,
  RecipeSchema,
  RecipeStepSchema,
  RecipeVersionSchema,
} from "../src/index";

const ids = {
  owner: "00000000-0000-4000-8000-000000000001",
  recipe: "00000000-0000-4000-8000-000000000002",
  source: "00000000-0000-4000-8000-000000000003",
  snapshot: "00000000-0000-4000-8000-000000000004",
  working: "00000000-0000-4000-8000-000000000005",
  ingredient: "00000000-0000-4000-8000-000000000006",
  step: "00000000-0000-4000-8000-000000000007",
} as const;

const text = {
  original: "番茄炒蛋",
  originalLocale: "zh-CN",
  enUS: "Tomato and eggs",
};

const ingredient = {
  id: ids.ingredient,
  groupId: null,
  sortOrder: 0,
  originalText: "盐适量",
  canonicalKey: "salt",
  name: {
    original: "盐",
    originalLocale: "zh-CN",
    enUS: "salt",
  },
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
  evidence: [],
};

const step = {
  id: ids.step,
  sortOrder: 0,
  instruction: text,
  ingredientIds: [ids.ingredient],
  sourceRange: null,
  durationSeconds: null,
  temperature: null,
  tools: [],
  evidenceState: "explicit",
  evidence: [],
  hasReliableVisual: false,
  media: [],
};

function version(
  id: string,
  kind: "source_snapshot" | "working",
  immutable: boolean,
  parentVersionId: string | null,
) {
  return {
    id,
    recipeId: ids.recipe,
    kind,
    parentVersionId,
    label: null,
    immutable,
    description: null,
    ingredientGroups: [],
    ingredients: [ingredient],
    steps: [step],
    createdAt: "2026-08-13T05:00:00Z",
    updatedAt: "2026-08-13T05:00:00Z",
  };
}

describe("localized text", () => {
  it("keeps source text mandatory and rejects unknown fields", () => {
    expect(LocalizedTextSchema.safeParse(text).success).toBe(true);
    expect(
      LocalizedTextSchema.safeParse({
        ...text,
        original: "",
      }).success,
    ).toBe(false);
    expect(
      LocalizedTextSchema.safeParse({
        ...text,
        silentlyAccepted: true,
      }).success,
    ).toBe(false);
  });
});

describe("evidence and quantities", () => {
  it("requires an OCR bounding box and ordered time ranges", () => {
    expect(
      EvidenceReferenceSchema.safeParse({
        id: ids.source,
        type: "ocr",
        startSeconds: 3,
        endSeconds: 2,
        relation: "supports",
      }).success,
    ).toBe(false);
  });

  it("preserves an imprecise source quantity without inventing a number", () => {
    const parsed = IngredientSchema.parse(ingredient);
    expect(parsed.quantity.minimum).toBeNull();
    expect(parsed.quantity.originalText).toBe("适量");

    expect(
      IngredientSchema.safeParse({
        ...ingredient,
        quantity: {
          ...ingredient.quantity,
          minimum: 2,
          maximum: 1,
        },
      }).success,
    ).toBe(false);
  });
});

describe("recipe aggregate invariants", () => {
  it("rejects step references to ingredients outside the version", () => {
    expect(
      RecipeVersionSchema.safeParse({
        ...version(ids.working, "working", false, ids.snapshot),
        steps: [
          {
            ...step,
            ingredientIds: [ids.owner],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects clips without a source range", () => {
    expect(
      RecipeStepSchema.safeParse({
        ...step,
        media: [
          {
            id: ids.source,
            kind: "step_clip",
            storagePath: `${ids.owner}/${ids.recipe}/step_clip/clip.mp4`,
            mimeType: "video/mp4",
            width: 480,
            height: 270,
            durationSeconds: 5,
            sourceTimestampSeconds: 12,
            alt: null,
            expiresAt: null,
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("requires source snapshot and editable working versions", () => {
    const recipe = {
      id: ids.recipe,
      ownerId: ids.owner,
      sourceId: ids.source,
      title: text,
      status: "needs_review",
      cover: null,
      servings: { value: 2, label: "2 servings" },
      prepMinutes: 5,
      cookMinutes: 10,
      tags: ["quick"],
      favorite: false,
      currentVersionId: ids.working,
      revision: 1,
      versions: [
        version(ids.snapshot, "source_snapshot", true, null),
        version(ids.working, "working", false, ids.snapshot),
      ],
      createdAt: "2026-08-13T05:00:00Z",
      updatedAt: "2026-08-13T05:00:00Z",
    };

    expect(RecipeSchema.parse(recipe).versions).toHaveLength(2);
    expect(
      RecipeSchema.safeParse({
        ...recipe,
        versions: [
          version(ids.snapshot, "source_snapshot", false, null),
          version(ids.working, "working", false, ids.snapshot),
        ],
      }).success,
    ).toBe(false);
  });
});
