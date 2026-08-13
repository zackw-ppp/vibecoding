begin;

create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.recipe_status as enum ('draft', 'needs_review', 'ready', 'archived');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.recipe_version_kind as enum ('source_snapshot', 'working', 'personal');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.source_platform as enum (
    'youtube', 'bilibili', 'tiktok', 'xiaohongshu', 'douyin', 'local', 'fixture'
  );
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.source_content_type as enum (
    'video', 'image_post', 'local_video', 'local_images', 'text', 'fixture'
  );
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.evidence_state as enum (
    'explicit', 'corroborated', 'inferred', 'missing', 'conflict', 'user_confirmed'
  );
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.evidence_type as enum (
    'post_text', 'native_caption', 'asr', 'ocr', 'visual', 'user'
  );
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.evidence_relation as enum ('supports', 'conflicts', 'inferred_from');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.media_asset_type as enum (
    'source_image', 'keyframe', 'step_clip', 'cover', 'review_proxy'
  );
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.media_sync_policy as enum ('persistent', 'temporary');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.review_issue_type as enum (
    'missing_quantity',
    'ambiguous_unit',
    'conflicting_time',
    'conflicting_temperature',
    'possible_missing_ingredient',
    'low_confidence_step_boundary',
    'missing_visual_match',
    'multiple_recipes',
    'translation_warning',
    'source_unavailable'
  );
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.review_issue_severity as enum ('info', 'warning', 'blocking');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.review_issue_status as enum ('open', 'resolved', 'ignored');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.import_source_type as enum ('url', 'upload', 'images', 'text', 'fixture');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.import_job_status as enum (
    'queued',
    'resolving_source',
    'downloading_media',
    'extracting_metadata',
    'extracting_captions',
    'transcribing',
    'sampling_frames',
    'running_ocr',
    'structuring_recipe',
    'aligning_evidence',
    'rendering_step_clips',
    'uploading_assets',
    'needs_review',
    'complete',
    'partial_failure',
    'failed',
    'cancelled',
    'stalled'
  );
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.standard_error_code as enum (
    'UNSUPPORTED_URL',
    'SOURCE_UNAVAILABLE',
    'AUTH_REQUIRED',
    'REGION_RESTRICTED',
    'MEDIA_DOWNLOAD_FAILED',
    'UNSUPPORTED_CODEC',
    'UPLOAD_INTERRUPTED',
    'CAPTION_EXTRACTION_FAILED',
    'TRANSCRIPTION_FAILED',
    'OCR_FAILED',
    'NO_RECIPE_DETECTED',
    'MULTIPLE_RECIPES_DETECTED',
    'MODEL_INVALID_OUTPUT',
    'EVIDENCE_ALIGNMENT_FAILED',
    'CLIP_RENDER_FAILED',
    'STORAGE_QUOTA_EXCEEDED',
    'JOB_TIMEOUT',
    'JOB_CANCELLED',
    'UNKNOWN_ERROR',
    'INVALID_INPUT',
    'UNAUTHORIZED',
    'RATE_LIMITED',
    'REVISION_CONFLICT',
    'PROVIDER_NOT_CONFIGURED',
    'TEMP_STORAGE_LIMIT'
  );
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.transcript_segment_kind as enum (
    'post_text', 'native_caption', 'asr', 'ocr'
  );
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.step_media_role as enum (
    'primary_image', 'supporting_image', 'step_clip'
  );
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  preferred_locale text not null default 'zh-CN'
    check (preferred_locale in ('zh-CN', 'en-US')),
  unit_system text not null default 'source'
    check (unit_system in ('source', 'metric', 'imperial')),
  appearance_theme text not null default 'warm-kitchen'
    check (appearance_theme in ('warm-kitchen', 'fresh-garden', 'midnight-cook', 'system')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  platform public.source_platform not null,
  content_type public.source_content_type not null,
  original_url text,
  canonical_url text,
  platform_post_id text,
  author_name text,
  author_url text,
  caption text,
  source_language text,
  published_at timestamptz,
  imported_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  constraint sources_remote_urls_check check (
    platform in ('local', 'fixture')
    or (original_url is not null and canonical_url is not null)
  ),
  constraint sources_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  unique (id, owner_id)
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid references public.sources(id) on delete set null,
  title_original text not null check (length(trim(title_original)) > 0),
  title_zh text,
  title_en text,
  original_locale text not null check (length(trim(original_locale)) > 0),
  status public.recipe_status not null default 'draft',
  cover_asset_id uuid,
  servings_value numeric,
  servings_label text,
  prep_minutes integer,
  cook_minutes integer,
  tags text[] not null default '{}',
  favorite boolean not null default false,
  current_version_id uuid not null,
  revision integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint recipes_servings_positive check (servings_value is null or servings_value > 0),
  constraint recipes_prep_nonnegative check (prep_minutes is null or prep_minutes >= 0),
  constraint recipes_cook_nonnegative check (cook_minutes is null or cook_minutes >= 0),
  constraint recipes_revision_positive check (revision > 0),
  constraint recipes_source_owner_fkey
    foreign key (source_id, owner_id)
    references public.sources(id, owner_id),
  unique (id, owner_id)
);

