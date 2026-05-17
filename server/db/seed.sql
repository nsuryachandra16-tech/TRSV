-- TSRV Regional Database Seed Data

-- 1. Insert Core Telangana Constituencies
INSERT INTO constituencies (constituency_name, district, status) VALUES
('Kukatpally Constituency', 'Medchal-Malkajgiri', 'active'),
('Secunderabad Constituency', 'Hyderabad', 'active'),
('Warangal West Node', 'Hanumakonda', 'active'),
('Nalgonda Node', 'Nalgonda', 'active'),
('Karimnagar Cluster', 'Karimnagar', 'active')
ON CONFLICT (constituency_name) DO NOTHING;

-- 2. Insert Core Colleges mapped to Constituencies
INSERT INTO colleges (college_name, constituency_id) VALUES
('JNTUH College of Engineering, Hyderabad', (SELECT id FROM constituencies WHERE constituency_name = 'Kukatpally Constituency')),
('VNR VIGNANA JYOTHI, Bachupally', (SELECT id FROM constituencies WHERE constituency_name = 'Kukatpally Constituency')),
('Secunderabad PG College, Secunderabad', (SELECT id FROM constituencies WHERE constituency_name = 'Secunderabad Constituency')),
('Kakatiya Institute of Technology, Warangal', (SELECT id FROM constituencies WHERE constituency_name = 'Warangal West Node')),
('Nalgonda Degree College, Nalgonda', (SELECT id FROM constituencies WHERE constituency_name = 'Nalgonda Node')),
('Karimnagar University College, Karimnagar', (SELECT id FROM constituencies WHERE constituency_name = 'Karimnagar Cluster'))
ON CONFLICT (college_name) DO NOTHING;
