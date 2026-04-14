# Career-Ops Backend API

REST API for the career-ops job search platform.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and update values:
```bash
cp .env.example .env
```

3. Database will be initialized automatically on first run

## Running

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Database

SQLite database is created at `./data/career-ops.db` automatically on startup.

To manually initialize:
```bash
npm run init-db
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify` - Verify JWT token

### Onboarding
- `GET /api/onboarding/status` - Get onboarding progress
- `POST /api/onboarding/cv` - Upload CV
- `POST /api/onboarding/profile` - Save profile
- `POST /api/onboarding/complete` - Complete onboarding

### Candidates
- `GET /api/candidates/profile` - Get profile
- `PUT /api/candidates/profile` - Update profile
- `GET /api/candidates/cv` - Get CV
- `PUT /api/candidates/cv` - Update CV

### Applications (Tracker)
- `GET /api/applications` - Get applications with filtering
- `GET /api/applications/stats` - Get statistics
- `GET /api/applications/:id` - Get single application
- `POST /api/applications` - Create application
- `PATCH /api/applications/:id` - Update application
- `DELETE /api/applications/:id` - Delete (discard) application

### Reports
- `GET /api/reports` - Get all reports
- `GET /api/reports/:id` - Get single report
- `GET /api/reports/num/:num` - Get report by number
- `POST /api/reports` - Create report
- `PATCH /api/reports/:id` - Update report
- `GET /api/reports/:id/pdf` - Get PDF path

### Evaluations (In progress)
- `POST /api/evaluate` - Start job evaluation
- `GET /api/evaluate/status/:id` - Get evaluation status

### Scanner (In progress)
- `POST /api/scan` - Trigger scanner
- `GET /api/scan/status/:id` - Get scan status
- `GET /api/scan/jobs` - Get recent jobs
- `POST /api/scan/jobs/:id/to-pipeline` - Add to pipeline

### Story Bank
- `GET /api/story-bank` - Get all stories
- `GET /api/story-bank/:id` - Get single story
- `POST /api/story-bank` - Create story
- `PATCH /api/story-bank/:id` - Update story
- `DELETE /api/story-bank/:id` - Delete story

### Interview Prep
- `GET /api/interview-prep/:company_slug` - Get company prep
- `POST /api/interview-prep/:company_slug` - Save company prep

### Follow-ups
- `GET /api/follow-ups` - Get follow-ups
- `POST /api/follow-ups` - Create follow-up
- `PATCH /api/follow-ups/:id` - Update follow-up
- `DELETE /api/follow-ups/:id` - Delete follow-up

## Health Check
- `GET /health` - Server status

All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```
