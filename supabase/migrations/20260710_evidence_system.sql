-- Evidence System: Attach compliance documentation to obligations
-- Enables proof of completion and audit trails

CREATE TABLE IF NOT EXISTS obligation_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INT NOT NULL, -- bytes
  file_type TEXT NOT NULL, -- mime type: application/pdf, image/png, etc.
  storage_path TEXT NOT NULL, -- path in Supabase Storage: obligations/{obligation_id}/{file_name}
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  notes TEXT, -- e.g., "Screenshot of control implementation"
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_obligation_evidence_obligation_id ON obligation_evidence(obligation_id);
CREATE INDEX idx_obligation_evidence_workspace_id ON obligation_evidence(workspace_id);
CREATE INDEX idx_obligation_evidence_uploaded_at ON obligation_evidence(uploaded_at DESC);

-- RLS: Users can view evidence for their workspace
ALTER TABLE obligation_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_evidence" ON obligation_evidence
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "workspace_members_can_upload_evidence" ON obligation_evidence
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "users_can_delete_own_evidence" ON obligation_evidence
  FOR DELETE USING (
    uploaded_by = auth.uid()
    AND workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Helper function: Get evidence count by obligation
CREATE OR REPLACE FUNCTION count_obligation_evidence(p_obligation_id UUID)
RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INT
    FROM obligation_evidence
    WHERE obligation_id = p_obligation_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function: Get evidence by obligation with uploader details
CREATE OR REPLACE FUNCTION get_obligation_evidence(p_obligation_id UUID)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_size INT,
  file_type TEXT,
  storage_path TEXT,
  uploaded_by_name TEXT,
  uploaded_at TIMESTAMP,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    oe.id,
    oe.file_name,
    oe.file_size,
    oe.file_type,
    oe.storage_path,
    COALESCE(u.raw_user_meta_data->>'first_name', u.email) as uploaded_by_name,
    oe.uploaded_at,
    oe.notes
  FROM obligation_evidence oe
  LEFT JOIN auth.users u ON oe.uploaded_by = u.id
  WHERE oe.obligation_id = p_obligation_id
  ORDER BY oe.uploaded_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;
