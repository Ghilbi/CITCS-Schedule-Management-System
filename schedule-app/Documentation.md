# DCS: An EdTech Cloud-Native Digitalized Course Scheduling System Documentation

## Table of Contents
- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Backend Functionalities](#backend-functionalities)
  - [Database Schema](#database-schema)
  - [API Endpoints](#api-endpoints)
- [Frontend Functionalities](#frontend-functionalities)
  - [Navigation](#navigation)
  - [Course Management](#course-management)
  - [Course Offering Management](#course-offering-management)
  - [Section View](#section-view)
  - [Room View](#room-view)
  - [Schedule Management](#schedule-management)
  - [Export Functionality](#export-functionality)
- [Key Features](#key-features)
- [Constraints and Validations](#constraints-and-validations)

## Overview

The DCS System is a web application designed for educational institutions to manage academic course schedules, room allocations, and timetables. It provides a comprehensive tool for planning and visualizing academic schedules across different trimesters and year levels.

## System Architecture

The system follows a client-server architecture with a backend built using Node.js and Express, utilizing a PostgreSQL database for data storage hosted on Neon. The frontend is a web application built with HTML, CSS, and JavaScript, providing an interactive user interface for managing schedules and is deployed using Render.

- **Backend**: Handles data storage, retrieval, and business logic through RESTful API endpoints.
- **Frontend**: Provides a user-friendly interface for interacting with the system, visualizing schedules, and managing data.
- **Database**: Stores information about courses, sections, rooms, and schedules.

## Backend Functionalities

### Database Schema

The system uses the following tables in the PostgreSQL database:

- **rooms**: Contains room information with fields for `id` and `name`.
- **courses**: Holds course details with fields for `id`, `subject`, `unit_category`, `units`, `year_level`, `degree`, `trimester`, and `description`.
- **schedules**: Manages schedule entries with fields for `id`, `dayType`, `time`, `col`, `roomId`, `courseId`, `color`, `unitType`, `section`, and `section2`.
- **course_offerings**: Tracks course offerings with fields for `id`, `courseId`, `section`, `type`, `units`, `trimester`, and `degree`.

### API Endpoints

The backend provides RESTful API endpoints for CRUD operations on the database tables:

- **GET /api/:table**: Retrieves all items from the specified table.
- **POST /api/:table**: Adds a new item to the specified table.
- **PUT /api/:table/:id**: Updates an existing item in the specified table.
- **DELETE /api/:table/:id**: Deletes an item from the specified table.

Supported tables for API operations are `rooms`, `courses`, `schedules`, and `course_offerings`. The system includes validation to ensure only valid table names are processed.

## Frontend Functionalities

### Navigation

The application features a navigation bar with buttons for quick access to different sections:
- **Manage Courses**: For adding, editing, and deleting courses.
- **Manage Course Offering**: For managing course offerings.
- **Section View**: For viewing and managing section schedules by trimester and year level.
- **Room View**: For visualizing room allocations and schedules.

### Course Management

- **Add Course**: Users can add new courses by providing details such as course code, name, description, units, and prerequisites.
- **Edit Course**: Existing course information can be modified.
- **Delete Course**: Courses can be removed from the system.

### Course Offering Management

- **Add Offering**: Users can create new course offerings linked to specific courses, specifying section, type, units, trimester, and degree.
- **Edit Offering**: Modify existing course offerings.
- **Delete Offering**: Remove course offerings from the system.

### Section View

- **Trimester and Year Level Selection**: Users can select specific trimesters and year levels to view and manage schedules.
- **Add Section**: Create new sections for courses with specific year levels and letters.
- **Bulk Add Sections**: Allows creation of multiple sections at once.
- **Schedule Assignment**: Assign courses to specific time slots, with conflict detection for overlapping schedules.

### Room View

- **View Room Schedules**: Displays room allocations across time slots as a timetable.
- **Add Room**: Add new rooms to the system.
- **Edit Room**: Modify existing room information.
- **Delete Room**: Remove rooms if they are not currently scheduled.

### Schedule Management

- **Schedule View**: Displays timetables with time slots, days, and assigned courses.
- **Schedule Summary**: Provides a detailed view of schedules for selected sections, including course details, days, times, and room assignments.
- **Conflict Detection**: Alerts users to scheduling conflicts such as room overlaps or section double-booking.

### Export Functionality

- **Export to Excel**: Users can export the complete schedule to an Excel file for offline use and sharing from the Schedule Summary view.

## Key Features

- **Comprehensive Scheduling**: Manage schedules by trimester, year level, and section with detailed views.
- **Conflict Detection**: Automatic warnings for scheduling conflicts involving rooms or sections.
- **Multiple Visualizations**: View schedules by room, section, or summary for different perspectives.
- **Data Management**: Full CRUD operations for courses, sections, and rooms.
- **User-Friendly Interface**: Intuitive navigation and modal dialogs for data entry and modifications.

## Constraints and Validations

- **Room Naming**: Room names must contain only letters and numbers, no spaces or special characters.
- **Duplicate Room Names**: Prevent adding rooms with names that already exist (case-insensitive).
- **Deletion Restrictions**: Cannot delete rooms if they are currently scheduled or assigned.

---

This documentation provides a complete overview of the Academic Schedule Management System, detailing all functionalities as they exist in the current implementation. For further assistance or feature requests, please contact the system administrator. 
