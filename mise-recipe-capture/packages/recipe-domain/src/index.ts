import { z } from "zod";

const nonBlankText = z.string().trim().min(1);
const nullableNonBlankText = nonBlankText.nullable();
const timestamp = z.string().datetime({ offset: true });
const seconds = z.number().finite().nonnegative();

export const SupportedContentLocaleSchema = z.enum(["zh-CN", "en-US"]);
export type SupportedContentLocale = z.infer<
  typeof SupportedContentLocaleSchema
>;

/**
 * Original source text is mandatory. Translations are additive and can never
 * replace the source-language value.
 */
export const LocalizedTextSchema = z
  .object({
    original: nonBlankText.max(100_000),
    originalLocale: nonBlankText.max(35),
    zhCN: nonBlankText.max(100_000).optional(),
    enUS: nonBlankText.max(100_000).optional(),
  })
  .strict();
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const EvidenceStateSchema = z.enum([
  "explicit",
  "corroborated",
  "inferred",
  "missing",
  "conflict",
  "user_confirmed",
]);
export type EvidenceState = z.infer<typeof EvidenceStateSchema>;

export const EvidenceTypeSchema = z.enum([
  "post_text",
  "native_caption",
  "asr",
  "ocr",
  "visual",
  "user",
]);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export const EvidenceRelationSchema = z.enum([
  "supports",
  "conflicts",
  "inferred_from",
]);
export type EvidenceRelation = z.infer<typeof EvidenceRelationSchema>;

export const BoundingBoxSchema = z
  .tuple([
    z.number().finite().nonnegative(),
    z.number().finite().nonnegative(),
    z.number().finite().positive(),
    z.number().finite().positive(),
  ])
  .describe("[x, y, width, height] in source-pixel or normalized coordinates");
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export const EvidenceReferenceSchema = z
  .object({
    id: z.string().uuid(),
    type: EvidenceTypeSchema,
    text: z.string().max(100_000).optional(),
    startSeconds: seconds.optional(),
    endSeconds: seconds.optional(),
    mediaAssetId: z.string().uuid().optional(),
    bbox: BoundingBoxSchema.optional(),
    relation: EvidenceRelationSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.startSeconds !== undefined &&
      value.endSeconds !== undefined &&
      value.endSeconds < value.startSeconds
    ) {
      context.addIssue({
        code: "custom",
        path: ["endSeconds"],
        message: "endSeconds must be greater than or equal to startSeconds",
      });
    }
    if (value.type === "ocr" && value.bbox === undefined) {
      context.addIssue({
        code: "custom",
        path: ["bbox"],
        message: "OCR evidence must include a bounding box",
      });
    }
  });
export type EvidenceReference = z.infer<typeof EvidenceReferenceSchema>;

export const SourceTimeRangeSchema = z
  .object({
    startSeconds: seconds,
    endSeconds: seconds,
  })
  .strict()
  .refine((range) => range.endSeconds >= range.startSeconds, {
    path: ["endSeconds"],
    message: "endSeconds must be greater than or equal to startSeconds",
  });
export type SourceTimeRange = z.infer<typeof SourceTimeRangeSchema>;

export const MediaAssetKindSchema = z.enum([
  "source_image",
  "keyframe",
  "step_clip",
  "cover",
  "review_proxy",
]);
export type MediaAssetKind = z.infer<typeof MediaAssetKindSchema>;

export const MediaAssetReferenceSchema = z
  .object({
    id: z.string().uuid(),
    kind: MediaAssetKindSchema,
    storagePath: nonBlankText
      .max(1_024)
      .refine(
        (path) =>
          !path.startsWith("/") &&
          !path.split("/").some((segment) => segment === ".."),
        "storagePath must be a relative, traversal-safe object path",
      ),
    mimeType: nonBlankText.max(255),
    width: z.number().int().positive().nullable().default(null),
    height: z.number().int().positive().nullable().default(null),
    durationSeconds: seconds.nullable().default(null),
    sourceTimestampSeconds: seconds.nullable().default(null),
    alt: LocalizedTextSchema.nullable().default(null),
    expiresAt: timestamp.nullable().default(null),
  })
  .strict()
  .superRefine((asset, context) => {
    if (asset.kind === "review_proxy" && asset.expiresAt === null) {
      context.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "review proxies must have an expiration time",
      });
    }
  });
export type MediaAssetReference = z.infer<typeof MediaAssetReferenceSchema>;

export const QuantitySchema = z
  .object({
    minimum: z.number().finite().nonnegative().nullable(),
    maximum: z.number().finite().nonnegative().nullable(),
    originalText: nullableNonBlankText,
    unitOriginal: nullableNonBlankText,
    unitNormalized: nullableNonBlankText,
    approximate: z.boolean(),
    suggestedValue: z
      .object({
        value: z.union([z.number().finite(), nonBlankText]),
        unit: nullableNonBlankText,
        rationale: LocalizedTextSchema,
      })
      .strict()
      .nullable()
      .default(null),
  })
  .strict()
  .superRefine((quantity, context) => {
    if (
      quantity.minimum !== null &&
      quantity.maximum !== null &&
      quantity.maximum < quantity.minimum
    ) {
      context.addIssue({
        code: "custom",
        path: ["maximum"],
        message: "maximum must be greater than or equal to minimum",
      });
    }
    if (
      quantity.minimum === null &&
      quantity.maximum !== null
    ) {
      context.addIssue({
        code: "custom",
        path: ["minimum"],
        message: "minimum is required when maximum is present",
      });
    }
  });
