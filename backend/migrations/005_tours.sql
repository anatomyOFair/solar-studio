-- Guided tours: each tour has ordered stops that FK to celestial_objects

CREATE TABLE tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tour_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  object_id TEXT NOT NULL REFERENCES celestial_objects(id),
  step_order INTEGER NOT NULL,
  narration TEXT NOT NULL,
  UNIQUE(tour_id, step_order)
);

CREATE INDEX idx_tour_stops_tour ON tour_stops(tour_id);

-- RLS: public read
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tours are viewable by everyone" ON tours FOR SELECT USING (true);
CREATE POLICY "Tour stops are viewable by everyone" ON tour_stops FOR SELECT USING (true);

-- Seed: Grand Tour
INSERT INTO tours (id, title, description, sort_order)
VALUES ('00000000-0000-0000-0000-000000000001', 'Grand Tour', 'A journey through every planet in our solar system, from the Sun to Neptune.', 0);

INSERT INTO tour_stops (tour_id, object_id, step_order, narration) VALUES
  ('00000000-0000-0000-0000-000000000001', 'sun',     0, 'Our journey begins at the Sun — a G-type main-sequence star containing 99.86% of the solar system''s mass. Its surface burns at 5,500 °C.'),
  ('00000000-0000-0000-0000-000000000001', 'mercury', 1, 'Mercury, the smallest planet and closest to the Sun. With no atmosphere to retain heat, temperatures swing from 430 °C to −180 °C.'),
  ('00000000-0000-0000-0000-000000000001', 'venus',   2, 'Venus, Earth''s twin in size but not in temperament. A runaway greenhouse effect makes it the hottest planet at 465 °C — hotter than Mercury.'),
  ('00000000-0000-0000-0000-000000000001', 'earth',   3, 'Earth — the only known world with liquid water, a protective magnetic field, and the conditions for complex life.'),
  ('00000000-0000-0000-0000-000000000001', 'mars',    4, 'Mars, the Red Planet. Home to Olympus Mons, the tallest volcano, and Valles Marineris, the deepest canyon in the solar system.'),
  ('00000000-0000-0000-0000-000000000001', 'jupiter', 5, 'Jupiter, the giant. Over 1,300 Earths could fit inside it. Its Great Red Spot is a storm larger than Earth that has raged for centuries.'),
  ('00000000-0000-0000-0000-000000000001', 'saturn',  6, 'Saturn and its spectacular rings of ice and rock. Despite being the second-largest planet, it''s the least dense — it would float in water.'),
  ('00000000-0000-0000-0000-000000000001', 'uranus',  7, 'Uranus rotates on its side with a 98° tilt, likely from an ancient collision. Its blue-green colour comes from methane in the atmosphere.'),
  ('00000000-0000-0000-0000-000000000001', 'neptune', 8, 'Neptune, the most distant planet. It has the fastest winds in the solar system, reaching 2,100 km/h. Its deep blue comes from methane absorbing red light.');

-- Seed: Rocky Worlds
INSERT INTO tours (id, title, description, sort_order)
VALUES ('00000000-0000-0000-0000-000000000002', 'Rocky Worlds', 'The four terrestrial planets — small, dense, and close to the Sun.', 1);

INSERT INTO tour_stops (tour_id, object_id, step_order, narration) VALUES
  ('00000000-0000-0000-0000-000000000002', 'mercury', 0, 'Mercury has no atmosphere to speak of. Its cratered surface looks remarkably like our Moon — a relic of the early solar system''s heavy bombardment.'),
  ('00000000-0000-0000-0000-000000000002', 'venus',   1, 'Beneath Venus''s opaque clouds lies a volcanic landscape with more volcanoes than any other planet. Radar mapping by Magellan revealed over 1,600.'),
  ('00000000-0000-0000-0000-000000000002', 'earth',   2, 'Earth''s secret weapon is plate tectonics — recycling carbon, building mountains, and keeping the climate stable over billions of years.'),
  ('00000000-0000-0000-0000-000000000002', 'mars',    3, 'Mars once had a thicker atmosphere and liquid water. Today, its polar ice caps hold frozen CO₂ and water ice — clues to its warmer past.');

-- Seed: Gas Giants
INSERT INTO tours (id, title, description, sort_order)
VALUES ('00000000-0000-0000-0000-000000000003', 'Gas Giants', 'The outer planets — massive worlds of gas and ice beyond the asteroid belt.', 2);

INSERT INTO tour_stops (tour_id, object_id, step_order, narration) VALUES
  ('00000000-0000-0000-0000-000000000003', 'jupiter', 0, 'Jupiter''s magnetic field is 20,000 times stronger than Earth''s. It traps radiation so intense that unshielded electronics would fry in minutes.'),
  ('00000000-0000-0000-0000-000000000003', 'saturn',  1, 'Saturn''s rings are incredibly thin — only about 10 metres thick despite spanning 280,000 km. They''re made of billions of chunks of ice and rock.'),
  ('00000000-0000-0000-0000-000000000003', 'uranus',  2, 'Uranus was the first planet discovered with a telescope, found by William Herschel in 1781. He initially thought it was a comet.'),
  ('00000000-0000-0000-0000-000000000003', 'neptune', 3, 'Neptune was found through mathematics before anyone saw it. Astronomers predicted its position from perturbations in Uranus''s orbit.');

-- Seed: Moons of the Giants
INSERT INTO tours (id, title, description, sort_order)
VALUES ('00000000-0000-0000-0000-000000000004', 'Moons of the Giants', 'The most fascinating moons in our solar system — worlds in their own right.', 3);

INSERT INTO tour_stops (tour_id, object_id, step_order, narration) VALUES
  ('00000000-0000-0000-0000-000000000004', 'moon',     0, 'Our Moon is slowly drifting away from Earth — about 3.8 cm per year. In the distant past it was much closer, making tides dramatically stronger.'),
  ('00000000-0000-0000-0000-000000000004', 'europa',   1, 'Europa''s ocean contains roughly twice as much water as all of Earth''s oceans combined, hidden beneath an ice shell 15–25 km thick.'),
  ('00000000-0000-0000-0000-000000000004', 'ganymede', 2, 'Ganymede is the only moon with its own magnetic field, which creates faint auroras. It''s larger than Mercury and has a subsurface ocean.'),
  ('00000000-0000-0000-0000-000000000004', 'titan',    3, 'Titan has rain, rivers, lakes, and seas — but made of liquid methane and ethane, not water. Its thick nitrogen atmosphere is denser than Earth''s.');
