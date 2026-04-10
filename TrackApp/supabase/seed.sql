insert into speed_cameras (type, latitude, longitude, speed_limit, road_name) values
('fixed', 52.3676, 4.9041, 50, 'Amsterdam Centrum'),
('trajectory', 52.0907, 5.1214, 80, 'Utrecht A27'),
('red_light', 51.9244, 4.4777, 50, 'Rotterdam Maasboulevard');

insert into reports (user_id, type, latitude, longitude, address, description, upvotes, downvotes, is_active, expires_at) values
(null, 'speed_camera_mobile', 52.3712, 4.8995, 'Damrak, Amsterdam', 'Mobiele flitser in de bocht richting Centraal', 12, 1, true, now() + interval '90 minutes'),
(null, 'police_control', 52.0882, 5.1045, 'Biltstraat, Utrecht', 'Politiecontrole bij de uitrit', 8, 0, true, now() + interval '75 minutes'),
(null, 'accident', 51.9227, 4.4791, 'Maasboulevard, Rotterdam', 'Kleine aanrijding, rijstrook deels dicht', 5, 0, true, now() + interval '60 minutes');

insert into pi_detections (user_id, service_type, frequency, rssi, distance_km, latitude, longitude) values
(null, 'police', 163.250, -71, 1.8, 52.3710, 4.9021);
