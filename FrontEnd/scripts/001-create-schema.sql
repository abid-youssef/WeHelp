-- ATB Life Companion Digital Twin Schema
-- Adapted for Next.js with Neon PostgreSQL

-- Users table (simplified for demo - no real auth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  user_type TEXT NOT NULL CHECK (user_type IN ('student', 'salaried', 'freelancer', 'family', 'entrepreneur')),
  current_balance NUMERIC(12, 3) NOT NULL DEFAULT 0,
  monthly_income NUMERIC(12, 3) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TND',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table (income and expenses)
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 3) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT, -- e.g., 'monthly', 'weekly', 'yearly'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Life events table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT, -- Arabic name
  type TEXT NOT NULL CHECK (type IN ('cultural', 'personal', 'financial', 'health', 'education', 'other')),
  date DATE NOT NULL,
  estimated_cost NUMERIC(12, 3) NOT NULL,
  cost_std_dev NUMERIC(12, 3) DEFAULT 0, -- Standard deviation for Monte Carlo
  distribution_type TEXT DEFAULT 'normal' CHECK (distribution_type IN ('normal', 'uniform', 'fixed')),
  is_built_in BOOLEAN DEFAULT FALSE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,
  icon TEXT,
  color TEXT,
  notes TEXT,
  readiness_status TEXT DEFAULT 'pending' CHECK (readiness_status IN ('on_track', 'at_risk', 'critical', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Savings goals table
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(12, 3) NOT NULL,
  current_amount NUMERIC(12, 3) DEFAULT 0,
  target_date DATE NOT NULL,
  monthly_contribution NUMERIC(12, 3) DEFAULT 0,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  auto_save_enabled BOOLEAN DEFAULT FALSE,
  linked_event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  icon TEXT,
  color TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goal contributions (tracking savings over time)
CREATE TABLE IF NOT EXISTS goal_contributions (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  amount NUMERIC(12, 3) NOT NULL,
  date DATE NOT NULL,
  type TEXT DEFAULT 'manual' CHECK (type IN ('manual', 'auto', 'adjustment')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stress test templates
CREATE TABLE IF NOT EXISTS stress_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE, -- NULL for system templates
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('income_shock', 'expense_spike', 'combined', 'custom')),
  income_multiplier NUMERIC(5, 4) DEFAULT 1.0, -- e.g., 0.5 for 50% income loss
  expense_multiplier NUMERIC(5, 4) DEFAULT 1.0, -- e.g., 1.3 for 30% expense increase
  duration_months INTEGER DEFAULT 3,
  is_system_template BOOLEAN DEFAULT FALSE,
  icon TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stress test results (saved simulations)
CREATE TABLE IF NOT EXISTS stress_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id TEXT REFERENCES stress_templates(id) ON DELETE SET NULL,
  run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  iterations INTEGER NOT NULL,
  resilience_score NUMERIC(5, 2),
  probability_negative NUMERIC(5, 4),
  min_balance NUMERIC(12, 3),
  p10_balance NUMERIC(12, 3),
  p50_balance NUMERIC(12, 3),
  p90_balance NUMERIC(12, 3),
  parameters JSONB, -- Store full simulation parameters
  results_summary JSONB -- Store key results
);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  monthly_savings_rate NUMERIC(5, 4) DEFAULT 0.1, -- 10% default
  notification_enabled BOOLEAN DEFAULT TRUE,
  notification_days_before INTEGER DEFAULT 7,
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ar', 'fr')),
  show_confidence_bands BOOLEAN DEFAULT TRUE,
  monte_carlo_iterations INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_date ON events(user_id, date);
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal ON goal_contributions(goal_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_stress_results_user ON stress_results(user_id, run_at DESC);

-- Insert system stress templates
INSERT INTO stress_templates (id, name, description, type, income_multiplier, expense_multiplier, duration_months, is_system_template, icon, severity)
VALUES 
  ('sys-job-loss', 'Job Loss', 'Complete loss of income for 3 months', 'income_shock', 0.0, 1.0, 3, TRUE, 'briefcase-off', 'critical'),
  ('sys-income-reduction', 'Income Reduction', '30% reduction in income', 'income_shock', 0.7, 1.0, 6, TRUE, 'trending-down', 'high'),
  ('sys-medical-emergency', 'Medical Emergency', 'Unexpected medical expenses', 'expense_spike', 1.0, 1.5, 2, TRUE, 'heart-pulse', 'high'),
  ('sys-inflation-spike', 'Inflation Spike', '20% increase in living costs', 'expense_spike', 1.0, 1.2, 6, TRUE, 'chart-line', 'medium'),
  ('sys-combined-crisis', 'Economic Crisis', 'Income drop + expense increase', 'combined', 0.8, 1.25, 4, TRUE, 'alert-triangle', 'critical')
ON CONFLICT (id) DO NOTHING;