export type Quantity = z.infer<typeof QuantitySchema>;

export const IngredientGroupSchema = z
  .object({
    id: z.string().uuid(),
    sortOrder: z.number().int().nonnegative(),
    name: LocalizedTextSchema.nullable(),
  })
  .strict();
export type IngredientGroup = z.infer<typeof IngredientGroupSchema>;

export const IngredientSchema = z
  .object({
    id: z.string().uuid(),
    groupId: z.string().uuid().nullable(),
    sortOrder: z.number().int().nonnegative(),
    originalText: nonBlankText.max(10_000),
    canonicalKey: nullableNonBlankText,
    name: LocalizedTextSchema,
    quantity: QuantitySchema,
    preparation: LocalizedTextSchema.nullable(),
    optional: z.boolean(),
    evidenceState: EvidenceStateSchema,
    evidence: z.array(EvidenceReferenceSchema).max(100),
  })
  .strict()
  .superRefine((ingredient, context) => {
    if (
      ingredient.evidenceState === "missing" &&
      ingredient.evidence.some((evidence) => evidence.relation === "supports")
    ) {
      context.addIssue({
        code: "custom",
        path: ["evidence"],
        message: "missing fields cannot have supporting evidence",
      });
    }
  });
export type Ingredient = z.infer<typeof IngredientSchema>;

export const TemperatureSchema = z
  .object({
    value: z.number().finite(),
    unit: z.enum(["C", "F"]),
    evidenceState: EvidenceStateSchema,
    evidence: z.array(EvidenceReferenceSchema).max(25),
  })
  .strict();
export type Temperature = z.infer<typeof TemperatureSchema>;

export const RecipeStepSchema = z
  .object({
    id: z.string().uuid(),
    sortOrder: z.number().int().nonnegative(),
    instruction: LocalizedTextSchema,
    ingredientIds: z.array(z.string().uuid()).max(250),
    sourceRange: SourceTimeRangeSchema.nullable(),
    durationSeconds: z.number().int().nonnegative().nullable(),
    temperature: TemperatureSchema.nullable(),
    tools: z.array(LocalizedTextSchema).max(50),
    evidenceState: EvidenceStateSchema,
    evidence: z.array(EvidenceReferenceSchema).max(250),
    hasReliableVisual: z.boolean(),
    media: z.array(MediaAssetReferenceSchema).max(10),
  })
  .strict()
  .superRefine((step, context) => {
    if (
      step.sourceRange === null &&
      step.media.some(
        (asset) =>
          asset.kind === "step_clip" || asset.sourceTimestampSeconds !== null,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["sourceRange"],
        message: "time-aligned step media requires a source range",
      });
    }
    if (
      step.hasReliableVisual &&
      !step.media.some(
        (asset) =>
          asset.kind === "keyframe" ||
          asset.kind === "source_image" ||
          asset.kind === "step_clip",
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["media"],
        message: "steps with reliable visuals must reference visual media",
      });
    }
  });
export type RecipeStep = z.infer<typeof RecipeStepSchema>;

export const RecipeVersionKindSchema = z.enum([
  "source_snapshot",
  "working",
  "personal",
]);
export type RecipeVersionKind = z.infer<typeof RecipeVersionKindSchema>;

