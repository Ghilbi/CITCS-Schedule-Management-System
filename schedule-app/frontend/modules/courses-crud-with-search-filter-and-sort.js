/**************************************************************
 * 6) COURSES CRUD with Search, Filter, and Sort
 **************************************************************/
// tableCoursesBody, btnAddCourse, modalCourse, btnSaveCourse, courseSearch, courseFilterDegree, courseSort, btnImportCsv, btnExportCsv, csvFileInput, tableCourseOfferingBody, btnAddCourseOffering, modalCourseOffering, courseOfferingIdInput, courseOfferingCourseSelect are defined in 03-global-variables-for-room-view-columns.js
const courseIdInput = document.getElementById("course-id");
const courseSubjectInput = document.getElementById("course-subject");
const courseUnitsInput = document.getElementById("course-units");
const courseDegreeSelect = document.getElementById("course-degree");
const courseTrimesterSelect = document.getElementById("course-trimester");
const courseDescriptionTextarea = document.getElementById("course-description");

async function renderCoursesTable(forceRefresh = false) {
  let coursesList = await apiGet("courses", forceRefresh);
  const searchTerm = courseSearch.value.toLowerCase();
  const filterYearLevel = courseFilterYearLevel.value;
  const filterDegree = courseFilterDegree.value;
  const filterTrimester = courseFilterTrimester.value;
  const sortValue = courseSort.value;

  if (searchTerm) {
    coursesList = coursesList.filter(c => 
      c.subject.toLowerCase().includes(searchTerm) ||
      c.degree.toLowerCase().includes(searchTerm) ||
      c.trimester.toLowerCase().includes(searchTerm) ||
      (c.description && c.description.toLowerCase().includes(searchTerm))
    );
  }

  if (filterYearLevel) {
    coursesList = coursesList.filter(c => c.year_level === filterYearLevel);
  }

  if (filterDegree) {
    coursesList = coursesList.filter(c => c.degree === filterDegree);
  }

  if (filterTrimester) {
    coursesList = coursesList.filter(c => c.trimester === filterTrimester);
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

btnAddCourse.addEventListener("click", () => {
  courseIdInput.value = "";
  courseSubjectInput.value = "";
  courseUnitsInput.value = "";
  courseDescriptionTextarea.value = "";
  document.getElementById("purelec").checked = true;
  document.getElementById("year-1st").checked = true;
  courseDegreeSelect.value = "BSIT";
  courseTrimesterSelect.value = "1st Trimester";
  
  document.getElementById("modal-course-title").textContent = "Add Course";
  showModal(modalCourse);
});

btnSaveCourse.addEventListener("click", async () => {
  const id = courseIdInput.value;
  const subject = courseSubjectInput.value.trim();
  const units = courseUnitsInput.value.trim();
  const unitCategoryElement = document.querySelector('input[name="unitCategory"]:checked');
  const yearLevelElement = document.querySelector('input[name="yearLevel"]:checked');
  const unit_category = unitCategoryElement ? unitCategoryElement.value : "PureLec"; // Default to PureLec if none selected
  const year_level = yearLevelElement ? yearLevelElement.value : "1st yr"; // Default to 1st yr if none selected
  const degree = courseDegreeSelect.value;
  const trimester = courseTrimesterSelect.value;
  const description = courseDescriptionTextarea.value.trim();
  
  if (!subject || !units) {
    alert("Please fill out subject and units.");
    return;
  }
  
  try {
    if (id) {
      await apiPut("courses", id, { subject, unitCategory: unit_category, units, yearLevel: year_level, degree, trimester, description });
    } else {
      await apiPost("courses", { subject, unitCategory: unit_category, units, yearLevel: year_level, degree, trimester, description });
    }
    
    hideModal(modalCourse);
    clearApiCache('courses');
    await renderCoursesTable(true); // Force refresh after save
    await forceValidateAllComplementary();
  } catch (error) {
    console.error('Error saving course:', error);
    // Extract error message from the API response
    let errorMessage = 'An error occurred while saving the course.';
    if (error.message && error.message.includes('already exists')) {
      errorMessage = error.message.replace('API request failed: 400 ', '').replace(/[{}"]/g, '').replace('error:', '');
    }
    alert(errorMessage);
  }
});

window.editCourse = async function(id) {
  const coursesList = await apiGet("courses");
  const found = coursesList.find(c => c.id == id);
  if (!found) {
    console.error(`Course with ID ${id} not found`);
    return;
  }
  
  courseIdInput.value = found.id;
  courseSubjectInput.value = found.subject;
  courseUnitsInput.value = found.units;
  courseDegreeSelect.value = found.degree;
  courseTrimesterSelect.value = found.trimester;
  courseDescriptionTextarea.value = found.description || '';
  
  if (found.unit_category === "PureLec") {
    document.getElementById("purelec").checked = true;
  } else if (found.unit_category === "Lec/Lab") {
    document.getElementById("leclab").checked = true;
  }
  
  const yearLevelId = `year-${found.year_level.split(" ")[0].toLowerCase()}`;
  const yearRadio = document.getElementById(yearLevelId);
  if (yearRadio) {
    yearRadio.checked = true;
  } else {
    console.error(`Year level radio button with ID ${yearLevelId} not found`);
    document.getElementById("year-1st").checked = true;
  }
  
  document.getElementById("modal-course-title").textContent = "Edit Course";
  showModal(modalCourse);
};

window.deleteCourse = async function(id) {
  if (!confirm("Are you sure?")) return;
  await apiDelete("courses", id);
  clearApiCache('courses');
  await renderCoursesTable(true); // Force refresh after delete
  await forceValidateAllComplementary();
};

// Collapsible filter functionality
const filterToggleBtn = document.getElementById("filter-toggle-btn");
const filterSection = document.getElementById("filter-section");

if (filterToggleBtn && filterSection) {
  filterToggleBtn.addEventListener("click", () => {
    filterSection.classList.toggle("collapsed");
    filterToggleBtn.classList.toggle("active");
    
    // Update the text and arrow
    const filterText = filterToggleBtn.querySelector(".filter-text");
    const filterArrow = filterToggleBtn.querySelector(".filter-arrow");
    
    if (filterSection.classList.contains("collapsed")) {
      if (filterText) filterText.textContent = "Show Filters";
      if (filterArrow) filterArrow.textContent = "▼";
    } else {
      if (filterText) filterText.textContent = "Hide Filters";
      if (filterArrow) filterArrow.textContent = "▲";
    }
  });
}

// Debounced controls for Courses
courseSearch.addEventListener("input", debounce(renderCoursesTable, 200));
courseFilterYearLevel.addEventListener("change", debounce(renderCoursesTable, 200));
courseFilterDegree.addEventListener("change", debounce(renderCoursesTable, 200));
courseFilterTrimester.addEventListener("change", debounce(renderCoursesTable, 200));
courseSort.addEventListener("change", debounce(renderCoursesTable, 200));

// CSV Import/Export functionality




// CSV Import Event Listener
btnImportCsv.addEventListener("click", () => {
  csvFileInput.click();
});

csvFileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!file.name.toLowerCase().endsWith('.csv')) {
    alert('Please select a CSV file.');
    return;
  }
  
  try {
    const text = await file.text();
    await importCoursesFromCsv(text);
    csvFileInput.value = ''; // Reset file input
  } catch (error) {
    console.error('Error reading CSV file:', error);
    alert('Error reading CSV file. Please try again.');
  }
});

// CSV Export Event Listener
btnExportCsv.addEventListener("click", async () => {
  try {
    await exportCoursesToCsv();
  } catch (error) {
    console.error('Error exporting CSV:', error);
    alert('Error exporting CSV file. Please try again.');
  }
});

// Function to import courses from CSV
async function importCoursesFromCsv(csvText) {
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
      alert(`Missing required columns: ${missingHeaders.join(', ')}\nRequired columns: ${requiredHeaders.join(', ')}\nOptional columns: description`);
      return;
    }
    
    const parsedCourses = [];
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
      
      parsedCourses.push({
        subject: course.subject,
        unitCategory: course.unit_category,
        units: course.units,
        yearLevel: course.year_level,
        degree: course.degree,
        trimester: course.trimester,
        description: course.description || ''
      });
    }
    
    // If validation errors, report and stop
    hideLoadingOverlay();
    if (errors.length > 0) {
      alert(`Found ${errors.length} error(s):\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? '\n... and more' : ''}`);
      return;
    }
    
    // De-duplicate within CSV by subject+degree (case-insensitive on subject)
    const seenKeys = new Set();
    const csvDuplicates = [];
    const uniqueParsed = [];
    for (const c of parsedCourses) {
      const key = `${String(c.subject).trim().toLowerCase()}|${String(c.degree).trim()}`;
      if (seenKeys.has(key)) {
        csvDuplicates.push(`${c.subject} (${c.degree})`);
      } else {
        seenKeys.add(key);
        uniqueParsed.push(c);
      }
    }
    
    // Check against existing DB to avoid 400 duplicate errors on import
    showLoadingOverlay('Checking existing courses...');
    const existingCourses = await apiGet('courses');
    const existingKeys = new Set(
      existingCourses.map(ec => `${String(ec.subject).trim().toLowerCase()}|${String(ec.degree).trim()}`)
    );
    const alreadyExisting = [];
    const toImport = [];
    for (const c of uniqueParsed) {
      const key = `${String(c.subject).trim().toLowerCase()}|${String(c.degree).trim()}`;
      if (existingKeys.has(key)) {
        alreadyExisting.push(`${c.subject} (${c.degree})`);
      } else {
        toImport.push(c);
      }
    }
    
    if (toImport.length === 0) {
      hideLoadingOverlay();
      const parts = [];
      if (csvDuplicates.length) parts.push(`${csvDuplicates.length} duplicate(s) within the CSV`);
      if (alreadyExisting.length) parts.push(`${alreadyExisting.length} already exist in the database`);
      const reason = parts.length ? ` (skipped: ${parts.join(', ')})` : '';
      alert(`No new courses to import${reason}.`);
      return;
    }
    
    // Confirm import with summary
    hideLoadingOverlay();
    const summary = [
      `Ready to import ${toImport.length} new course(s).`,
      csvDuplicates.length ? `Skipped ${csvDuplicates.length} duplicate row(s) within CSV.` : '',
      alreadyExisting.length ? `Skipped ${alreadyExisting.length} course(s) that already exist.` : ''
    ].filter(Boolean).join('\n');
    if (!confirm(`${summary}\n\nProceed?`)) {
      return;
    }
    
    // Show loading overlay for import process
    showLoadingOverlay('Importing courses...');
    
    // Import courses
    let successCount = 0;
    let failCount = 0;
    
    for (const course of toImport) {
      try {
        await apiPost('courses', course);
        successCount++;
      } catch (error) {
        console.error('Error importing course:', course, error);
        failCount++;
      }
    }
    
    hideLoadingOverlay();
    
    const results = [`Import completed:`, `${successCount} courses imported successfully`];
    if (failCount) results.push(`${failCount} courses failed to import`);
    if (csvDuplicates.length) results.push(`${csvDuplicates.length} duplicate row(s) within CSV were skipped`);
    if (alreadyExisting.length) results.push(`${alreadyExisting.length} course(s) already existed and were skipped`);
    alert(results.join('\n'));
    
    if (successCount > 0) {
      showLoadingOverlay('Refreshing course table...');
      // Clear all API cache to ensure fresh data is fetched
      clearApiCache(); // Clear all cache
      // Force refresh the courses table with fresh data
      await renderCoursesTable(true); // Pass true to force refresh
      await forceValidateAllComplementary();
      hideLoadingOverlay();
    }
  } catch (error) {
    hideLoadingOverlay();
    console.error('Error during CSV import:', error);
    alert('An error occurred during import. Please try again.');
  }
}

// Function to export courses to CSV
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

// Initialize courses table on page load
renderCoursesTable();

