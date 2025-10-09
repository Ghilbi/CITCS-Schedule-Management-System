/**************************************************************
 * 6) COURSES CRUD with Search, Filter, and Sort
 **************************************************************/
// tableCoursesBody, btnAddCourse, modalCourse, btnSaveCourse, courseSearch, courseFilterDegree, courseSort, btnImportCsv, btnExportCsv, csvFileInput, tableCourseOfferingBody, btnAddCourseOffering, modalCourseOffering, courseOfferingIdInput, courseOfferingCourseSelect are defined in 03-global-variables-for-room-view-columns.js
const courseIdInput = document.getElementById("course-id");
const courseSubjectInput = document.getElementById("course-subject");
const courseUnitsInput = document.getElementById("course-units");
const courseDegreeSelect = document.getElementById("course-degree");
const courseTrimesterSelect = document.getElementById("course-trimester");
const courseCurriculumSelect = document.getElementById("course-curriculum");
const courseDescriptionTextarea = document.getElementById("course-description");
const courseFilterCurriculum = document.getElementById("course-filter-curriculum");

async function renderCoursesTable(forceRefresh = false) {
  let coursesList = await apiGet("courses", forceRefresh);
  const searchTerm = courseSearch.value.toLowerCase();
  const filterYearLevel = courseFilterYearLevel.value;
  const filterDegree = courseFilterDegree.value;
  const filterTrimester = courseFilterTrimester.value;
  const filterCurriculum = courseFilterCurriculum.value;
  const sortValue = courseSort.value;

  if (searchTerm) {
    coursesList = coursesList.filter(c => 
      c.subject.toLowerCase().includes(searchTerm) ||
      c.degree.toLowerCase().includes(searchTerm) ||
      c.trimester.toLowerCase().includes(searchTerm) ||
      (c.curriculum && c.curriculum.toLowerCase().includes(searchTerm)) ||
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

  if (filterCurriculum) {
    coursesList = coursesList.filter(c => c.curriculum === filterCurriculum);
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
      <td>${c.curriculum || (window.ActiveCurriculumManager ? window.ActiveCurriculumManager.getActiveCurriculum() : '2024-2025')}</td>
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
  
  // Use active curriculum as default, with fallbacks
  if (window.ActiveCurriculumManager) {
    const activeCurriculum = window.ActiveCurriculumManager.getActiveCurriculum();
    if (curriculaList.some(c => c.year === activeCurriculum)) {
      courseCurriculumSelect.value = activeCurriculum;
    } else if (curriculaList.length > 0) {
      courseCurriculumSelect.value = curriculaList[0].year;
    } else {
      courseCurriculumSelect.value = "2024-2025";
    }
  } else {
    // Fallback to previous behavior if ActiveCurriculumManager is not available
    const filterCurriculumValue = courseFilterCurriculum.value;
    if (filterCurriculumValue && curriculaList.some(c => c.year === filterCurriculumValue)) {
      courseCurriculumSelect.value = filterCurriculumValue;
    } else if (curriculaList.length > 0) {
      courseCurriculumSelect.value = curriculaList[0].year;
    } else {
      courseCurriculumSelect.value = "2024-2025";
    }
  }
  
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
  const curriculum = courseCurriculumSelect.value;
  const description = courseDescriptionTextarea.value.trim();
  
  if (!subject || !units) {
    alert("Please fill out subject and units.");
    return;
  }
  
  try {
    if (id) {
      await apiPut("courses", id, { subject, unitCategory: unit_category, units, yearLevel: year_level, degree, trimester, curriculum, description });
    } else {
      await apiPost("courses", { subject, unitCategory: unit_category, units, yearLevel: year_level, degree, trimester, curriculum, description });
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
  // Use the course's curriculum if available, otherwise use the first curriculum in the list or default to "2024-2025" as fallback
  if (found.curriculum && curriculaList.some(c => c.year === found.curriculum)) {
    courseCurriculumSelect.value = found.curriculum;
  } else if (curriculaList.length > 0) {
    courseCurriculumSelect.value = curriculaList[0].year;
  } else {
    courseCurriculumSelect.value = "2024-2025";
  }
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
courseFilterCurriculum.addEventListener("change", debounce(renderCoursesTable, 200));
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
    // Curriculum is OPTIONAL in CSV; we'll default to 2024-2025 when missing
    const requiredHeaders = ['subject', 'unit_category', 'units', 'year_level', 'degree', 'trimester'];
    
    // Check if all required headers are present
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
      hideLoadingOverlay();
      alert(`Missing required columns: ${missingHeaders.join(', ')}\nRequired columns: ${requiredHeaders.join(', ')}\nOptional columns: curriculum, description`);
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
      
      // Set default curriculum if not provided
      if (!course.curriculum) {
        course.curriculum = window.ActiveCurriculumManager ? window.ActiveCurriculumManager.getActiveCurriculum() : '2024-2025';
      }
      
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
        curriculum: course.curriculum,
        description: course.description || ''
      });
    }
    
    // If validation errors, report and stop
    hideLoadingOverlay();
    if (errors.length > 0) {
      alert(`Found ${errors.length} error(s):\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? '\n... and more' : ''}`);
      return;
    }
    
    // De-duplicate within CSV by subject+curriculum+degree (case-insensitive on subject)
    const seenKeys = new Set();
    const csvDuplicates = [];
    const uniqueParsed = [];
    for (const c of parsedCourses) {
      const key = `${String(c.subject).trim().toLowerCase()}|${String(c.curriculum || (window.ActiveCurriculumManager ? window.ActiveCurriculumManager.getActiveCurriculum() : '2024-2025'))}|${String(c.degree).trim()}`;
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
      existingCourses.map(ec => `${String(ec.subject).trim().toLowerCase()}|${String(ec.curriculum || (window.ActiveCurriculumManager ? window.ActiveCurriculumManager.getActiveCurriculum() : '2024-2025'))}|${String(ec.degree).trim()}`)
    );
    const alreadyExisting = [];
    const toImport = [];
    for (const c of uniqueParsed) {
      const key = `${String(c.subject).trim().toLowerCase()}|${String(c.curriculum || (window.ActiveCurriculumManager ? window.ActiveCurriculumManager.getActiveCurriculum() : '2024-2025'))}|${String(c.degree).trim()}`;
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
    const headers = ['subject', 'unit_category', 'units', 'year_level', 'degree', 'trimester', 'curriculum', 'description'];
    
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
        course.curriculum || (window.ActiveCurriculumManager ? window.ActiveCurriculumManager.getActiveCurriculum() : '2024-2025'),
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

/**************************************************************
 * CURRICULUM MANAGEMENT FUNCTIONALITY
 **************************************************************/
const btnManageCurriculum = document.getElementById("btn-manage-curriculum");
const modalCurriculumManagement = document.getElementById("modal-curriculum-management");
const modalAddEditCurriculum = document.getElementById("modal-add-edit-curriculum");
const btnAddCurriculum = document.getElementById("btn-add-curriculum");
const btnSaveCurriculum = document.getElementById("btn-save-curriculum");
const btnCancelCurriculum = document.getElementById("btn-cancel-curriculum");
const curriculumTableBody = document.getElementById("curriculum-table-body");
const curriculumYearInput = document.getElementById("curriculum-year");
const curriculumIdInput = document.getElementById("curriculum-id");
const modalCurriculumTitle = document.getElementById("modal-curriculum-title");

// Curriculum data will be loaded from the database
let curriculaList = [];

// Load curricula from database
async function loadCurriculaFromDatabase() {
  try {
    curriculaList = await apiGet("curricula");
  } catch (error) {
    console.error("Error loading curricula:", error);
    alert("Error loading curricula from database.");
  }
}

// Open curriculum management modal
btnManageCurriculum.addEventListener("click", async () => {
  await loadCurriculaFromDatabase();
  renderCurriculaTable();
  modalCurriculumManagement.classList.remove("hidden");
});

// Add new curriculum button
btnAddCurriculum.addEventListener("click", () => {
  modalCurriculumTitle.textContent = "Add Curriculum";
  curriculumYearInput.value = "";
  curriculumIdInput.value = "";
  modalAddEditCurriculum.classList.remove("hidden");
});

// Save curriculum
btnSaveCurriculum.addEventListener("click", async () => {
  const year = curriculumYearInput.value.trim();
  const id = curriculumIdInput.value;
  
  if (!year) {
    alert("Please enter a curriculum year.");
    return;
  }
  
  // Check for duplicate curriculum year
  const existingCurriculum = curriculaList.find(c => c.year === year && c.id != id);
  if (existingCurriculum) {
    alert("This curriculum year already exists.");
    return;
  }
  
  try {
    if (id) {
      // Edit existing curriculum
      await apiPut("curricula", id, { year });
    } else {
      // Add new curriculum
      await apiPost("curricula", { year });
    }
    
    // Reload curricula from database
    await loadCurriculaFromDatabase();
    
    // Clear cache to ensure fresh data
    clearApiCache('curricula');
    
    // Update curriculum dropdowns
    updateCurriculumDropdowns();
    
    // Close modal and refresh table
    modalAddEditCurriculum.classList.add("hidden");
    renderCurriculaTable();
  } catch (error) {
    console.error("Error saving curriculum:", error);
    alert("Error saving curriculum to database.");
  }
});

// Cancel curriculum editing
btnCancelCurriculum.addEventListener("click", () => {
  modalAddEditCurriculum.classList.add("hidden");
});

// Render curricula table
function renderCurriculaTable() {
  curriculumTableBody.innerHTML = "";
  
  curriculaList.forEach(curriculum => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${curriculum.year}</td>
      <td>
        <button class="action-edit-btn" onclick="editCurriculum(${curriculum.id})">Edit</button>
        <button class="action-delete-btn" onclick="deleteCurriculum(${curriculum.id})">Delete</button>
      </td>
    `;
    curriculumTableBody.appendChild(row);
  });
}

// Edit curriculum
window.editCurriculum = function(id) {
  const curriculum = curriculaList.find(c => c.id == id);
  if (curriculum) {
    modalCurriculumTitle.textContent = "Edit Curriculum";
    curriculumYearInput.value = curriculum.year;
    curriculumIdInput.value = curriculum.id;
    modalAddEditCurriculum.classList.remove("hidden");
  }
};

// Delete curriculum
window.deleteCurriculum = async function(id) {
  const curriculum = curriculaList.find(c => c.id == id);
  if (curriculum && confirm(`Are you sure you want to delete curriculum "${curriculum.year}"?`)) {
    try {
      await apiDelete("curricula", id);
      
      // Reload curricula from database
      await loadCurriculaFromDatabase();
      
      // Clear cache to ensure fresh data
      clearApiCache('curricula');
      
      // Update curriculum dropdowns
      updateCurriculumDropdowns();
      renderCurriculaTable();
    } catch (error) {
      console.error("Error deleting curriculum:", error);
      alert("Error deleting curriculum from database.");
    }
  }
};

// Update all curriculum dropdowns in the application
function updateCurriculumDropdowns() {
  const dropdowns = [courseCurriculumSelect, courseFilterCurriculum];
  
  dropdowns.forEach(dropdown => {
    if (dropdown) {
      const currentValue = dropdown.value;
      dropdown.innerHTML = "";
      
      curriculaList.forEach(curriculum => {
        const option = document.createElement("option");
        option.value = curriculum.year;
        option.textContent = curriculum.year;
        dropdown.appendChild(option);
      });
      
      // Restore previous selection if it still exists, otherwise use active curriculum
      if (curriculaList.find(c => c.year === currentValue)) {
        dropdown.value = currentValue;
      } else if (window.ActiveCurriculumManager) {
        const activeCurriculum = window.ActiveCurriculumManager.getActiveCurriculum();
        if (curriculaList.find(c => c.year === activeCurriculum)) {
          dropdown.value = activeCurriculum;
        }
      }
    }
  });
  
  // Update the active curriculum manager with the new curricula list
  if (window.ActiveCurriculumManager) {
    window.ActiveCurriculumManager.updateCurriculaList(curriculaList);
  }
}

// Initialize curricula on page load
async function initializeCurricula() {
  await loadCurriculaFromDatabase();
  updateCurriculumDropdowns();
  
  // Set filter to active curriculum if available
  if (window.ActiveCurriculumManager && courseFilterCurriculum) {
    const activeCurriculum = window.ActiveCurriculumManager.getActiveCurriculum();
    if (curriculaList.some(c => c.year === activeCurriculum)) {
      courseFilterCurriculum.value = activeCurriculum;
    }
  }
  
  // Render table with active curriculum filter
  await renderCoursesTable();
}

// Call initialization when the page loads
initializeCurricula();

// Listen for active curriculum changes and update filter
if (window.ActiveCurriculumManager) {
  window.ActiveCurriculumManager.addActiveCurriculumChangeListener((newActiveCurriculum) => {
    if (courseFilterCurriculum && curriculaList.some(c => c.year === newActiveCurriculum)) {
      courseFilterCurriculum.value = newActiveCurriculum;
      renderCoursesTable(); // Refresh the table with new filter
    }
  });
}

