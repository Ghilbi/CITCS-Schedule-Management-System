## CITCS Schedule Management System – User Manual

### Who is this for?
- Administrators and staff who manage courses, offerings, rooms, and schedules.
- Requires valid credentials to sign in for protected actions (e.g., course editing).

### What you can do
- Manage course catalog and curricula
- Create and bulk-create course offerings
- Assign offerings to sections, times, and rooms with conflict prevention
- Manage rooms and view occupancy
- Review schedule summaries and analytics
- Export schedules and data

---

## 1. Getting Started

### 1.1 Requirements
- A modern desktop browser (Chrome, Edge, Firefox, Safari)
- Stable internet connection
- Your administrator credentials

### 1.2 Accessing the system
1. Open `http://localhost:3000` (or your organization’s deployed URL).
2. If you are not signed in, you will be redirected to the login page.
3. Enter your username and password, then select Sign In.
4. After a successful login, you’ll land on the main dashboard.

Tip: For security, tokens expire about every 2 hours. If you are prompted to log in again, simply re-authenticate.

---

## 2. The Interface at a Glance

### 2.1 Navigation
Use the left sidebar to switch between modules:
- Analytics
- Course Catalog
- Manage Course Offering
- Section Management
- Room Management
- Schedule Summary
- Logout

### 2.2 Common UI patterns
- Filters appear at the top of most pages (Degree, Year Level, Trimester, Curriculum).
- Tables support search, sort, and sometimes CSV import/export.
- Actions like Add, Edit, and Delete appear near table headers or row actions.
- Visual notices/warnings appear for conflicts and validation messages during scheduling.

---

## 3. Core Concepts (Plain English)
- Course: A subject in the catalog (e.g., “Calculus I”). Has attributes like units, year level, degree, trimester, curriculum, and type (PureLec or Lec/Lab).
- Course Offering: A specific instance of a course for a trimester, degree, and section (e.g., “Calculus I – Section A – Lec – Trimester 1”).
- Section: A labeled group of students (e.g., A, B, C) that you schedule for a course offering.
- Room: A location used for scheduled classes.
- Schedule: The assignment of a course offering to a day pattern (MWF or TTHS), a time slot, and a room.
- Day Patterns: The app organizes time by typical patterns (e.g., MWF and TTHS).

---

## 4. Typical Workflow (End-to-End)

1) Add or update Rooms (Room Management)  
2) Build your Course Catalog (Course Catalog)  
3) Create Course Offerings (Manage Course Offering)  
4) Schedule Offerings into times and rooms (Section Management)  
5) Review (Schedule Summary, Analytics)  
6) Export to Excel or CSV as needed (Export options where available)  

You can repeat steps as curricula and trimesters change.

---

## 5. Course Catalog

### 5.1 View and search courses
1. Go to Course Catalog.
2. Use search to find a subject or filters for Year Level, Degree, Trimester, and Curriculum.
3. Sort columns where available (e.g., by Subject, Units).

### 5.2 Add a course
1. Select Add Course.
2. Provide: Subject, Unit Category (PureLec or Lec/Lab), Units, Year Level, Degree, Trimester, Curriculum, Description (optional).
3. Select Save.

Notes:
- The system prevents duplicate subjects within the same curriculum where applicable.
- Some operations (add/edit/delete) require you to be logged in.

### 5.3 Edit or delete a course
1. Locate the course in the table.
2. Select Edit to update fields; Save when done.
3. Select Delete to remove. Confirm when prompted.

### 5.4 Import/Export (CSV)
- Export: Use the Export option to download the current view.
- Import: Use Import to upload CSV data that matches required columns. Validate preview before saving.

---

## 6. Manage Course Offering

### 6.1 Create an offering (single)
1. Go to Manage Course Offering.
2. Select Add Offering.
3. Choose the base Course. The Units and Trimester typically inherit from the course.
4. Provide Section (e.g., A), Type (`Lec`, `Lab`, or `PureLec`), and (if needed) Degree.
5. Select Save.

### 6.2 Bulk-create offerings
1. In Manage Course Offering, choose Bulk Create.
2. Select Degree, Year Level, Trimester.
3. Enter Section letters or a range (e.g., A–D).
4. Confirm the preview and Save to generate multiple offerings at once.

