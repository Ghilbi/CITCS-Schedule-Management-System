# Academic Schedule Management System

A comprehensive web application for managing academic course schedules, room allocations, and timetables for educational institutions.

## Table of Contents
- [Overview](#overview)
- [Getting Started](#getting-started)
- [Features](#features)
- [User Guide](#user-guide)
  - [Navigation](#navigation)
  - [Course Management](#course-management)
  - [Section Management](#section-management)
  - [Room Management](#room-management)
  - [Schedule View](#schedule-view)
  - [Schedule Summary](#schedule-summary)
- [Export Functionality](#export-functionality)
- [Troubleshooting](#troubleshooting)

## Overview

This web application provides educational institutions with a powerful tool to plan and manage academic schedules. It handles courses, sections, room allocations, and presents schedule information in various useful views.

## Getting Started

### Option 1: Local Setup
1. Clone this repository to your local machine
2. Navigate to the project directory
3. Install dependencies (if required)
4. Open `index.html` in a web browser to launch the application
5. **Note**: When using local setup, the database will initially be empty. You'll need to add your own data.

### Option 2: Web Access
1. Access the application directly at: [https://uc-schedule-management-system.onrender.com](https://uc-schedule-management-system.onrender.com)
2. **Note**: The application may be slow to load and respond as it is hosted on a free cloud service tier.
3. **Important**: The web access may not always be available as it depends on the cloud service's availability.

> **IMPORTANT**: DO NOT CHANGE OR ADD ANYTHING IN THE MANAGE COURSES SECTION AT THE MOMENT.

## Dependencies

The following dependencies are required **only for local setup**:

- Modern web browser (Chrome, Firefox, Edge, Safari)
- Node.js and npm (for development)
- PostgreSQL database
- Required npm packages:
  ```
  npm install express pg dotenv cors
  ```

If using the application locally for development:
1. Create a `.env` file in the root directory with database connection parameters:
   ```
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_DATABASE=schedule_db
   PORT=3000
   ```
2. Initialize the database:
   ```
   psql -U your_username -d schedule_db -f database/init.sql
   ```
3. Start the server:
   ```
   npm start
   ```

## Features

- **Course Management**: Add, edit, and delete course offerings with detailed information
- **Section Management**: Create and manage course sections with year levels and letters
- **Room Allocation**: Assign rooms to sections and visualize room usage
- **Schedule Planning**: Plan schedules by trimester and year level
- **Conflict Detection**: Automatic detection and warning of scheduling conflicts
- **Multiple Views**: Different ways to visualize schedule data (by room, section, summary)
- **Export Functionality**: Export schedules to Excel for offline use and sharing

## User Guide

### Navigation

The top navigation bar provides quick access to all main functions of the application. Click on the corresponding button to navigate to different sections:

- Courses
- Sections
- Rooms
- Schedule View
- Schedule Summary

### Course Management

#### Adding a New Course

1. Navigate to the Courses section
2. Click the "Add Course" button
3. Fill in the course details:
   - Course Code
   - Course Name
   - Description
   - Units
   - Prerequisites (if any)
4. Click "Save" to add the course

#### Editing a Course

1. Find the course in the course table
2. Click the "Edit" button in the course row
3. Modify the course details
4. Click "Save" to apply changes

#### Deleting a Course

1. Find the course in the course table
2. Click the "Delete" button in the course row
3. Confirm deletion when prompted

### Section Management

#### Adding Course Sections

1. Navigate to the Sections view
2. Click the "Add Section" button
3. Choose a course from the dropdown
4. Specify section details:
   - Year level (1st, 2nd, 3rd, 4th)
   - Section letter(s)
5. For bulk section creation, use the "Bulk Add" tab
   - Enter multiple section letters separated by commas
   - Preview will show all sections to be created

#### Managing Section Schedules

1. Select the appropriate trimester using the Trimester Tabs
2. Select the year level using the Year Level Tabs
3. Click on a time slot in the schedule to assign a course
4. The system will warn if there are conflicts

### Room Management

The Room Management functionality is view-only and allows you to:

1. View which subjects are assigned to specific rooms
2. See room allocation across different time slots
3. Access this information for exporting to Excel

#### Viewing Room Schedules

1. Navigate to the Room View section
2. Rooms are displayed as columns in the timetable
3. Each cell represents a time slot for a specific room
4. Occupied slots show the course and section information

Note that room assignments are made through the Section View, not directly in the Room Management view.

### Schedule View

1. Use the controls at the top to filter and search schedules
2. Toggle between different views using the view selector
3. The timetable shows:
   - Time slots on the left
   - Days across the top
   - Courses assigned to specific slots

### Schedule Summary

1. Navigate to the Schedule Summary section
2. Select a section from the dropdown to see its complete schedule
3. The summary table shows:
   - Course details
   - Schedule information (day and time)
   - Room assignments
   - Shared sections information

## Export Functionality

To export the schedule:

1. Navigate to the Schedule Summary view
2. Click the "Export to Excel" button at the bottom of the page
3. The browser will download an Excel file with the complete schedule

## Troubleshooting

### Schedule Conflicts

If you see a conflict warning:
1. Check for overlapping schedules in the same room
2. Check for sections scheduled in multiple rooms at the same time
3. Check for faculty assigned to multiple sections at the same time

### Data Not Saving

1. Ensure all required fields are completed
2. Check your internet connection
3. Try refreshing the page and entering the data again

---

For additional support, please contact the system administrator. 