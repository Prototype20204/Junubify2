-- Secure administrator workflow for reviewing private artist submissions.
create table if not exists public.track_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.track_admins enable row level security;
revoke all on public.track_admins from anon, authenticated;

create or replace function public.is_track_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.track_admins admins
    where admins.user_id = auth.uid()
  );
$$;

revoke all on function public.is_track_admin() from public;
grant execute on function public.is_track_admin() to authenticated;

alter table public.tracks
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

drop policy if exists "Admins can read all track submissions" on public.tracks;
create policy "Admins can read all track submissions"
  on public.tracks for select to authenticated
  using (public.is_track_admin());

drop policy if exists "Admins can decide pending track submissions" on public.tracks;
create policy "Admins can decide pending track submissions"
  on public.tracks for update to authenticated
  using (public.is_track_admin() and status = 'pending_review')
  with check (public.is_track_admin() and status in ('published', 'rejected'));

grant update (status) on public.tracks to authenticated;

create or replace function public.set_track_review_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if not public.is_track_admin() then
      raise exception 'Only track administrators can review submissions';
    end if;
    new.reviewed_at := now();
    new.reviewed_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists set_track_review_audit on public.tracks;
create trigger set_track_review_audit
  before update of status on public.tracks
  for each row execute function public.set_track_review_audit();

drop policy if exists "Track administrators can review private audio" on storage.objects;
create policy "Track administrators can review private audio"
  on storage.objects for select to authenticated
  using (bucket_id = 'junubify-audio' and public.is_track_admin());
