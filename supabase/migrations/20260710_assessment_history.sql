-- Assessment History: Track previous assessment versions
-- Enables progress tracking and comparison over time

CREATE TABLE IF NOT EXISTS assessment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
  ai_system_id UUID NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL, -- unacceptable, high, medium, low
  risk_score FLOAT NOT NULL,
  assessment_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  version_number INT NOT NULL,
  archived_at TIMESTAMP DEFAULT NOW(),
  notes TEXT, -- e.g., "Updated after remediation", "Annual review"
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(assessment_id, version_number)
);

CREATE INDEX idx_assessment_history_assessment_id ON assessment_history(assessment_id);
CREATE INDEX idx_assessment_history_ai_system ON assessment_history(ai_system_id);
CREATE INDEX idx_assessment_history_workspace ON assessment_history(workspace_id);
CREATE INDEX idx_assessment_history_archived_at ON assessment_history(archived_at DESC);

-- RLS: Users can only view history for their workspace
ALTER TABLE assessment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_assessment_history" ON assessment_history
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "service_can_insert_assessment_history" ON assessment_history
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
  );

-- Helper function: Calculate improvement between two assessments
CREATE OR REPLACE FUNCTION calculate_assessment_improvement(
  old_score FLOAT,
  new_score FLOAT
)
RETURNS TABLE (
  improved BOOLEAN,
  score_change FLOAT,
  percent_change FLOAT,
  improvement_category TEXT -- "significant", "moderate", "minor", "regression"
) AS $$
BEGIN
  RETURN QUERY SELECT
    new_score < old_score as improved,
    (old_score - new_score) as score_change,
    CASE
      WHEN old_score > 0 THEN ROUND(((old_score - new_score) / old_score) * 100, 1)
      ELSE 0
    END as percent_change,
    CASE
      WHEN new_score > old_score THEN 'regression'
      WHEN (old_score - new_score) >= 30 THEN 'significant'
      WHEN (old_score - new_score) >= 10 THEN 'moderate'
      WHEN (old_score - new_score) > 0 THEN 'minor'
      ELSE 'no_change'
    END as improvement_category;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function: Get latest and previous assessment for comparison
CREATE OR REPLACE FUNCTION get_assessment_comparison(
  p_ai_system_id UUID
)
RETURNS TABLE (
  current_version INT,
  current_score FLOAT,
  current_level TEXT,
  current_date TIMESTAMP,
  previous_version INT,
  previous_score FLOAT,
  previous_level TEXT,
  previous_date TIMESTAMP,
  versions_count INT
) AS $$
BEGIN
  RETURN QUERY
  WITH assessment_versions AS (
    SELECT
      COALESCE(version_number, 1) as version,
      risk_score,
      risk_level,
      COALESCE(archived_at, (SELECT updated_at FROM risk_assessments WHERE id = p_ai_system_id)) as assessed_at,
      ROW_NUMBER() OVER (ORDER BY COALESCE(archived_at, (SELECT updated_at FROM risk_assessments WHERE id = p_ai_system_id)) DESC) as row_num
    FROM assessment_history
    WHERE ai_system_id = p_ai_system_id
    UNION ALL
    SELECT
      1 as version,
      risk_score,
      risk_level,
      updated_at as assessed_at,
      ROW_NUMBER() OVER (ORDER BY updated_at DESC) as row_num
    FROM risk_assessments
    WHERE ai_system_id = p_ai_system_id
  )
  SELECT
    MAX(CASE WHEN row_num = 1 THEN version END)::INT,
    MAX(CASE WHEN row_num = 1 THEN risk_score END)::FLOAT,
    MAX(CASE WHEN row_num = 1 THEN risk_level END)::TEXT,
    MAX(CASE WHEN row_num = 1 THEN assessed_at END)::TIMESTAMP,
    MAX(CASE WHEN row_num = 2 THEN version END)::INT,
    MAX(CASE WHEN row_num = 2 THEN risk_score END)::FLOAT,
    MAX(CASE WHEN row_num = 2 THEN risk_level END)::TEXT,
    MAX(CASE WHEN row_num = 2 THEN assessed_at END)::TIMESTAMP,
    COUNT(DISTINCT version)::INT
  FROM assessment_versions;
END;
$$ LANGUAGE plpgsql STABLE;
