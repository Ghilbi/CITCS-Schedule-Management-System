/**************************************************************
 * (FACULTY SECTION REMOVED)
 **************************************************************/

/**************************************************************
 * 6) COURSES CRUD with Search, Filter, and Sort
 **************************************************************/
// tableCoursesBody is defined in 06-6-courses-crud-with-search-filter-and-sort.js
// btnAddCourse is defined in 06-6-courses-crud-with-search-filter-and-sort.js
// modalCourse is defined in 06-6-courses-crud-with-search-filter-and-sort.js
// courseIdInput is defined in 06-6-courses-crud-with-search-filter-and-sort.js
// courseSubjectInput is defined in 06-6-courses-crud-with-search-filter-and-sort.js
// courseUnitsInput is defined in 06-6-courses-crud-with-search-filter-and-sort.js
// courseDegreeSelect is defined in 06-6-courses-crud-with-search-filter-and-sort.js
// courseTrimesterSelect is defined in 06-6-courses-crud-with-search-filter-and-sort.js
// courseDescriptionTextarea is defined in 06-6-courses-crud-with-search-filter-and-sort.js
// btnSaveCourse is defined in 06-6-courses-crud-with-search-filter-and-sort.js
// courseSearch is defined in 06-6-courses-crud-with-search-filter-and-sort.js



