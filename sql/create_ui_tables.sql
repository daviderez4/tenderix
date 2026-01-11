-- Tenderix UI Tables
-- ==================
-- Tables for notifications, user settings, and profiles

-- =====================
-- NOTIFICATIONS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  message TEXT,
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_urgent BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- =====================
-- USER SETTINGS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification preferences
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  deadline_reminders BOOLEAN DEFAULT TRUE,
  new_tender_alerts BOOLEAN DEFAULT TRUE,
  competitor_alerts BOOLEAN DEFAULT TRUE,
  weekly_summary BOOLEAN DEFAULT TRUE,

  -- UI preferences
  language VARCHAR(10) DEFAULT 'he',
  theme VARCHAR(20) DEFAULT 'dark',
  currency VARCHAR(10) DEFAULT 'ILS',

  -- Deadline alert thresholds (days)
  deadline_urgent_days INTEGER DEFAULT 3,
  deadline_warning_days INTEGER DEFAULT 7,

  -- AI preferences
  ai_auto_analyze BOOLEAN DEFAULT TRUE,
  ai_competitor_tracking BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user_settings
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- RLS for user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================
-- PROFILES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  company_name VARCHAR(255),
  company_id VARCHAR(50),
  phone VARCHAR(50),
  role VARCHAR(50) DEFAULT 'user',
  avatar_url TEXT,

  -- Company details
  business_type VARCHAR(100),
  employee_count VARCHAR(50),
  annual_revenue VARCHAR(50),

  -- Address
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Israel',

  -- Social links
  website TEXT,
  linkedin TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================
-- ACTIVITY LOG TABLE
-- =====================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  entity_name TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for activity_log
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- RLS for activity_log
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity" ON activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity" ON activity_log
  FOR INSERT WITH CHECK (true);

-- =====================
-- HELPER FUNCTION: Create notification
-- =====================
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT DEFAULT NULL,
  p_tender_id UUID DEFAULT NULL,
  p_is_urgent BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, tender_id, is_urgent)
  VALUES (p_user_id, p_type, p_title, p_message, p_tender_id, p_is_urgent)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- TRIGGER: Auto-create profile on user signup
-- =====================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================
-- TRIGGER: Notify on tender deadline approaching
-- =====================
CREATE OR REPLACE FUNCTION check_tender_deadlines()
RETURNS void AS $$
DECLARE
  tender_record RECORD;
  days_remaining INTEGER;
BEGIN
  FOR tender_record IN
    SELECT t.id, t.name, t.deadline, t.user_id
    FROM tenders t
    WHERE t.deadline IS NOT NULL
      AND t.deadline > NOW()
      AND t.deadline < NOW() + INTERVAL '7 days'
      AND t.status NOT IN ('won', 'lost', 'cancelled')
  LOOP
    days_remaining := EXTRACT(DAY FROM (tender_record.deadline - NOW()));

    -- Check if notification already exists for this deadline
    IF NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE tender_id = tender_record.id
        AND type = 'deadline'
        AND created_at > NOW() - INTERVAL '1 day'
    ) THEN
      PERFORM create_notification(
        tender_record.user_id,
        'deadline',
        CASE
          WHEN days_remaining <= 1 THEN 'מועד הגשה מחר!'
          WHEN days_remaining <= 3 THEN 'מועד הגשה מתקרב!'
          ELSE 'תזכורת: מועד הגשה בשבוע הקרוב'
        END,
        tender_record.name || ' - נותרו ' || days_remaining || ' ימים',
        tender_record.id,
        days_remaining <= 3
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE notifications IS 'User notifications for tender updates, deadlines, and system alerts';
COMMENT ON TABLE user_settings IS 'User preferences for notifications, UI, and AI features';
COMMENT ON TABLE profiles IS 'Extended user profile information';
COMMENT ON TABLE activity_log IS 'User activity tracking for audit and analytics';
