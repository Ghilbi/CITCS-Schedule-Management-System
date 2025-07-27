# DCS: An EdTech Cloud-Native Digitalized Course Scheduling System

A comprehensive edtech cloud-native web application for managing academic course schedules, room allocations, and timetables for educational institutions.

## Table of Contents
- [Overview](#overview)
- [Getting Started](#getting-started)
- [Features](#features)
- [User Guide](#user-guide)
  - [Navigation](#navigation)
  - [Manage Courses](#manage-courses)
  - [Manage Course Offering](#manage-course-offering)
  - [Section View](#section-view)
  - [Room View](#room-view)
- [Export Functionality](#export-functionality)
- [System Constraints & Warnings](#system-constraints--warnings)
- [Troubleshooting](#troubleshooting)

## Overview

This web application provides educational institutions with a powerful tool to plan and manage academic schedules. It handles courses, sections, room allocations, and presents schedule information in various useful views with intelligent conflict detection and bulk management capabilities.

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

- **🔐 Secure Course Management**: Login-protected course data management with full CRUD operations
- **📚 Course Offering Management**: Single and bulk section creation with program-specific organization
- **📅 Intelligent Schedule Planning**: Advanced scheduling with conflict detection and room allocation
- **🏢 Room Management**: Comprehensive room view with conflict detection and usage tracking
- **⚠️ Smart Conflict Detection**: Automatic detection of room conflicts and duplicate schedule warnings
- **📊 Multiple Views**: Different ways to visualize schedule data (by room, section, summary)
- **📤 Export Functionality**: Export schedules to Excel for offline use and sharing
- **🔍 Advanced Filtering**: Filter by trimester and year level for focused schedule management

## User Guide

### Navigation

The top navigation bar provides quick access to all main functions of the application:

- **Manage Courses** - Course data management (requires login)
- **Manage Course Offering** - Section creation and management
- **Section View** - Schedule assignment and room allocation
- **Room View** - Room usage visualization and summary

> **Note**: You can browse all tabs freely, but login is only required for the Manage Courses section.

---

### Manage Courses

**🔐 Login Required** - This section requires user authentication to access course data and management features.

#### Getting Started
1. Click on the "Manage Courses" tab
2. You will be prompted to log in with your credentials
3. Once authenticated, you can access all course management features

#### Adding a New Course
1. After logging in, click the "Add Course" button
2. Fill in the complete course details:
   - **Course Code**: Unique identifier for the course (e.g., CS101)
   - **Course Name**: Full name of the course
   - **Description**: Detailed course description
   - **Units**: Credit hours/units for the course
   - **Prerequisites**: List any required prerequisite courses
3. Click "Save" to add the course to the system
4. The new course will appear in the course list immediately

#### Editing Course Information
1. Locate the course you want to modify in the course table
2. Click the "Edit" button in the corresponding row
3. Update any of the course details:
   - Modify course information as needed
   - Ensure all required fields remain filled
4. Click "Save" to apply your changes
5. Changes will be reflected across all related sections and schedules

#### Deleting Courses
1. Find the course you want to remove in the course table
2. Click the "Delete" button in the course row
3. **Important**: Confirm deletion when prompted
4. **Warning**: Deleting a course will affect all associated sections and schedules

#### Managing Course Data
- **Search & Filter**: Use the search functionality to quickly find specific courses
- **Bulk Operations**: Select multiple courses for batch operations
- **Data Validation**: The system ensures all required fields are completed before saving
- **Change History**: All modifications are tracked for audit purposes

---

### Manage Course Offering

This section allows you to create and manage course sections for different programs without requiring login.

#### Adding Single Sections
1. Navigate to the "Manage Course Offering" tab
2. Click "Add Section" to create individual sections
3. Select the program and course from dropdown menus
4. Specify section details:
   - **Year Level**: Choose from 1st, 2nd, 3rd, or 4th year
   - **Section Letter**: Assign a letter identifier (A, B, C, etc.)
   - **Capacity**: Set maximum number of students
   - **Program**: Select the specific academic program
5. Click "Save" to create the section

#### Bulk Adding Sections
1. Click on the "Bulk Add" tab within the section creation area
2. Select the target program and course
3. Choose the year level for all sections
4. Enter multiple section letters:
   - Type section letters separated by commas (e.g., A, B, C, D)
   - Or use ranges (e.g., A-F for sections A through F)
5. Preview all sections that will be created
6. Click "Create All Sections" to add them simultaneously
7. **Benefit**: This saves significant time when creating multiple sections for large programs

#### Editing Section Details
1. Locate the section in the section management table
2. Click the "Edit" button for the specific section
3. Modify any section attributes:
   - Change section letter or capacity
   - Update program assignment
   - Adjust year level if needed
4. Click "Update" to save changes
5. **Note**: Changes may affect existing schedule assignments

#### Managing Section Data
- **Program Organization**: Sections are organized by academic program for easy management
- **Capacity Tracking**: Monitor enrollment limits and current capacity
- **Quick Actions**: Duplicate sections, transfer students, or merge sections as needed
- **Validation**: System prevents duplicate section identifiers within the same program

#### Important Notes for Section Management
- **Dependencies**: Before deleting sections, ensure they are not assigned to any schedules
- **Best Practice**: Use bulk add for efficiency when creating multiple sections
- **Data Integrity**: The system maintains relationships between courses and sections automatically

---

### Section View

This is the core scheduling interface where you assign subject schedules and manage room allocations for each created section.

#### Getting Started with Schedule Assignment
1. Navigate to the "Section View" tab
2. Use the **Trimester Tabs** to select the current academic term
3. Select the **Year Level Tabs** to focus on specific year groups
4. The schedule grid will display available time slots for the selected filters

#### Assigning Subject Schedules
1. **Select Time Slot**: Click on any empty time slot in the schedule grid
2. **Choose Section**: Select the section from the dropdown menu
3. **Select Subject**: Pick the subject/course to be scheduled
4. **Room Assignment**: Choose an available room from the room dropdown
5. **Confirm Assignment**: Click "Assign" to save the schedule entry

#### Room Allocation Management
1. **Room Selection**: The system shows available rooms for each time slot
2. **Capacity Check**: Room capacity is automatically verified against section enrollment
3. **Availability**: Only unoccupied rooms are shown for selection
4. **Room Groups**: Rooms are organized into Group A and Group B for better management

#### Editing Existing Schedules
1. **Find Schedule**: Locate the scheduled item in the time grid
2. **Click to Edit**: Click on the occupied time slot
3. **Modify Details**: Change any of the following:
   - Subject/course assignment
   - Room allocation
   - Time duration
   - Section assignment
4. **Save Changes**: Confirm modifications to update the schedule

#### Advanced Filtering Options
1. **Trimester Filtering**:
   - Select from available trimesters (1st, 2nd, 3rd)
   - Each trimester shows only relevant courses and sections
   - Easy switching between academic terms

2. **Year Level Filtering**:
   - Filter by 1st, 2nd, 3rd, or 4th year levels
   - Reduces clutter by showing only relevant sections
   - Streamlines schedule management for specific year groups

#### System Constraints & Smart Features

**🚨 Room Conflict Detection**:
- System automatically detects when two sections are assigned to the same room at the same time
- Immediate warning displays when conflicts are detected
- Prevents double-booking of rooms

**⚠️ Duplicate Schedule Warnings**:
- Alerts when attempting to schedule the same section multiple times
- Warns about conflicting instructor assignments
- Identifies overlapping course schedules

**🔍 Real-time Validation**:
- Instant feedback on scheduling conflicts
- Room capacity vs. section enrollment verification
- Time slot availability checking

#### Schedule Management Best Practices
1. **Plan by Year Level**: Start with one year level at a time to avoid confusion
2. **Check Room Capacity**: Ensure rooms can accommodate section sizes
3. **Verify Prerequisites**: Make sure prerequisite courses are scheduled appropriately
4. **Use Filters**: Take advantage of trimester and year level filters for focused planning
5. **Save Frequently**: Save your work regularly to prevent data loss

#### Troubleshooting Schedule Issues
- **Red Warnings**: Address all conflict warnings before finalizing schedules
- **Missing Rooms**: Check if rooms are already occupied or have capacity issues
- **Section Not Available**: Verify the section exists in the selected trimester/year level
- **Save Errors**: Ensure all required fields are filled before saving

---

### Room View

**📋 View-Only Interface** - This section is designed for monitoring and reporting room usage across the institution.

#### Viewing Room Allocations
1. Navigate to the "Room View" tab
2. **Room Group A & B**: Toggle between different room groups using the tabs
3. **Time Grid Display**: 
   - Rooms are displayed as columns
   - Time slots are shown as rows
   - Occupied slots show course and section information
   - Empty slots are clearly marked as available

#### Understanding Room Information
1. **Room Details**: Each room column shows:
   - Room number/identifier
   - Room capacity
   - Equipment available
   - Current occupancy status

2. **Schedule Information**: For each occupied time slot:
   - Course code and name
   - Section identifier
   - Instructor information (if available)
   - Duration of the class

#### Room Usage Summary
1. **Access Summary**: Click the "Show Summary" button
2. **Summary Features**:
   - **Overall Utilization**: Percentage of room usage across all time slots
   - **Peak Hours**: Identification of busiest time periods
   - **Available Slots**: Quick view of unoccupied rooms and times
   - **Room Efficiency**: Analysis of room usage patterns

3. **Detailed Reports**:
   - Room-by-room utilization statistics
   - Time-based usage patterns
   - Conflict resolution suggestions
   - Capacity optimization recommendations

#### Excel Export from Room View
1. **Access Export**: Look for the "Export" option in the "Show Summary" section
2. **Export Options**:
   - **Complete Schedule**: Full room allocation for all rooms and time slots
   - **Filtered Export**: Export specific room groups or time periods
   - **Summary Report**: Statistical overview of room usage

3. **Excel File Contents**:
   - **Sheet 1**: Complete room schedule grid
   - **Sheet 2**: Room utilization summary
   - **Sheet 3**: Conflict report (if any)
   - **Sheet 4**: Available time slots for future planning

#### Using Room View for Planning
1. **Identify Bottlenecks**: Find overutilized rooms or time periods
2. **Find Alternatives**: Locate available rooms for schedule adjustments
3. **Optimize Usage**: Use summary data to improve room allocation efficiency
4. **Plan Maintenance**: Identify low-usage periods for room maintenance scheduling

#### Room View Benefits
- **Real-time Monitoring**: See current room allocation status instantly
- **Conflict Prevention**: Identify potential scheduling conflicts before they occur
- **Resource Optimization**: Make informed decisions about room usage
- **Reporting**: Generate comprehensive reports for administration
- **Offline Access**: Export data for offline analysis and presentation

#### Navigation Tips
- **Quick Search**: Use browser search (Ctrl+F) to find specific rooms or courses
- **Time Navigation**: Click on time headers to jump to specific periods
- **Room Comparison**: Use side-by-side view to compare room utilization
- **Print Friendly**: Room view is optimized for printing when needed

---

## Export Functionality

The system provides comprehensive export capabilities for offline use and reporting.

### Accessing Export Features
1. Navigate to the Room View section
2. Click the "Show Summary" button
3. Look for export options in the summary interface

### Export Options Available
1. **Complete Schedule Export**:
   - All rooms and their schedules
   - All time slots and assignments
   - Section and course details

2. **Filtered Exports**:
   - Specific trimester data
   - Individual year level schedules
   - Room group specific data

3. **Summary Reports**:
   - Room utilization statistics
   - Conflict analysis
   - Available time slots

### Excel File Structure
- **Multiple Worksheets**: Organized data across different sheets
- **Formatted Tables**: Professional formatting for easy reading
- **Charts & Graphs**: Visual representation of utilization data
- **Print-Ready**: Optimized for printing and presentation

## System Constraints & Warnings

### Automatic Conflict Detection
The system continuously monitors for scheduling conflicts and provides immediate warnings:

1. **Room Conflicts**: 
   - Warns when multiple sections are assigned to the same room simultaneously
   - Highlights conflicting assignments in red
   - Suggests alternative rooms when available

2. **Duplicate Schedules**:
   - Alerts when attempting to schedule the same section multiple times
   - Prevents instructor double-booking
   - Identifies overlapping course times

### Data Validation Rules
- **Required Fields**: All essential information must be completed before saving
- **Capacity Limits**: Room capacity cannot be exceeded by section enrollment
- **Time Constraints**: Classes cannot overlap within the same section
- **Prerequisites**: System tracks prerequisite requirements

### Important Deletion Guidelines
⚠️ **Critical Warning**: Before deleting any sections from the Manage Course Offering:
1. **Empty Section View First**: Remove all schedule assignments for the section
2. **Check Dependencies**: Verify no other data depends on the section
3. **Backup Data**: Consider exporting current schedules before major deletions
4. **Confirm Impact**: Understand that deletion affects all related schedule data

## Troubleshooting

### Common Issues and Solutions

#### Login Problems (Manage Courses)
- **Issue**: Cannot access course management features
- **Solution**: Ensure you have valid login credentials and contact system administrator if needed
- **Note**: Login is only required for course management, not for browsing other sections

#### Schedule Conflicts
- **Red Warning Messages**: Address all conflict warnings before finalizing schedules
- **Room Double-booking**: Check room availability and consider alternative rooms
- **Time Overlaps**: Verify section schedules don't conflict with each other

#### Data Not Saving
1. **Check Required Fields**: Ensure all mandatory fields are completed
2. **Internet Connection**: Verify stable internet connection
3. **Session Timeout**: Re-login if session has expired
4. **Browser Issues**: Try refreshing the page or using a different browser

#### Export Issues
- **Empty Excel Files**: Ensure data exists for the selected filters
- **Download Problems**: Check browser download settings and permissions
- **File Corruption**: Try exporting smaller data sets or contact support

#### Performance Issues
- **Slow Loading**: The web version may be slow due to free hosting tier
- **Local Setup**: Consider local installation for better performance
- **Browser Optimization**: Close unnecessary tabs and clear browser cache

### Getting Help
- **System Administrator**: Contact your IT department for technical issues
- **User Training**: Request additional training sessions for complex features
- **Documentation**: Refer to this guide for step-by-step instructions
- **Backup Support**: Always maintain backups of important schedule data

---

**For additional support or advanced features, please contact your system administrator.** 