export const RecipeVersionSchema = z
  .object({
    id: z.string().uuid(),
    recipeId: z.string().uuid(),
    kind: RecipeVersionKindSchema,
    parentVersionId: z.string().uuid().nullable(),
    label: LocalizedTextSchema.nullable(),
    immutable: z.boolean(),
    description: LocalizedTextSchema.nullable(),
    ingredientGroups: z.array(IngredientGroupSchema).max(100),
    ingredients: z.array(IngredientSchema).max(2_000),
    steps: z.array(RecipeStepSchema).min(1).max(500),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .strict()
  .superRefine((version, context) => {
    if (version.kind === "source_snapshot" && !version.immutable) {
      context.addIssue({
        code: "custom",
        path: ["immutable"],
        message: "source snapshots must be immutable",
      });
    }
    if (version.kind !== "source_snapshot" && version.immutable) {
      context.addIssue({
        code: "custom",
        path: ["immutable"],
        message: "editable versions cannot be immutable",
      });
    }

    const groupIds = new Set(version.ingredientGroups.map((group) => group.id));
    const ingredientIds = new Set(
      version.ingredients.map((ingredient) => ingredient.id),
    );
    const seenSortOrders = new Set<number>();

    version.ingredients.forEach((ingredient, index) => {
      if (ingredient.groupId !== null && !groupIds.has(ingredient.groupId)) {
        context.addIssue({
          code: "custom",
          path: ["ingredients", index, "groupId"],
          message: "ingredient groupId must belong to this version",
        });
      }
    });

    version.steps.forEach((step, index) => {
      if (seenSortOrders.has(step.sortOrder)) {
        context.addIssue({
          code: "custom",
          path: ["steps", index, "sortOrder"],
          message: "step sortOrder values must be unique",
        });
      }
      seenSortOrders.add(step.sortOrder);
      step.ingredientIds.forEach((ingredientId) => {
        if (!ingredientIds.has(ingredientId)) {
          context.addIssue({
            code: "custom",
            path: ["steps", index, "ingredientIds"],
            message: "step ingredientIds must belong to this version",
          });
        }
      });
    });
  });
export type RecipeVersion = z.infer<typeof RecipeVersionSchema>;

export const RecipeStatusSchema = z.enum([
  "draft",
  "needs_review",
  "ready",
  "archived",
]);
export type RecipeStatus = z.infer<typeof RecipeStatusSchema>;

export const RecipeSchema = z
  .object({
    id: z.string().uuid(),
    ownerId: z.string().uuid(),
    sourceId: z.string().uuid().nullable(),
    title: LocalizedTextSchema,
    status: RecipeStatusSchema,
    cover: MediaAssetReferenceSchema.nullable(),
    servings: z
      .object({
        value: z.number().finite().positive().nullable(),
        label: nullableNonBlankText,
      })
      .strict(),
    prepMinutes: z.number().int().nonnegative().nullable(),
    cookMinutes: z.number().int().nonnegative().nullable(),
    tags: z.array(nonBlankText.max(100)).max(100),
    favorite: z.boolean(),
    currentVersionId: z.string().uuid(),
    revision: z.number().int().positive(),
    versions: z.array(RecipeVersionSchema).min(2).max(100),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .strict()
  .superRefine((recipe, context) => {
    const versionIds = new Set(recipe.versions.map((version) => version.id));
    if (!versionIds.has(recipe.currentVersionId)) {
      context.addIssue({
        code: "custom",
        path: ["currentVersionId"],
        message: "currentVersionId must reference an included version",
      });
    }
    if (
      !recipe.versions.some(
        (version) =>
          version.kind === "source_snapshot" && version.immutable,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["versions"],
        message: "a recipe requires an immutable source snapshot",
      });
    }
    if (
      !recipe.versions.some(
        (version) => version.kind === "working" && !version.immutable,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["versions"],
        message: "a recipe requires an editable working version",
      });
    }
    recipe.versions.forEach((version, index) => {
      if (version.recipeId !== recipe.id) {
        context.addIssue({
          code: "custom",
          path: ["versions", index, "recipeId"],
          message: "version recipeId must match its aggregate",
        });
      }
      if (
        version.parentVersionId !== null &&
        !versionIds.has(version.parentVersionId)
      ) {
        context.addIssue({
          code: "custom",
          path: ["versions", index, "parentVersionId"],
          message: "parentVersionId must reference an included version",
        });
      }
    });
  });
export type Recipe = z.infer<typeof RecipeSchema>;

export const ReviewIssueTypeSchema = z.enum([
  "missing_quantity",
  "ambiguous_unit",
  "conflicting_time",
  "conflicting_temperature",
  "possible_missing_ingredient",
  "low_confidence_step_boundary",
  "missing_visual_match",
  "multiple_recipes",
  "translation_warning",
  "source_unavailable",
]);
export type ReviewIssueType = z.infer<typeof ReviewIssueTypeSchema>;

export const ReviewIssueSchema = z
  .object({
    id: z.string().uuid(),
    recipeId: z.string().uuid(),
    recipeVersionId: z.string().uuid(),
    type: ReviewIssueTypeSchema,
    severity: z.enum(["info", "warning", "blocking"]),
    target: z
      .object({
        entityType: z.enum(["ingredient", "step", "recipe_meta"]),
        entityId: z.string().uuid(),
      })
      .strict()
      .nullable(),
    message: LocalizedTextSchema,
    evidence: z.array(EvidenceReferenceSchema).max(100),
    payload: z.record(z.string(), z.unknown()),
    status: z.enum(["open", "resolved", "ignored"]),
    resolution: z.record(z.string(), z.unknown()).nullable(),
    createdAt: timestamp,
    resolvedAt: timestamp.nullable(),
  })
  .strict()
  .superRefine((issue, context) => {
    if (issue.status === "open" && issue.resolvedAt !== null) {
      context.addIssue({
        code: "custom",
        path: ["resolvedAt"],
        message: "open issues cannot have a resolvedAt timestamp",
      });
    }
    if (issue.status !== "open" && issue.resolvedAt === null) {
      context.addIssue({
        code: "custom",
        path: ["resolvedAt"],
        message: "closed issues require a resolvedAt timestamp",
      });
    }
  });
export type ReviewIssue = z.infer<typeof ReviewIssueSchema>;
