-- Users (multi-tenant support)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  auth_id TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  full_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Candidates (one-to-one with users)
CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  timezone TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  github_url TEXT,
  twitter_url TEXT,
  cv_markdown TEXT,
  cv_json TEXT,
  headline TEXT,
  exit_story TEXT,
  superpowers TEXT,
  target_roles TEXT,
  compensation_target TEXT,
  compensation_currency TEXT DEFAULT 'USD',
  compensation_minimum TEXT,
  location_flexibility TEXT,
  visa_status TEXT,
  onsite_availability TEXT,
  article_digest TEXT,
  canva_design_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Applications (Tracker entries)
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  num INTEGER NOT NULL,
  date TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  score DECIMAL(3,1),
  status TEXT NOT NULL,
  pdf_path TEXT,
  report_id INTEGER,
  notes TEXT,
  url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, company, role),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL
);

-- Reports (Evaluation reports)
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  num INTEGER NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  archetype TEXT,
  score DECIMAL(3,1),
  legitimacy TEXT,
  markdown_content TEXT,
  pdf_path TEXT,
  cv_match_score DECIMAL(3,1),
  level_strategy TEXT,
  comp_range TEXT,
  interview_prep TEXT,
  blocks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Pipeline URLs (Inbox)
CREATE TABLE IF NOT EXISTS pipeline_urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  url TEXT UNIQUE NOT NULL,
  company TEXT,
  title TEXT,
  status TEXT,
  report_id INTEGER,
  error_message TEXT,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL
);

-- Scan History (Dedup for scanner)
CREATE TABLE IF NOT EXISTS scan_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  url TEXT UNIQUE NOT NULL,
  company TEXT,
  title TEXT,
  api_source TEXT,
  scan_date TEXT,
  status TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Story Bank (Interview prep)
CREATE TABLE IF NOT EXISTS story_bank (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  situation TEXT,
  task TEXT,
  action TEXT,
  result TEXT,
  reflection TEXT,
  tags TEXT,
  relevant_to TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Interview Prep (Company-specific)
CREATE TABLE IF NOT EXISTS interview_prep (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  company_slug TEXT NOT NULL,
  company_name TEXT,
  role TEXT,
  company_research TEXT,
  recommended_stories TEXT,
  case_study_recommendation TEXT,
  red_flags TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, company_slug),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Follow-ups (Cadence tracking)
CREATE TABLE IF NOT EXISTS follow_ups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  application_id INTEGER NOT NULL,
  date TEXT,
  channel TEXT,
  contact_name TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_urls_user_id ON pipeline_urls(user_id);
CREATE INDEX IF NOT EXISTS idx_story_bank_user_id ON story_bank(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_user_id ON follow_ups(user_id);
