import {
  ImportJobSchema,
  type ImportJob,
  type ImportSourceType,
  type Platform,
} from "@mise/platform-contracts";
import {
  RecipeSchema,
  type MediaAssetReference,
  type Recipe,
  type RecipeStatus,
  type RecipeVersion,
} from "@mise/recipe-domain";

export type RepositoryKind = "fixture" | "local" | "supabase";

export interface RecipeListQuery {
  readonly statuses?: readonly RecipeStatus[];
  readonly favorite?: boolean;
  readonly search?: string;
  readonly limit?: number;
}

export type RecipePatch = Partial<{
  title: Recipe["title"];
  status: RecipeStatus;
  cover: MediaAssetReference | null;
  servings: Recipe["servings"];
  prepMinutes: number | null;
  cookMinutes: number | null;
  tags: string[];
  favorite: boolean;
  currentVersionId: string;
  versions: RecipeVersion[];
}>;

export interface UpdateRecipeCommand {
  readonly recipeId: string;
  readonly expectedRevision: number;
  readonly patch: RecipePatch;
}

export interface DeleteRecipeCommand {
  readonly recipeId: string;
  readonly expectedRevision: number;
}

export interface RecipeRepository {
  readonly kind: RepositoryKind;
  list(query?: RecipeListQuery): Promise<readonly Recipe[]>;
  get(recipeId: string): Promise<Recipe | null>;
  create(recipe: Recipe): Promise<Recipe>;
  update(command: UpdateRecipeCommand): Promise<Recipe>;
  delete(command: DeleteRecipeCommand): Promise<void>;
}

export class RecipeNotFoundError extends Error {
  readonly recipeId: string;

  constructor(recipeId: string) {
    super(`Recipe ${recipeId} was not found`);
    this.name = "RecipeNotFoundError";
    this.recipeId = recipeId;
  }
}

export class DuplicateRecipeError extends Error {
  readonly recipeId: string;

  constructor(recipeId: string) {
    super(`Recipe ${recipeId} already exists`);
    this.name = "DuplicateRecipeError";
    this.recipeId = recipeId;
  }
}

export class RevisionConflictError extends Error {
  readonly recipeId: string;
  readonly expectedRevision: number;
  readonly current: Recipe;

  constructor(
    recipeId: string,
    expectedRevision: number,
    current: Recipe,
  ) {
    super(
      `Recipe ${recipeId} revision conflict: expected ${expectedRevision}, current ${current.revision}`,
    );
    this.name = "RevisionConflictError";
    this.recipeId = recipeId;
    this.expectedRevision = expectedRevision;
    this.current = cloneRecipe(current);
  }
}

export class ReadOnlyRepositoryError extends Error {
  constructor() {
    super("This fixture repository is read-only");
    this.name = "ReadOnlyRepositoryError";
  }
}

interface InMemoryRepositoryOptions {
  readonly kind?: Extract<RepositoryKind, "fixture" | "local">;
  readonly readOnly?: boolean;
  readonly clock?: () => Date;
}

/**
 * Deterministic fixture/local repository. All values are schema-validated and
 * cloned across the boundary so callers cannot mutate repository state.
 */
export class InMemoryFixtureRecipeRepository implements RecipeRepository {
  readonly kind: Extract<RepositoryKind, "fixture" | "local">;
  readonly #recipes = new Map<string, Recipe>();
  readonly #readOnly: boolean;
  readonly #clock: () => Date;

  constructor(
    fixtures: readonly Recipe[] = [],
    options: InMemoryRepositoryOptions = {},
  ) {
    this.kind = options.kind ?? "fixture";
    this.#readOnly = options.readOnly ?? false;
    this.#clock = options.clock ?? (() => new Date());
    for (const fixture of fixtures) {
      const parsed = RecipeSchema.parse(fixture);
      if (this.#recipes.has(parsed.id)) {
        throw new DuplicateRecipeError(parsed.id);
      }
      this.#recipes.set(parsed.id, cloneRecipe(parsed));
    }
  }

