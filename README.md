# DCS: AN EDTECH CLOUD-NATIVE DIGITALIZED COURSE SCHEDULING SYSTEM FOR THE FACULTY OF CITCS DEPARTMENT 

A cloud-native web application for managing course schedules, room allocations, and timetables for the CITCS Department. Streamlines scheduling across trimesters, year levels, and degree programs (BSIT, BSCS, BSDA, BMMA).

## Table of Contents
- [Overview](#overview)
- [Getting Started](#getting-started)
- [Core Features](#core-features)
- [Authentication](#authentication)
- [Conflict Detection](#conflict-detection)
- [Exporting Schedules](#exporting-schedules)
- [Setup](#setup)
- [Dependencies](#dependencies)
- [Troubleshooting](#troubleshooting)

## Overview

This system simplifies academic scheduling by managing courses, sections, and room assignments. It supports trimester-based scheduling, multiple degree programs, and automatic conflict detection for efficient planning.

## Getting Started

### Option 1: Web Access
- Visit: [https://uc-schedule-management-system.onrender.com](https://uc-schedule-management-system.onrender.com)
- Note: Initial load may be slow due to free hosting tier.

### Option 2: Local Setup
1. Clone the repository.
2. Navigate to `schedule-app`.
3. Install dependencies: `npm install`.
4. Configure environment variables (see [Setup](#setup)).
5. Start server: `npm start`.
6. Open `http://localhost:3000`.

## Core Features

### Manage Courses
- **Requires Admin Login**  
- Add, edit, or delete courses with details like subject code, name, units (PureLec or Lec/Lab), year level, degree program, trimester, and description.
- Search by course name/code, filter by program, sort by name or units.
<img width="500" height="450" alt="image" src="https://github.com/user-attachments/assets/ef209365-18e2-4466-9d57-cc242b69f51f" />
<img width="500" height="450" alt="image" src="https://github.com/user-attachments/assets/7fc3e9d1-ae56-45b2-979e-ad303d2d2f18" />

> **Note**: Users can still access other tabs without logging in, login is only for Manage Courses.

### Manage Course Offerings
- Create sections (e.g., 1A, 2B) for courses with automatic unit/trimester inheritance.
- **Manaul Add**: Which is single add, adds single courses for a degree program or a section.
- **Bulk Add**: Add all courses for a degree program or multiple sections (e.g., A,B,C).
- Filter by year level or trimester.
- Edit or delete sections; ensure Section View is cleared before deleting offerings.

<img width="500" height="450" alt="image" src="https://github.com/user-attachments/assets/bb21446f-7bbe-46e3-970b-955070ac197d" />|

<img width="200" height="350" alt="image" src="https://github.com/user-attachments/assets/ba2e32fd-161f-4784-b0c1-264f4a327eff" />
<img width="200" height="350" alt="image" src="https://github.com/user-attachments/assets/025d1fd6-79fb-439f-a023-9eb480a974fb" />

### Section View
- Assign schedules and rooms to sections by trimester and year level.
- Interactive time grid for MWF/TTH schedules.
- Supports shared courses between sections.
- Filter rooms by group (A, B, or All) with real-time availability checks.
- Edit or delete assignments with conflict prevention.

<img width="500" height="450" alt="image" src="https://github.com/user-attachments/assets/7215e8c7-a75d-4a45-8678-f28f9a80d945" />

<img width="200" height="350" alt="image" src="https://github.com/user-attachments/assets/709707c3-8e03-462c-926d-d0bc5892873d" />



### Room View
- View schedules by room, grouped by Room Group A or B.
- Filter by trimester, year level, or time pattern (MWF/TTHS).
- Generate detailed schedule summaries.

<img width="500" height="450" alt="image" src="https://github.com/user-attachments/assets/eb8f5f38-4bf4-4b27-8460-77b382029b5e" /> | 

<img width="500" height="450" alt="image" src="https://github.com/user-attachments/assets/f4bdddc5-270d-40c8-8fea-367285431311" />

  #### Exporting Schedules
  - Export full schedules to Excel.
  - Professional, multi-sheet format compatible with Excel, Google Sheets, etc.
  - Automatic downloads with standardized naming.

    <img width="500" height="450" alt="image" src="https://github.com/user-attachments/assets/2935f226-630b-4d76-b7da-3804607a9bc0" />

## Authentication
- **JWT-Based**: Secure admin login with 2-hour token expiration.
- Course management requires authentication; other views are open.
- Sessions persist across refreshes; auto-logout on token expiration.

## Conflict Detection
- Prevents room double-booking and duplicate section schedules.
- Cross-year and section overlap validation.
- Visual warnings with clear error messages.
- Server-side validation ensures data integrity.

## Setup

### Prerequisites
- Node.js (v14+)
- PostgreSQL
- Modern browser

### Environment Configuration
Create `.env` in `schedule-app/backend`:
```
DB_USER=your_username
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=schedule_db
PORT=3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_key
```

### Database Setup
```bash
createdb schedule_db
psql -U your_username -d schedule_db -f database/init.sql
```

### Run Application
```bash
cd schedule-app
npm install
npm start
```

## Dependencies
- **Backend**: Express.js, PostgreSQL (pg), JWT, CORS, dotenv.
- **Frontend**: SheetJS (XLSX), modern browser APIs.
- **Development**: Node.js, npm, PostgreSQL.

## Troubleshooting

### Common Issues
- **Login Issues**: Verify credentials, check JWT_SECRET, clear localStorage.
- **Table Bugging**: Double click on section view to resolve.
- **Data Not Saving**: Ensure all fields are filled, check connection, review console errors.
- **Exports**: Disable pop-up blockers, ensure JavaScript is enabled.
- **Performance**: Allow extra load time for web version; filter large datasets.

### Maintenance
- Monitor database performance.
- Back up schedules via Excel exports.

**Contact the system administrator for support or feature requests.**

