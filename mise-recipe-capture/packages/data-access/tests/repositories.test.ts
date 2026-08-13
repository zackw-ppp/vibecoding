import { describe, expect, it } from "vitest";

import { RecipeSchema, type Recipe } from "@mise/recipe-domain";

import {
  InMemoryFixtureRecipeRepository,
  ReadOnlyRepositoryError,
  RevisionConflictError,
  SupabaseRecipeRepository,
  type AtomicRecipeUpdateResult,
  type RecipeListQuery,
  type SupabaseRecipeGateway,
} from "../src/index";

const id = {
  owner: "10000000-0000-4000-8000-000000000001",
  recipe: "10000000-0000-4000-8000-000000000002",
  source: "10000000-0000-4000-8000-000000000003",
  snapshot: "10000000-0000-4000-8000-000000000004",
  working: "10000000-0000-4000-8000-000000000005",
  ingredient: "10000000-0000-4000-8000-000000000006",
  step: "10000000-0000-4000-8000-000000000007",
} as const;

function makeRecipe(): Recipe {
  const ingredient = {
    id: id.ingredient,
    groupId: null,
    sortOrder: 0,
    originalText: "2 tomatoes",
    canonicalKey: "tomato",
    name: {
      original: "tomatoes",
      originalLocale: "en-US",
      zhCN: "番茄",
    },
    quantity: {
      minimum: 2,
      maximum: 2,
      originalText: "2",
      unitOriginal: null,
      unitNormalized: "piece",
      approximate: false,
      suggestedValue: null,
    },
    preparation: null,
    optional: false,
    evidenceState: "explicit",
    evidence: [],
  } as const;
  const step = {
    id: id.step,
    sortOrder: 0,
    instruction: {
      original: "Slice the tomatoes.",
      originalLocale: "en-US",
      zhCN: "切番茄。",
    },
    ingredientIds: [id.ingredient],
    sourceRange: null,
    durationSeconds: null,
    temperature: null,
    tools: [],
    evidenceState: "explicit",
    evidence: [],
    hasReliableVisual: false,
    media: [],
  } as const;
  const base = {
    recipeId: id.recipe,
    label: null,
    description: null,
    ingredientGroups: [],
    ingredients: [ingredient],
    steps: [step],
    createdAt: "2026-08-13T05:00:00Z",
    updatedAt: "2026-08-13T05:00:00Z",
  } as const;

  return RecipeSchema.parse({
    id: id.recipe,
    ownerId: id.owner,
    sourceId: id.source,
    title: {
      original: "Tomato toast",
      originalLocale: "en-US",
      zhCN: "番茄吐司",
    },
    status: "needs_review",
    cover: null,
    servings: { value: 2, label: "2 servings" },
    prepMinutes: 5,
    cookMinutes: 10,
    tags: ["breakfast"],
    favorite: false,
    currentVersionId: id.working,
    revision: 1,
    versions: [
      {
        ...base,
        id: id.snapshot,
        kind: "source_snapshot",
        parentVersionId: null,
        immutable: true,
      },
      {
        ...base,
        id: id.working,
        kind: "working",
        parentVersionId: id.snapshot,
        immutable: false,
      },
    ],
    createdAt: "2026-08-13T05:00:00Z",
    updatedAt: "2026-08-13T05:00:00Z",
  });
}

describe("in-memory fixture repository", () => {
  it("is usable for querying and returns defensive copies", async () => {
    const repository = new InMemoryFixtureRecipeRepository([makeRecipe()]);
    const found = await repository.list({ search: "番茄" });
    expect(found).toHaveLength(1);

    const first = found[0];
    expect(first).toBeDefined();
    if (first === undefined) return;
    first.title.original = "mutated outside repository";

    expect((await repository.get(id.recipe))?.title.original).toBe(
      "Tomato toast",
    );
  });

  it("increments revisions and exposes the latest copy on stale writes", async () => {
    const repository = new InMemoryFixtureRecipeRepository([makeRecipe()], {
      clock: () => new Date("2026-08-13T06:00:00Z"),
    });

    const updated = await repository.update({
      recipeId: id.recipe,
      expectedRevision: 1,
      patch: { favorite: true },
    });
    expect(updated.revision).toBe(2);
    expect(updated.favorite).toBe(true);
    expect(updated.updatedAt).toBe("2026-08-13T06:00:00.000Z");

    await expect(
      repository.update({
        recipeId: id.recipe,
        expectedRevision: 1,
        patch: { status: "ready" },
      }),
    ).rejects.toMatchObject({
      name: "RevisionConflictError",
      expectedRevision: 1,
      current: { revision: 2, favorite: true },
    });
  });

  it("can expose immutable bundled fixtures", async () => {
    const repository = new InMemoryFixtureRecipeRepository([makeRecipe()], {
      readOnly: true,
    });
    await expect(
      repository.update({
        recipeId: id.recipe,
        expectedRevision: 1,
        patch: { favorite: true },
      }),
    ).rejects.toBeInstanceOf(ReadOnlyRepositoryError);
  });
});

class RacingGateway implements SupabaseRecipeGateway {
  current = makeRecipe();

  async list(
    _ownerId: string,
    _query: RecipeListQuery,
  ): Promise<readonly unknown[]> {
    return [structuredClone(this.current)];
  }

  async get(_ownerId: string, _recipeId: string): Promise<unknown> {
    return structuredClone(this.current);
  }

  async create(_ownerId: string, recipe: Recipe): Promise<unknown> {
    this.current = structuredClone(recipe);
    return structuredClone(this.current);
  }

  async updateIfRevision(
    _ownerId: string,
    _recipeId: string,
    _expectedRevision: number,
    _next: Recipe,
  ): Promise<AtomicRecipeUpdateResult> {
    this.current = {
      ...this.current,
      revision: this.current.revision + 1,
      favorite: true,
      updatedAt: "2026-08-13T06:30:00Z",
    };
    return { updated: false, recipe: null };
  }

  async deleteIfRevision(): Promise<boolean> {
    return false;
  }
}

describe("Supabase repository boundary", () => {
  it("turns a failed atomic compare-and-swap into a revision conflict", async () => {
    const gateway = new RacingGateway();
    const repository = new SupabaseRecipeRepository(id.owner, gateway);

    let caught: unknown;
    try {
      await repository.update({
        recipeId: id.recipe,
        expectedRevision: 1,
        patch: { status: "ready" },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(RevisionConflictError);
    expect(caught).toMatchObject({
      expectedRevision: 1,
      current: { revision: 2, favorite: true },
    });
  });
});