create table if not exists public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  version_kind public.recipe_version_kind not null,
  parent_version_id uuid references public.recipe_versions(id) on delete set null,
  label text,
  is_immutable boolean not null default false,
  description_original text,
  description_zh text,
  description_en text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint recipe_versions_snapshot_immutable check (
    (version_kind = 'source_snapshot' and is_immutable)
    or (version_kind <> 'source_snapshot' and not is_immutable)
  ),
  constraint recipe_versions_recipe_owner_fkey
    foreign key (recipe_id, owner_id)
    references public.recipes(id, owner_id)
    on delete cascade,
  unique (id, owner_id),
  unique (id, recipe_id, owner_id)
);

alter table public.recipe_versions
  drop constraint if exists recipe_versions_parent_same_recipe_fkey;
alter table public.recipe_versions
  add constraint recipe_versions_parent_same_recipe_fkey
  foreign key (parent_version_id, recipe_id, owner_id)
  references public.recipe_versions(id, recipe_id, owner_id)
  deferrable initially deferred;

alter table public.recipes
  drop constraint if exists recipes_current_version_id_fkey;
alter table public.recipes
  add constraint recipes_current_version_id_fkey
  foreign key (current_version_id, id, owner_id)
  references public.recipe_versions(id, recipe_id, owner_id)
  deferrable initially deferred;

create table if not exists public.ingredient_groups (
  id uuid primary key default gen_random_uuid(),
  recipe_version_id uuid not null references public.recipe_versions(id) on delete cascade,
  sort_order integer not null check (sort_order >= 0),
  name_original text,
  name_zh text,
  name_en text,
  unique (recipe_version_id, sort_order),
  unique (id, recipe_version_id)
);

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_version_id uuid not null references public.recipe_versions(id) on delete cascade,
  group_id uuid references public.ingredient_groups(id) on delete set null,
  sort_order integer not null check (sort_order >= 0),
  original_text text not null check (length(trim(original_text)) > 0),
  canonical_key text,
  name_original text not null check (length(trim(name_original)) > 0),
  name_zh text,
  name_en text,
  quantity_min numeric,
  quantity_max numeric,
  unit_normalized text,
  unit_original text,
  original_quantity_text text,
  preparation_original text,
  preparation_zh text,
  preparation_en text,
  optional boolean not null default false,
  approximate boolean not null default false,
  evidence_state public.evidence_state not null default 'missing',
  ai_suggested_value jsonb,
  constraint ingredients_quantity_nonnegative check (
    (quantity_min is null or quantity_min >= 0)
    and (quantity_max is null or quantity_max >= 0)
  ),
  constraint ingredients_quantity_ordered check (
    quantity_max is null
    or (quantity_min is not null and quantity_max >= quantity_min)
  ),
  constraint ingredients_ai_suggestion_object check (
    ai_suggested_value is null or jsonb_typeof(ai_suggested_value) = 'object'
  ),
  constraint ingredients_group_version_fkey
    foreign key (group_id, recipe_version_id)
    references public.ingredient_groups(id, recipe_version_id),
  unique (recipe_version_id, sort_order)
);

