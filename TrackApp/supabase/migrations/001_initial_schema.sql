-- Enable extensions
create extension if not exists "uuid-ossp";

-- Profiles table
create table profiles (
  id uuid references auth.users primary key,
  username text unique,
  avatar_url text,
  subscription_type text default 'free' check (subscription_type in ('free', 'premium')),
  subscription_expires_at timestamptz,
  total_reports int default 0,
  reputation_score int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Reports table (user meldingen)
create table reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  type text not null check (type in ('speed_camera_mobile', 'police_control', 'accident', 'traffic_jam', 'roadwork', 'danger', 'other')),
  latitude double precision not null,
  longitude double precision not null,
  address text,
  description text,
  upvotes int default 0,
  downvotes int default 0,
  is_active boolean default true,
  expires_at timestamptz default (now() + interval '2 hours'),
  created_at timestamptz default now()
);

-- Report Votes
create table report_votes (
  id uuid primary key default uuid_generate_v4(),
  report_id uuid references reports(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  vote_type text check (vote_type in ('up', 'down')),
  created_at timestamptz default now(),
  unique(report_id, user_id)
);

-- Fixed Speed Cameras (permanent)
create table speed_cameras (
  id uuid primary key default uuid_generate_v4(),
  type text check (type in ('fixed', 'trajectory', 'red_light')),
  latitude double precision not null,
  longitude double precision not null,
  speed_limit int,
  direction text,
  road_name text,
  is_active boolean default true,
  last_verified timestamptz default now()
);

-- Pi Detections (Premium only)
create table pi_detections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  session_id uuid,
  service_type text check (service_type in ('police', 'ambulance', 'fire', 'defense', 'unknown')),
  frequency double precision,
  rssi double precision,
  distance_km double precision,
  latitude double precision,
  longitude double precision,
  created_at timestamptz default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table reports enable row level security;
alter table report_votes enable row level security;
alter table speed_cameras enable row level security;
alter table pi_detections enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Reports are viewable by everyone"
  on reports for select using (true);

create policy "Authenticated users can create reports"
  on reports for insert with check (auth.role() = 'authenticated');

create policy "Users can update own reports"
  on reports for update using (auth.uid() = user_id);

create policy "Users can view report votes"
  on report_votes for select using (true);

create policy "Users can create own report votes"
  on report_votes for insert with check (auth.uid() = user_id);

create policy "Users can delete own report votes"
  on report_votes for delete using (auth.uid() = user_id);

create policy "Speed cameras are viewable by everyone"
  on speed_cameras for select using (true);

create policy "Pi detections viewable by owner"
  on pi_detections for select using (auth.uid() = user_id);

create policy "Premium users can insert pi detections"
  on pi_detections for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 from profiles
      where id = auth.uid()
      and subscription_type = 'premium'
    )
  );

-- Functions
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create or replace function handle_profile_update_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create trigger on_profile_update_timestamp
  before update on profiles
  for each row execute function handle_profile_update_timestamp();

-- Function to update report votes
create or replace function update_report_votes()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.vote_type = 'up' then
      update reports set upvotes = upvotes + 1 where id = NEW.report_id;
    else
      update reports set downvotes = downvotes + 1 where id = NEW.report_id;
    end if;
  elsif TG_OP = 'DELETE' then
    if OLD.vote_type = 'up' then
      update reports set upvotes = upvotes - 1 where id = OLD.report_id;
    else
      update reports set downvotes = downvotes - 1 where id = OLD.report_id;
    end if;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_vote_change
  after insert or delete on report_votes
  for each row execute function update_report_votes();

-- Realtime subscriptions
alter publication supabase_realtime add table reports;

-- Indexes for the main app flows
create index reports_lat_lng_idx on reports (latitude, longitude);
create index reports_active_created_idx on reports (is_active, created_at desc);
create index report_votes_report_idx on report_votes (report_id);
create index report_votes_user_idx on report_votes (user_id);
create index speed_cameras_active_idx on speed_cameras (is_active);
create index pi_detections_user_created_idx on pi_detections (user_id, created_at desc);
