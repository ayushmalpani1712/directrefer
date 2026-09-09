create table if not exists public.profile_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  snapshot jsonb not null,
  created_at timestamptz default now() not null
);

alter table public.profile_history enable row level security;

create policy "Users can insert their own profile history"
  on public.profile_history for insert
  with check (auth.uid() = user_id);

create policy "Users can read their own profile history"
  on public.profile_history for select
  using (auth.uid() = user_id);

create index if not exists idx_profile_history_user_id on public.profile_history(user_id);
create index if not exists idx_profile_history_created_at on public.profile_history(created_at desc);
