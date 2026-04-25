INSERT INTO users (username, display_name, password_hash, is_admin)
VALUES
  ('ali',     'Ali',     '$2a$12$t/OrPmjZBEfQtOd3lwmf7eHOqbeVIvmqgMG7J4ylIEjWCKSJs3Em6', TRUE),
  ('alishba', 'Alishba', '$2a$12$f2Ts0CUdSpFH3DFmLeKKCeSDa5mRhFQr/kaWjo.WBbNw05A6u26ta', FALSE)
ON CONFLICT (username) DO NOTHING;