async function renderCoursesTable() {
  let coursesList = await apiGet("courses");
  const searchTerm = courseSearch.value.toLowerCase();
  const filterDegree = courseFilterDegree.value;
  const sortValue = courseSort.value;

  if (searchTerm) {
    coursesList = coursesList.filter(c => 
      c.subject.toLowerCase().includes(searchTerm) ||
      c.degree.toLowerCase().includes(searchTerm) ||
      c.trimester.toLowerCase().includes(searchTerm) ||
      (c.description && c.description.toLowerCase().includes(searchTerm))
    );
  }

  if (filterDegree) {
    coursesList = coursesList.filter(c => c.degree === filterDegree);
  }

  if (sortValue) {
    const [field, direction] = sortValue.split('-');
    coursesList.sort((a, b) => {
      if (field === 'subject') {
        return direction === 'asc' 
          ? a.subject.localeCompare(b.subject) 
          : b.subject.localeCompare(a.subject);
      } else if (field === 'units') {
        return direction === 'asc' 
          ? parseFloat(a.units) - parseFloat(b.units) 
          : parseFloat(b.units) - parseFloat(a.units);
      }
    });
  }

  tableCoursesBody.innerHTML = "";
  coursesList.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.subject}</td>
      <td>${c.unit_category}</td>
      <td>${c.units}</td>
      <td>${c.year_level}</td>
      <td>${c.degree}</td>
      <td>${c.trimester}</td>
      <td>${c.description || ''}</td>
      <td>
        <div class="action-buttons-container">
          <button class="action-edit-btn" onclick="editCourse(${c.id})">Edit</button>
          <button class="action-delete-btn" onclick="deleteCourse(${c.id})">Delete</button>
        </div>
      </td>
    `;
    tableCoursesBody.appendChild(tr);
  });
}

// btnAddCourse.addEventListener("click", () => {
//   courseIdInput.value = "";
//   courseSubjectInput.value = "";
//   courseUnitsInput.value = "";
//   courseDescriptionTextarea.value = "";
//   document.getElementById("purelec").checked = true;
//   document.getElementById("year-1st").checked = true;
//   courseDegreeSelect.value = "BSIT";
//   courseTrimesterSelect.value = "1st Trimester";
//   document.getElementById("modal-course-title").textContent = "Add Course";
//   showModal(modalCourse);
// });

// Legacy module notice: course handlers in this file are deprecated and disabled to avoid conflicts with 06-6-courses-crud-with-search-filter-and-sort.js
// btnSaveCourse.addEventListener("click", async () => {
//   const id = courseIdInput.value;
//   const subject = courseSubjectInput.value.trim();
//   const units = courseUnitsInput.value.trim();
//   const unitCategoryElement = document.querySelector('input[name="unitCategory"]:checked');
//   const yearLevelElement = document.querySelector('input[name="yearLevel"]:checked');
//   const unitCategory = unitCategoryElement ? unitCategoryElement.value : "PureLec"; // Default to PureLec if none selected
//   const yearLevel = yearLevelElement ? yearLevelElement.value : "1st yr"; // Default to 1st yr if none selected
//   const degree = courseDegreeSelect.value;
//   const trimester = courseTrimesterSelect.value;
//   const description = courseDescriptionTextarea.value.trim();
//   const curriculum = (document.getElementById("course-curriculum")?.value) || "2024-2025";
//   
//   if (!subject || !units) {
//     alert("Please fill out subject and units.");
//     return;
//   }
//   
//   if (id) {
//     await apiPut("courses", id, { subject, unitCategory, units, yearLevel, degree, trimester, curriculum, description });
//   } else {
//     await apiPost("courses", { subject, unitCategory, units, yearLevel, degree, trimester, curriculum, description });
//   }
//   
//   hideModal(modalCourse);
//   await renderCoursesTable();
//   await validateAllComplementary(); // Debounced validation
// });

// LEGACY (DISABLED): window.editCourse to avoid overriding the newer implementation
// window.editCourse = async function(id) {
//   const coursesList = await apiGet("courses");
//   const found = coursesList.find(c => c.id == id);
//   if (!found) {
//     console.error(`Course with ID ${id} not found`);
//     return;
//   }
//   
//   courseIdInput.value = found.id;
//   courseSubjectInput.value = found.subject;
//   courseUnitsInput.value = found.units;
//   courseDegreeSelect.value = found.degree;
//   courseTrimesterSelect.value = found.trimester;
//   courseDescriptionTextarea.value = found.description || '';
//   const curriculumSelect = document.getElementById("course-curriculum");
//   if (curriculumSelect) curriculumSelect.value = found.curriculum || "2024-2025";
//   
//   if (found.unit_category === "PureLec") {
//     document.getElementById("purelec").checked = true;
//   } else if (found.unit_category === "Lec/Lab") {
//     document.getElementById("leclab").checked = true;
//   }
//   
//   const yearLevelId = `year-${found.year_level.split(" ")[0].toLowerCase()}`;
//   const yearRadio = document.getElementById(yearLevelId);
//   if (yearRadio) {
//     yearRadio.checked = true;
//   } else {
//     console.error(`Year level radio button with ID ${yearLevelId} not found`);
//     document.getElementById("year-1st").checked = true;
//   }
//   
//   document.getElementById("modal-course-title").textContent = "Edit Course";
//   showModal(modalCourse);
// };

// LEGACY (DISABLED): window.deleteCourse to avoid overriding the newer implementation
// window.deleteCourse = async function(id) {
//   if (!confirm("Are you sure?")) return;
//   await apiDelete("courses", id);
//   await renderCoursesTable();
//   await validateAllComplementary(); // Debounced validation
// };

// Debounced controls for Courses
courseSearch.addEventListener("input", debounce(renderCoursesTable, 200));
courseFilterDegree.addEventListener("change", debounce(renderCoursesTable, 200));
courseSort.addEventListener("change", debounce(renderCoursesTable, 200));

// CSV Import/Export functionality




// CSV Import/Export event listeners removed - handled by courses module
// CSV Import/Export functions removed - handled by courses module

/*
// Function to import courses from CSV (REMOVED - handled by courses module)
async function importCoursesFromCsv(csvText) {
  // COMMENTED OUT - Function moved to courses module
  /*
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    alert('CSV file must contain at least a header row and one data row.');
    return;
  }

  // Show loading overlay for validation
  showLoadingOverlay('Validating CSV file...');

  try {
    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['subject', 'unit_category', 'units', 'year_level', 'degree', 'trimester'];

    // Check if all required headers are present
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
      hideLoadingOverlay();
      alert(`Missing required columns: ${missingHeaders.join(', ')}\nRequired columns: ${requiredHeaders.join(', ')}`);
      return;
    }

    const courses = [];
    const errors = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: Column count mismatch`);
        continue;
      }

      const course = {};
      headers.forEach((header, index) => {
        course[header] = values[index];
      });

      // Validate required fields
      if (!course.subject || !course.units) {
        errors.push(`Row ${i + 1}: Subject and units are required`);
        continue;
      }

      // Validate unit_category
      if (!['PureLec', 'Lec/Lab'].includes(course.unit_category)) {
        errors.push(`Row ${i + 1}: unit_category must be 'PureLec' or 'Lec/Lab'`);
        continue;
      }
      
      // Validate year_level
      if (!['1st yr', '2nd yr', '3rd yr'].includes(course.year_level)) {
        errors.push(`Row ${i + 1}: year_level must be '1st yr', '2nd yr', or '3rd yr'`);
        continue;
      }
      
      // Validate degree
      const validDegrees = ['BSIT', 'BSIT(Webtech)', 'BSIT(NetSec)', 'BSIT(ERP)', 'BSCS', 'BSDA', 'BMMA'];
      if (!validDegrees.includes(course.degree)) {
        errors.push(`Row ${i + 1}: Invalid degree '${course.degree}'. Valid degrees: ${validDegrees.join(', ')}`);
        continue;
      }
      
      // Validate trimester
      const validTrimesters = ['1st Trimester', '2nd Trimester', '3rd Trimester'];
      if (!validTrimesters.includes(course.trimester)) {
        errors.push(`Row ${i + 1}: Invalid trimester '${course.trimester}'. Valid trimesters: ${validTrimesters.join(', ')}`);
        continue;
      }
      
      // Validate units is a number
      if (isNaN(parseFloat(course.units))) {
        errors.push(`Row ${i + 1}: Units must be a valid number`);
        continue;
      }
      
      courses.push({
        subject: course.subject,
        unitCategory: course.unit_category,
        units: course.units,
        yearLevel: course.year_level,
        degree: course.degree,
        trimester: course.trimester,
        description: course.description || ''
      });
    }
    
    hideLoadingOverlay();
    
    if (errors.length > 0) {
      alert(`Found ${errors.length} error(s):\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? '\n... and more' : ''}`);
      return;
    }
    
    if (courses.length === 0) {
      alert('No valid courses found in CSV file.');
      return;
    }
    
    // Confirm import
    if (!confirm(`Import ${courses.length} course(s)? This will add new courses to the existing ones.`)) {
      return;
    }
    
    // Show loading overlay for import process
    showLoadingOverlay('Importing courses...');
    
    // Import courses
    let successCount = 0;
    let failCount = 0;
    
    for (const course of courses) {
      try {
        await apiPost('courses', course);
        successCount++;
      } catch (error) {
        console.error('Error importing course:', course, error);
        failCount++;
      }
    }
    
    hideLoadingOverlay();
    
    alert(`Import completed:\n${successCount} courses imported successfully\n${failCount} courses failed to import`);
    
    if (successCount > 0) {
      showLoadingOverlay('Refreshing course table...');
      await renderCoursesTable();
      await validateAllComplementary(); // Debounced validation
      hideLoadingOverlay();
    }
  } catch (error) {
    hideLoadingOverlay();
    console.error('Error during CSV import:', error);
    alert('An error occurred during import. Please try again.');
  }
}
*/