create table if not exists public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_version_id uuid not null references public.recipe_versions(id) on delete cascade,
  sort_order integer not null check (sort_order >= 0),
  instruction_original text not null check (length(trim(instruction_original)) > 0),
  instruction_zh text,
  instruction_en text,
  source_start_seconds numeric,
  source_end_seconds numeric,
  duration_seconds integer,
  temperature_value numeric,
  temperature_unit text,
  evidence_state public.evidence_state not null default 'missing',
  has_reliable_visual boolean not null default false,
  tools jsonb not null default '[]'::jsonb,
  constraint recipe_steps_source_range check (
    (source_start_seconds is null and source_end_seconds is null)
    or (
      source_start_seconds is not null
      and source_end_seconds is not null
      and source_start_seconds >= 0
      and source_end_seconds >= source_start_seconds
    )
  ),
  constraint recipe_steps_duration_nonnegative check (
    duration_seconds is null or duration_seconds >= 0
  ),
  constraint recipe_steps_temperature_unit check (
    temperature_unit is null or temperature_unit in ('C', 'F')
  ),
  constraint recipe_steps_tools_array check (jsonb_typeof(tools) = 'array'),
  unique (recipe_version_id, sort_order)
);

create table if not exists public.step_ingredients (
  step_id uuid not null references public.recipe_steps(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  quantity_override jsonb,
  primary key (step_id, ingredient_id),
  constraint step_ingredients_quantity_object check (
    quantity_override is null or jsonb_typeof(quantity_override) = 'object'
  )
);

create table if not exists public.transcript_segments (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  segment_kind public.transcript_segment_kind not null,
  start_seconds numeric,
  end_seconds numeric,
  text text not null check (length(trim(text)) > 0),
  language text,
  confidence numeric,
  bbox jsonb,
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null check (sort_order >= 0),
  constraint transcript_time_range check (
    (start_seconds is null and end_seconds is null)
    or (
      start_seconds is not null
      and end_seconds is not null
      and start_seconds >= 0
      and end_seconds >= start_seconds
    )
  ),
  constraint transcript_confidence_range check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  ),
  constraint transcript_bbox_array check (bbox is null or jsonb_typeof(bbox) = 'array'),
  constraint transcript_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint transcript_source_owner_fkey
    foreign key (source_id, owner_id)
    references public.sources(id, owner_id)
    on delete cascade,
  unique (source_id, segment_kind, sort_order),
  unique (id, source_id, owner_id)
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete cascade,
  source_id uuid references public.sources(id) on delete cascade,
  asset_type public.media_asset_type not null,
  bucket text not null check (bucket in ('recipe-media', 'temp-review')),
  object_path text not null,
  mime_type text not null check (length(trim(mime_type)) > 0),
  size_bytes bigint,
  duration_seconds numeric,
  width integer,
  height integer,
  source_timestamp_seconds numeric,
  hash text,
  expires_at timestamptz,
  sync_policy public.media_sync_policy not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint media_assets_owner_path check (
    split_part(object_path, '/', 1) = owner_id::text
  ),
  constraint media_assets_dimensions_positive check (
    (width is null or width > 0) and (height is null or height > 0)
  ),
  constraint media_assets_size_nonnegative check (size_bytes is null or size_bytes >= 0),
  constraint media_assets_duration_nonnegative check (
    duration_seconds is null or duration_seconds >= 0
  ),
  constraint media_assets_timestamp_nonnegative check (
    source_timestamp_seconds is null or source_timestamp_seconds >= 0
  ),
  constraint media_assets_has_parent check (
    recipe_id is not null or source_id is not null
  ),
  constraint media_assets_recipe_owner_fkey
    foreign key (recipe_id, owner_id)
    references public.recipes(id, owner_id)
    on delete cascade,
  constraint media_assets_source_owner_fkey
    foreign key (source_id, owner_id)
    references public.sources(id, owner_id)
    on delete cascade,
  constraint media_assets_lifecycle check (
    (
      asset_type = 'review_proxy'
      and bucket = 'temp-review'
      and sync_policy = 'temporary'
      and expires_at is not null
    )
    or (
      asset_type <> 'review_proxy'
      and bucket = 'recipe-media'
      and sync_policy = 'persistent'
      and expires_at is null
    )
  ),
  unique (bucket, object_path),
  unique (id, owner_id),
  unique (id, recipe_id, owner_id)
);

alter table public.recipes
  drop constraint if exists recipes_cover_asset_id_fkey;
alter table public.recipes
  add constraint recipes_cover_asset_id_fkey
  foreign key (cover_asset_id, id, owner_id)
  references public.media_assets(id, recipe_id, owner_id)
  deferrable initially deferred;

