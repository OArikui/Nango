-- Nango personal dictionary storage.
-- Run this script in the Supabase SQL Editor.
create table if not exists public.nango_user_data (
    user_id uuid primary key references auth.users (id) on delete cascade,
    data jsonb not null check (jsonb_typeof(data) = 'object'),
    updated_at timestamptz not null default now()
);

alter table public.nango_user_data enable row level security;
revoke all on table public.nango_user_data from anon, authenticated;
grant select, insert, update, delete on table public.nango_user_data to authenticated;

drop policy if exists "Users can read their own Nango data" on public.nango_user_data;
create policy "Users can read their own Nango data"
    on public.nango_user_data for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own Nango data" on public.nango_user_data;
create policy "Users can insert their own Nango data"
    on public.nango_user_data for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own Nango data" on public.nango_user_data;
create policy "Users can update their own Nango data"
    on public.nango_user_data for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own Nango data" on public.nango_user_data;
create policy "Users can delete their own Nango data"
    on public.nango_user_data for delete to authenticated
    using ((select auth.uid()) = user_id);

-- User-specific application display settings (kept separate from dictionary JSON).
create table if not exists public.nango_user_settings (
    user_id uuid primary key references auth.users (id) on delete cascade,
    settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
    updated_at timestamptz not null default now()
);

alter table public.nango_user_settings enable row level security;
revoke all on table public.nango_user_settings from anon, authenticated;
grant select, insert, update, delete on public.nango_user_settings to authenticated;

drop policy if exists "Users can read their own Nango settings" on public.nango_user_settings;
create policy "Users can read their own Nango settings"
    on public.nango_user_settings for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own Nango settings" on public.nango_user_settings;
create policy "Users can insert their own Nango settings"
    on public.nango_user_settings for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own Nango settings" on public.nango_user_settings;
create policy "Users can update their own Nango settings"
    on public.nango_user_settings for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own Nango settings" on public.nango_user_settings;
create policy "Users can delete their own Nango settings"
    on public.nango_user_settings for delete to authenticated
    using ((select auth.uid()) = user_id);

-- Per-user word-detail view events. These records are separate from dictionary JSON.
create table if not exists public.nango_user_view_events (
    event_id uuid primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    view_date date not null,
    viewed_at timestamptz not null default now()
);

create index if not exists nango_user_view_events_user_date_idx
    on public.nango_user_view_events (user_id, view_date);

alter table public.nango_user_view_events enable row level security;
revoke all on table public.nango_user_view_events from anon, authenticated;
grant select, insert on table public.nango_user_view_events to authenticated;

drop policy if exists "Users can read their own Nango view events" on public.nango_user_view_events;
create policy "Users can read their own Nango view events"
    on public.nango_user_view_events for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own Nango view events" on public.nango_user_view_events;
create policy "Users can insert their own Nango view events"
    on public.nango_user_view_events for insert to authenticated
    with check ((select auth.uid()) = user_id);
