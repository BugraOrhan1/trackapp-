insert into profiles (id, username, avatar_url, subscription_type, total_reports, reputation_score) values
('11111111-1111-1111-1111-111111111111', 'amsterdam_fan', null, 'premium', 18, 210),
('22222222-2222-2222-2222-222222222222', 'utrecht_driver', null, 'free', 7, 84),
('33333333-3333-3333-3333-333333333333', 'rotterdam_roadwatch', null, 'premium', 24, 320)
on conflict (id) do nothing;

insert into speed_cameras (id, type, latitude, longitude, location, speed_limit, direction, road_name, is_active, last_verified) values
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fixed', 52.3676, 4.9041, st_setsrid(st_makepoint(4.9041, 52.3676), 4326)::geography, 50, 'northbound', 'Amsterdam Centrum', true, now()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'trajectory', 52.0907, 5.1214, st_setsrid(st_makepoint(5.1214, 52.0907), 4326)::geography, 80, 'eastbound', 'Utrecht A27', true, now()),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'red_light', 51.9244, 4.4777, st_setsrid(st_makepoint(4.4777, 51.9244), 4326)::geography, 50, 'southbound', 'Rotterdam Maasboulevard', true, now()),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'fixed', 52.3791, 4.8994, st_setsrid(st_makepoint(4.8994, 52.3791), 4326)::geography, 70, 'westbound', 'IJ-tunnel', true, now())
on conflict (id) do nothing;

insert into reports (id, user_id, type, latitude, longitude, location, address, description, upvotes, downvotes, is_active, expires_at) values
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'speed_camera_mobile', 52.3712, 4.8995, st_setsrid(st_makepoint(4.8995, 52.3712), 4326)::geography, 'Damrak, Amsterdam', 'Mobiele flitser in de bocht richting Centraal', 12, 1, true, now() + interval '90 minutes'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', 'police_control', 52.0882, 5.1045, st_setsrid(st_makepoint(5.1045, 52.0882), 4326)::geography, 'Biltstraat, Utrecht', 'Politiecontrole bij de uitrit', 8, 0, true, now() + interval '75 minutes'),
('99999999-9999-9999-9999-999999999999', '33333333-3333-3333-3333-333333333333', 'accident', 51.9227, 4.4791, st_setsrid(st_makepoint(4.4791, 51.9227), 4326)::geography, 'Maasboulevard, Rotterdam', 'Kleine aanrijding, rijstrook deels dicht', 5, 0, true, now() + interval '60 minutes'),
('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'roadwork', 52.0815, 5.1194, st_setsrid(st_makepoint(5.1194, 52.0815), 4326)::geography, 'Utrecht Ring', 'Tijdelijke rijstrookafsluiting', 4, 0, true, now() + interval '45 minutes')
on conflict (id) do nothing;

insert into pi_detections (id, user_id, session_id, service_type, frequency, rssi, distance_km, latitude, longitude, location, bearing, created_at) values
('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'police', 163.250, -71, 1.8, 52.3710, 4.9021, st_setsrid(st_makepoint(4.9021, 52.3710), 4326)::geography, 255, now() - interval '10 minutes'),
('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ambulance', 155.120, -66, 2.4, 52.3705, 4.8988, st_setsrid(st_makepoint(4.8988, 52.3705), 4326)::geography, 120, now() - interval '22 minutes'),
('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'fire', 172.875, -60, 3.1, 51.9242, 4.4765, st_setsrid(st_makepoint(4.4765, 51.9242), 4326)::geography, 45, now() - interval '5 minutes')
on conflict (id) do nothing;