create table if not exists public.step_media (
  step_id uuid not null references public.recipe_steps(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  role public.step_media_role not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  primary key (step_id, media_asset_id)
);

create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  evidence_type public.evidence_type not null,
  transcript_segment_id uuid references public.transcript_segments(id) on delete set null,
  media_asset_id uuid references public.media_assets(id) on delete set null,
  start_seconds numeric,
  end_seconds numeric,
  text text,
  confidence numeric,
  metadata jsonb not null default '{}'::jsonb,
  constraint evidence_items_time_range check (
    (start_seconds is null and end_seconds is null)
    or (
      start_seconds is not null
      and end_seconds is not null
      and start_seconds >= 0
      and end_seconds >= start_seconds
    )
  ),
  constraint evidence_items_confidence_range check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  ),
  constraint evidence_items_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint evidence_items_source_owner_fkey
    foreign key (source_id, owner_id)
    references public.sources(id, owner_id)
    on delete cascade,
  constraint evidence_items_transcript_source_fkey
    foreign key (transcript_segment_id, source_id, owner_id)
    references public.transcript_segments(id, source_id, owner_id),
  constraint evidence_items_media_owner_fkey
    foreign key (media_asset_id, owner_id)
    references public.media_assets(id, owner_id),
  unique (id, owner_id)
);

create table if not exists public.evidence_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('ingredient', 'step', 'recipe_meta')),
  entity_id uuid not null,
  evidence_item_id uuid not null references public.evidence_items(id) on delete cascade,
  relation public.evidence_relation not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint evidence_links_item_owner_fkey
    foreign key (evidence_item_id, owner_id)
    references public.evidence_items(id, owner_id)
    on delete cascade,
  unique (entity_type, entity_id, evidence_item_id, relation)
);

create table if not exists public.review_issues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  recipe_version_id uuid not null references public.recipe_versions(id) on delete cascade,
  issue_type public.review_issue_type not null,
  severity public.review_issue_severity not null,
  target_entity_type text
    check (target_entity_type is null or target_entity_type in ('ingredient', 'step', 'recipe_meta')),
  target_entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  status public.review_issue_status not null default 'open',
  resolution jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  constraint review_issue_target_pair check (
    (target_entity_type is null) = (target_entity_id is null)
  ),
  constraint review_issue_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint review_issue_resolution_object check (
    resolution is null or jsonb_typeof(resolution) = 'object'
  ),
  constraint review_issue_resolution_state check (
    (status = 'open' and resolved_at is null)
    or (status <> 'open' and resolved_at is not null)
  ),
  constraint review_issues_version_recipe_owner_fkey
    foreign key (recipe_version_id, recipe_id, owner_id)
    references public.recipe_versions(id, recipe_id, owner_id)
    on delete cascade
);

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_type public.import_source_type not null,
  platform public.source_platform,
  source_original_url text,
  source_url text,
  upload_id text,
  fixture_id text,
  preferred_locale text not null default 'zh-CN'
    check (preferred_locale in ('zh-CN', 'en-US')),
  unit_system text not null default 'source'
    check (unit_system in ('source', 'metric', 'imperial')),
  input_payload jsonb not null default '{}'::jsonb,
  status public.import_job_status not null default 'queued',
  current_stage public.import_job_status not null default 'queued',
  progress integer not null default 0 check (progress between 0 and 100),
  retry_count integer not null default 0 check (retry_count >= 0),
  cancel_requested_at timestamptz,
  heartbeat_at timestamptz,
  error_code public.standard_error_code,
  error_message_key text,
  debug_ref text,
  result_recipe_id uuid references public.recipes(id) on delete set null,
  worker_id text,
  claimed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  constraint import_jobs_payload_object check (jsonb_typeof(input_payload) = 'object'),
  constraint import_jobs_source_shape check (
    (source_type = 'url' and source_url is not null and platform is not null)
    or (source_type in ('upload', 'images') and upload_id is not null)
    or (source_type = 'text' and input_payload ? 'text')
    or (source_type = 'fixture' and fixture_id is not null)
  ),
  constraint import_jobs_completion_state check (
    (
      status in ('complete', 'partial_failure', 'failed', 'cancelled')
      and completed_at is not null
    )
    or (
      status not in ('complete', 'partial_failure', 'failed', 'cancelled')
      and completed_at is null
    )
  ),
  constraint import_jobs_complete_result check (
    status <> 'complete' or result_recipe_id is not null
  ),
  constraint import_jobs_failure_error check (
    status not in ('failed', 'partial_failure') or error_code is not null
  ),
  constraint import_jobs_result_owner_fkey
    foreign key (result_recipe_id, owner_id)
    references public.recipes(id, owner_id)
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_id, name),
  unique (id, owner_id)
);