// Function to export courses to CSV (REMOVED - handled by courses module)
/*
async function exportCoursesToCsv() {
  try {
    // Show loading overlay
    showLoadingOverlay('Fetching courses...');
    
    const coursesList = await apiGet('courses');
    
    if (coursesList.length === 0) {
      hideLoadingOverlay();
      alert('No courses to export.');
      return;
    }
    
    // Update loading message
    showLoadingOverlay(`Generating CSV file for ${coursesList.length} courses...`);
    
    // CSV headers
    const headers = ['subject', 'unit_category', 'units', 'year_level', 'degree', 'trimester', 'description'];
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    coursesList.forEach(course => {
      const row = [
        course.subject || '',
        course.unit_category || '',
        course.units || '',
        course.year_level || '',
        course.degree || '',
        course.trimester || '',
        (course.description || '').replace(/,/g, ';') // Replace commas with semicolons in description
      ];
      csvContent += row.join(',') + '\n';
    });
    
    // Update loading message
    showLoadingOverlay('Preparing download...');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `courses_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      hideLoadingOverlay();
    } else {
      hideLoadingOverlay();
      alert('CSV export is not supported in this browser.');
    }
  } catch (error) {
    hideLoadingOverlay();
    console.error('Error during CSV export:', error);
    alert('An error occurred during export. Please try again.');
  }
}
*/

