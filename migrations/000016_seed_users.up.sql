INSERT INTO users (username, display_name, password_hash, is_admin)
VALUES
  ('ali',     'Ali',     '$2a$12$zVEwHu5NtVBpQgBUvGI2m.axswbej9M0DUULQNFEv7B2mdopVPtRC', TRUE),
  ('alishba', 'Alishba', '$2a$12$Juy8xz3MAsSoSxkA3AzbdOANym.O9Tam/vVIfBDmw3OLCAt5ls9CC', FALSE)
ON CONFLICT (username) DO NOTHING;
