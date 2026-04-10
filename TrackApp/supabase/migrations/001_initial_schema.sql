-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists postgis;

-- Profiles
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  avatar_url text,
  subscription_type text not null default 'free' check (subscription_type in ('free', 'premium')),
  subscription_expires_at timestamptz,
  total_reports integer not null default 0,
  reputation_score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Speed cameras
create table if not exists speed_cameras (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('fixed', 'trajectory', 'red_light')),
  latitude double precision not null,
  longitude double precision not null,
  location geography(Point, 4326),
  speed_limit integer,
  direction text,
  road_name text,
  is_active boolean not null default true,
  last_verified timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Reports
create table if not exists reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null check (type in (
    'speed_camera_mobile',
    'police_control',
    'accident',
    'traffic_jam',
    'roadwork',
    'danger',
    'other'
  )),
  latitude double precision not null,
  longitude double precision not null,
  location geography(Point, 4326),
  address text,
  description text,
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  is_active boolean not null default true,
  expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz not null default now()
);

-- Report votes
create table if not exists report_votes (
  id uuid primary key default uuid_generate_v4(),
  report_id uuid references reports(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  vote_type text not null check (vote_type in ('up', 'down')),
  created_at timestamptz not null default now(),
  unique (report_id, user_id)
);

-- Pi detections
create table if not exists pi_detections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  session_id uuid,
  service_type text not null check (service_type in ('police', 'ambulance', 'fire', 'defense', 'unknown')),
  frequency double precision,
  rssi double precision,
  distance_km double precision,
  latitude double precision,
  longitude double precision,
  location geography(Point, 4326),
  bearing integer,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists speed_cameras_location_idx on speed_cameras using gist (location);
create index if not exists reports_location_idx on reports using gist (location);
create index if not exists reports_expires_at_idx on reports (expires_at);
create index if not exists reports_user_id_idx on reports (user_id);
create index if not exists report_votes_report_idx on report_votes (report_id);
create index if not exists report_votes_user_idx on report_votes (user_id);
create index if not exists pi_detections_location_idx on pi_detections using gist (location);
create index if not exists pi_detections_user_idx on pi_detections (user_id);

-- RLS
alter table profiles enable row level security;
alter table reports enable row level security;
alter table report_votes enable row level security;
alter table speed_cameras enable row level security;
alter table pi_detections enable row level security;

-- Policies: profiles
create policy "Profiles viewable by everyone"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Policies: reports
create policy "Reports viewable by everyone"
  on reports for select using (is_active = true);

create policy "Authenticated users can create reports"
  on reports for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Users can update own reports"
  on reports for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own reports"
  on reports for delete using (auth.uid() = user_id);

-- Policies: report votes
create policy "Votes viewable by everyone"
  on report_votes for select using (true);

create policy "Authenticated users can vote"
  on report_votes for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Users can update own votes"
  on report_votes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own votes"
  on report_votes for delete using (auth.uid() = user_id);

-- Policies: speed cameras
create policy "Speed cameras viewable by everyone"
  on speed_cameras for select using (is_active = true);

-- Policies: pi detections
create policy "Users can view own detections"
  on pi_detections for select using (auth.uid() = user_id);

create policy "Premium users can insert detections"
  on pi_detections for insert with check (
    auth.uid() = user_id and exists (
      select 1
      from profiles
      where id = auth.uid()
        and subscription_type = 'premium'
        and (subscription_expires_at is null or subscription_expires_at > now())
    )
  );

-- Updated timestamps
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- New user profile
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Vote counters
create or replace function update_report_votes()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    if new.vote_type = 'up' then
      update reports set upvotes = upvotes + 1 where id = new.report_id;
    else
      update reports set downvotes = downvotes + 1 where id = new.report_id;
    end if;
    return null;
  elsif tg_op = 'UPDATE' then
    if old.vote_type = 'up' then
      update reports set upvotes = greatest(upvotes - 1, 0) where id = old.report_id;
    else
      update reports set downvotes = greatest(downvotes - 1, 0) where id = old.report_id;
    end if;

    if new.vote_type = 'up' then
      update reports set upvotes = upvotes + 1 where id = new.report_id;
    else
      update reports set downvotes = downvotes + 1 where id = new.report_id;
    end if;
    return null;
  elsif tg_op = 'DELETE' then
    if old.vote_type = 'up' then
      update reports set upvotes = greatest(upvotes - 1, 0) where id = old.report_id;
    else
      update reports set downvotes = greatest(downvotes - 1, 0) where id = old.report_id;
    end if;
    return null;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_vote_change
  after insert or update or delete on report_votes
  for each row execute function update_report_votes();

-- Expire old reports
create or replace function expire_old_reports()
returns void as $$
begin
  update reports
  set is_active = false
  where expires_at < now() and is_active = true;
end;
$$ language plpgsql security definer;

-- Nearby geo helpers
create or replace function nearby_reports(
  user_lat double precision,
  user_lng double precision,
  radius_km double precision default 10
)
returns table (
  id uuid,
  user_id uuid,
  type text,
  latitude double precision,
  longitude double precision,
  distance_meters double precision
) as $$
begin
  return query
  select
    r.id,
    r.user_id,
    r.type,
    r.latitude,
    r.longitude,
    st_distance(r.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography) as distance_meters
  from reports r
  where r.is_active = true
    and r.expires_at > now()
    and st_dwithin(r.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography, radius_km * 1000)
  order by distance_meters asc;
end;
$$ language plpgsql security definer;

create or replace function nearby_speed_cameras(
  user_lat double precision,
  user_lng double precision,
  radius_km double precision default 10
)
returns table (
  id uuid,
  type text,
  latitude double precision,
  longitude double precision,
  distance_meters double precision
) as $$
begin
  return query
  select
    s.id,
    s.type,
    s.latitude,
    s.longitude,
    st_distance(s.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography) as distance_meters
  from speed_cameras s
  where s.is_active = true
    and st_dwithin(s.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography, radius_km * 1000)
  order by distance_meters asc;
end;
$$ language plpgsql security definer;

-- Realtime
alter publication supabase_realtime add table reports;
alter publication supabase_realtime add table report_votes;
alter publication supabase_realtime add table pi_detections;
