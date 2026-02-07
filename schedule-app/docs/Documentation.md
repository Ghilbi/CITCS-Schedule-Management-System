# CITCS Schedule Management System – Documentation

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Environment Variables](#environment-variables)
- [Local Setup](#local-setup)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Token Utilities](#token-utilities)
  - [Data Endpoints](#data-endpoints)
- [Database Schema](#database-schema)
- [Frontend Guide](#frontend-guide)
  - [Navigation](#navigation)
  - [Course Catalog](#course-catalog)
  - [Manage Course Offering](#manage-course-offering)
  - [Section Management](#section-management)
  - [Room Management](#room-management)
  - [Schedule Summary](#schedule-summary)
  - [Analytics](#analytics)
  - [Export](#export)
- [Validations and Constraints](#validations-and-constraints)
- [Deployment Notes](#deployment-notes)
- [Maintenance and Backup](#maintenance-and-backup)
- [Troubleshooting](#troubleshooting)

## Overview

A secure web application for managing academic schedules across trimesters, year levels, degrees, and curricula. It supports course CRUD, course offerings, room allocation, section scheduling, conflict prevention, analytics, and export to Excel. Authentication is JWT-based and protects course write operations.

## Architecture

- **Backend**: Node.js + Express (`schedule-app/backend/server.js`). Serves static frontend, exposes REST APIs, and handles JWT auth.
- **Database**: PostgreSQL via `pg` using `DATABASE_URL`. Tables are created/altered on startup if missing.
- **Frontend**: HTML/CSS/vanilla JavaScript in `schedule-app/frontend/` with modular JS files for features. Assets in `schedule-app/assets/`.
- **Security**: JWT with 2-hour expiry and role-based payloads (`admin` or `programchair`); bcrypt password verification using password hashes from environment variables.

Key Libraries
- express, pg, jsonwebtoken, bcrypt, dotenv
- SheetJS/ExcelJS in frontend for export

## Environment Variables

Create a `.env` file in `schedule-app/backend`:

```
PORT=3000
NODE_ENV=development
DATABASE_URL=postgres://user:password@host:port/dbname

# Admin auth
ADMIN_USERNAME=admin
# Bcrypt hash of your chosen admin password (NOT the plaintext password)
ADMIN_PASSWORD_HASH=$2b$10$...your_bcrypt_hash...

# Program Chair auth
PROGRAMCHAIR_USERNAME=programchair
# Bcrypt hash of your chosen program chair password
PROGRAMCHAIR_PASSWORD_HASH=$2b$10$...your_bcrypt_hash...

JWT_SECRET=replace_with_a_long_random_secret
```

Generate a bcrypt hash (example):

```
node -e "require('bcrypt').hash(process.argv[1], 10).then(h=>console.log(h))" 'yourStrongPassword'
```

## Local Setup

1. Install Node.js (LTS) and set up a PostgreSQL instance (local or hosted).  
2. In `schedule-app/backend`, create `.env` as above with a valid `DATABASE_URL`.  
3. Install dependencies and start the server:

```
cd schedule-app/backend
npm install
npm start
```

4. Open `http://localhost:3000`. You will be redirected to `login.html` if not authenticated.

## API Reference

Base URL: `/api`

### Authentication

- POST `/api/login`  
  Request: `{ "username": string, "password": string }`  
  Response: `{ "token": string, "role": string }` (JWT, 2h expiry)

Notes
- The server supports two account types. The username is matched against `ADMIN_USERNAME` (role: `admin`) or `PROGRAMCHAIR_USERNAME` (role: `programchair`). The password is verified against the corresponding bcrypt hash (`ADMIN_PASSWORD_HASH` or `PROGRAMCHAIR_PASSWORD_HASH`).
- The JWT payload includes both `username` and `role`.
- The response returns the `role` alongside the `token` so the frontend can apply role-based navigation.
- Store the token and role (e.g., `localStorage`) and send the token as `Authorization: Bearer <token>` for protected operations.

### Token Utilities

- POST `/api/refresh-token` (requires valid token)  
  Response: `{ "token": string, "role": string }` (new 2h token, preserves original role)

- GET `/api/token-status` (requires valid token)  
  Response: `{ valid: true, expiresAt: number, expiresIn: number, warningThreshold: boolean }`

All `/api` responses may include:
- `X-Token-Expires-In`, `X-Token-Expires-At`, and `X-Token-Expiry-Warning` headers when a token is present.

### Data Endpoints

Generic CRUD is exposed under `/api/:table` with whitelisted tables only.

Whitelisted tables
- `rooms`, `courses`, `schedules`, `course_offerings`, `curricula`

Read (public)
- GET `/api/:table` → Returns all rows.  
  Special casing for camelCased fields in `schedules` and `course_offerings`.

Create (protected for `courses` only)
- POST `/api/:table` with JSON body matching the schema (see Database Schema).  
  - `courses`: requires valid JWT

Update (protected for `courses` only)
- PUT `/api/:table/:id` with JSON body.  
  - `courses`: requires valid JWT

Delete (protected for `courses` only)
- DELETE `/api/:table/:id`  
  - `courses`: requires valid JWT

Security
- Table names are validated against a fixed allowlist.  
- Values are parameterized to prevent SQL injection.

## Database Schema

Tables are created/updated at server start if missing. Effective columns:

- rooms
  - id SERIAL PRIMARY KEY
  - name TEXT NOT NULL

- courses
  - id SERIAL PRIMARY KEY
  - subject TEXT NOT NULL
  - unit_category TEXT NOT NULL
  - units TEXT NOT NULL
  - year_level TEXT NOT NULL
  - degree TEXT NOT NULL
  - trimester TEXT NOT NULL
  - description TEXT
  - curriculum TEXT

- schedules
  - id SERIAL PRIMARY KEY
  - dayType TEXT NOT NULL
  - time TEXT NOT NULL
  - col INTEGER NOT NULL
  - roomId INTEGER REFERENCES rooms(id)
  - courseId INTEGER REFERENCES courses(id)
  - color TEXT
  - unitType TEXT
  - section TEXT
  - section2 TEXT

- course_offerings
  - id SERIAL PRIMARY KEY
  - courseId INTEGER NOT NULL REFERENCES courses(id)
  - section TEXT NOT NULL
  - type TEXT NOT NULL
  - units INTEGER NOT NULL
  - trimester TEXT NOT NULL
  - degree TEXT

- curricula
  - id SERIAL PRIMARY KEY
  - year TEXT UNIQUE

Notes
- On startup, server ensures `public` schema and unique index on `curricula.year`.  
- Legacy handling may drop a previous `curricula.name` if present and backfill `year` from it.

## Frontend Guide

The app is served statically from the backend. Main entry: `index.html`. If no token is found in `localStorage`, users are redirected to `login.html`.

### Navigation

Sidebar options include: Analytics, Course Catalog, Manage Course Offering, Section Management, Room Management, Schedule Summary, Logout. The UI is responsive and includes a startup loader animation.

**Role-Based Navigation:**
- On page load, `applyRoleBasedNavigation()` checks the user's role from `localStorage`.
- **Admin** role: Full sidebar with all navigation options visible.
- **Program Chair** role: The Course Catalog button and section are hidden (`display: none`). All other navigation options remain accessible.
- The `userRole` is stored in `localStorage` alongside `authToken` and is cleared on logout or token expiration.

### Course Catalog

Protected (requires login) for add/edit/delete. **Admin role only** — the Course Catalog section and its navigation button are hidden for Program Chair users.
- Add/Edit/Delete courses with subject, unit category (PureLec or Lec/Lab), units, year level, degree, trimester, curriculum, and description.
- Search, filter (year, degree, trimester, curriculum), sort (subject, units).
- CSV import/export and selective deletion tools.
- The `openCoursesSection()` function blocks access if `getUserRole()` returns `'programchair'`.

### Manage Course Offering

Create course offerings per degree/year/trimester/section.
- Manual and bulk creation flows, auto-inheriting units/trimester from source course.
- Supports types: `Lec`, `Lab`, `PureLec`.
- Bulk creation by degree, year level, trimester, and multi-section letters.

### Section Management

Assign offerings to time slots and rooms by trimester and year level.
- Time-grid per day pattern (MWF, TTHS).
- Optional dual-section assignment for shared subjects.
- Real-time conflict checks with visual notifications.

### Room Management

Add/update/delete rooms and visualize time-grid occupancy.
- Grouped views (Room Group A/B), MWF and TTHS tables.
- Assign offerings with Section 1 and optional Section 2.

### Schedule Summary

View aggregated schedules by trimester and year level, with section-based summaries.

### Analytics

The analytics module (`analytics.js`) has been redesigned from basic counts into an actionable data analytics dashboard. It provides scheduling completion tracking, gap analysis, room utilization insights, and prioritized action items.

**Key Metric Cards:**
- **Scheduling Complete (%)**: Percentage of offerings that are fully scheduled (have room assignments)
- **Unscheduled Offerings**: Offerings with no schedule entry at all
- **Need Room Assignment**: Offerings scheduled in Section View (col=0) but lacking a room column assignment
- **Room Utilization (%)**: Average percentage of the 18 possible time slots (9 times x 2 day types) that are occupied across all rooms
- **Missing Lec/Lab Pairs**: Lec/Lab courses where a section has only one component (Lec or Lab) but not both
- **Overloaded Slots**: Time slots where room occupancy exceeds the 80% threshold

**Trimester Filtering:**
- Filter buttons (All, 1st Tri, 2nd Tri, 3rd Tri) filter offerings, schedules, and courses by trimester
- All metrics, charts, and action items recalculate when the filter changes

**Analysis Functions:**
- `analyzeOfferingStatus()`: Classifies each offering as `fullyScheduled`, `needsRoom`, or `unscheduled`
- `analyzeRoomUtilization()`: Calculates per-room occupancy out of 18 possible slots
- `analyzeTimeSlotLoad()`: Determines percentage of rooms used per (dayType, time) combination
- `analyzeLecLabPairing()`: Finds Lec/Lab courses missing a component for any section

**Next Steps & Action Items:**
- `generateActionItems()` produces prioritized recommendations at three severity levels: `critical`, `warning`, and `info`
- Rendered in a collapsible panel with color-coded severity badges
- Examples: unscheduled offerings by program, missing Lec/Lab pairs, overloaded time slots, underutilized rooms, fully scheduled confirmation

**Room Utilization Chart:**
- Horizontal bar chart ranking all rooms by utilization percentage (rendered via inline HTML/CSS bars)

**Room Availability Heatmap:**
- Collapsible panel with MWF/TTHS toggle
- Grid showing rooms as columns and time slots as rows
- Color-coded cells (green = free, red = occupied) for quick visual scanning

**Auto-Refresh:**
- `startAnalyticsAutoRefresh()` / `stopAnalyticsAutoRefresh()` manage periodic data reload
- Auto-refresh stops when navigating away from the analytics section (`hideAllSections()` calls `stopAnalyticsAutoRefresh()`)

**Entry Point:**
- `renderFullAnalytics()` orchestrates the full render pipeline: load data → filter → analyze → render cards, action items, chart, and heatmap

### Export

Excel export of schedules using SheetJS/ExcelJS, plus CSV export for tabular data.

## Validations and Constraints

Server-side
- Table allowlist and parameterized queries protect against SQL injection.
- Duplicate prevention:
  - Rooms: case-insensitive name uniqueness check on create.
  - Courses (POST): subject + curriculum + degree uniqueness (treats NULL curriculum distinctly).
  - Courses (PUT): prevents changing into an existing subject + curriculum combination.

Client-side
- Real-time room conflict and section overlap prevention in scheduling UI.
- Duplicate schedule checks for subjects within a section.
- Trimester/year-level filters gate bulk operations.

Auth
- JWT required for write operations on `courses` only (rooms, schedules, offerings, curricula are public in current config).  
- Tokens expire in 2 hours; headers expose expiry to aid proactive refresh.
- Two roles supported: `admin` (full access) and `programchair` (no Course Catalog access).
- Role is included in JWT payload and returned with login/refresh responses.
- Frontend stores `userRole` in `localStorage` and applies role-based UI restrictions on page load.

## Deployment Notes

- Provide `DATABASE_URL`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `PROGRAMCHAIR_USERNAME`, and `PROGRAMCHAIR_PASSWORD_HASH` in environment.  
- Ensure the process has access to serve `schedule-app/frontend` and `schedule-app/assets`.  
- For hosted Postgres, enable SSL; the server auto-sets SSL in production (`NODE_ENV=production`).  
- Scale guidance: terminate idle connections; prefer a connection pool compatible with your provider.

## Maintenance and Backup

- Regularly back up the Postgres database (especially before bulk deletions).  
- Export schedules to Excel as operational backups.  
- Periodically review curricula and offerings for consistency across trimesters and years.

## Troubleshooting

Login/auth issues
- Verify `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `PROGRAMCHAIR_USERNAME`, `PROGRAMCHAIR_PASSWORD_HASH`, and `JWT_SECRET` in environment.
- Recreate bcrypt hash if plaintext password changed.
- Check token expiry; use `/api/refresh-token`.
- If a user reports missing navigation items (e.g., Course Catalog not visible), check their role — Program Chair users do not have access to Course Catalog by design.
- Clear both `authToken` and `userRole` from `localStorage` when troubleshooting login state.

Database issues
- Verify `DATABASE_URL` connectivity and SSL settings in production.
- Ensure the `public` schema is available.

Data not saving
- Confirm required fields and correct table target in requests.
- For protected `courses` writes, include `Authorization: Bearer <token>`.

Export issues
- Ensure a modern browser (pop-ups allowed) for downloads.
- Large exports may take time; prefer filtered exports when possible.

Performance
- Use filters (degree/year/trimester) to limit dataset in UI.
- Monitor database connection limits on hosted providers.