  async list(query: RecipeListQuery = {}): Promise<readonly Recipe[]> {
    const normalizedSearch = query.search?.trim().toLocaleLowerCase();
    const limit = Math.min(Math.max(query.limit ?? 100, 1), 500);

    return [...this.#recipes.values()]
      .filter(
        (recipe) =>
          query.statuses === undefined ||
          query.statuses.includes(recipe.status),
      )
      .filter(
        (recipe) =>
          query.favorite === undefined ||
          recipe.favorite === query.favorite,
      )
      .filter((recipe) => {
        if (normalizedSearch === undefined || normalizedSearch === "") {
          return true;
        }
        const searchable = [
          recipe.title.original,
          recipe.title.zhCN,
          recipe.title.enUS,
          ...recipe.tags,
          ...recipe.versions.flatMap((version) =>
            version.ingredients.flatMap((ingredient) => [
              ingredient.name.original,
              ingredient.name.zhCN,
              ingredient.name.enUS,
            ]),
          ),
        ]
          .filter((value): value is string => value !== undefined)
          .join("\n")
          .toLocaleLowerCase();
        return searchable.includes(normalizedSearch);
      })
      .sort(
        (left, right) =>
          right.updatedAt.localeCompare(left.updatedAt) ||
          left.id.localeCompare(right.id),
      )
      .slice(0, limit)
      .map(cloneRecipe);
  }

  async get(recipeId: string): Promise<Recipe | null> {
    const recipe = this.#recipes.get(recipeId);
    return recipe === undefined ? null : cloneRecipe(recipe);
  }

  async create(recipe: Recipe): Promise<Recipe> {
    this.#assertWritable();
    const parsed = RecipeSchema.parse(recipe);
    if (this.#recipes.has(parsed.id)) {
      throw new DuplicateRecipeError(parsed.id);
    }
    if (parsed.revision !== 1) {
      throw new RevisionConflictError(parsed.id, 1, parsed);
    }
    const stored = cloneRecipe(parsed);
    this.#recipes.set(stored.id, stored);
    return cloneRecipe(stored);
  }

  async update(command: UpdateRecipeCommand): Promise<Recipe> {
    this.#assertWritable();
    const current = this.#recipes.get(command.recipeId);
    if (current === undefined) {
      throw new RecipeNotFoundError(command.recipeId);
    }
    if (current.revision !== command.expectedRevision) {
      throw new RevisionConflictError(
        command.recipeId,
        command.expectedRevision,
        current,
      );
    }

    const next = RecipeSchema.parse({
      ...current,
      ...command.patch,
      id: current.id,
      ownerId: current.ownerId,
      sourceId: current.sourceId,
      revision: current.revision + 1,
      createdAt: current.createdAt,
      updatedAt: this.#clock().toISOString(),
    });
    this.#recipes.set(next.id, cloneRecipe(next));
    return cloneRecipe(next);
  }

  async delete(command: DeleteRecipeCommand): Promise<void> {
    this.#assertWritable();
    const current = this.#recipes.get(command.recipeId);
    if (current === undefined) {
      throw new RecipeNotFoundError(command.recipeId);
    }
    if (current.revision !== command.expectedRevision) {
      throw new RevisionConflictError(
        command.recipeId,
        command.expectedRevision,
        current,
      );
    }
    this.#recipes.delete(command.recipeId);
  }

  #assertWritable(): void {
    if (this.#readOnly) {
      throw new ReadOnlyRepositoryError();
    }
  }
}

export class InMemoryLocalRecipeRepository extends InMemoryFixtureRecipeRepository {
  constructor(
    recipes: readonly Recipe[] = [],
    options: Omit<InMemoryRepositoryOptions, "kind"> = {},
  ) {
    super(recipes, { ...options, kind: "local" });
  }
}

export interface AtomicRecipeUpdateResult {
  readonly updated: boolean;
  readonly recipe: unknown | null;
}

/**
 * Gateway operations must be implemented with an authenticated Supabase
 * publishable-key client. updateIfRevision must perform one atomic
 * `WHERE id = ? AND owner_id = auth.uid() AND revision = ?` mutation.
 * A service-role key must never be supplied by browser/mobile code.
 */
export interface SupabaseRecipeGateway {
  list(ownerId: string, query: RecipeListQuery): Promise<readonly unknown[]>;
  get(ownerId: string, recipeId: string): Promise<unknown | null>;
  create(ownerId: string, recipe: Recipe): Promise<unknown>;
  updateIfRevision(
    ownerId: string,
    recipeId: string,
    expectedRevision: number,
    next: Recipe,
  ): Promise<AtomicRecipeUpdateResult>;
  deleteIfRevision(
    ownerId: string,
    recipeId: string,
    expectedRevision: number,
  ): Promise<boolean>;
}

/**
 * Supabase adapter around a transport/gateway. Keeping transport separate
 * allows the app to use an authenticated client while workers use their own
 * server-only implementation without sharing credentials or bypassing RLS.
 */
export class SupabaseRecipeRepository implements RecipeRepository {
  readonly kind = "supabase" as const;
  readonly #ownerId: string;
  readonly #gateway: SupabaseRecipeGateway;
  readonly #clock: () => Date;

  constructor(
    ownerId: string,
    gateway: SupabaseRecipeGateway,
    clock: () => Date = () => new Date(),
  ) {
    this.#ownerId = ownerId;
    this.#gateway = gateway;
    this.#clock = clock;
  }

