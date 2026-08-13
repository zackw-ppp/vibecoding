export type Locale = 'zh-CN' | 'en-US'
export type LocalePreference = Locale | 'system'
export type ThemePreference =
  | 'warm-kitchen'
  | 'fresh-garden'
  | 'midnight-cook'
  | 'system'
export type ResolvedTheme = Exclude<ThemePreference, 'system'>
export type UnitSystem = 'source' | 'metric' | 'imperial'
export type ContentDisplay = 'translated' | 'original' | 'bilingual'
export type EvidenceState =
  | 'explicit'
  | 'corroborated'
  | 'inferred'
  | 'missing'
  | 'conflict'
  | 'user_confirmed'
export type RecipeStatus = 'ready' | 'needs_review' | 'processing' | 'failed'
export type Platform =
  | 'xiaohongshu'
  | 'douyin'
  | 'bilibili'
  | 'tiktok'
  | 'youtube'
  | 'upload'
  | 'manual'
export type ImportJobStatus =
  | 'processing'
  | 'needs_review'
  | 'complete'
  | 'failed'
  | 'cancelled'
export type ReviewIssueStatus = 'open' | 'resolved' | 'ignored'

export interface LocalizedText {
  original: string
  originalLocale: Locale
  zhCN: string
  enUS: string
}

export interface EvidenceReference {
  id: string
  type: 'post_text' | 'native_caption' | 'asr' | 'ocr' | 'visual' | 'user'
  text: LocalizedText
  startSeconds: number | null
  endSeconds: number | null
  status: 'supports' | 'conflicts' | 'inferred_from'
}

export interface Ingredient {
  id: string
  name: LocalizedText
  quantity: {
    source: string
    metric: string
    imperial: string
  }
  preparation: LocalizedText | null
  optional: boolean
  evidenceState: EvidenceState
}

export interface RecipeStep {
  id: string
  instruction: LocalizedText
  ingredientIds: string[]
  durationSeconds: number | null
  sourceStartSeconds: number
  sourceEndSeconds: number
  temperature: string | null
  evidenceState: EvidenceState
  media: string | null
  evidence: EvidenceReference[]
}

export interface Recipe {
  id: string
  title: LocalizedText
  description: LocalizedText
  originalLocale: Locale
  status: RecipeStatus
  cover: string
  servings: number
  prepMinutes: number
  cookMinutes: number
  tags: LocalizedText[]
  favorite: boolean
  platform: Platform
  contentType: 'video' | 'images' | 'text'
  author: string
  sourceUrl: string
  importedAt: string
  updatedAt: string
  ingredients: Ingredient[]
  steps: RecipeStep[]
  script: EvidenceReference[]
}

export interface ReviewIssue {
  id: string
  recipeId: string
  type:
    | 'missing_quantity'
    | 'ambiguous_unit'
    | 'conflicting_time'
    | 'possible_missing_ingredient'
    | 'low_confidence_step_boundary'
    | 'translation_warning'
  severity: 'info' | 'warning' | 'blocking'
  status: ReviewIssueStatus
  targetId: string
  titleKey: string
  descriptionKey: string
  candidate: string
  evidenceTime: number | null
}

export interface ImportJob {
  id: string
  title: LocalizedText
  platform: Platform
  status: ImportJobStatus
  stage: number
  progress: number
  createdAt: string
  resultRecipeId: string | null
  errorCode: string | null
  autoAdvance: boolean
}

export interface RecipeCollection {
  id: string
  nameKey: string
  descriptionKey: string
  recipeIds: string[]
  cover: string
}
