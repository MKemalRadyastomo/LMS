-- Migration 006: Add Notifications System
-- Purpose: Add comprehensive notification system with WebSocket support
-- Date: 2025-08-01

-- Table: notifications (for managing user notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error', 'assignment', 'course', 'system'
    priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(20) NOT NULL DEFAULT 'unread', -- 'unread', 'read', 'archived'
    
    -- Related entities
    related_type VARCHAR(50), -- 'course', 'assignment', 'material', 'submission', 'grade'
    related_id INTEGER,
    
    -- Action data
    action_url VARCHAR(500), -- URL to navigate to when notification is clicked
    action_label VARCHAR(100), -- Button text for action
    
    -- Metadata
    metadata JSONB,
    
    -- Delivery tracking
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    archived_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: notification_preferences (for user notification settings)
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Email preferences
    email_enabled BOOLEAN DEFAULT true,
    email_frequency VARCHAR(20) DEFAULT 'immediate', -- 'immediate', 'daily', 'weekly', 'never'
    
    -- Push notification preferences
    push_enabled BOOLEAN DEFAULT true,
    push_assignments BOOLEAN DEFAULT true,
    push_grades BOOLEAN DEFAULT true,
    push_course_updates BOOLEAN DEFAULT true,
    push_system_alerts BOOLEAN DEFAULT true,
    
    -- WebSocket preferences
    websocket_enabled BOOLEAN DEFAULT true,
    
    -- Type-specific preferences
    notification_types JSONB DEFAULT '{}', -- Store preferences for each notification type
    
    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    quiet_hours_timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one preference record per user
    UNIQUE(user_id)
);

-- Table: notification_templates (for reusable notification templates)
CREATE TABLE IF NOT EXISTS notification_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    title_template VARCHAR(255) NOT NULL,
    message_template TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    
    -- Template variables
    required_variables JSONB DEFAULT '[]', -- Array of required variable names
    optional_variables JSONB DEFAULT '[]', -- Arrays of optional variable names
    
    -- Default values
    default_action_url VARCHAR(500),
    default_action_label VARCHAR(100),
    default_expires_hours INTEGER DEFAULT 168, -- 1 week default
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Table: notification_delivery_log (for tracking delivery status)
CREATE TABLE IF NOT EXISTS notification_delivery_log (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    delivery_method VARCHAR(50) NOT NULL, -- 'websocket', 'email', 'push'
    delivery_status VARCHAR(50) NOT NULL, -- 'pending', 'sent', 'delivered', 'failed', 'bounced'
    delivery_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    delivered_at TIMESTAMP,
    error_message TEXT,
    metadata JSONB,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_related ON notifications(related_type, related_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, status) WHERE status = 'unread';
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- Indexes for notification_preferences table
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Indexes for notification_templates table
CREATE INDEX IF NOT EXISTS idx_notification_templates_name ON notification_templates(name);
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);

-- Indexes for notification_delivery_log table
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_notification_id ON notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_method ON notification_delivery_log(delivery_method);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_status ON notification_delivery_log(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_created_at ON notification_delivery_log(created_at DESC);

-- Add triggers for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_delivery_log_updated_at ON notification_delivery_log;
CREATE TRIGGER update_notification_delivery_log_updated_at
    BEFORE UPDATE ON notification_delivery_log
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default notification templates
INSERT INTO notification_templates (name, title_template, message_template, type, priority, required_variables, default_action_url, default_expires_hours) VALUES
('assignment_created', 'New Assignment: {{assignment_title}}', 'A new assignment "{{assignment_title}}" has been created in {{course_name}}. Due date: {{due_date}}.', 'assignment', 'medium', '["assignment_title", "course_name", "due_date"]', '/assignments/{{assignment_id}}', 168),
('assignment_due_soon', 'Assignment Due Soon: {{assignment_title}}', 'Your assignment "{{assignment_title}}" is due {{due_date}}. Don''t forget to submit!', 'assignment', 'high', '["assignment_title", "due_date"]', '/assignments/{{assignment_id}}', 24),
('assignment_graded', 'Assignment Graded: {{assignment_title}}', 'Your assignment "{{assignment_title}}" has been graded. Score: {{grade}}/{{max_score}}.', 'assignment', 'medium', '["assignment_title", "grade", "max_score"]', '/assignments/{{assignment_id}}/results', 720),
('course_enrollment', 'Enrolled in Course: {{course_name}}', 'You have been successfully enrolled in "{{course_name}}".', 'course', 'medium', '["course_name"]', '/courses/{{course_id}}', 168),
('course_material_added', 'New Material: {{material_title}}', 'New learning material "{{material_title}}" has been added to {{course_name}}.', 'course', 'low', '["material_title", "course_name"]', '/courses/{{course_id}}/materials/{{material_id}}', 168),
('system_maintenance', 'System Maintenance Notice', 'Scheduled maintenance will occur on {{maintenance_date}}. Expected downtime: {{duration}}.', 'system', 'high', '["maintenance_date", "duration"]', null, 48)
ON CONFLICT (name) DO NOTHING;

-- Insert default notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM notification_preferences);

-- Comments for documentation
COMMENT ON TABLE notifications IS 'Stores individual notifications for users';
COMMENT ON TABLE notification_preferences IS 'Stores user-specific notification preferences and settings';
COMMENT ON TABLE notification_templates IS 'Reusable templates for generating notifications';
COMMENT ON TABLE notification_delivery_log IS 'Tracks delivery status of notifications across different channels';

COMMENT ON COLUMN notifications.metadata IS 'Additional data specific to the notification type (JSON format)';
COMMENT ON COLUMN notifications.related_type IS 'Type of entity this notification relates to';
COMMENT ON COLUMN notifications.related_id IS 'ID of the related entity';
COMMENT ON COLUMN notifications.action_url IS 'URL to navigate to when notification is clicked';
COMMENT ON COLUMN notifications.expires_at IS 'When this notification should be automatically archived';

-- Migration completed successfully