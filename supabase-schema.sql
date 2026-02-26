-- ============================================================
-- MOSL — Supabase baza podataka (sa ženskom vertikalom)
-- Pokrenite u: Supabase → SQL Editor → Run
-- NAPOMENA: ako već imate tabele, pokrenite samo ALTER deo dole
-- ============================================================

-- 1. TIMOVI
CREATE TABLE IF NOT EXISTS teams (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL CHECK (category IN (
    'seniori','juniori','kadeti','pioniri','predpioniri','mini-muski',
    'seniorke','juniorke','kadetkinje','pionirke','predpionirke','mini-zenske'
  )),
  city       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA LIGA
CREATE TABLE IF NOT EXISTS standings (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id      UUID REFERENCES teams(id) ON DELETE CASCADE,
  category     TEXT NOT NULL CHECK (category IN (
    'seniori','juniori','kadeti','pioniri','predpioniri','mini-muski',
    'seniorke','juniorke','kadetkinje','pionirke','predpionirke','mini-zenske'
  )),
  season       TEXT NOT NULL DEFAULT '2025/2026',
  position     INT  DEFAULT 1,
  played       INT  DEFAULT 0,
  won          INT  DEFAULT 0,
  lost         INT  DEFAULT 0,
  sets_won     INT  DEFAULT 0,
  sets_lost    INT  DEFAULT 0,
  points_won   INT  DEFAULT 0,
  points_lost  INT  DEFAULT 0,
  points       INT  DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. UTAKMICE
CREATE TABLE IF NOT EXISTS matches (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  home_team_id   UUID REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id   UUID REFERENCES teams(id) ON DELETE CASCADE,
  category       TEXT NOT NULL CHECK (category IN (
    'seniori','juniori','kadeti','pioniri','predpioniri','mini-muski',
    'seniorke','juniorke','kadetkinje','pionirke','predpionirke','mini-zenske'
  )),
  season         TEXT NOT NULL DEFAULT '2025/2026',
  match_date     DATE NOT NULL,
  match_time     TIME,
  venue          TEXT,
  home_score     INT,
  away_score     INT,
  home_sets      INT,
  away_sets      INT,
  status         TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','finished','postponed')),
  round          TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE teams     ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_teams"     ON teams     FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "read_standings" ON standings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "read_matches"   ON matches   FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "write_teams"     ON teams     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "write_standings" ON standings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "write_matches"   ON matches   FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- AKO VEĆ IMAŠ TABELE — pokreni samo ovo da ažuriraš CHECK:
-- ============================================================
-- ALTER TABLE teams     DROP CONSTRAINT IF EXISTS teams_category_check;
-- ALTER TABLE standings DROP CONSTRAINT IF EXISTS standings_category_check;
-- ALTER TABLE matches   DROP CONSTRAINT IF EXISTS matches_category_check;
--
-- ALTER TABLE teams     ADD CONSTRAINT teams_category_check
--   CHECK (category IN ('seniori','juniori','kadeti','pioniri','predpioniri','mini-muski','seniorke','juniorke','kadetkinje','pionirke','predpionirke','mini-zenske'));
-- ALTER TABLE standings ADD CONSTRAINT standings_category_check
--   CHECK (category IN ('seniori','juniori','kadeti','pioniri','predpioniri','mini-muski','seniorke','juniorke','kadetkinje','pionirke','predpionirke','mini-zenske'));
-- ALTER TABLE matches   ADD CONSTRAINT matches_category_check
--   CHECK (category IN ('seniori','juniori','kadeti','pioniri','predpioniri','mini-muski','seniorke','juniorke','kadetkinje','pionirke','predpionirke','mini-zenske'));
