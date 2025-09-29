# Academic Schedule Management System Documentation

## Table of Contents
- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Authentication System](#authentication-system)
- [Backend Functionalities](#backend-functionalities)
  - [Database Schema](#database-schema)
  - [API Endpoints](#api-endpoints)
- [Frontend Functionalities](#frontend-functionalities)
  - [Startup Animation](#startup-animation)
  - [Navigation](#navigation)
  - [Course Management](#course-management)
  - [Course Offering Management](#course-offering-management)
  - [Section View](#section-view)
  - [Room View](#room-view)
  - [Schedule Management](#schedule-management)
  - [Curriculum Management](#curriculum-management)
  - [Export Functionality](#export-functionality)
- [Key Features](#key-features)
- [Constraints and Validations](#constraints-and-validations)

## Overview

The Academic Schedule Management System is a secure web application designed for educational institutions to manage academic course schedules, room allocations, and timetables. It provides a comprehensive tool for planning and visualizing academic schedules across different trimesters, year levels, and curriculum years with JWT-based authentication and modern UI components.

## System Architecture

The system follows a client-server architecture with a backend built using Node.js and Express, utilizing a PostgreSQL database for data storage hosted on Neon. The frontend is a web application built with HTML, CSS, and JavaScript, providing an interactive user interface for managing schedules and is deployed using Render.

- **Backend**: Handles data storage, retrieval, business logic, and authentication through RESTful API endpoints
- **Frontend**: Provides a user-friendly interface with startup animations, responsive design, and interactive components
- **Database**: Stores information about courses, sections, rooms, schedules, curricula, and user authentication
- **Authentication**: JWT-based security system protecting sensitive operations

## Authentication System

The application implements a comprehensive authentication system:

### Features
- **JWT-based Authentication**: Secure token-based authentication using JSON Web Tokens
- **Password Hashing**: Passwords are securely hashed using bcrypt
- **Protected Routes**: Course management operations require authentication
- **Session Management**: Automatic token validation and session handling

### Login Process
1. Users access the login page at `/login.html`
2. Credentials are validated against environment variables
3. Upon successful authentication, a JWT token is issued
4. The token is stored and used for subsequent authenticated requests
5. Users are redirected to the main application

### Security Measures
- Course write operations (POST, PUT, DELETE) are protected
- Other operations (rooms, schedules, course offerings) remain accessible
- Automatic logout functionality
- Token expiration handling

## Backend Functionalities

### Database Schema

The system uses the following tables in the PostgreSQL database:

- **rooms**: Contains room information with fields for `id` and `name`
- **courses**: Holds course details with fields for `id`, `subject`, `unit_category`, `units`, `year_level`, `degree`, `trimester`, `description`, and `curriculum`
- **schedules**: Manages schedule entries with fields for `id`, `dayType`, `time`, `col`, `roomId`, `courseId`, `color`, `unitType`, `section`, and `section2`
- **course_offerings**: Tracks course offerings with fields for `id`, `courseId`, `section`, `type`, `units`, `trimester`, and `degree`
- **curricula**: Manages curriculum years with fields for `id` and `year` (unique constraint on year)

### API Endpoints

The backend provides RESTful API endpoints for CRUD operations and authentication:

#### Authentication Endpoints
- **POST /api/login**: Authenticates user credentials and returns JWT token
  - Request body: `{ "username": "string", "password": "string" }`
  - Response: `{ "token": "jwt_token_string" }`

#### Data Management Endpoints
- **GET /api/:table**: Retrieves all items from the specified table
  - Supported tables: `rooms`, `courses`, `schedules`, `course_offerings`, `curricula`
- **POST /api/:table**: Adds a new item to the specified table
  - **Note**: Course operations require authentication
- **PUT /api/:table/:id**: Updates an existing item in the specified table
  - **Note**: Course operations require authentication
- **DELETE /api/:table/:id**: Deletes an item from the specified table
  - **Note**: Course operations require authentication

#### Security Features
- Authentication middleware protects course write operations
- JWT token validation for protected routes
- Automatic table validation to prevent SQL injection
- Row mapping for consistent data format across different database drivers

Supported tables for API operations are `rooms`, `courses`, `schedules`, and `course_offerings`. The system includes validation to ensure only valid table names are processed.

## Frontend Functionalities

### Startup Animation

The application features an engaging startup sequence:
- **Loading Screen**: Animated logo with glowing effects and particle animations
- **Progress Indicator**: Visual loading bar with animated dots
- **Smooth Transition**: Fade-in effect when transitioning to the main application
- **Responsive Design**: Adapts to different screen sizes and devices

### Navigation

The application provides a responsive sidebar navigation system with hamburger menu toggle:

- **Dashboard**: Overview of the system with quick access to main features
- **Manage Courses**: Interface for adding, editing, and deleting courses (authentication required)
- **Manage Course Offering**: Interface for managing course offerings and sections
- **Section Management**: Displays courses organized by sections with filtering options
- **Room Management**: Shows room allocations and schedules with CRUD operations
- **Schedule Summary**: Provides a comprehensive view of all schedules
- **Logout**: Secure logout functionality that clears authentication tokens

### Course Management

The course management interface provides comprehensive course administration (requires authentication):

- **Add New Courses**: Create new course entries with details such as subject, units, year level, degree, trimester, and curriculum year
- **Edit Existing Courses**: Modify course information with real-time validation
- **Delete Courses**: Remove courses from the system with confirmation dialogs
- **Advanced Search and Filter**: Find courses using search functionality and filter by:
  - Degree programs (BSIT, BSIT variants, BSCS, BSDA, BMMA)
  - Curriculum year (2020-2021 through 2024-2025)
  - Year level and trimester
- **Import/Export Functionality**: 
  - Import course data from CSV files with validation
  - Export current course data to CSV format
  - Clear all courses with bulk operations
- **Sorting Options**: Sort by subject, units, year level, and other criteria

### Course Offering Management

This section manages course offerings with enhanced functionality:

- **Create Offerings**: Set up course offerings for specific sections and trimesters
- **Section Management**: Organize courses by sections with dynamic section creation
- **Unit Types**: Handle different unit types (Lecture, Laboratory) with proper validation
- **Trimester Organization**: Organize offerings by trimester periods with tabbed interface
- **Conflict Detection**: Automatic detection and notification of scheduling conflicts
- **Bulk Operations**: Mass creation and modification of course offerings

### Curriculum Management

The system includes comprehensive curriculum tracking:

- **Curriculum Years**: Manage different curriculum versions (2020-2025)
- **Course Association**: Link courses to specific curriculum years
- **Filtering by Curriculum**: Filter courses and offerings by curriculum year
- **Migration Support**: Handle transitions between curriculum versions
- **Validation**: Ensure courses are properly associated with valid curricula

### Section View

The section view provides comprehensive section management:

- **Trimester Tabs**: Navigate between different trimesters (1st, 2nd, 3rd) with dynamic content loading
- **Year Level Filtering**: Filter courses by year level (1st Year through 4th Year)
- **Section Display**: View courses organized by sections with enhanced visual layout
- **Schedule Visualization**: Interactive schedule grid with drag-and-drop functionality
- **Conflict Resolution**: Real-time conflict detection and resolution suggestions
- **Bulk Operations**: Mass schedule creation and modification tools

### Room View

The room view offers advanced room management:

- **Room CRUD Operations**: Create, read, update, and delete room entries
- **Room Selection**: Choose from available rooms with search and filter capabilities
- **Schedule Display**: Visual representation of room usage with color-coded time slots
- **Time Slot Management**: Manage time slots with validation and conflict prevention
- **Occupancy Tracking**: Monitor room utilization and availability
- **Export Options**: Export room schedules in multiple formats

### Schedule Management

Schedule management includes comprehensive scheduling tools:

- **Interactive Schedule Grid**: Drag-and-drop interface for schedule creation
- **Create Schedules**: Add new schedule entries with course, room, and time information
- **Edit Schedules**: Modify existing schedule entries with real-time validation
- **Delete Schedules**: Remove schedule entries with confirmation dialogs
- **Conflict Detection**: Automatic detection of time, room, and instructor conflicts
- **Color Coding**: Visual distinction between different course types and sections
- **Responsive Design**: Mobile-friendly schedule interface

### Export Functionality

The system provides comprehensive export capabilities:

- **Excel Export**: Export schedule data to Excel format using SheetJS library
- **CSV Export**: Export course and schedule data in CSV format
- **Filtered Export**: Export specific data based on current filters and selections
- **Multiple Views**: Export from different views (courses, schedules, rooms)
- **Batch Export**: Export multiple datasets simultaneously
- **Custom Formatting**: Configurable export formats to meet institutional requirements

## Key Features

1. **Secure Authentication System**: JWT-based authentication with password hashing and protected routes
2. **Comprehensive Course Management**: Full CRUD operations with curriculum tracking and advanced filtering
3. **Interactive Schedule Planning**: Drag-and-drop interface with real-time conflict detection and resolution
4. **Advanced Room Management**: Complete room lifecycle management with occupancy tracking
5. **Curriculum Management**: Multi-year curriculum support with version tracking and migration tools
6. **Modern User Interface**: Responsive design with startup animations, hamburger navigation, and mobile support
7. **Export Capabilities**: Multiple export formats (Excel, CSV) with customizable options
8. **Real-time Validation**: Live conflict detection and data validation across all operations
9. **Bulk Operations**: Mass data import/export and batch processing capabilities
10. **Cross-platform Compatibility**: Works across different browsers and devices

## Constraints and Validations

1. **Authentication Requirements**: Course management operations require valid JWT authentication
2. **Room Conflict Prevention**: Automatic detection and prevention of room double-booking
3. **Section Conflict Detection**: Prevents scheduling conflicts for sections and instructors
4. **Curriculum Consistency**: Ensures courses are properly associated with valid curriculum years
5. **Time Slot Validation**: Validates time slots within acceptable academic hours and formats
6. **Data Integrity**: Maintains referential integrity across all database tables with foreign key constraints
7. **Input Validation**: Comprehensive client and server-side validation for all user inputs
8. **Trimester Consistency**: Ensures schedules align with proper trimester periods and academic calendars
9. **Duplicate Prevention**: Prevents duplicate course offerings and schedule entries
10. **Database Security**: SQL injection prevention through parameterized queries and table validation

---

This documentation provides a complete overview of the Academic Schedule Management System, detailing all functionalities as they exist in the current implementation. For further assistance or feature requests, please contact the system administrator.