create table if not exists public.collection_recipes (
  collection_id uuid not null references public.collections(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (collection_id, recipe_id)
);

create or replace function public.prevent_immutable_recipe_version_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.is_immutable then
    raise exception 'source snapshot versions are immutable'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

drop trigger if exists recipe_versions_prevent_immutable_update on public.recipe_versions;
create trigger recipe_versions_prevent_immutable_update
before update on public.recipe_versions
for each row execute function public.prevent_immutable_recipe_version_update();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();
drop trigger if exists recipe_versions_set_updated_at on public.recipe_versions;
create trigger recipe_versions_set_updated_at
before update on public.recipe_versions
for each row execute function public.set_updated_at();
drop trigger if exists import_jobs_set_updated_at on public.import_jobs;
create trigger import_jobs_set_updated_at
before update on public.import_jobs
for each row execute function public.set_updated_at();
drop trigger if exists collections_set_updated_at on public.collections;
create trigger collections_set_updated_at
before update on public.collections
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requested_locale text;
begin
  requested_locale := coalesce(new.raw_user_meta_data ->> 'preferred_locale', 'zh-CN');
  if requested_locale not in ('zh-CN', 'en-US') then
    requested_locale := 'zh-CN';
  end if;

  insert into public.profiles (id, preferred_locale)
  values (new.id, requested_locale)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create index if not exists sources_owner_imported_idx
  on public.sources (owner_id, imported_at desc);
create index if not exists sources_owner_canonical_url_idx
  on public.sources (owner_id, canonical_url)
  where canonical_url is not null;
create index if not exists sources_owner_platform_post_idx
  on public.sources (owner_id, platform, platform_post_id)
  where platform_post_id is not null;
create index if not exists recipes_owner_updated_idx
  on public.recipes (owner_id, updated_at desc);
create index if not exists recipes_owner_status_idx
  on public.recipes (owner_id, status, updated_at desc);
create index if not exists recipes_tags_gin_idx on public.recipes using gin (tags);
create index if not exists recipe_versions_recipe_idx
  on public.recipe_versions (recipe_id, created_at);
create index if not exists recipe_versions_owner_idx
  on public.recipe_versions (owner_id, updated_at desc);
create index if not exists ingredient_groups_version_idx
  on public.ingredient_groups (recipe_version_id, sort_order);
create index if not exists ingredients_version_idx
  on public.ingredients (recipe_version_id, sort_order);
create index if not exists ingredients_canonical_key_idx
  on public.ingredients (canonical_key)
  where canonical_key is not null;
create index if not exists recipe_steps_version_idx
  on public.recipe_steps (recipe_version_id, sort_order);
create index if not exists transcript_source_kind_idx
  on public.transcript_segments (source_id, segment_kind, sort_order);
create index if not exists transcript_owner_idx
  on public.transcript_segments (owner_id, source_id);
create index if not exists media_assets_owner_recipe_idx
  on public.media_assets (owner_id, recipe_id, asset_type);
create index if not exists media_assets_expiry_idx
  on public.media_assets (expires_at)
  where sync_policy = 'temporary';
create index if not exists evidence_items_source_idx
  on public.evidence_items (source_id, evidence_type);
create index if not exists evidence_links_entity_idx
  on public.evidence_links (entity_type, entity_id);
create index if not exists review_issues_recipe_status_idx
  on public.review_issues (recipe_id, status, severity);
create index if not exists review_issues_owner_open_idx
  on public.review_issues (owner_id, created_at desc)
  where status = 'open';
create index if not exists import_jobs_claim_idx
  on public.import_jobs (created_at)
  where status = 'queued' and cancel_requested_at is null;
create index if not exists import_jobs_owner_updated_idx
  on public.import_jobs (owner_id, updated_at desc);
create index if not exists import_jobs_worker_heartbeat_idx
  on public.import_jobs (worker_id, heartbeat_at)
  where worker_id is not null
    and status not in ('complete', 'partial_failure', 'failed', 'cancelled');
create index if not exists collection_recipes_recipe_idx
  on public.collection_recipes (recipe_id);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.sources enable row level security;
alter table public.sources force row level security;
alter table public.recipes enable row level security;
alter table public.recipes force row level security;
alter table public.recipe_versions enable row level security;
alter table public.recipe_versions force row level security;
alter table public.ingredient_groups enable row level security;
alter table public.ingredient_groups force row level security;
alter table public.ingredients enable row level security;
alter table public.ingredients force row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_steps force row level security;
alter table public.step_ingredients enable row level security;
alter table public.step_ingredients force row level security;
alter table public.transcript_segments enable row level security;
alter table public.transcript_segments force row level security;
alter table public.media_assets enable row level security;
alter table public.media_assets force row level security;
alter table public.step_media enable row level security;
alter table public.step_media force row level security;
alter table public.evidence_items enable row level security;
alter table public.evidence_items force row level security;
alter table public.evidence_links enable row level security;
alter table public.evidence_links force row level security;
alter table public.review_issues enable row level security;
alter table public.review_issues force row level security;
alter table public.import_jobs enable row level security;
alter table public.import_jobs force row level security;
alter table public.collections enable row level security;
alter table public.collections force row level security;
alter table public.collection_recipes enable row level security;
alter table public.collection_recipes force row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated
using ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "sources_owner_all" on public.sources;
create policy "sources_owner_all" on public.sources
for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "recipes_owner_all" on public.recipes;
create policy "recipes_owner_all" on public.recipes
for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "recipe_versions_owner_all" on public.recipe_versions;
create policy "recipe_versions_owner_all" on public.recipe_versions
for all to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1
    from public.recipes r
    where r.id = recipe_id and r.owner_id = (select auth.uid())
  )
);

