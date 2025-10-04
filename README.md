# DCS: AN EDTECH CLOUD-NATIVE DIGITALIZED COURSE SCHEDULING SYSTEM FOR THE FACULTY OF CITCS DEPARTMENT 

A comprehensive web application for managing academic course schedules, room allocations, and timetables for educational institutions. This system provides administrators and staff with powerful tools to efficiently plan and organize academic schedules across different trimesters, year levels, and degree programs.

## Table of Contents
- [Overview](#overview)
- [Getting Started](#getting-started)
- [Core Features](#core-features)
  - [Course Catalog](#course-catalog)
  - [Manage Course Offering](#manage-course-offering)
  - [Section View](#section-view)
  - [Room View](#room-view)
- [Authentication & Security](#authentication--security)
- [Conflict Detection & Validation](#conflict-detection--validation)
- [Export Functionality](#export-functionality)
- [Installation & Setup](#installation--setup)
- [Technical Dependencies](#technical-dependencies)
- [Troubleshooting](#troubleshooting)

## Overview

This Academic Schedule Management System streamlines the complex process of academic scheduling for educational institutions. It handles course management, section creation, room allocation, and schedule visualization while automatically detecting conflicts and ensuring data integrity. The system supports multiple degree programs (BSIT, BSCS, BSDA, BMMA) and their specializations, with trimester-based scheduling across different year levels.

## Getting Started

### Option 1: Web Access (Recommended)
1. Visit: [https://uc-schedule-management-system.onrender.com](https://uc-schedule-management-system.onrender.com)
2. **Note**: Initial loading may be slow due to free hosting tier
3. **Important**: Web availability depends on cloud service status

### Option 2: Local Development Setup
1. Clone this repository to your local machine
2. Navigate to the `schedule-app` directory
3. Install dependencies: `npm install`
4. Set up environment variables (see [Installation & Setup](#installation--setup))
5. Start the server: `npm start`
6. Open your browser to `http://localhost:3000`

## Core Features

### Course Catalog

**Authentication Required**: Users must login with administrator credentials to access course management features.

**Key Capabilities:**
- **Add New Courses**: Create courses with comprehensive details including:
  - Subject code and name
  - Unit categories (PureLec for pure lecture, Lec/Lab for lecture with laboratory)
  - Credit units (automatically determined by unit category)
  - Year level assignment (1st, 2nd, 3rd year)
  - Degree program association (BSIT, BSIT specializations, BSCS, BSDA, BMMA)
  - Trimester scheduling (1st, 2nd, 3rd trimester)
  - Course descriptions

- **Edit Existing Courses**: Modify any course information while maintaining data integrity
- **Delete Courses**: Remove courses from the system (with proper validation)
- **Advanced Filtering & Search**:
  - Search by course name or subject code
  - Filter by degree program
  - Sort by subject name (A-Z, Z-A) or credit units (ascending/descending)

**Navigation**: Browsing other sections is available without login - authentication is only required for course management operations.

### Manage Course Offering

**Purpose**: Create and manage specific course sections for each academic program and semester.

**Single Section Addition:**
- Select from existing courses filtered by degree program
- Create sections with systematic naming (Year + Letter format: 1A, 2B, 3C)
- Automatic unit and trimester inheritance from parent course
- Support for different offering types:
  - **Lec** (Lecture component for Lec/Lab courses)
  - **Lab** (Laboratory component for Lec/Lab courses)  
  - **PureLec** (Complete course for pure lecture courses)

**Bulk Section Addition:**
- **Degree-wide Operations**: Add all courses for an entire degree program at once
- **Multi-section Creation**: Generate multiple sections using comma-separated letters (A,B,C creates sections 1A, 1B, 1C)
- **Filter Controls**:
  - Year level filtering (All years, 1st, 2nd, 3rd year)
  - Trimester selection for bulk operations
- **Preview System**: See exactly which sections will be created before confirming

**Section Management:**
- Edit section details for any created offering
- Delete individual sections or clear all offerings
- Trimester-based viewing with filtering tabs (All, 1st, 2nd, 3rd Trimester)

**Important Note**: Before deleting course offerings, ensure the Section View tables are emptied to maintain data consistency.

### Section View

**Primary Function**: Assign specific subject schedules and room allocations for each created section.

**Schedule Assignment Features:**
- **Trimester Navigation**: Switch between 1st, 2nd, and 3rd trimester schedules
- **Year Level Filtering**: View and manage schedules by year level (1st, 2nd, 3rd year)
- **Interactive Time Grid**: Click on time slots to assign courses to sections
- **Dual Section Support**: Assign shared courses between two sections simultaneously
- **Room Assignment Integration**:
  - Filter rooms by groups (Group A, Group B, or All Rooms)
  - Real-time room availability checking
  - Visual room allocation indicators

**Advanced Scheduling Tools:**
- **Time Slot Management**: Full weekly schedule grid with MWF and TTH time patterns
- **Section Code Preview**: Dynamic preview of section assignments before saving
- **Edit Capabilities**: Modify existing schedule assignments
- **Delete Operations**: Remove specific time slot assignments

**Conflict Prevention System:**
- **Room Conflict Detection**: Prevents double-booking of rooms at the same time
- **Duplicate Schedule Warnings**: Alerts when the same subject is scheduled multiple times for a section
- **Cross-Year Validation**: Ensures rooms aren't double-booked across different year levels
- **Section Overlap Checking**: Prevents scheduling conflicts for individual sections

**User Interface Features:**
- **Filter Tabs**: Easy switching between trimesters and year levels
- **Visual Indicators**: Color-coded schedule blocks for easy identification
- **Responsive Design**: Optimized for different screen sizes and devices

### Room View

**Access Level**: View-only interface for schedule visualization and reporting.

**Room Schedule Visualization:**
- **Comprehensive Room Display**: View subject allocations across all rooms
- **Grouped Room Views**: Separate displays for Room Group A and Room Group B
- **Time Pattern Organization**: 
  - **MWF Schedule View**: Monday, Wednesday, Friday time blocks
  - **TTHS Schedule View**: Tuesday, Thursday, Saturday time blocks
- **Multi-Level Viewing**: Filter by trimester and year level for focused analysis

**Schedule Summary Features:**
- **"Show Summary" Button**: Access detailed schedule reports
- **Section-Based Filtering**: View complete schedules for specific sections
- **Comprehensive Schedule Tables**: Display course details, time slots, room assignments, and shared section information

**Export Capabilities:**
- **Excel Export Functionality**: Generate offline-ready Excel spreadsheets
- **Complete Schedule Export**: Export all schedules across all sections and time periods
- **Professional Formatting**: Well-organized spreadsheet layout for institutional use
- **Batch Export Options**: Export multiple schedules simultaneously

**Additional Room Management:**
- **Room Addition**: Add new rooms to the system through the "Manage Rooms" interface
- **Room Organization**: Systematic room naming and categorization
- **Capacity Planning**: Visual overview of room utilization across time periods

## Authentication & Security

**JWT-Based Authentication:**
- Secure admin login system using JSON Web Tokens
- 2-hour token expiration for security
- Automatic re-authentication prompts when tokens expire
- LocalStorage-based session management

**Access Control:**
- **Protected Operations**: Course management (add, edit, delete) requires authentication
- **Open Access**: Section View, Room View, and browsing functions available without login
- **Secure Credentials**: Environment-based admin credential management

**Session Management:**
- Persistent login sessions across browser refreshes
- Automatic logout on token expiration
- Secure credential validation on all protected endpoints

## Conflict Detection & Validation

**Advanced Conflict Prevention:**
- **Real-Time Room Conflict Detection**: Immediate warnings when attempting to double-book rooms
- **Duplicate Schedule Prevention**: Alerts when the same subject is assigned multiple times to a section
- **Cross-Year Validation**: Prevents scheduling conflicts across different year levels in the same room
- **Section Overlap Checking**: Ensures individual sections don't have conflicting schedules

**User Warning System:**
- **Visual Conflict Notifications**: Pop-up warnings with detailed conflict information
- **Descriptive Error Messages**: Clear explanations of what conflicts exist and how to resolve them
- **Prevention-Based Design**: System blocks conflicting assignments rather than allowing correction later

**Data Integrity Features:**
- **Constraint Validation**: Server-side validation of all schedule assignments
- **Referential Integrity**: Ensures all foreign key relationships remain valid
- **Cascade Protection**: Prevents deletion of courses or rooms that are actively scheduled

## Export Functionality

**Excel Export Features:**
- **Complete Schedule Export**: Generate comprehensive Excel files containing all schedule information
- **Professional Formatting**: Well-organized spreadsheet layout suitable for institutional reporting
- **Multi-Sheet Organization**: Separate sheets for different views and data types
- **Offline Access**: Fully functional Excel files for use without internet connection

**Export Options:**
- **Full System Export**: All schedules across all sections, trimesters, and year levels
- **Filtered Exports**: Export specific subsets based on current view filters
- **Summary Reports**: Condensed overview reports for administrative review

**File Management:**
- **Automatic Download**: Browser-based file download system
- **Standardized Naming**: Consistent file naming conventions for easy organization
- **Cross-Platform Compatibility**: Excel files compatible with Microsoft Excel, Google Sheets, and LibreOffice

## Installation & Setup

### Local Development Environment

**Prerequisites:**
- Node.js (v14 or higher)
- PostgreSQL database
- Modern web browser

**Environment Configuration:**
Create a `.env` file in the `schedule-app/backend` directory:
```env
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

**Database Setup:**
```bash
# Create database
createdb schedule_db

# Initialize database schema
psql -U your_username -d schedule_db -f database/init.sql
```

**Application Setup:**
```bash
# Navigate to application directory
cd schedule-app

# Install dependencies
npm install

# Start the server
npm start
```

## Technical Dependencies

**Backend Dependencies:**
- **Express.js**: Web application framework
- **PostgreSQL (pg)**: Database connectivity
- **JWT**: Authentication token management
- **CORS**: Cross-origin resource sharing
- **dotenv**: Environment variable management

**Frontend Dependencies:**
- **SheetJS (XLSX)**: Excel file generation and export
- **Modern Browser APIs**: For localStorage, fetch, and DOM manipulation

**Development Dependencies:**
- **Node.js & npm**: Runtime and package management
- **PostgreSQL**: Database server

## Troubleshooting

### Common Issues and Solutions

**Login Problems:**
- Verify admin credentials in environment variables
- Check browser console for authentication errors
- Clear browser localStorage and retry login
- Ensure JWT_SECRET is properly configured

**Schedule Conflicts:**
- **Room Conflicts**: Check for overlapping time slots in the same room
- **Section Conflicts**: Verify sections aren't scheduled in multiple rooms simultaneously
- **Data Integrity**: Use the "Clear" functions to reset problematic data sets

**Data Not Saving:**
- Verify all required fields are completed
- Check internet connection for web-hosted version
- Review browser console for error messages
- Ensure proper authentication for protected operations

**Performance Issues:**
- **Web Version**: Allow extra time for initial loading on free hosting tier
- **Local Version**: Verify database connection and proper resource allocation
- **Large Datasets**: Use filtering options to work with smaller data subsets

**Export Problems:**
- Ensure modern browser with JavaScript enabled
- Check for pop-up blockers preventing file downloads
- Verify sufficient disk space for exported files
- Try alternative browsers if export fails

### System Maintenance

**Regular Maintenance Tasks:**
- Monitor database size and performance
- Review and clean up unused course offerings
- Validate schedule integrity across trimesters
- Update room information as needed

**Data Backup Recommendations:**
- Regular database backups before major changes
- Export schedules to Excel as backup copies
- Document any custom configurations or modifications

---

**For additional technical support or feature requests, please contact the system administrator.**
