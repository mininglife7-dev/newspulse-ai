-- Migration: Remove unused current_workspace_id column from profiles
-- Reason: Column is populated but never used for RLS or business logic
--         Access control is properly enforced via workspace_members table
--         Removing reduces schema complexity and cognitive load
-- Safety: Column contains no data needed for access decisions

ALTER TABLE profiles DROP COLUMN IF EXISTS current_workspace_id;