drop policy if exists "ingredient_groups_owner_all" on public.ingredient_groups;
create policy "ingredient_groups_owner_all" on public.ingredient_groups
for all to authenticated
using (
  exists (
    select 1 from public.recipe_versions rv
    where rv.id = recipe_version_id and rv.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.recipe_versions rv
    where rv.id = recipe_version_id and rv.owner_id = (select auth.uid())
  )
);

drop policy if exists "ingredients_owner_all" on public.ingredients;
create policy "ingredients_owner_all" on public.ingredients
for all to authenticated
using (
  exists (
    select 1 from public.recipe_versions rv
    where rv.id = recipe_version_id and rv.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.recipe_versions rv
    where rv.id = recipe_version_id and rv.owner_id = (select auth.uid())
  )
);

drop policy if exists "recipe_steps_owner_all" on public.recipe_steps;
create policy "recipe_steps_owner_all" on public.recipe_steps
for all to authenticated
using (
  exists (
    select 1 from public.recipe_versions rv
    where rv.id = recipe_version_id and rv.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.recipe_versions rv
    where rv.id = recipe_version_id and rv.owner_id = (select auth.uid())
  )
);

drop policy if exists "step_ingredients_owner_all" on public.step_ingredients;
create policy "step_ingredients_owner_all" on public.step_ingredients
for all to authenticated
using (
  exists (
    select 1
    from public.recipe_steps rs
    join public.recipe_versions rv on rv.id = rs.recipe_version_id
    where rs.id = step_id and rv.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.recipe_steps rs
    join public.recipe_versions rv on rv.id = rs.recipe_version_id
    join public.ingredients i
      on i.id = ingredient_id and i.recipe_version_id = rv.id
    where rs.id = step_id and rv.owner_id = (select auth.uid())
  )
);

drop policy if exists "transcript_segments_owner_all" on public.transcript_segments;
create policy "transcript_segments_owner_all" on public.transcript_segments
for all to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.sources s
    where s.id = source_id and s.owner_id = (select auth.uid())
  )
);

drop policy if exists "media_assets_owner_all" on public.media_assets;
create policy "media_assets_owner_all" on public.media_assets
for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "step_media_owner_all" on public.step_media;
create policy "step_media_owner_all" on public.step_media
for all to authenticated
using (
  exists (
    select 1
    from public.recipe_steps rs
    join public.recipe_versions rv on rv.id = rs.recipe_version_id
    where rs.id = step_id and rv.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.recipe_steps rs
    join public.recipe_versions rv on rv.id = rs.recipe_version_id
    join public.media_assets ma
      on ma.id = media_asset_id and ma.owner_id = rv.owner_id
    where rs.id = step_id and rv.owner_id = (select auth.uid())
  )
);