Tips:
- Use filters (Degree/Year/Trimester) to limit scope before bulk operations.
- Ensure your Course Catalog is complete first to reduce cleanup later.

---

## 7. Section Management (Scheduling)

### 7.1 Assign offerings to the time grid
1. Go to Section Management.
2. Filter by Trimester and Year Level.
3. Select the day pattern tab (MWF or TTHS).
4. Select a course offering and assign:
   - Time slot (based on the grid)
   - Room
   - Section (primary), and optionally Section 2 for shared subjects
5. Save or confirm the assignment.

### 7.2 Conflict prevention and notices
- The system checks for:
  - Room conflicts (same time, same room)
  - Section overlaps (a section double-booked at the same time)
  - Duplicates within a section
- Conflicts display as warnings or highlighted cells. Adjust time/room/section to resolve.

### 7.3 Editing or removing a scheduled item
1. Select the scheduled entry in the grid.
2. Edit time, room, or section as needed; Save changes.
3. To remove, choose Delete/Remove and confirm.

---

## 8. Room Management

### 8.1 Add or update rooms
1. Go to Room Management.
2. Select Add Room, provide a unique room name, and Save.
3. To edit, select a room row, update fields, and Save.

### 8.2 Visualize occupancy
- Use the MWF and TTHS tabs to see room schedules at a glance.
- Optionally group rooms (e.g., Room Group A/B) for easier scanning.

Validation:
- Room names are case-insensitive unique. The system prevents duplicates.

---

## 9. Schedule Summary
Use Schedule Summary to:
- Review schedules by Trimester and Year Level
- See a concise, section-based overview of what has been scheduled
- Validate coverage and detect obvious gaps

Filters at the top help narrow the view (e.g., focus on a specific year or degree).

---

## 10. Analytics
Key counts and distributions:
- Total courses, offerings, schedules, rooms, and curricula
- Utilization (e.g., room usage across patterns)

Use Analytics to inform planning (e.g., whether more rooms or sections are needed).

---

## 11. Export

### 11.1 Excel export (schedules)
1. Navigate to the relevant module (e.g., Schedule Summary or Section Management).
2. Use the Export to Excel option.
3. The system generates a downloadable file using Excel-compatible formats.

### 11.2 CSV export (tabular data)
- In tables that support CSV, use Export to download the current view.
- For large datasets, apply filters first to export only what you need.

Browser tips:
- Allow pop-ups and downloads for your domain.
- Large exports can take longer—avoid navigating away until complete.

---

## 12. Best Practices
- Apply filters early (Degree/Year/Trimester/Curriculum) to keep views focused.
- Build Course Catalog first, then create offerings, then schedule them.
- Resolve conflict warnings before finalizing schedules.
- Export schedules before major changes as a quick operational backup.
- Back up the database regularly (follow your IT policy).

---

## 13. Troubleshooting & FAQ

### Can’t log in
- Verify your username and password.
- If your password changed, ask an admin to generate a new hash and update credentials.
- If your session expired, sign in again.

### Data won’t save
- Ensure all required fields are filled.
- Check that you’re targeting the correct table (e.g., Courses vs Offerings).
- For protected actions (like Courses), ensure you are signed in.

### Conflict warnings while scheduling
- Adjust the room or time to avoid room conflicts.
- Ensure the same section is not double-booked for the same time.
- For shared subjects, use the optional Section 2 if appropriate.

### Export didn’t download
- Enable pop-ups/downloads for your browser on this site.
- Try exporting a filtered subset if the dataset is large.
- Use a modern browser and try again.

### Where is my data stored?
- The system uses a PostgreSQL database. Contact your IT administrator for backups and retention policy.

---

## 14. Glossary
- Degree: The academic program (e.g., BSCS).
- Year Level: The study year (e.g., 1st year).
- Trimester: Academic period (e.g., Trimester 1).
- Curriculum: A program plan/version (e.g., 2023 curriculum).
- PureLec / Lec / Lab: Unit categories or offering types.
- Section: Label for a class cohort (e.g., A, B).
- Offering: A course instantiated for a section/trimester/type.
- Day Pattern: MWF or TTHS organization for time grids.

---

## 15. Getting Help
- Check this User Manual first.
- Refer to the technical `Documentation.md` for system architecture and setup details.
- Contact your system administrator for account/access issues or feature requests.