  async list(query: RecipeListQuery = {}): Promise<readonly Recipe[]> {
    const rows = await this.#gateway.list(this.#ownerId, query);
    return rows.map((row) => this.#parseOwned(row));
  }

  async get(recipeId: string): Promise<Recipe | null> {
    const row = await this.#gateway.get(this.#ownerId, recipeId);
    return row === null ? null : this.#parseOwned(row);
  }

  async create(recipe: Recipe): Promise<Recipe> {
    const candidate = this.#parseOwned(recipe);
    if (candidate.revision !== 1) {
      throw new Error("New recipes must start at revision 1");
    }
    return this.#parseOwned(
      await this.#gateway.create(this.#ownerId, candidate),
    );
  }

  async update(command: UpdateRecipeCommand): Promise<Recipe> {
    const current = await this.get(command.recipeId);
    if (current === null) {
      throw new RecipeNotFoundError(command.recipeId);
    }
    if (current.revision !== command.expectedRevision) {
      throw new RevisionConflictError(
        command.recipeId,
        command.expectedRevision,
        current,
      );
    }

    const next = RecipeSchema.parse({
      ...current,
      ...command.patch,
      id: current.id,
      ownerId: current.ownerId,
      sourceId: current.sourceId,
      revision: current.revision + 1,
      createdAt: current.createdAt,
      updatedAt: this.#clock().toISOString(),
    });
    const result = await this.#gateway.updateIfRevision(
      this.#ownerId,
      command.recipeId,
      command.expectedRevision,
      next,
    );
    if (result.updated && result.recipe !== null) {
      return this.#parseOwned(result.recipe);
    }

    const latest = await this.get(command.recipeId);
    if (latest === null) {
      throw new RecipeNotFoundError(command.recipeId);
    }
    throw new RevisionConflictError(
      command.recipeId,
      command.expectedRevision,
      latest,
    );
  }

  async delete(command: DeleteRecipeCommand): Promise<void> {
    const deleted = await this.#gateway.deleteIfRevision(
      this.#ownerId,
      command.recipeId,
      command.expectedRevision,
    );
    if (deleted) return;

    const latest = await this.get(command.recipeId);
    if (latest === null) {
      throw new RecipeNotFoundError(command.recipeId);
    }
    throw new RevisionConflictError(
      command.recipeId,
      command.expectedRevision,
      latest,
    );
  }

  #parseOwned(input: unknown): Recipe {
    const parsed = RecipeSchema.parse(input);
    if (parsed.ownerId !== this.#ownerId) {
      throw new Error("Supabase gateway returned a recipe for another owner");
    }
    return cloneRecipe(parsed);
  }
}

export interface CreateImportJobCommand {
  readonly sourceType: ImportSourceType;
  readonly sourceUrl?: string;
  readonly uploadId?: string;
  readonly fixtureId?: string;
  readonly preferredLocale: "zh-CN" | "en-US";
  readonly unitSystem: "source" | "metric" | "imperial";
}

export interface ImportJobListQuery {
  readonly statuses?: readonly ImportJob["status"][];
  readonly platforms?: readonly Platform[];
  readonly limit?: number;
}

export interface ImportJobRepository {
  list(query?: ImportJobListQuery): Promise<readonly ImportJob[]>;
  get(jobId: string): Promise<ImportJob | null>;
  create(command: CreateImportJobCommand): Promise<ImportJob>;
  requestCancellation(jobId: string): Promise<ImportJob>;
}

/**
 * Creation and cancellation are Edge Function operations; clients should not
 * directly mutate import_jobs state.
 */
export interface SupabaseImportJobGateway {
  list(query: ImportJobListQuery): Promise<readonly unknown[]>;
  get(jobId: string): Promise<unknown | null>;
  invokeCreate(command: CreateImportJobCommand): Promise<unknown>;
  invokeCancel(jobId: string): Promise<unknown>;
}

export class SupabaseImportJobRepository implements ImportJobRepository {
  readonly #gateway: SupabaseImportJobGateway;
  readonly #ownerId: string;

  constructor(ownerId: string, gateway: SupabaseImportJobGateway) {
    this.#ownerId = ownerId;
    this.#gateway = gateway;
  }

  async list(
    query: ImportJobListQuery = {},
  ): Promise<readonly ImportJob[]> {
    return (await this.#gateway.list(query)).map((row) => this.#parse(row));
  }

  async get(jobId: string): Promise<ImportJob | null> {
    const row = await this.#gateway.get(jobId);
    return row === null ? null : this.#parse(row);
  }

  async create(command: CreateImportJobCommand): Promise<ImportJob> {
    return this.#parse(await this.#gateway.invokeCreate(command));
  }

  async requestCancellation(jobId: string): Promise<ImportJob> {
    return this.#parse(await this.#gateway.invokeCancel(jobId));
  }

  #parse(row: unknown): ImportJob {
    const parsed = ImportJobSchema.parse(row);
    if (parsed.ownerId !== this.#ownerId) {
      throw new Error("Supabase gateway returned a job for another owner");
    }
    return structuredClone(parsed);
  }
}

function cloneRecipe(recipe: Recipe): Recipe {
  return structuredClone(recipe);
}