drop policy if exists "evidence_items_owner_all" on public.evidence_items;
create policy "evidence_items_owner_all" on public.evidence_items
for all to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.sources s
    where s.id = source_id and s.owner_id = (select auth.uid())
  )
);

drop policy if exists "evidence_links_owner_all" on public.evidence_links;
create policy "evidence_links_owner_all" on public.evidence_links
for all to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.evidence_items ei
    where ei.id = evidence_item_id and ei.owner_id = (select auth.uid())
  )
);

drop policy if exists "review_issues_owner_all" on public.review_issues;
create policy "review_issues_owner_all" on public.review_issues
for all to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.recipes r
    where r.id = recipe_id and r.owner_id = (select auth.uid())
  )
);

drop policy if exists "import_jobs_select_own" on public.import_jobs;
create policy "import_jobs_select_own" on public.import_jobs
for select to authenticated
using ((select auth.uid()) = owner_id);
drop policy if exists "import_jobs_delete_terminal_own" on public.import_jobs;
create policy "import_jobs_delete_terminal_own" on public.import_jobs
for delete to authenticated
using (
  (select auth.uid()) = owner_id
  and status in ('complete', 'partial_failure', 'failed', 'cancelled')
);

drop policy if exists "collections_owner_all" on public.collections;
create policy "collections_owner_all" on public.collections
for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "collection_recipes_owner_all" on public.collection_recipes;
create policy "collection_recipes_owner_all" on public.collection_recipes
for all to authenticated
using (
  exists (
    select 1 from public.collections c
    where c.id = collection_id and c.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.collections c
    join public.recipes r
      on r.id = recipe_id and r.owner_id = c.owner_id
    where c.id = collection_id and c.owner_id = (select auth.uid())
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipe-media',
  'recipe-media',
  false,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'video/mp4',
    'application/vnd.mise.fixture-clip+json'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'temp-review',
  'temp-review',
  false,
  52428800,
  array[
    'video/mp4',
    'application/vnd.apple.mpegurl',
    'video/mp2t',
    'application/vnd.mise.fixture-timeline+json'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "private_media_select_own" on storage.objects;
create policy "private_media_select_own" on storage.objects
for select to authenticated
using (
  bucket_id in ('recipe-media', 'temp-review')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists "private_media_insert_own" on storage.objects;
create policy "private_media_insert_own" on storage.objects
for insert to authenticated
with check (
  bucket_id in ('recipe-media', 'temp-review')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists "private_media_update_own" on storage.objects;
create policy "private_media_update_own" on storage.objects
for update to authenticated
using (
  bucket_id in ('recipe-media', 'temp-review')
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id in ('recipe-media', 'temp-review')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists "private_media_delete_own" on storage.objects;
create policy "private_media_delete_own" on storage.objects
for delete to authenticated
using (
  bucket_id in ('recipe-media', 'temp-review')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.claim_next_import_job(p_worker_id text)
returns setof public.import_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_worker_id is null or length(trim(p_worker_id)) = 0 or length(p_worker_id) > 200 then
    raise exception 'worker id is required and must be at most 200 characters'
      using errcode = '22023';
  end if;

  return query
  with candidate as (
    select job.id
    from public.import_jobs as job
    where job.status = 'queued'
      and job.cancel_requested_at is null
    order by job.created_at, job.id
    for update skip locked
    limit 1
  )
  update public.import_jobs as job
  set status = 'resolving_source',
      current_stage = 'resolving_source',
      progress = greatest(job.progress, 1),
      worker_id = trim(p_worker_id),
      claimed_at = timezone('utc', now()),
      heartbeat_at = timezone('utc', now()),
      error_code = null,
      error_message_key = null,
      debug_ref = null
  from candidate
  where job.id = candidate.id
  returning job.*;
end;
$$;

revoke all on function public.claim_next_import_job(text) from public;
revoke all on function public.claim_next_import_job(text) from anon;
revoke all on function public.claim_next_import_job(text) from authenticated;
grant execute on function public.claim_next_import_job(text) to service_role;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'import_jobs'
  ) then
    alter publication supabase_realtime add table public.import_jobs;
  end if;
end;
$$;

commit;
