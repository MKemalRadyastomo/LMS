-- =====================================================
-- Migration 007: Add status column to courses table
-- =====================================================
-- This migration adds a status column to the courses table
-- to support course status badges (active, draft, archived)
-- =====================================================

-- Add status column to courses table
ALTER TABLE courses 
ADD COLUMN status VARCHAR(20) DEFAULT 'active' 
CHECK (status IN ('active', 'draft', 'archived'));

-- Update existing courses based on is_active field
-- is_active = true → status = 'active'
-- is_active = false → status = 'draft'
UPDATE courses 
SET status = CASE 
    WHEN is_active = true THEN 'active'
    WHEN is_active = false THEN 'draft'
    ELSE 'active'
END;

-- Make status column NOT NULL after setting values
ALTER TABLE courses 
ALTER COLUMN status SET NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

-- Add comment for documentation
COMMENT ON COLUMN courses.status IS 'Course status: active (published), draft (unpublished), archived (hidden)';

-- Migration complete
-- Status values:
-- - 'active': Course is published and available to students
-- - 'draft': Course is being prepared, not visible to students
-- - 'archived': Course is completed/hidden, read-only access