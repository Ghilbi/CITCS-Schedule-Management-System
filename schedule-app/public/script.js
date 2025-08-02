/**************************************************************
 * API wrapper functions for backend calls
 **************************************************************/
// Utility: debounce to limit frequent calls on inputs
function debounce(func, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
}

// Parse section input supporting both ranges (A-D) and comma-separated values (A,B,C)
function parseSectionInput(input) {
  if (!input || !input.trim()) {
    return [];
  }
  
  const sections = [];
  const parts = input.split(',').map(part => part.trim()).filter(part => part);
  
  for (const part of parts) {
    // Check if it's a range (e.g., A-D, a-d)
    const rangeMatch = part.match(/^([a-zA-Z])\s*-\s*([a-zA-Z])$/);
    if (rangeMatch) {
      const start = rangeMatch[1].toUpperCase();
      const end = rangeMatch[2].toUpperCase();
      const startCode = start.charCodeAt(0);
      const endCode = end.charCodeAt(0);
      
      if (startCode <= endCode) {
        // Generate range from start to end
        for (let i = startCode; i <= endCode; i++) {
          sections.push(String.fromCharCode(i));
        }
      } else {
        // Invalid range, treat as individual letters
        sections.push(start, end);
      }
    } else {
      // Single letter or invalid format, add as-is (converted to uppercase)
      sections.push(part.toUpperCase());
    }
  }
  
  // Remove duplicates and return
  return [...new Set(sections)];
}

async function apiGet(table) {
  const response = await fetch(`/api/${table}`, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  return response.json();
}

// Performance: cache GET calls to avoid redundant network requests
const apiCache = {};
const originalApiGet = apiGet;
apiGet = async (table) => {
  if (!apiCache[table]) {
    apiCache[table] = await originalApiGet(table);
  }
  return apiCache[table];
};
const clearApiCache = (table) => {
  delete apiCache[table];
};

async function apiPost(table, data) {
  try {
    const response = await fetch(`/api/${table}`, {
      method: 'POST',
      headers: addAuthHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}) for POST to ${table}:`, errorText);
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error(`Failed to POST to ${table}:`, error, data);
    throw error;
  }
}

// Clear cache on POST/PUT/DELETE to keep data consistent
const originalApiPost = apiPost;
apiPost = async (table, data) => {
  clearApiCache(table);
  return originalApiPost(table, data);
};

async function apiPut(table, id, data) {
  const response = await fetch(`/api/${table}/${id}`, {
    method: 'PUT',
    headers: addAuthHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  return response.json();
}

// Clear cache on POST/PUT/DELETE to keep data consistent
const originalApiPut = apiPut;
apiPut = async (table, id, data) => {
  clearApiCache(table);
  return originalApiPut(table, id, data);
};

async function apiDelete(table, id) {
  const response = await fetch(`/api/${table}/${id}`, {
    method: 'DELETE',
    headers: addAuthHeader()
  });
  return response.json();
}

// Clear cache on POST/PUT/DELETE to keep data consistent
const originalApiDelete = apiDelete;
apiDelete = async (table, id) => {
  clearApiCache(table);
  return originalApiDelete(table, id);
};

/**************************************************************
 * Global variables for Room View columns
 **************************************************************/
const predefinedRooms = [
  "M301", "M303", "M304", "M305", "M306", "M307", 
  "S311", "S312", "U405", "U406", "U705", "U706"
];

async function getAllRoomColumns() {
  const rooms = await apiGet("rooms");
  const roomNames = rooms.map(room => room.name);
  const allRooms = [...new Set([...predefinedRooms, ...roomNames])];
  const doubled = [];
  allRooms.forEach(room => {
    doubled.push(`${room} A`);
    doubled.push(`${room} B`);
  });
  return doubled;
}

/**************************************************************
 * Navigation
 **************************************************************/
const sectionCourses = document.getElementById("section-courses");
const sectionCourseOffering = document.getElementById("section-course-offering");
const sectionRoomView = document.getElementById("section-room-view");
const sectionSectionView = document.getElementById("section-section-view");

// Add fade animation helper
function applyFadeAnimation(element) {
  element.classList.add("fade-in");
  element.addEventListener("animationend", () => element.classList.remove("fade-in"), { once: true });
}

function hideAllSections() {
  // remove fade-in from all sections
  document.querySelectorAll("[id^='section-']").forEach(sec => sec.classList.remove("fade-in"));
  document.getElementById("section-courses").classList.add("hidden");
  document.getElementById("section-course-offering").classList.add("hidden");
  document.getElementById("section-section-view").classList.add("hidden");
  document.getElementById("section-room-view").classList.add("hidden");
  document.getElementById("section-schedule-summary").classList.add("hidden");
}

function showSection(section) {
  hideAllSections();
  const secEl = document.getElementById(`section-${section}`);
  secEl.classList.remove("hidden");
  applyFadeAnimation(secEl);
  
  // Update active button in navigation
  document.querySelectorAll("nav button").forEach(btn => btn.classList.remove("active"));
  document.getElementById(`btn-${section}`).classList.add("active");
  
  // Additional actions for specific sections
  if (section === "courses") {
    renderCoursesTable();
  } else if (section === "course-offering") {
    renderCourseOfferingTable();
  }
}

// After the apiCache helper, add auth helpers
let authToken = localStorage.getItem('authToken') || null;

function isLoggedIn() {
  return !!authToken;
}

function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
}

async function loginRequest(username, password) {
  const resp = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!resp.ok) {
    throw new Error('Invalid credentials');
  }
  const data = await resp.json();
  setAuthToken(data.token);
}

function addAuthHeader(headers = {}) {
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

// Navigation: replace inline listener for btn-courses with auth-check helper
function openCoursesSection() {
  if (!isLoggedIn()) {
    showModal(document.getElementById('modal-login'));
    return;
  }
  hideAllSections();
  sectionCourses.classList.remove('hidden');
  applyFadeAnimation(sectionCourses);
  // Set active navigation button
  document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
  document.getElementById('btn-courses').classList.add('active');
  renderCoursesTable();
}

// Update navigation event bindings
document.getElementById('btn-courses').addEventListener('click', openCoursesSection);

document.getElementById("btn-course-offering").addEventListener("click", async () => {
  hideAllSections();
  sectionCourseOffering.classList.remove("hidden");
  applyFadeAnimation(sectionCourseOffering);
  
  // Update active button in navigation
  document.querySelectorAll("nav button").forEach(btn => btn.classList.remove("active"));
  document.getElementById("btn-course-offering").classList.add("active");
  
  await renderCourseOfferingTable();
  setupTrimesterTabs();
});
// New Event Listener for Section View
document.getElementById("btn-section-view").addEventListener("click", async () => {
  hideAllSections();
  sectionSectionView.classList.remove("hidden");
  applyFadeAnimation(sectionSectionView);
  
  // Update active button in navigation
  document.querySelectorAll("nav button").forEach(btn => btn.classList.remove("active"));
  document.getElementById("btn-section-view").classList.add("active");
  
  // Preserve currentSectionViewTrimester and yearLevel
  setupSectionViewTrimesterTabs();
  await renderSectionViewTables();
  await validateAllComplementary();
});
document.getElementById("btn-room-view").addEventListener("click", async () => {
  hideAllSections();
  sectionRoomView.classList.remove("hidden");
  applyFadeAnimation(sectionRoomView);
  
  // Update active button in navigation
  document.querySelectorAll("nav button").forEach(btn => btn.classList.remove("active"));
  document.getElementById("btn-room-view").classList.add("active");
  
  setupRoomViewTrimesterTabs();
  await renderRoomViewTables();
  await validateAllComplementary();
});

document.getElementById("btn-schedule-summary").addEventListener("click", async () => {
  hideAllSections();
  const sectionScheduleSummary = document.getElementById("section-schedule-summary");
  sectionScheduleSummary.classList.remove("hidden");
  applyFadeAnimation(sectionScheduleSummary);
  
  // Update active button in navigation
  document.querySelectorAll("nav button").forEach(btn => btn.classList.remove("active"));
  document.getElementById("btn-schedule-summary").classList.add("active");
  
  await initializeScheduleSummarySection();
});

/**************************************************************
 * (FACULTY SECTION REMOVED)
 **************************************************************/

/**************************************************************
 * 6) COURSES CRUD with Search, Filter, and Sort
 **************************************************************/
const tableCoursesBody = document.querySelector("#table-courses tbody");
const btnAddCourse = document.getElementById("btn-add-course");
const modalCourse = document.getElementById("modal-course");
const courseIdInput = document.getElementById("course-id");
const courseSubjectInput = document.getElementById("course-subject");
const courseUnitsInput = document.getElementById("course-units");
const courseDegreeSelect = document.getElementById("course-degree");
const courseTrimesterSelect = document.getElementById("course-trimester");
const courseDescriptionTextarea = document.getElementById("course-description");
const btnSaveCourse = document.getElementById("btn-save-course");
const courseSearch = document.getElementById("course-search");
const courseFilterDegree = document.getElementById("course-filter-degree");
const courseSort = document.getElementById("course-sort");

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
        <button class="table-edit-btn" onclick="editCourse(${c.id})">Edit</button>
        <button class="table-delete-btn" onclick="deleteCourse(${c.id})">Delete</button>
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
  const unitCategory = unitCategoryElement ? unitCategoryElement.value : "PureLec"; // Default to PureLec if none selected
  const yearLevel = yearLevelElement ? yearLevelElement.value : "1st yr"; // Default to 1st yr if none selected
  const degree = courseDegreeSelect.value;
  const trimester = courseTrimesterSelect.value;
  const description = courseDescriptionTextarea.value.trim();
  
  if (!subject || !units) {
    alert("Please fill out subject and units.");
    return;
  }
  
  if (id) {
    await apiPut("courses", id, { subject, unitCategory, units, yearLevel, degree, trimester, description });
  } else {
    await apiPost("courses", { subject, unitCategory, units, yearLevel, degree, trimester, description });
  }
  
  hideModal(modalCourse);
  await renderCoursesTable();
  await validateAllComplementary();
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
  await renderCoursesTable();
  await validateAllComplementary();
};

// Debounced controls for Courses
courseSearch.addEventListener("input", debounce(renderCoursesTable, 200));
courseFilterDegree.addEventListener("change", debounce(renderCoursesTable, 200));
courseSort.addEventListener("change", debounce(renderCoursesTable, 200));

/**************************************************************
 * 7) COURSE OFFERING CRUD with Search, Filter, Sort, and Trimester Tabs
 **************************************************************/
const tableCourseOfferingBody = document.querySelector("#table-courseOffering tbody");
const btnAddCourseOffering = document.getElementById("btn-add-courseOffering");
const modalCourseOffering = document.getElementById("modal-course-offering");
const courseOfferingIdInput = document.getElementById("courseOffering-id");
const courseOfferingCourseSelect = document.getElementById("courseOffering-course");
const courseOfferingSectionInput = document.getElementById("courseOffering-section");
const courseOfferingUnitsInput = document.getElementById("courseOffering-units");
const courseOfferingTrimesterInput = document.getElementById("courseOffering-trimester");
const btnSaveCourseOffering = document.getElementById("btn-save-courseOffering");
const offeringSearch = document.getElementById("offering-search");
const offeringFilterType = document.getElementById("offering-filter-type");
const offeringSort = document.getElementById("offering-sort");

// New section input elements
const courseOfferingYearSelect = document.getElementById("courseOffering-year");
const courseOfferingSectionLetter = document.getElementById("courseOffering-section-letter");
const sectionCodePreview = document.getElementById("section-code-preview");
const courseOfferingSectionLetters = document.getElementById("courseOffering-section-letters");
const bulkSectionCodePreview = document.getElementById("bulk-section-code-preview");
const courseOfferingMultipleSections = document.getElementById("courseOffering-multiple-sections");

const courseOfferingLecRadio = document.getElementById("courseOffering-lec");
const courseOfferingLabRadio = document.getElementById("courseOffering-lab");
const courseOfferingPurelecRadio = document.getElementById("courseOffering-purelec");
const labelLec = document.getElementById("label-lec");
const labelLab = document.getElementById("label-lab");
const labelPurelec = document.getElementById("label-purelec");

let currentTrimesterFilter = "all";

// Function to update the section code preview for manual entry
async function updateSectionCodePreview() {
  const year = courseOfferingYearSelect.value;
  const sectionLetter = courseOfferingSectionLetter.value.toUpperCase();
  const sectionCode = year + sectionLetter;
  
  sectionCodePreview.textContent = sectionCode;
  courseOfferingSectionInput.value = sectionCode;
  
  // Check for duplicates if we're in the modal
  if (document.getElementById("modal-course-offering").classList.contains("hidden") === false) {
    // Get the current trimester from the selected course
    const selectedOption = courseOfferingCourseSelect.options[courseOfferingCourseSelect.selectedIndex];
    if (selectedOption) {
      const trimester = selectedOption.getAttribute("data-trimester");
      const courseId = courseOfferingCourseSelect.value;
      
      // Only run the check if we have enough information
      if (trimester && sectionCode.length > 1) {
        const id = courseOfferingIdInput.value || null;
        const duplicateCheck = await checkDuplicateSection(sectionCode, trimester, courseId, id);
        
        // Remove any existing warning first
        const existingWarning = document.querySelector('.duplicate-warning');
        if (existingWarning) {
          existingWarning.remove();
        }
        
        if (duplicateCheck.isDuplicate) {
          // Show a warning that doesn't prevent editing
          const warningEl = document.createElement('div');
          warningEl.className = 'duplicate-warning';
          warningEl.textContent = 'Warning: ' + duplicateCheck.message;
          warningEl.style.color = '#ff6600';
          warningEl.style.fontSize = '0.9rem';
          warningEl.style.marginTop = '8px';
          
          // Add the warning below the section preview
          const previewEl = document.getElementById('section-code-preview');
          if (previewEl && previewEl.parentNode) {
            previewEl.parentNode.appendChild(warningEl);
          }
        }
      }
    }
  }
}

// Function to update the bulk section codes preview
async function updateBulkSectionCodePreview() {
  const selectedYearRadio = document.querySelector('input[name="bulkAddYearLevel"]:checked');
  const selectedYearLevel = selectedYearRadio ? selectedYearRadio.value : "1st yr"; // Default to 1st yr if none selected
  let yearPrefix = "1"; // Default to 1 if no year level is selected
  
  // Map the year level to the appropriate number prefix
  if (selectedYearLevel === "2nd yr") {
    yearPrefix = "2";
  } else if (selectedYearLevel === "3rd yr") {
    yearPrefix = "3";
  }
  
  const sectionLetters = parseSectionInput(courseOfferingSectionLetters.value);
  const sectionCodes = sectionLetters.map(letter => yearPrefix + letter);
  
  bulkSectionCodePreview.textContent = sectionCodes.join(', ');
  courseOfferingMultipleSections.value = sectionCodes.join(',');
  
  // Check for duplicates if we're in the modal
  if (document.getElementById("modal-course-offering").classList.contains("hidden") === false) {
    // Get the current trimester from the radio buttons
    const trimesterRadio = document.querySelector('input[name="bulkAddTrimester"]:checked');
    const selectedTrimester = trimesterRadio ? trimesterRadio.value : "1st Trimester";
    
    // Only run checks if we have section codes
    if (sectionCodes.length > 0 && selectedTrimester) {
      // Remove any existing bulk warnings
      const existingWarnings = document.querySelectorAll('.bulk-duplicate-warning');
      existingWarnings.forEach(warning => warning.remove());
      
      // Create a container for duplicate warnings
      const warningsContainer = document.createElement('div');
      warningsContainer.className = 'bulk-duplicate-warning';
      warningsContainer.style.marginTop = '12px';
      
      let hasDuplicates = false;
      
      // Check each section code
      for (const sectionCode of sectionCodes) {
        const duplicateCheck = await checkDuplicateSection(sectionCode, selectedTrimester);
        if (duplicateCheck.isDuplicate) {
          hasDuplicates = true;
          const warningEl = document.createElement('div');
          warningEl.textContent = 'Warning: ' + duplicateCheck.message;
          warningEl.style.margin = '3px 0';
          warningsContainer.appendChild(warningEl);
        }
      }
      
      if (hasDuplicates) {
        // Style the container
        warningsContainer.className = 'duplicate-warning bulk-duplicate-warning';
        
        // Add the warnings below the bulk preview
        const previewEl = document.getElementById('bulk-section-code-preview');
        if (previewEl && previewEl.parentNode) {
          previewEl.parentNode.appendChild(warningsContainer);
        }
      }
    }
  }
}

// Add event listeners to update the section code preview when year or letter changes
courseOfferingYearSelect.addEventListener('change', function() {
  updateSectionCodePreview().catch(error => console.error("Error checking for duplicates:", error));
});
courseOfferingSectionLetter.addEventListener('input', function() {
  updateSectionCodePreview().catch(error => console.error("Error checking for duplicates:", error));
});

// Add event listener for the section letters in bulk mode
courseOfferingSectionLetters.addEventListener('input', function() {
  updateBulkSectionCodePreview().catch(error => console.error("Error checking for bulk duplicates:", error));
});

// Add event listeners for year level radio buttons in bulk mode
document.querySelectorAll('input[name="bulkAddYearLevel"]').forEach(radio => {
  radio.addEventListener('change', function() {
    updateBulkSectionCodePreview().catch(error => console.error("Error checking for bulk duplicates:", error));
  });
});

// Add event listeners for trimester radio buttons to check for duplicates when trimester changes
document.querySelectorAll('input[name="bulkAddTrimester"]').forEach(radio => {
  radio.addEventListener('change', function() {
    updateBulkSectionCodePreview().catch(error => console.error("Error checking for bulk duplicates:", error));
  });
});

function setupTrimesterTabs() {
  const tabs = document.querySelectorAll("#section-course-offering .trimester-tabs .tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentTrimesterFilter = tab.getAttribute("data-trimester");
      renderCourseOfferingTable();
    });
  });
}

async function populateCourseOfferingCourses() {
  let coursesList = await apiGet("courses");
  
  // Get the selected degree filter value - use the manual tab's degree filter
  const degreeFilter = document.getElementById("courseOffering-degree").value;
  
  // Filter by trimester if needed
  if (currentTrimesterFilter !== "all") {
    coursesList = coursesList.filter(c => c.trimester === currentTrimesterFilter);
  }
  
  // Filter by degree if selected
  if (degreeFilter) {
    coursesList = coursesList.filter(c => c.degree === degreeFilter);
  }
  
  // Build the HTML string once before setting innerHTML
  let optionsHTML = `<option value="">-- Select Course --</option>`;
  
  coursesList.forEach(c => {
    optionsHTML += `<option value="${c.id}" data-unit-category="${c.unit_category}" data-trimester="${c.trimester}">${c.subject} (${c.unit_category}) - ${c.trimester}</option>`;
  });
  
  // Set innerHTML once
  courseOfferingCourseSelect.innerHTML = optionsHTML;
}

// Add event listeners for both degree dropdowns
document.getElementById("courseOffering-degree").addEventListener("change", async function() {
  // Update course list based on degree filter
  await populateCourseOfferingCourses();
  
  // Apply year restrictions based on selected degree
  const selectedDegree = this.value;
  
  // Reset all years to enabled state first
  courseOfferingYearSelect.querySelectorAll('option').forEach(option => {
    option.disabled = false;
  });
  
  // Apply restrictions based on degree
  if (selectedDegree === "BSIT") {
    // For BSIT, only 1st year (value="1") is available
    document.querySelectorAll('#courseOffering-year option[value="2"], #courseOffering-year option[value="3"]').forEach(option => {
      option.disabled = true;
    });
    courseOfferingYearSelect.value = "1";
  } 
  else if (selectedDegree === "BSIT(Webtech)" || selectedDegree === "BSIT(NetSec)" || selectedDegree === "BSIT(ERP)") {
    // For specialization tracks, 1st year is not available
    document.querySelector('#courseOffering-year option[value="1"]').disabled = true;
    
    // If current selection is 1st year, change to 2nd year
    if (courseOfferingYearSelect.value === "1") {
      courseOfferingYearSelect.value = "2";
    }
  }
  
  // Update the section code preview
  await updateSectionCodePreview();
});
// We don't need to add functionality to the bulk degree dropdown as it's only used on the button click

// Add event listener to control year level options based on selected degree in bulk add
document.getElementById("courseOffering-degree-bulk").addEventListener("change", function() {
  const selectedDegree = this.value;
  
  // Get all year level radio buttons
  const yearAll = document.getElementById("year-all");
  const year1st = document.getElementById("year-1st-bulk");
  const year2nd = document.getElementById("year-2nd-bulk");
  const year3rd = document.getElementById("year-3rd-bulk");
  
  // Reset all to enabled state
  year1st.disabled = false;
  year2nd.disabled = false;
  year3rd.disabled = false;
  year1st.parentElement.style.opacity = 1;
  year2nd.parentElement.style.opacity = 1;
  year3rd.parentElement.style.opacity = 1;
  
  // Apply restrictions based on degree
  if (selectedDegree === "BSIT") {
    // For BSIT, only 1st year is selectable
    year1st.disabled = false;
    year2nd.disabled = true;
    year3rd.disabled = true;
    year2nd.parentElement.style.opacity = 0.5;
    year3rd.parentElement.style.opacity = 0.5;
    
    // Select 1st year by default
    year1st.checked = true;
    yearAll.checked = false;
  } 
  else if (selectedDegree === "BSIT(Webtech)" || selectedDegree === "BSIT(NetSec)" || selectedDegree === "BSIT(ERP)") {
    // For specialization tracks, 1st year is not selectable
    year1st.disabled = true;
    year2nd.disabled = false;
    year3rd.disabled = false;
    year1st.parentElement.style.opacity = 0.5;
    
    // If 1st year was selected, change to "All Years"
    if (year1st.checked) {
      yearAll.checked = true;
    }
  }
});

// Function to initialize course offering modal tabs
function initCourseOfferingTabs() {
  const tabButtons = document.querySelectorAll('.modal-tab-btn');
  const tabContents = document.querySelectorAll('.modal-tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      tabButtons.forEach(btn => btn.classList.remove('active'));
      // Add active class to clicked button
      button.classList.add('active');
      
      // Hide all tab contents
      tabContents.forEach(content => content.style.display = 'none');
      
      // Show the selected tab content
      const tabName = button.getAttribute('data-tab');
      document.getElementById(`${tabName}-add-section`).style.display = 'block';
      
      // Show/hide save button appropriately
      if (tabName === 'manual') {
        document.getElementById('btn-save-courseOffering').style.display = 'block';
      } else {
        document.getElementById('btn-save-courseOffering').style.display = 'none';
      }
    });
  });
}

// Set up handlers for year level radio buttons to update the section code prefix
document.querySelectorAll('input[name="bulkAddYearLevel"]').forEach(radio => {
  radio.addEventListener('change', () => {
    // Update the bulk section preview when year level changes
    updateBulkSectionCodePreview();
  });
});

/**************************************************************
 * Loading Overlay Functions
 **************************************************************/
function showLoadingOverlay(message = 'Processing...') {
  const overlay = document.querySelector('.loading-overlay');
  const messageElement = overlay.querySelector('.loading-message');
  messageElement.textContent = message;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent scrolling while loading
}

function hideLoadingOverlay() {
  const overlay = document.querySelector('.loading-overlay');
  overlay.classList.remove('active');
  document.body.style.overflow = ''; // Restore scrolling
}

// Modified btn-add-all-courses event listener to use loading overlay
document.getElementById("btn-add-all-courses").addEventListener("click", async function() {
  const selectedDegree = document.getElementById("courseOffering-degree-bulk").value;
  const yearLevelRadio = document.querySelector('input[name="bulkAddYearLevel"]:checked');
  const trimesterRadio = document.querySelector('input[name="bulkAddTrimester"]:checked');
  const selectedYearLevel = yearLevelRadio ? yearLevelRadio.value : "1st yr"; // Default to 1st yr if none selected
  const selectedTrimesterBulk = trimesterRadio ? trimesterRadio.value : "1st Trimester"; // Default to 1st Trimester if none selected
  
  // Validate year level selections based on degree
  if (selectedDegree === "BSIT" && selectedYearLevel && selectedYearLevel !== "1st yr") {
    alert("For BSIT, only 1st year courses can be selected.");
    return;
  } else if ((selectedDegree === "BSIT(Webtech)" || selectedDegree === "BSIT(NetSec)" || selectedDegree === "BSIT(ERP)") 
            && selectedYearLevel === "1st yr") {
    alert("For " + selectedDegree + ", 1st year courses cannot be selected.");
    return;
  }
  
  if (!selectedDegree) {
    alert("Please select a degree first.");
    return;
  }
  
  // Get the sections text and parse it
  const sectionsInput = document.getElementById("courseOffering-multiple-sections").value.trim();
  if (!sectionsInput) {
    alert("Please enter at least one section.");
    return;
  }
  
  // Parse sections with support for ranges (e.g., A-D) and comma-separated values
  const sections = parseSectionInput(sectionsInput);
  
  if (sections.length === 0) {
    alert("Please enter at least one valid section.");
    return;
  }
  
  // Check for duplicate sections across all degrees
  const duplicateSections = [];
  for (const section of sections) {
    const duplicateCheck = await checkDuplicateSection(section, selectedTrimesterBulk);
    if (duplicateCheck.isDuplicate) {
      duplicateSections.push(`${section}: ${duplicateCheck.message}`);
    }
  }
  
  if (duplicateSections.length > 0) {
    showConflictNotification("Duplicate sections detected:\n" + duplicateSections.join("\n"));
    return;
  }
  
  // Build confirmation message
  let confirmMessage = `This will add ALL courses for the ${selectedDegree} degree`;
  if (selectedYearLevel) {
    confirmMessage += ` in ${selectedYearLevel}`;
  }
  confirmMessage += ` with ${sections.length} section(s): ${sections.join(', ')}. Continue?`;
  
  // Get confirmation from the user
  if (!confirm(confirmMessage)) {
    return;
  }
  
  try {
    // Show loading overlay
    showLoadingOverlay(`Adding ${selectedDegree} courses for ${sections.join(', ')}...`);
    
    // Get all courses and filter by selected degree and chosen trimester
    let courses = await apiGet("courses");
    courses = courses.filter(course =>
      course.degree === selectedDegree &&
      (!selectedTrimesterBulk || course.trimester === selectedTrimesterBulk)
    );
    
    // Apply year level filter if one is selected
    if (selectedYearLevel) {
      courses = courses.filter(course => course.year_level === selectedYearLevel);
    }
    
    if (courses.length === 0) {
      hideLoadingOverlay();
      let message = `No courses found for ${selectedDegree}`;
      if (selectedYearLevel) {
        message += ` in ${selectedYearLevel}`;
      }
      message += ` in the current trimester filter.`;
      alert(message);
      return;
    }
    
    // Count how many courses will be added
    let addedCount = 0;
    
    // Add each course as a course offering for each section
    for (const course of courses) {
      for (const section of sections) {
        // Determine units based on course subject
        let purelecUnits = "3";
        let lecUnits = "2";
        let labUnits = "1";
        
        if (course.subject && course.subject.includes("PATHFIT")) {
          purelecUnits = "2";
          lecUnits = "2";
          labUnits = "2";
        } else if (course.subject && course.subject.includes("Calculus")) {
          purelecUnits = "5";
          lecUnits = "5";
          labUnits = "5";
        }
        
        if (course.unit_category === "PureLec") {
          await apiPost("course_offerings", {
            courseId: course.id,
            section: section,
            type: "PureLec",
            units: purelecUnits,
            trimester: course.trimester,
            degree: course.degree
          });
          addedCount++;
        } else if (course.unit_category === "Lec/Lab") {
          // Add lecture part
          await apiPost("course_offerings", {
            courseId: course.id,
            section: section,
            type: "Lec",
            units: lecUnits,
            trimester: course.trimester,
            degree: course.degree
          });
          
          // Add lab part
          await apiPost("course_offerings", {
            courseId: course.id,
            section: section,
            type: "Lab",
            units: labUnits,
            trimester: course.trimester,
            degree: course.degree
          });
          addedCount += 2; // Counting both Lec and Lab
        }
      }
    }
    
    // Close the modal and refresh the table
    hideModal(modalCourseOffering);
    await renderCourseOfferingTable();
    
    // Hide loading overlay
    hideLoadingOverlay();
  } catch (error) {
    console.error("Error adding all courses:", error);
    hideLoadingOverlay();
    alert("An error occurred while adding all courses. Please try again.");
  }
});

// Add a helper function to check for duplicate sections before the btnSaveCourseOffering handler
// Function to check if a section already exists in course offerings
async function checkDuplicateSection(section, trimester, courseId = null, id = null) {
  const offerings = await apiGet("course_offerings");
  const courses = await apiGet("courses");
  
  // Filter offerings for the given section and trimester
  const duplicates = offerings.filter(off => {
    // Skip comparing with the current offering if we're editing
    if (id && off.id == id) return false;
    
    // Skip comparing the same course if courseId is provided
    if (courseId && off.courseId == courseId) return false;
    
    // Check if this offering has the same section and trimester
    return off.section === section && off.trimester === trimester;
  });
  
  if (duplicates.length > 0) {
    // Find details about the duplicate for better error messages
    const duplicate = duplicates[0];
    const course = courses.find(c => c.id === duplicate.courseId);
    const degree = duplicate.degree || (course ? course.degree : "Unknown");
    return {
      isDuplicate: true,
      message: `Duplicate section: "${section}" is already used for ${course ? course.subject : 'Unknown'} (${degree}) in ${trimester}`
    };
  }
  
  return { isDuplicate: false };
}

// Updated btnAddCourseOffering click handler
btnAddCourseOffering.addEventListener("click", async () => {
  courseOfferingIdInput.value = "";
  courseOfferingCourseSelect.value = "";
  courseOfferingSectionInput.value = "";
  
  // Reset section input fields
  courseOfferingYearSelect.value = "1"; // Default to First Year
  courseOfferingSectionLetter.value = "A"; // Default to A
  await updateSectionCodePreview(); // Update the preview
  
  document.getElementById("courseOffering-degree").value = ""; // Reset degree filter
  document.getElementById("courseOffering-degree-bulk").value = ""; // Reset bulk degree filter
  document.querySelector('input[id="year-all"]').checked = true; // Reset year level to "All Years"
  
  // Reset all year options to enabled state
  courseOfferingYearSelect.querySelectorAll('option').forEach(option => {
    option.disabled = false;
  });
  
  // Reset bulk section inputs
  courseOfferingSectionLetters.value = "A"; // Default to A
  updateBulkSectionCodePreview(); // Update the bulk preview
  
  labelLec.style.display = "none";
  labelLab.style.display = "none";
  labelPurelec.style.display = "none";
  courseOfferingUnitsInput.value = "";
  courseOfferingTrimesterInput.value = "";
  document.getElementById("modal-course-offering-title").textContent = "Add Course Offering";
  
  // Reset year level radio buttons to enabled state
  const year1st = document.getElementById("year-1st-bulk");
  const year2nd = document.getElementById("year-2nd-bulk");
  const year3rd = document.getElementById("year-3rd-bulk");
  year1st.disabled = false;
  year2nd.disabled = false;
  year3rd.disabled = false;
  year1st.parentElement.style.opacity = 1;
  year2nd.parentElement.style.opacity = 1;
  year3rd.parentElement.style.opacity = 1;
  
  // Reset tabs to show manual tab by default
  const tabButtons = document.querySelectorAll('.modal-tab-btn');
  const tabContents = document.querySelectorAll('.modal-tab-content');
  
  tabButtons.forEach(btn => btn.classList.remove('active'));
  document.querySelector('.modal-tab-btn[data-tab="manual"]').classList.add('active');
  
  tabContents.forEach(content => content.style.display = 'none');
  document.getElementById('manual-add-section').style.display = 'block';
  document.getElementById('btn-save-courseOffering').style.display = 'block';
  
  // Remove any existing warning
  const existingWarning = document.querySelector('.duplicate-warning');
  if (existingWarning) {
    existingWarning.remove();
  }
  
  await populateCourseOfferingCourses();
  showModal(modalCourseOffering);
});

// Add event listener for the course select dropdown to capture degree
courseOfferingCourseSelect.addEventListener("change", async function() {
  const selectedOption = courseOfferingCourseSelect.options[courseOfferingCourseSelect.selectedIndex];
  const unitCategory = selectedOption.getAttribute("data-unit-category");
  const trimester = selectedOption.getAttribute("data-trimester");
  
  // Get course to retrieve degree
  if (courseOfferingCourseSelect.value) {
    const courses = await apiGet("courses");
    const selectedCourse = courses.find(c => c.id == courseOfferingCourseSelect.value);
    if (selectedCourse) {
      document.getElementById("courseOffering-selected-degree").value = selectedCourse.degree;
      
      // Auto-set units for PATHFIT and Calculus subjects
      if (selectedCourse.subject && selectedCourse.subject.includes("PATHFIT")) {
        courseOfferingUnitsInput.value = "2";
      } else if (selectedCourse.subject && selectedCourse.subject.includes("Calculus")) {
        courseOfferingUnitsInput.value = "5";
      } else {
        // Apply the original unit logic for other subjects
        if (unitCategory === "PureLec") {
          courseOfferingUnitsInput.value = "3";
        } else if (unitCategory === "Lec/Lab") {
          const checkedRadio = document.querySelector('input[name="courseOfferingType"]:checked');
          if (checkedRadio && checkedRadio.value === "Lec") {
            courseOfferingUnitsInput.value = "2";
          } else if (checkedRadio && checkedRadio.value === "Lab") {
            courseOfferingUnitsInput.value = "1";
          }
        }
      }
    }
  }
  
  labelLec.style.display = "none";
  labelLab.style.display = "none";
  labelPurelec.style.display = "none";
  if (unitCategory === "PureLec") {
    labelPurelec.style.display = "inline-block";
    courseOfferingPurelecRadio.checked = true;
    if (!courseOfferingUnitsInput.value.includes("PATHFIT") && !courseOfferingUnitsInput.value.includes("Calculus")) {
      courseOfferingUnitsInput.value = "3";
    }
  } else if (unitCategory === "Lec/Lab") {
    labelLec.style.display = "inline-block";
    labelLab.style.display = "inline-block";
    courseOfferingLecRadio.checked = true;
    if (!courseOfferingUnitsInput.value.includes("PATHFIT") && !courseOfferingUnitsInput.value.includes("Calculus")) {
      courseOfferingUnitsInput.value = "2";
    }
  }
  courseOfferingTrimesterInput.value = trimester || "";
});

document.querySelectorAll('input[name="courseOfferingType"]').forEach(radio => {
  radio.addEventListener("change", function() {
    const checkedRadio = document.querySelector('input[name="courseOfferingType"]:checked');
    if (!checkedRadio) return; // Exit if no radio is checked
    const type = checkedRadio.value;
    
    // Get current selected course
    const selectedOption = courseOfferingCourseSelect.options[courseOfferingCourseSelect.selectedIndex];
    if (selectedOption && selectedOption.value) {
      const courseId = selectedOption.getAttribute("data-course-id");
      
      // Check if this is a PATHFIT or Calculus course
      apiGet("courses").then(courses => {
        const selectedCourse = courses.find(c => c.id == courseId);
        if (selectedCourse) {
          if (selectedCourse.subject && selectedCourse.subject.includes("PATHFIT")) {
            courseOfferingUnitsInput.value = "2";
            return;
          } else if (selectedCourse.subject && selectedCourse.subject.includes("Calculus")) {
            courseOfferingUnitsInput.value = "5";
            return;
          }
        }
        
        // Default behavior for other courses
        if (type === "Lec") {
          courseOfferingUnitsInput.value = "2";
        } else if (type === "Lab") {
          courseOfferingUnitsInput.value = "1";
        } else if (type === "PureLec") {
          courseOfferingUnitsInput.value = "3";
        }
      });
    } else {
      // Default behavior if no course is selected
      if (type === "Lec") {
        courseOfferingUnitsInput.value = "2";
      } else if (type === "Lab") {
        courseOfferingUnitsInput.value = "1";
      } else if (type === "PureLec") {
        courseOfferingUnitsInput.value = "3";
      }
    }
  });
});

// Note: Removed duplicate btnAddCourseOffering event listener that was causing performance issues

async function renderCourseOfferingTable() {
  const offerings = await apiGet("course_offerings");
  let coursesList = await apiGet("courses");
  const searchTerm = offeringSearch.value.toLowerCase();
  const filterType = offeringFilterType.value;
  const sortValue = offeringSort.value;

  let filteredOfferings = offerings;

  if (currentTrimesterFilter !== "all") {
    filteredOfferings = filteredOfferings.filter(off => {
      const course = coursesList.find(c => c.id == off.courseId);
      return course && course.trimester === currentTrimesterFilter;
    });
  }

  if (searchTerm) {
    filteredOfferings = filteredOfferings.filter(off => {
      const course = coursesList.find(c => c.id == off.courseId);
      const courseDisplay = course ? course.subject : off.courseId;
      const degree = course ? course.degree : (off.degree || "");
      return (
        courseDisplay.toLowerCase().includes(searchTerm) ||
        off.section.toLowerCase().includes(searchTerm) ||
        off.trimester.toLowerCase().includes(searchTerm) ||
        degree.toLowerCase().includes(searchTerm)
      );
    });
  }

  if (filterType) {
    filteredOfferings = filteredOfferings.filter(off => off.type === filterType);
  }

  if (sortValue) {
    const [field, direction] = sortValue.split('-');
    filteredOfferings.sort((a, b) => {
      const courseA = coursesList.find(c => c.id == a.courseId);
      const courseB = coursesList.find(c => c.id == b.courseId);
      if (field === 'course') {
        const nameA = courseA ? courseA.subject : a.courseId;
        const nameB = courseB ? courseB.subject : b.courseId;
        return direction === 'asc' 
          ? nameA.localeCompare(nameB) 
          : nameB.localeCompare(nameA);
      } else if (field === 'section') {
        return direction === 'asc' 
          ? a.section.localeCompare(b.section) 
          : b.section.localeCompare(a.section);
      }
    });
  }

  // Group offerings by year and degree
  const categorizedOfferings = {};

  filteredOfferings.forEach(off => {
    const course = coursesList.find(c => c.id == off.courseId);
    const degree = off.degree || (course ? course.degree : "Unknown");
    const yearPrefix = off.section ? off.section.charAt(0) : "?";
    const yearLabel = 
      yearPrefix === "1" ? "1st Year" :
      yearPrefix === "2" ? "2nd Year" :
      yearPrefix === "3" ? "3rd Year" : "Other";
    
    const categoryKey = `${yearLabel} - ${degree}`;
    
    if (!categorizedOfferings[categoryKey]) {
      categorizedOfferings[categoryKey] = [];
    }
    
    categorizedOfferings[categoryKey].push(off);
  });

  // Clear the existing table
  const tableContainer = document.getElementById('section-course-offering');
  const originalTable = document.getElementById('table-courseOffering');
  
  // Find the container for the categorizer
  let categorizerContainer = document.querySelector('.offering-categorizer');
  
  // If no categorizer exists yet, create one
  if (!categorizerContainer) {
    categorizerContainer = document.createElement('div');
    categorizerContainer.className = 'offering-categorizer';
    
    // Insert the categorizer container before the original table
    tableContainer.insertBefore(categorizerContainer, originalTable);
    
    // Hide the original table
    originalTable.style.display = 'none';
  } else {
    // Clear existing categories
    categorizerContainer.innerHTML = '';
  }

  // Sort category keys for consistent display
  const sortedCategoryKeys = Object.keys(categorizedOfferings).sort();

  // Generate category groups
  sortedCategoryKeys.forEach(categoryKey => {
    const offerings = categorizedOfferings[categoryKey];
    
    // Create category group
    const categoryGroup = document.createElement('div');
    categoryGroup.className = 'category-group';
    
    // Create header
    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'category-header';
    categoryHeader.innerHTML = `
      <span>${categoryKey}</span>
      <span class="category-count">${offerings.length}</span>
    `;
    
    // Create content container
    const categoryContent = document.createElement('div');
    categoryContent.className = 'category-content';
    
    // Further group by section
    const sectionGroups = {};
    offerings.forEach(off => {
      const section = off.section || 'Unassigned';
      
      if (!sectionGroups[section]) {
        sectionGroups[section] = [];
      }
      
      sectionGroups[section].push(off);
    });
    
    // Sort sections alphabetically
    const sortedSections = Object.keys(sectionGroups).sort();
    
    // Create section category for each section
    sortedSections.forEach(section => {
      const sectionOfferings = sectionGroups[section];
      
      // Create section category group
      const sectionCategoryGroup = document.createElement('div');
      sectionCategoryGroup.className = 'section-category-group';
      
      // Create section header
      const sectionCategoryHeader = document.createElement('div');
      sectionCategoryHeader.className = 'section-category-header';
      sectionCategoryHeader.innerHTML = `
        <span>Section: ${section}</span>
        <span class="section-category-count">${sectionOfferings.length}</span>
      `;
      
      // Create section content container
      const sectionCategoryContent = document.createElement('div');
      sectionCategoryContent.className = 'section-category-content';
      
      // Create section table wrapper
      const sectionTableWrapper = document.createElement('div');
      sectionTableWrapper.className = 'section-category-table-wrapper';
      
      // Create table for this section
      const sectionTable = document.createElement('table');
      sectionTable.className = 'course-offering-table';
      sectionTable.innerHTML = `
        <thead>
          <tr>
            <th>ID</th>
            <th>Course</th>
            <th>Section</th>
            <th>Type</th>
            <th>Units</th>
            <th>Trimester</th>
            <th>Degree</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      
      const sectionTbody = sectionTable.querySelector('tbody');
      
      // Add offerings to this section
      sectionOfferings.forEach(off => {
        const course = coursesList.find(c => c.id == off.courseId);
        const courseDisplay = course ? course.subject : off.courseId;
        const trimester = course ? course.trimester : off.trimester;
        const degree = off.degree || (course ? course.degree : "");
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${off.id}</td>
          <td>${courseDisplay}</td>
          <td>${off.section}</td>
          <td>${off.type}</td>
          <td>${off.units}</td>
          <td>${trimester}</td>
          <td>${degree}</td>
          <td>
            <button class="table-edit-btn" onclick="editCourseOffering(${off.id})">Edit</button>
            <button class="table-delete-btn" onclick="deleteCourseOffering(${off.id})">Delete</button>
          </td>
        `;
        sectionTbody.appendChild(tr);
      });
      
      sectionTableWrapper.appendChild(sectionTable);
      sectionCategoryContent.appendChild(sectionTableWrapper);
      
      // Add event listener to toggle section
      sectionCategoryHeader.addEventListener('click', (e) => {
        // Prevent triggering parent category toggle
        e.stopPropagation();
        
        // Toggle active state for this header
        sectionCategoryHeader.classList.toggle('active');
        
        // Toggle open state for this content
        sectionCategoryContent.classList.toggle('open');
      });
      
      // Add to section category group
      sectionCategoryGroup.appendChild(sectionCategoryHeader);
      sectionCategoryGroup.appendChild(sectionCategoryContent);
      
      // Add to parent category content
      categoryContent.appendChild(sectionCategoryGroup);
    });
    
    // Add event listener to toggle category
    categoryHeader.addEventListener('click', () => {
      // Toggle active state for this header
      categoryHeader.classList.toggle('active');
      
      // Toggle open state for this content
      categoryContent.classList.toggle('open');
    });
    
    // Add to category group
    categoryGroup.appendChild(categoryHeader);
    categoryGroup.appendChild(categoryContent);
    
    // Add to container
    categorizerContainer.appendChild(categoryGroup);
  });
  
  // If no categories, show a message
  if (sortedCategoryKeys.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.textContent = 'No course offerings match your current filters.';
    emptyMessage.style.textAlign = 'center';
    emptyMessage.style.padding = '20px';
    emptyMessage.style.color = '#666';
    categorizerContainer.appendChild(emptyMessage);
  }
  
  // All categories will start closed by default
  // User will need to click on them to open
}

btnSaveCourseOffering.addEventListener("click", async () => {
  const id = courseOfferingIdInput.value;
  const courseId = courseOfferingCourseSelect.value;
  const section = courseOfferingSectionInput.value.trim();
  const selectedOption = courseOfferingCourseSelect.options[courseOfferingCourseSelect.selectedIndex];
  const unitCategory = selectedOption ? selectedOption.getAttribute("data-unit-category") : "";
  const trimester = selectedOption ? selectedOption.getAttribute("data-trimester") : "";
  const degree = document.getElementById("courseOffering-selected-degree").value;
  const checkedRadio = document.querySelector('input[name="courseOfferingType"]:checked');
  const type = checkedRadio ? checkedRadio.value : "";
  let units = courseOfferingUnitsInput.value;
  
  if (!courseId || !section || !type) {
    alert("Please fill out all fields.");
    return;
  }
  
  // Check for duplicate section
  const duplicateCheck = await checkDuplicateSection(section, trimester, courseId, id);
  if (duplicateCheck.isDuplicate) {
    showConflictNotification(duplicateCheck.message);
    return;
  }
  
  // Validate section based on degree
  if (section && section.length >= 2) {
    const yearDigit = section.charAt(0);
    
    // For BSIT, only first year sections (starting with 1) are allowed
    if (degree === "BSIT" && yearDigit !== "1") {
      alert("For BSIT, only sections starting with '1' (first year) are allowed.");
      return;
    }
    
    // For specializations, first year sections (starting with 1) are not allowed
    if ((degree === "BSIT(Webtech)" || degree === "BSIT(NetSec)" || degree === "BSIT(ERP)") && yearDigit === "1") {
      alert("For " + degree + ", sections starting with '1' (first year) are not allowed.");
      return;
    }
  }
  
  // Get course to confirm PATHFIT or Calculus
  const courses = await apiGet("courses");
  const selectedCourse = courses.find(c => c.id == courseId);
  
  // Ensure correct units for PATHFIT and Calculus courses
  if (selectedCourse) {
    if (selectedCourse.subject && selectedCourse.subject.includes("PATHFIT")) {
      units = "2";
    } else if (selectedCourse.subject && selectedCourse.subject.includes("Calculus")) {
      units = "5";
    }
  }
  
  if (!id && unitCategory === "Lec/Lab") {
    // For new Lec/Lab courses, create both Lec and Lab entries
    const lecUnits = selectedCourse && selectedCourse.subject.includes("PATHFIT") ? "2" : 
                     selectedCourse && selectedCourse.subject.includes("Calculus") ? "5" : "2";
    const labUnits = selectedCourse && selectedCourse.subject.includes("PATHFIT") ? "2" : 
                     selectedCourse && selectedCourse.subject.includes("Calculus") ? "5" : "1";
                     
    await apiPost("course_offerings", { courseId, section, type: "Lec", units: lecUnits, trimester, degree });
    await apiPost("course_offerings", { courseId, section, type: "Lab", units: labUnits, trimester, degree });
  } else {
    if (id) {
      await apiPut("course_offerings", id, { courseId, section, type, units, trimester, degree });
    } else {
      await apiPost("course_offerings", { courseId, section, type, units, trimester, degree });
    }
  }
  hideModal(modalCourseOffering);
  await renderCourseOfferingTable();
  await validateAllComplementary();
});

window.editCourseOffering = async function(id) {
  const offerings = await apiGet("course_offerings");
  const courses = await apiGet("courses");
  const offering = offerings.find(off => off.id == id);
  if (!offering) return;
  
  // Reset the degree filter when editing
  document.getElementById("courseOffering-degree").value = "";
  // Reset year level to "All Years"
  document.querySelector('input[id="year-all"]').checked = true;
  
  courseOfferingIdInput.value = offering.id;
  await populateCourseOfferingCourses();
  courseOfferingCourseSelect.value = offering.courseId;
  
  // Set the degree from the offering or get it from the associated course
  let currentDegree = "";
  if (offering.degree) {
    currentDegree = offering.degree;
    document.getElementById("courseOffering-selected-degree").value = offering.degree;
  } else {
    const associatedCourse = courses.find(c => c.id == offering.courseId);
    if (associatedCourse) {
      currentDegree = associatedCourse.degree;
      document.getElementById("courseOffering-selected-degree").value = associatedCourse.degree;
    }
  }
  
  // Reset all years to enabled state first
  courseOfferingYearSelect.querySelectorAll('option').forEach(option => {
    option.disabled = false;
  });
  
  // Apply restrictions based on degree
  if (currentDegree === "BSIT") {
    // For BSIT, only 1st year (value="1") is available
    document.querySelectorAll('#courseOffering-year option[value="2"], #courseOffering-year option[value="3"]').forEach(option => {
      option.disabled = true;
    });
  } 
  else if (currentDegree === "BSIT(Webtech)" || currentDegree === "BSIT(NetSec)" || currentDegree === "BSIT(ERP)") {
    // For specialization tracks, 1st year is not available
    document.querySelector('#courseOffering-year option[value="1"]').disabled = true;
  }
  
  const event = new Event('change');
  courseOfferingCourseSelect.dispatchEvent(event);
  
  // Set the section value in hidden field
  courseOfferingSectionInput.value = offering.section;
  
  // Parse the section code to extract year and letter
  if (offering.section) {
    const yearDigit = offering.section.charAt(0);
    const sectionLetter = offering.section.substring(1);
    
    // Set the year select and section letter input
    courseOfferingYearSelect.value = yearDigit;
    courseOfferingSectionLetter.value = sectionLetter;
    
    // Update the preview
    updateSectionCodePreview();
    
    // Check if this section is used in other offerings for the same trimester
    const duplicateCheck = await checkDuplicateSection(offering.section, offering.trimester, offering.courseId, offering.id);
    if (duplicateCheck.isDuplicate) {
      // Show a non-blocking warning that doesn't prevent editing
      const warningEl = document.createElement('div');
      warningEl.className = 'duplicate-warning';
      warningEl.textContent = 'Note: ' + duplicateCheck.message;
      warningEl.style.color = '#ff6600';
      warningEl.style.fontSize = '0.9rem';
      warningEl.style.marginTop = '8px';
      
      // Remove any existing warning first
      const existingWarning = document.querySelector('.duplicate-warning');
      if (existingWarning) {
        existingWarning.remove();
      }
      
      // Add the warning below the section preview
      const previewEl = document.getElementById('section-code-preview');
      if (previewEl && previewEl.parentNode) {
        previewEl.parentNode.appendChild(warningEl);
      }
    }
  }
  
  if (offering.type === "Lec") {
    courseOfferingLecRadio.checked = true;
  } else if (offering.type === "Lab") {
    courseOfferingLabRadio.checked = true;
  } else if (offering.type === "PureLec") {
    courseOfferingPurelecRadio.checked = true;
  }
  courseOfferingUnitsInput.value = offering.units;
  courseOfferingTrimesterInput.value = offering.trimester;
  document.getElementById("modal-course-offering-title").textContent = "Edit Course Offering";
  
  // Make sure we're showing the manual tab since we're editing a single offering
  const tabButtons = document.querySelectorAll('.modal-tab-btn');
  const tabContents = document.querySelectorAll('.modal-tab-content');
  
  tabButtons.forEach(btn => btn.classList.remove('active'));
  document.querySelector('.modal-tab-btn[data-tab="manual"]').classList.add('active');
  
  tabContents.forEach(content => content.style.display = 'none');
  document.getElementById('manual-add-section').style.display = 'block';
  document.getElementById('btn-save-courseOffering').style.display = 'block';
  
  showModal(modalCourseOffering);
}

window.deleteCourseOffering = async function(id) {
  if (!confirm("Are you sure?")) return;
  await apiDelete("course_offerings", id);
  await renderCourseOfferingTable();
  await validateAllComplementary();
};

// Debounced controls for Course Offerings
offeringSearch.addEventListener("input", debounce(renderCourseOfferingTable, 200));
offeringFilterType.addEventListener("change", debounce(renderCourseOfferingTable, 200));
offeringSort.addEventListener("change", debounce(renderCourseOfferingTable, 200));

/**************************************************************
 * ROOM VIEW: Trimester Tabs, Headers, and Tables
 **************************************************************/
let currentRoomViewTrimester = "1st Trimester";
let currentRoomViewYearLevel = "1st yr";

// Schedule Summary Section Variables
let currentScheduleSummaryTrimester = "1st Trimester";
let currentScheduleSummaryYearLevel = "1st yr";

function setupRoomViewTrimesterTabs() {
  // Clone all tabs to remove existing event listeners
  const tabs = document.querySelectorAll("#section-room-view .trimester-tabs .tab-btn");
  tabs.forEach(tab => {
    const newTab = tab.cloneNode(true);
    tab.parentNode.replaceChild(newTab, tab);
  });
  
  // Get fresh references to tabs
  const freshTabs = document.querySelectorAll("#section-room-view .trimester-tabs .tab-btn");
  freshTabs.forEach(tab => {
    tab.addEventListener("click", async () => {
      freshTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentRoomViewTrimester = tab.getAttribute("data-trimester");
      await renderRoomViewTables();
      await validateAllComplementary();
    });
  });
  
  // Clone all year tabs to remove existing event listeners
  const yearTabs = document.querySelectorAll("#section-room-view .year-level-tabs .year-tab-btn");
  yearTabs.forEach(tab => {
    const newTab = tab.cloneNode(true);
    tab.parentNode.replaceChild(newTab, tab);
  });
  
  // Get fresh references to year tabs
  const freshYearTabs = document.querySelectorAll("#section-room-view .year-level-tabs .year-tab-btn");
  freshYearTabs.forEach(tab => {
    tab.addEventListener("click", async () => {
      freshYearTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentRoomViewYearLevel = tab.getAttribute("data-year");
      await renderRoomViewTables();
      await validateAllComplementary();
    });
  });

  // Schedule summary button is now handled in the main navigation section

  // Ensure only one tab is active by default
  const activeTab = document.querySelector(`#section-room-view .trimester-tabs .tab-btn[data-trimester="${currentRoomViewTrimester}"]`);
  if (activeTab) {
    freshTabs.forEach(t => t.classList.remove("active"));
    activeTab.classList.add("active");
  }
  
  const activeYearTab = document.querySelector(`#section-room-view .year-level-tabs .year-tab-btn[data-year="${currentRoomViewYearLevel}"]`);
  if (activeYearTab) {
    freshYearTabs.forEach(t => t.classList.remove("active"));
    activeYearTab.classList.add("active");
  }
}

async function renderRoomViewTables() {
  const columns = await getAllRoomColumns();
  const times = [
    "7:30 - 8:50", "8:50 - 10:10", "10:10 - 11:30", "11:30 - 12:50",
    "12:50 - 2:10", "2:10 - 3:30", "3:30 - 4:50", "4:50 - 6:10", "6:10 - 7:30"
  ];
  const rooms = await apiGet("rooms");
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");

  // Create MWF table first, then TTHS table
  const dayTypes = ["MWF", "TTHS"];
  for (const dayType of dayTypes) {
    const thead = document.getElementById(
      dayType === "MWF" ? "room-view-mwf-thead" : "room-view-tths-thead"
    );
    const tbody = document.getElementById(
      dayType === "MWF" ? "room-view-mwf-tbody" : "room-view-tths-tbody"
    );
    
    // Build Header
    thead.innerHTML = "";
    const headerRow = document.createElement("tr");
    const timeTh = document.createElement("th");
    timeTh.textContent = "Time";
    headerRow.appendChild(timeTh);
    columns.forEach((roomName) => {
      const baseRoomName = roomName.replace(/ (A|B)$/, '');
      const th = document.createElement("th");
      const input = document.createElement("input");
      input.type = "text";
      input.classList.add("extra-column-input");
      input.value = baseRoomName;
      input.disabled = true;
      th.appendChild(input);
      const abSpan = document.createElement("div");
      abSpan.textContent = roomName.endsWith(" A") ? "A" : "B";
      abSpan.style.fontSize = "0.8em";
      th.appendChild(abSpan);
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Build Table Body
    tbody.innerHTML = "";
    const filteredSchedules = schedules.filter(sch => {
      const course = courses.find(c => c.id === sch.courseId);
      return course && 
             course.trimester === currentRoomViewTrimester && 
             course.year_level === currentRoomViewYearLevel &&
             sch.dayType === dayType &&
             sch.col > 0; // Only show Room View entries (col > 0)
    });

    for (let time of times) {
      const tr = document.createElement("tr");
      const timeTd = document.createElement("td");
      timeTd.textContent = time;
      tr.appendChild(timeTd);
      
      for (const [index, roomName] of columns.entries()) {
        const baseRoomName = roomName.replace(/ (A|B)$/, '');
        const td = document.createElement("td");
        td.classList.add("clickable-cell");
        td.setAttribute("data-dayType", dayType);
        td.setAttribute("data-time", time);
        td.setAttribute("data-col", index + 1);
        td.addEventListener("click", () => openRoomViewModal(dayType, time, roomName, index + 1));
        
        const room = rooms.find(r => r.name === baseRoomName);
        let schedule = filteredSchedules.find(sch =>
          sch.dayType === dayType &&
          sch.time === time &&
          sch.col === index + 1
        );

        if (schedule) {
          const course = courses.find(c => c.id === schedule.courseId);
          const sections = [schedule.section, schedule.section2].filter(s => s).join(", ");
          td.textContent = course ? `${course.subject} - ${sections} - Type: ${schedule.unitType}` : "No Course";
          td.style.backgroundColor = schedule.color || "#e9f1fb";
        } else {
          td.textContent = "";
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }
}

/**************************************************************
 * ROOM VIEW Modal: Open, populate, and save with trimester filter
 **************************************************************/
const modalRoomView = document.getElementById("modal-roomview");

async function openRoomViewModal(dayType, time, roomName, col) {
  // Clear any existing notifications
  clearConflictNotification();
  
  let roomsList = await apiGet("rooms");
  const baseRoomName = roomName.replace(/ (A|B)$/, '');
  const room = roomsList.find(r => r.name === baseRoomName);
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");
  let existing = schedules.find(sch =>
    sch.dayType === dayType &&
    sch.time === time &&
    sch.col === col &&
    courses.find(c => c.id === sch.courseId)?.trimester === currentRoomViewTrimester &&
    courses.find(c => c.id === sch.courseId)?.year_level === currentRoomViewYearLevel
  );

  document.getElementById("roomview-dayType").value = dayType;
  document.getElementById("roomview-time").value = time;
  document.getElementById("roomview-col").value = col;
  document.getElementById("roomview-roomId").value = room ? room.id : "";
  if (existing) {
    document.getElementById("roomview-id").value = existing.id;
    document.getElementById("btn-delete-roomview").style.display = "block";
  } else {
    document.getElementById("roomview-id").value = "";
    document.getElementById("btn-delete-roomview").style.display = "none";
  }
  await populateRoomViewCourseDropdown();
  if (existing) {
    const offerings = await apiGet("course_offerings");
    const matchingOffering = offerings.find(off => 
      off.courseId === existing.courseId && 
      off.type === existing.unitType &&
      courses.find(c => c.id === off.courseId)?.trimester === currentRoomViewTrimester
    );
    if (matchingOffering) {
      document.getElementById("roomview-course").value = matchingOffering.id;
      await populateRoomViewSectionDropdown();
      document.getElementById("roomview-section").value = existing.section || "";
      document.getElementById("roomview-section2").value = existing.section2 || "";
    }
  } else {
    document.getElementById("roomview-course").value = "";
    document.getElementById("roomview-section").innerHTML = `<option value="">-- Select Section --</option>`;
    document.getElementById("roomview-section2").innerHTML = `<option value="">-- Select Section --</option>`;
  }
  showModal(modalRoomView);
}

document.getElementById("roomview-course").addEventListener("change", function() {
  populateRoomViewSectionDropdown();
});

async function populateRoomViewCourseDropdown() {
  const roomviewCourseSelect = document.getElementById("roomview-course");
  const dayType = document.getElementById("roomview-dayType").value;
  const time = document.getElementById("roomview-time").value;
  
  roomviewCourseSelect.innerHTML = `<option value="">-- Select Course Offering --</option>`;
  
  // Get all schedules from Section View (col=0) for the current time and day
  const schedules = await apiGet("schedules");
  const offerings = await apiGet("course_offerings");
  const courses = await apiGet("courses");
  
  // Find all section view schedules that match the current day, time, trimester, and year level
  const sectionViewSchedules = schedules.filter(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    return sch.col === 0 && // Section View entries
           sch.dayType === dayType &&
           sch.time === time &&
           course &&
           course.trimester === currentRoomViewTrimester &&
           course.year_level === currentRoomViewYearLevel;
  });
  
  if (sectionViewSchedules.length === 0) {
    // No subjects are scheduled for this time in Section View
    return;
  }
  
  // Create a unique list of course offerings from these schedules
  const uniqueOfferings = [];
  const seenCombinations = new Set();
  
  sectionViewSchedules.forEach(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    if (!course) return;
    
    const matchingOfferings = offerings.filter(off => 
      off.courseId === sch.courseId && 
      off.type === sch.unitType &&
      off.trimester === currentRoomViewTrimester
    );
    
    matchingOfferings.forEach(off => {
      const combination = `${course.subject}-${off.trimester}-${off.type}`;
      if (!seenCombinations.has(combination)) {
        seenCombinations.add(combination);
        uniqueOfferings.push(off);
    }
    });
  });

  // Add the offerings to the dropdown
  uniqueOfferings.forEach(off => {
    const course = courses.find(c => c.id === off.courseId);
    if (course) {
      const displayText = `${course.subject} - ${off.trimester} - ${off.type}`;
      roomviewCourseSelect.innerHTML += `<option value="${off.id}" data-course-id="${off.courseId}" data-unit-type="${off.type}">${displayText}</option>`;
    }
  });
}

async function populateRoomViewSectionDropdown() {
  const roomviewSectionSelect = document.getElementById("roomview-section");
  const roomviewSection2Select = document.getElementById("roomview-section2");
  roomviewSectionSelect.innerHTML = `<option value="">-- Select Section --</option>`;
  roomviewSection2Select.innerHTML = `<option value="">-- Select Section --</option>`;
  
  const courseOfferingId = document.getElementById("roomview-course").value;
  if (!courseOfferingId) return;
  
  const dayType = document.getElementById("roomview-dayType").value;
  const time = document.getElementById("roomview-time").value;
  
  const offerings = await apiGet("course_offerings");
  const courses = await apiGet("courses");
  const schedules = await apiGet("schedules");
  
  const selectedOffering = offerings.find(off => off.id == courseOfferingId);
  if (!selectedOffering) return;
  
  // Find schedules from Section View for this course and type at this time
  const sectionViewSchedules = schedules.filter(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    return sch.col === 0 && // Section View entries
           sch.dayType === dayType &&
           sch.time === time &&
           sch.courseId === selectedOffering.courseId &&
           sch.unitType === selectedOffering.type &&
           course &&
           course.trimester === currentRoomViewTrimester &&
           course.year_level === currentRoomViewYearLevel;
  });
  
  // Get all sections from these schedules
  const availableSections = new Set();
  
  sectionViewSchedules.forEach(sch => {
    if (sch.section) {
      availableSections.add(sch.section);
    }
    if (sch.section2) {
      availableSections.add(sch.section2);
    }
  });
  
  // Add the sections to the dropdowns
  [...availableSections].forEach(sec => {
      roomviewSectionSelect.innerHTML += `<option value="${sec}">${sec}</option>`;
      roomviewSection2Select.innerHTML += `<option value="${sec}">${sec}</option>`;
    });
}

document.getElementById("btn-save-roomview").addEventListener("click", async () => {
  const roomviewCourseSelect = document.getElementById("roomview-course");
  const roomviewSectionSelect = document.getElementById("roomview-section");
  const roomviewSection2Select = document.getElementById("roomview-section2");
  const courseOfferingId = roomviewCourseSelect.value;
  const section = roomviewSectionSelect.value;
  const section2 = roomviewSection2Select.value || null;

  if (!courseOfferingId || !section) {
    showConflictNotification("Please select a course offering and at least one section before saving.");
    return;
  }

  if (section === section2 && section2) {
    showConflictNotification("Section 1 and Section 2 cannot be the same.");
    return;
  }

  const offerings = await apiGet("course_offerings");
  const selectedOffering = offerings.find(off => off.id == courseOfferingId);
  if (!selectedOffering) {
    showConflictNotification("Invalid course offering selected.");
    return;
  }

  const courseId = selectedOffering.courseId;
  const unitType = selectedOffering.type;

  const dayType = document.getElementById("roomview-dayType").value;
  const time = document.getElementById("roomview-time").value;
  const col = document.getElementById("roomview-col").value;
  const roomId = document.getElementById("roomview-roomId").value;

  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");
  const rooms = await apiGet("rooms");
  const allColumns = await getAllRoomColumns();
  const existingId = document.getElementById("roomview-id").value;

  // Verify that this section is actually scheduled in the Section View for this time
  const sectionsToCheck = [section, section2].filter(s => s);
  const sectionScheduled = schedules.some(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    return sch.col === 0 && // Section View entries
           sch.dayType === dayType &&
           sch.time === time &&
      sch.courseId === courseId &&
           sch.unitType === unitType &&
           (sch.section === section || sch.section2 === section ||
            (section2 && (sch.section === section2 || sch.section2 === section2))) &&
           course &&
           course.trimester === currentRoomViewTrimester &&
           course.year_level === currentRoomViewYearLevel;
  });

  if (!sectionScheduled) {
    showConflictNotification("This course and section is not scheduled in the Section View for this time slot. Please schedule it in Section View first.");
    return;
  }

  // Check for subjects in different year levels
  const currentCourse = courses.find(c => c.id === courseId);
  if (!currentCourse || currentCourse.year_level !== currentRoomViewYearLevel) {
    showConflictNotification(`Year level mismatch: This course (${currentCourse?.subject || 'Unknown'}) is for ${currentCourse?.year_level || 'unknown'} year level, but you're currently in ${currentRoomViewYearLevel} view.`);
    return;
  }

  // Rest of the original validation code
  for (const sec of sectionsToCheck) {
    const existingSubjectSectionUnitType = schedules.find(sch => {
      const schCourse = courses.find(c => c.id === sch.courseId);
      return sch.courseId === courseId &&
      (sch.section === sec || sch.section2 === sec) &&
      sch.unitType === unitType &&
        schCourse && schCourse.trimester === currentRoomViewTrimester &&
        schCourse.year_level === currentRoomViewYearLevel &&
        sch.col > 0 && // Only check against Room View entries
        sch.id.toString() !== existingId;
    });
    
    if (existingSubjectSectionUnitType) {
      const course = courses.find(c => c.id === courseId);
      const subjectName = course ? course.subject : "Unknown Subject";
      const room = rooms.find(r => r.id === existingSubjectSectionUnitType.roomId);
      const baseRoomName = room ? room.name : "Unassigned";
      const colIndex = existingSubjectSectionUnitType.col - 1;
      const fullRoomName = colIndex >= 0 && colIndex < allColumns.length 
        ? allColumns[colIndex] 
        : `${baseRoomName} (Unknown Group)`;
      const group = fullRoomName.endsWith(" A") ? "Group A" : fullRoomName.endsWith(" B") ? "Group B" : "Unknown Group";
      showConflictNotification(
        `Duplicate detected (${currentRoomViewYearLevel}): ${subjectName} - (${sec}) - ${unitType} is already scheduled in ${currentRoomViewTrimester}.\n` +
        `Details: Days: ${existingSubjectSectionUnitType.dayType}, Room: ${fullRoomName}, Group: ${group}, Time: ${existingSubjectSectionUnitType.time}`
      );
      return;
    }
  }

  const existingTimeRoomConflict = schedules.find(sch => {
    const schCourse = courses.find(c => c.id === sch.courseId);
    return sch.dayType === dayType &&
    sch.time === time &&
    sch.col === parseInt(col, 10) &&
      schCourse && schCourse.trimester === currentRoomViewTrimester &&
      schCourse.year_level === currentRoomViewYearLevel &&
      sch.col > 0 && // Only check against Room View entries 
      sch.id.toString() !== existingId;
  });

  if (existingTimeRoomConflict) {
    const conflictCourse = courses.find(c => c.id === existingTimeRoomConflict.courseId);
    if (conflictCourse) {
      const colIndex = existingTimeRoomConflict.col - 1;
      const roomName = colIndex >= 0 && colIndex < allColumns.length ? allColumns[colIndex] : "Unknown Room";
    showConflictNotification(
        `Room ${roomName} at ${dayType} ${time} already has ${conflictCourse.subject} scheduled.\n` +
        `Please choose a different room, day, or time.`
    );
    return;
    }
  }

  // NEW: Check if this room is occupied in any year level (not just the current one)
  const crossYearRoomConflict = schedules.find(sch => {
    const schCourse = courses.find(c => c.id === sch.courseId);
    return sch.dayType === dayType &&
      sch.time === time &&
      sch.col === parseInt(col, 10) &&
      schCourse && 
      schCourse.trimester === currentRoomViewTrimester &&
      schCourse.year_level !== currentRoomViewYearLevel && // Different year level
      sch.col > 0 && // Only check against Room View entries 
      sch.id.toString() !== existingId;
  });

  if (crossYearRoomConflict) {
    const conflictCourse = courses.find(c => c.id === crossYearRoomConflict.courseId);
    if (conflictCourse) {
      const colIndex = crossYearRoomConflict.col - 1;
      const roomName = colIndex >= 0 && colIndex < allColumns.length ? allColumns[colIndex] : "Unknown Room";
      showConflictNotification(
        `Cross-year conflict: Room ${roomName} at ${dayType} ${time} is already occupied in ${conflictCourse.year_level}.\n` +
        `Subject: ${conflictCourse.subject}, Trimester: ${currentRoomViewTrimester}.\n` +
        `Please choose a different room, day, or time.`
      );
      return;
    }
  }

  // NEW: Check if the same subject is already assigned to any room (by subject name)
  const currentCourseSubject = currentCourse?.subject;
  if (currentCourseSubject) {
    const sameSubjectAssignedInOtherYearLevel = schedules.find(sch => {
      const schCourse = courses.find(c => c.id === sch.courseId);
      return sch.dayType === dayType &&
        sch.time === time &&
        schCourse && 
        schCourse.subject === currentCourseSubject &&
        schCourse.trimester === currentRoomViewTrimester &&
        schCourse.year_level !== currentRoomViewYearLevel && // Different year level
        sch.col > 0 && // Only check against Room View entries
        sch.col !== parseInt(col, 10) && // Different room
        sch.id.toString() !== existingId;
    });

    if (sameSubjectAssignedInOtherYearLevel) {
      const conflictCourse = courses.find(c => c.id === sameSubjectAssignedInOtherYearLevel.courseId);
      if (conflictCourse) {
        const colIndex = sameSubjectAssignedInOtherYearLevel.col - 1;
        const otherRoomName = colIndex >= 0 && colIndex < allColumns.length ? allColumns[colIndex] : "Unknown Room";
        const colIndexCurrent = parseInt(col, 10) - 1;
        const currentRoomName = colIndexCurrent >= 0 && colIndexCurrent < allColumns.length ? allColumns[colIndexCurrent] : "Unknown Room";
        
        showConflictNotification(
          `Duplicate subject assignment: ${currentCourseSubject} is already assigned to room ${otherRoomName} at ${dayType} ${time} for ${conflictCourse.year_level}.\n` +
          `You are trying to assign it to ${currentRoomName} for ${currentRoomViewYearLevel}.\n` +
          `This is allowed, but please verify this is intentional.`
        );
        // Don't return here - just show a warning but allow it
      }
    }
  }

  // NEW: Check if any of the sections are already assigned to a room in any year level
  const allSections = [section, section2].filter(s => s);
  for (const sec of allSections) {
    const sectionAssignedInOtherYearLevel = schedules.find(sch => {
      const schCourse = courses.find(c => c.id === sch.courseId);
      return (sch.section === sec || sch.section2 === sec) &&
        sch.dayType === dayType &&
        sch.time === time &&
        schCourse && 
        schCourse.trimester === currentRoomViewTrimester &&
        schCourse.year_level !== currentRoomViewYearLevel && // Different year level
        sch.col > 0 && // Only check against Room View entries
        sch.id.toString() !== existingId;
    });

    if (sectionAssignedInOtherYearLevel) {
      const conflictCourse = courses.find(c => c.id === sectionAssignedInOtherYearLevel.courseId);
      if (conflictCourse) {
        const colIndex = sectionAssignedInOtherYearLevel.col - 1;
        const roomName = colIndex >= 0 && colIndex < allColumns.length ? allColumns[colIndex] : "Unknown Room";
        
        showConflictNotification(
          `Section conflict: Section ${sec} is already assigned to room ${roomName} at ${dayType} ${time} for ${conflictCourse.year_level}.\n` +
          `Subject: ${conflictCourse.subject}, Type: ${sectionAssignedInOtherYearLevel.unitType}\n` +
          `This is not allowed as a section cannot be in two places at once.`
        );
        return; // This is a blocking error
      }
    }
  }

  const data = {
    dayType,
    time,
    col: parseInt(col, 10),
    roomId: parseInt(roomId, 10),
    courseId,
    color: "#e9f1fb",
    unitType,
    section,
    section2
  };

  if (existingId) {
    await apiPut("schedules", existingId, data);
  } else {
    await apiPost("schedules", data);
  }
  hideModal(modalRoomView);
  await renderRoomViewTables();
  await validateAllComplementary();
});

document.getElementById("btn-delete-roomview").addEventListener("click", async () => {
  const id = document.getElementById("roomview-id").value;
  if (!id) return;
  if (!confirm("Are you sure you want to delete this schedule entry?")) return;
  await apiDelete("schedules", id);
  hideModal(modalRoomView);
  await renderRoomViewTables();
  await validateAllComplementary();
});

/**************************************************************
 * ROOM MANAGEMENT CRUD
 **************************************************************/
const btnManageRooms = document.getElementById("btn-manage-rooms");
const modalManageRooms = document.getElementById("modal-manage-rooms");
const tableRoomsBody = document.querySelector("#table-rooms tbody");
const btnAddRoom = document.getElementById("btn-add-room");
const modalAddRoom = document.getElementById("modal-add-room");
const roomIdInput = document.getElementById("room-id");
const roomNameInput = document.getElementById("room-name");
const btnSaveRoom = document.getElementById("btn-save-room");

btnManageRooms.addEventListener("click", async () => {
  await renderRoomsTable();
  showModal(modalManageRooms);
});

async function renderRoomsTable() {
  const roomsList = await apiGet("rooms");
  tableRoomsBody.innerHTML = "";
  roomsList.forEach(room => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${room.id}</td>
      <td>${room.name}</td>
      <td>
        <button class="table-edit-btn" onclick="editRoom(${room.id})">Edit</button>
        <button class="table-delete-btn" onclick="deleteRoom(${room.id})">Delete</button>
      </td>
    `;
    tableRoomsBody.appendChild(tr);
  });
}

btnAddRoom.addEventListener("click", () => {
  roomIdInput.value = "";
  roomNameInput.value = "";
  document.getElementById("modal-room-title").textContent = "Add New Room";
  showModal(modalAddRoom);
});

btnSaveRoom.addEventListener("click", async () => {
  try {
    const id = roomIdInput.value;
    const name = roomNameInput.value.trim();
    if (!name) {
      alert("Please enter a room name.");
      return;
    }
    const rooms = await apiGet("rooms");
    // Make case insensitive comparison for room names
    const existingRoom = rooms.find(r => r.name.toLowerCase() === name.toLowerCase() && r.id != id);
    if (existingRoom) {
      alert("This room name already exists.");
      return;
    }
    
    // Check if room name contains any special characters
    if (/[^a-zA-Z0-9]/.test(name)) {
      alert("Room name should only contain letters and numbers.");
      return;
    }
    
    if (id) {
      await apiPut("rooms", id, { name });
    } else {
      await apiPost("rooms", { name });
    }
    hideModal(modalAddRoom);
    await renderRoomsTable();
    await renderRoomViewTables();
    await validateAllComplementary();
  } catch (error) {
    console.error("Error saving room:", error);
    alert("Failed to save the room. Please try again.");
  }
});

window.editRoom = async function(id) {
  const roomsList = await apiGet("rooms");
  const room = roomsList.find(r => r.id == id);
  if (!room) return;
  roomIdInput.value = room.id;
  roomNameInput.value = room.name;
  document.getElementById("modal-room-title").textContent = "Edit Room";
  showModal(modalAddRoom);
};

window.deleteRoom = async function(id) {
  const schedules = await apiGet("schedules");
  if (schedules.some(sch => sch.roomId == id)) {
    alert("Cannot delete this room because it is currently scheduled.");
    return;
  }
  if (!confirm("Are you sure you want to delete this room?")) return;
  await apiDelete("rooms", id);
  await renderRoomsTable();
  await renderRoomViewTables();
  await validateAllComplementary();
};

/**************************************************************
 * SECTION VIEW FUNCTIONALITY (Existing)
 **************************************************************/
// Removed View Sections functionality

/**************************************************************
 * NEW SECTION VIEW: Trimester Tabs, Headers, and Tables
 **************************************************************/
let currentSectionViewTrimester = "1st Trimester";
let currentSectionViewYearLevel = "1st yr";

function setupSectionViewTrimesterTabs() {
  // Reset current trimester and year level to default if needed
  if (!currentSectionViewTrimester) currentSectionViewTrimester = "1st Trimester";
  if (!currentSectionViewYearLevel) currentSectionViewYearLevel = "1st yr";
  
  // Clone and replace the trimester tab elements to remove existing event listeners
  const trimesterTabs = document.querySelectorAll("#section-section-view .trimester-tabs .tab-btn");
  trimesterTabs.forEach(tab => {
    const newTab = tab.cloneNode(true);
    tab.parentNode.replaceChild(newTab, tab);
  });
  
  // Clone and replace the year level tab elements to remove existing event listeners
  const yearTabs = document.querySelectorAll("#section-section-view .year-level-tabs .year-tab-btn");
  yearTabs.forEach(tab => {
    const newTab = tab.cloneNode(true);
    tab.parentNode.replaceChild(newTab, tab);
  });
  
  // Remove animation transitions from section view container
  const sectionViewContainer = document.getElementById("section-view-container");
  
  // Add trimester tab functionality for Section View (to the new elements)
  document.querySelectorAll("#section-section-view .trimester-tabs .tab-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll("#section-section-view .trimester-tabs .tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      currentSectionViewTrimester = btn.dataset.trimester;
      
      // Update content immediately without animations
      await renderSectionViewTables();
      await validateAllComplementary();
    });
  });
  
  // Add year level tab functionality for Section View (to the new elements)
  document.querySelectorAll("#section-section-view .year-level-tabs .year-tab-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll("#section-section-view .year-level-tabs .year-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      currentSectionViewYearLevel = btn.dataset.year;
      
      // Update content immediately without animations
      await renderSectionViewTables();
      await validateAllComplementary();
    });
  });
  
  // Re-apply active classes based on current selections
  document.querySelector(`#section-section-view .trimester-tabs .tab-btn[data-trimester="${currentSectionViewTrimester}"]`).classList.add("active");
  document.querySelector(`#section-section-view .year-level-tabs .year-tab-btn[data-year="${currentSectionViewYearLevel}"]`).classList.add("active");
}

async function getUniqueSectionsForTrimesterAndYear(trimester, yearLevel) {
  const offerings = await apiGet("course_offerings");
  const courses = await apiGet("courses");
  const sections = new Set();
  
  offerings.forEach(off => {
    if (off.trimester === trimester) {
      const course = courses.find(c => c.id === off.courseId);
      if (course && course.year_level === yearLevel) {
      sections.add(off.section);
      }
    }
  });
  
  return [...sections].sort();
}

let isRenderingSectionView = false;

async function renderSectionViewTables() {
  // Prevent concurrent rendering to avoid duplication
  if (isRenderingSectionView) {
    return;
  }
  
  isRenderingSectionView = true;
  
  try {
    // Clear the container first to prevent duplication
    const container = document.getElementById("section-view-container");
    
    // Remove transition styles
    container.style.transition = "";
    
    container.innerHTML = ""; // Completely empty the container before adding new content

  const sections = await getUniqueSectionsForTrimesterAndYear(currentSectionViewTrimester, currentSectionViewYearLevel);
  
  // Show message if no sections found
  if (sections.length === 0) {
    const noSectionsMsg = document.createElement("div");
    noSectionsMsg.textContent = `No sections found for ${currentSectionViewYearLevel} in ${currentSectionViewTrimester}`;
    noSectionsMsg.style.textAlign = "center";
    noSectionsMsg.style.padding = "20px";
    noSectionsMsg.style.color = "#666";
    container.appendChild(noSectionsMsg);
    return;
  }
  
  const times = [
    "7:30 - 8:50", "8:50 - 10:10", "10:10 - 11:30", "11:30 - 12:50",
    "12:50 - 2:10", "2:10 - 3:30", "3:30 - 4:50", "4:50 - 6:10", "6:10 - 7:30"
  ];
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");
  const allColumns = await getAllRoomColumns();

  const dayTypes = ["MWF", "TTHS"];
  for (const dayType of dayTypes) {
    const tableContainer = document.createElement("div");
    tableContainer.className = "table-container";
    
    // Remove transition styles
    tableContainer.style.transition = "";
    
    const heading = document.createElement("h3");
    heading.textContent = `${dayType} Section Management`;
    tableContainer.appendChild(heading);

    const table = document.createElement("table");
    table.className = "schedule-table";
    table.id = `section-view-${dayType.toLowerCase()}-table`;
    
    // Remove transition styles
    table.style.transition = "";

    // Create header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    // Remove transition styles
    headerRow.style.transition = "";
    
    const timeTh = document.createElement("th");
    timeTh.textContent = "Time";
    // Remove transition styles
    timeTh.style.transition = "";
    headerRow.appendChild(timeTh);
    
    sections.forEach(section => {
      const th = document.createElement("th");
      th.textContent = section;
      // Remove transition styles
      th.style.transition = "";
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body
    const tbody = document.createElement("tbody");
    for (let time of times) {
      const tr = document.createElement("tr");
      // Remove transition styles
      tr.style.transition = "";
      
      const timeTd = document.createElement("td");
      timeTd.textContent = time;
      // Remove transition styles
      timeTd.style.transition = "";
      tr.appendChild(timeTd);
      
      for (const section of sections) {
        const td = document.createElement("td");
        td.classList.add("clickable-cell");
        td.setAttribute("data-dayType", dayType);
        td.setAttribute("data-time", time);
        td.setAttribute("data-section", section);
        
        // Remove transition styles
        td.style.transition = "";
        
        td.addEventListener("click", () => openSectionViewModal(dayType, time, section));
        
        // Rest of your code for populating cells remains the same
        const scheduleEntries = schedules.filter(sch => {
          const course = courses.find(c => c.id === sch.courseId);
          return course && 
                 course.trimester === currentSectionViewTrimester &&
                 course.year_level === currentSectionViewYearLevel &&
                 sch.dayType === dayType &&
                 sch.time === time &&
                 (sch.section === section || sch.section2 === section) &&
                 sch.col === 0; // Only show Section View entries (col = 0)
        });
        
        if (scheduleEntries.length > 0) {
          const sch = scheduleEntries[0]; // Assuming one schedule per section per time slot
          const course = courses.find(c => c.id === sch.courseId);
          
          // Find if there's a corresponding Room View entry
          const roomViewEntry = schedules.find(roomSch => {
            return roomSch.courseId === sch.courseId &&
                   roomSch.unitType === sch.unitType &&
                   roomSch.section === sch.section &&
                   roomSch.section2 === sch.section2 &&
                   roomSch.dayType === dayType &&
                   roomSch.time === time &&
                   roomSch.col > 0; // Room View entry
          });
          
          // Get course offering to get degree information
          const offerings = await apiGet("course_offerings");
          const courseOffering = offerings.find(off => 
            off.courseId === sch.courseId && 
            off.type === sch.unitType && 
            (off.section === sch.section || off.section === sch.section2)
          );
          
          // Get degree information from offering or course
          const degree = courseOffering && courseOffering.degree ? 
                        courseOffering.degree : 
                        (course ? course.degree : "");
                        
          let cellContent = course ? 
            `${course.subject} (${degree})<br>${sch.unitType}` : 
            "Unknown";
          
          // Add section2 info if it exists
          if (sch.section2) {
            cellContent += `<br><span class="secondary-section">With: ${sch.section2}</span>`;
          }
          
          // If there's a room assigned, add it to the display
          if (roomViewEntry && roomViewEntry.col > 0) {
            const colIndex = roomViewEntry.col - 1;
            if (colIndex >= 0 && colIndex < allColumns.length) {
              const roomName = allColumns[colIndex];
              cellContent += `<br><span class="room-label">Room: ${roomName}</span>`;
            }
          } else {
            // Highlight missing room assignment with a red border
            td.style.border = "2px solid #ff6666";
            cellContent += `<br><span class="room-label" style="color:#ff6666;">No room assigned</span>`;
          }
          
          // Check for missing complementary component (Lec/Lab)
          if (sch.unitType === "Lec" || sch.unitType === "Lab") {
            const complementary = sch.unitType === "Lec" ? "Lab" : "Lec";
            const compEntry = schedules.find(s => {
              const sCourse = courses.find(c => c.id === s.courseId);
              return s.col === 0 && // Section view entry
                     s.dayType === dayType &&
                     s.courseId === sch.courseId &&
                     (s.section === section || s.section2 === section) &&
                     s.unitType === complementary &&
                     sCourse &&
                     sCourse.trimester === currentSectionViewTrimester &&
                     sCourse.year_level === currentSectionViewYearLevel;
            });
            
            if (!compEntry) {
              // Add warning indicator for missing complementary component
              td.style.backgroundColor = "#fff3cd"; // Light yellow warning color
              td.title = `Missing ${complementary} component for this course`;
              cellContent = `⚠️ ${cellContent}`;
            }
            
            // Add visual indicators for Lec/Lab components
            td.classList.remove('schedule-lec-component', 'schedule-lab-component');
            if (sch.unitType === "Lec") {
              td.classList.add('schedule-lec-component');
            } else if (sch.unitType === "Lab") {
              td.classList.add('schedule-lab-component');
            }
          }
          
          td.innerHTML = cellContent;
          if (!td.style.backgroundColor) {
            td.style.backgroundColor = sch.color || "#e9f1fb";
          }
        } else {
          td.textContent = "";
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    tableContainer.appendChild(table);
    container.appendChild(tableContainer);
  }
  } finally {
    isRenderingSectionView = false;
  }
}

/**************************************************************
 * NEW SECTION VIEW Modal: Open, populate, and save
 **************************************************************/
const modalSectionView = document.getElementById("modal-sectionview");

async function openSectionViewModal(dayType, time, section) {
  document.getElementById("sectionview-dayType").value = dayType;
  document.getElementById("sectionview-time").value = time;
  document.getElementById("sectionview-section").value = section;
  
  // Reset room group filter to "Group A"
  document.getElementById("room-group-a").checked = true;
  
  // Hide LecLab interface initially
  hideLecLabInterface();
  
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");
  const existing = schedules.find(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    return course && course.trimester === currentSectionViewTrimester &&
           course && course.year_level === currentSectionViewYearLevel &&
           sch.dayType === dayType &&
           sch.time === time &&
           (sch.section === section || sch.section2 === section) &&
           sch.col === 0; // Only find Section View entries (col = 0)
  });
  
  if (existing) {
    document.getElementById("sectionview-id").value = existing.id;
    document.getElementById("btn-delete-sectionview").style.display = "block";
  } else {
    document.getElementById("sectionview-id").value = "";
    document.getElementById("btn-delete-sectionview").style.display = "none";
  }
  
  await populateSectionViewCourseOfferingDropdown(section);
  
  if (existing) {
    const offerings = await apiGet("course_offerings");
    const matchingOffering = offerings.find(off =>
      off.courseId === existing.courseId &&
      off.type === existing.unitType &&
      off.section === section
    );
    if (matchingOffering) {
      document.getElementById("sectionview-courseOffering").value = matchingOffering.id;
      await populateSectionViewSection2Dropdown(matchingOffering.courseId, matchingOffering.type);
      document.getElementById("sectionview-section2").value = existing.section2 || "";
      
      // Check if this is a LecLab subject and show interface
      const course = courses.find(c => c.id === matchingOffering.courseId);
      if (course && course.unit_category === "Lec/Lab") {
        await showLecLabInterface(course, matchingOffering, dayType, time, section);
      }
    }
    
    // Check if there's a corresponding entry in Room View
    const roomViewEntry = schedules.find(sch => {
      const course = courses.find(c => c.id === sch.courseId);
      return sch.courseId === existing.courseId &&
             sch.unitType === existing.unitType &&
             sch.section === existing.section &&
             sch.section2 === existing.section2 &&
             sch.dayType === dayType &&
             sch.time === time &&
             course &&
             course.trimester === currentSectionViewTrimester &&
             course.year_level === currentSectionViewYearLevel &&
             sch.col > 0; // Room View entry
    });
    
    await populateSectionViewRoomDropdown();
    
    if (roomViewEntry) {
      // Select the room in the dropdown if it exists in Room View
      const roomColumns = await getAllRoomColumns();
      const colIndex = roomViewEntry.col - 1;
      if (colIndex >= 0 && colIndex < roomColumns.length) {
        document.getElementById("sectionview-room").value = roomViewEntry.col;
      }
    }
  } else {
    document.getElementById("sectionview-courseOffering").value = "";
    document.getElementById("sectionview-section2").innerHTML = `<option value="">-- Select Section --</option>`;
    await populateSectionViewRoomDropdown();
  }
  showModal(modalSectionView);
}

// New function to populate the room dropdown
async function populateSectionViewRoomDropdown() {
  const roomSelect = document.getElementById("sectionview-room");
  roomSelect.innerHTML = `<option value="">-- Select Room --</option>`;
  
  const dayType = document.getElementById("sectionview-dayType").value;
  const time = document.getElementById("sectionview-time").value;
  const existingId = document.getElementById("sectionview-id").value;
  
  // Get the selected room group
  const roomGroupRadio = document.querySelector('input[name="roomGroup"]:checked');
  const selectedRoomGroup = roomGroupRadio ? roomGroupRadio.value : "A"; // Default to "A" if none selected
  
  const allColumns = await getAllRoomColumns();
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");
  
  // Get the existing entry if editing
  const existingRoomViewEntry = existingId ? 
    schedules.find(sch => {
      const course = courses.find(c => c.id === sch.courseId);
      return sch.id.toString() === existingId && 
             sch.col === 0 && // Section View entry
             course && 
             course.trimester === currentSectionViewTrimester && 
             course.year_level === currentSectionViewYearLevel;
    }) : null;

  // Find the corresponding Room View entry if it exists
  let correspondingRoomCol = null;
  if (existingRoomViewEntry) {
    const roomEntry = schedules.find(sch => {
      const course = courses.find(c => c.id === sch.courseId);
      return sch.dayType === dayType &&
             sch.time === time &&
             sch.courseId === existingRoomViewEntry.courseId &&
             sch.unitType === existingRoomViewEntry.unitType &&
             sch.section === existingRoomViewEntry.section &&
             sch.section2 === existingRoomViewEntry.section2 &&
             course && 
             course.trimester === currentSectionViewTrimester && 
             course.year_level === currentSectionViewYearLevel &&
             sch.col > 0; // Room View entry
    });
    
    if (roomEntry) {
      correspondingRoomCol = roomEntry.col;
    }
  }
  
  // Find all occupied rooms for this day type and time across ALL year levels in the current trimester
  const occupiedCols = schedules.filter(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    return sch.dayType === dayType &&
           sch.time === time &&
           sch.col > 0 && // Room View entries only
           course && 
           course.trimester === currentSectionViewTrimester; // Check all year levels in current trimester
  }).map(sch => sch.col);
  
  // Add room columns to the dropdown, excluding occupied ones
  // (unless it's the one already assigned to this entry)
  allColumns.forEach((roomName, index) => {
    const colValue = index + 1; // Column values start at 1
    
    // Check if the room belongs to the selected group
    const isGroupA = roomName.endsWith(" A");
    const isGroupB = roomName.endsWith(" B");
    const matchesSelectedGroup = 
      (selectedRoomGroup === "A" && isGroupA) || 
      (selectedRoomGroup === "B" && isGroupB);
    
    // Only add the room if:
    // 1. It matches the selected group, AND
    // 2. It's not occupied OR it's the one already assigned to this entry
    if (matchesSelectedGroup && (!occupiedCols.includes(colValue) || colValue === correspondingRoomCol)) {
      roomSelect.innerHTML += `<option value="${colValue}">${roomName}</option>`;
    }
  });
}

// Add event listeners for the room group radio buttons
document.querySelectorAll('input[name="roomGroup"]').forEach(radio => {
  radio.addEventListener('change', populateSectionViewRoomDropdown);
});

async function populateSectionViewCourseOfferingDropdown(section) {
  const offerings = await apiGet("course_offerings");
  const courses = await apiGet("courses");
  const sectionviewCourseOfferingSelect = document.getElementById("sectionview-courseOffering");
  sectionviewCourseOfferingSelect.innerHTML = `<option value="">-- Select Course Offering --</option>`;
  
  // Filter offerings that match the current trimester and year level
  const filteredOfferings = offerings.filter(off => {
    const course = courses.find(c => c.id === off.courseId);
    return off.section === section && 
           off.trimester === currentSectionViewTrimester && 
           course && course.year_level === currentSectionViewYearLevel;
  });
  
  // If no offerings found with exact section match, show all offerings for the current trimester and year level
  let offeringsToShow = filteredOfferings;
  if (offeringsToShow.length === 0) {
    offeringsToShow = offerings.filter(off => {
      const course = courses.find(c => c.id === off.courseId);
      return off.trimester === currentSectionViewTrimester && 
             course && course.year_level === currentSectionViewYearLevel;
    });
  }
  
  // Group offerings by course and section to combine LecLab subjects
  const groupedOfferings = {};
  
  offeringsToShow.forEach(off => {
    const course = courses.find(c => c.id === off.courseId);
    if (!course) return;
    
    const degree = off.degree || course.degree;
    const key = `${course.subject}_${degree}_${off.section}`;
    
    if (!groupedOfferings[key]) {
      groupedOfferings[key] = {
        courseId: course.id,
        subject: course.subject,
        degree: degree,
        section: off.section,
        unitCategory: course.unit_category,
        offerings: []
      };
    }
    
    groupedOfferings[key].offerings.push(off);
  });
  
  // Add options to dropdown
  Object.values(groupedOfferings).forEach(group => {
    // For LecLab subjects, only show one entry instead of separate Lec and Lab entries
    if (group.unitCategory === "Lec/Lab" && group.offerings.length > 1) {
      // Find the Lec offering to use as the primary one
      const lecOffering = group.offerings.find(off => off.type === "Lec") || group.offerings[0];
      const displayText = `${group.subject} (${group.degree}) - ${group.section}`;
      sectionviewCourseOfferingSelect.innerHTML += `<option value="${lecOffering.id}" data-course-id="${lecOffering.courseId}" data-unit-type="${lecOffering.type}">${displayText}</option>`;
    } else {
      // For non-LecLab subjects, show each offering with its type
      group.offerings.forEach(off => {
        const displayText = `${group.subject} (${group.degree}) - ${off.type} - ${off.section}`;
        sectionviewCourseOfferingSelect.innerHTML += `<option value="${off.id}" data-course-id="${off.courseId}" data-unit-type="${off.type}">${displayText}</option>`;
      });
    }
  });
}


async function populateSectionViewSection2Dropdown(courseId, type) {
  const offerings = await apiGet("course_offerings");
  const courses = await apiGet("courses");
  const sectionviewSection2Select = document.getElementById("sectionview-section2");
  const currentSection = document.getElementById("sectionview-section").value;
  
  sectionviewSection2Select.innerHTML = `<option value="">-- Select Section --</option>`;
  
  // Get all sections for the current year level and trimester
  const allSections = [];
  const sectionsUsed = new Set(); // To track sections we've already added
  
  // Add a helper text option explaining the functionality 
  const helperOption = document.createElement("option");
  helperOption.disabled = true;
  helperOption.innerHTML = "--- All sections in current year level ---";
  helperOption.style.fontStyle = "italic";
  helperOption.style.color = "#666";
  sectionviewSection2Select.appendChild(helperOption);
  
  // Get unique sections from all offerings in the current year and trimester
  offerings.forEach(off => {
    const course = courses.find(c => c.id === off.courseId);
    if (course && 
        course.trimester === currentSectionViewTrimester && 
        course.year_level === currentSectionViewYearLevel && 
        off.section !== currentSection && 
        !sectionsUsed.has(off.section)) {
      
      sectionsUsed.add(off.section);
      allSections.push(off.section);
    }
  });
  
  // Sort sections alphabetically
  allSections.sort((a, b) => {
    // Extract year number and letter for better sorting
    const yearA = parseInt(a.match(/\d+/)?.[0] || 0);
    const yearB = parseInt(b.match(/\d+/)?.[0] || 0);
    if (yearA !== yearB) {
      return yearA - yearB;
    }
    return a.localeCompare(b);
  });
  
  // Add all unique sections to the dropdown
  allSections.forEach(section => {
    sectionviewSection2Select.innerHTML += `<option value="${section}">${section}</option>`;
  });
}

document.getElementById("sectionview-courseOffering").addEventListener("change", async function() {
  const selectedOption = this.options[this.selectedIndex];
  const courseId = selectedOption.getAttribute("data-course-id");
  const unitType = selectedOption.getAttribute("data-unit-type");
  if (courseId && unitType) {
    await populateSectionViewSection2Dropdown(courseId, unitType);
    
    // Check if this is a LecLab subject and show/hide interface accordingly
    const courses = await apiGet("courses");
    const course = courses.find(c => c.id == courseId);
    if (course && course.unit_category === "Lec/Lab") {
      const offerings = await apiGet("course_offerings");
      const offering = offerings.find(off => off.id == this.value);
      if (offering) {
        const dayType = document.getElementById("sectionview-dayType").value;
        const time = document.getElementById("sectionview-time").value;
        const section = document.getElementById("sectionview-section").value;
        await showLecLabInterface(course, offering, dayType, time, section);
      }
    } else {
      hideLecLabInterface();
    }
  } else {
    document.getElementById("sectionview-section2").innerHTML = `<option value="">-- Select Section --</option>`;
    hideLecLabInterface();
  }
});

/**************************************************************
 * Enhanced LecLab Interface Functions
 **************************************************************/

async function showLecLabInterface(course, offering, dayType, time, section) {
  const lecLabSection = document.getElementById("leclab-assignment-section");
  lecLabSection.style.display = "block";
  
  // Populate time slots for separate assignment
  populateTimeSlots("lec-time", dayType);
  populateTimeSlots("lab-time", dayType);
  
  // Initialize the room group data attribute with the currently selected radio button value
  const lecLabRadio = document.querySelector('#separate-assignment input[name="leclab-roomGroup"]:checked');
  const selectedRoomGroup = lecLabRadio ? lecLabRadio.value : "A";
  document.getElementById("separate-assignment").dataset.selectedRoomGroup = selectedRoomGroup;
  
  // Populate room dropdowns
  await populateRoomDropdown("lec-room");
  await populateRoomDropdown("lab-room");
  
  // Set default values
  document.getElementById("lec-day").value = dayType;
  document.getElementById("lab-day").value = dayType;
  document.getElementById("lec-time").value = time;
  
  // Find next available time slot for lab
  const nextTime = await getNextAvailableTimeSlot(dayType, time, section);
  if (nextTime) {
    document.getElementById("lab-time").value = nextTime;
  } else {
    document.getElementById("lab-time").value = time;
  }
  
  // Ensure separate assignment UI is visible
  document.getElementById("combined-assignment").style.display = "none";
  document.getElementById("separate-assignment").style.display = "block";
  
  // Set up event listeners for day changes
  setupAssignmentModeListeners();
  
  // Check if there are existing room assignments for this course and section
  await setExistingRoomAssignments(course.id, offering.type, section, dayType, time);
}

function hideLecLabInterface() {
  const lecLabSection = document.getElementById("leclab-assignment-section");
  lecLabSection.style.display = "none";
  
  // No need to reset assignment mode as we only have separate mode now
  document.getElementById("separate-assignment").style.display = "block";
  document.getElementById("combined-assignment").style.display = "none";
}

function populateTimeSlots(selectId, dayType) {
  const times = [
    "7:30 - 8:50", "8:50 - 10:10", "10:10 - 11:30", "11:30 - 12:50",
    "12:50 - 2:10", "2:10 - 3:30", "3:30 - 4:50", "4:50 - 6:10", "6:10 - 7:30"
  ];
  
  const select = document.getElementById(selectId);
  select.innerHTML = "";
  
  times.forEach(time => {
    const option = document.createElement("option");
    option.value = time;
    option.textContent = time;
    select.appendChild(option);
  });
}

async function getNextAvailableTimeSlot(dayType, currentTime, section) {
  const times = [
    "7:30 - 8:50", "8:50 - 10:10", "10:10 - 11:30", "11:30 - 12:50",
    "12:50 - 2:10", "2:10 - 3:30", "3:30 - 4:50", "4:50 - 6:10", "6:10 - 7:30"
  ];
  
  const currentIndex = times.indexOf(currentTime);
  if (currentIndex === -1) return null;
  
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");
  
  // Check subsequent time slots for availability
  for (let i = currentIndex + 1; i < times.length; i++) {
    const timeSlot = times[i];
    const isOccupied = schedules.some(sch => {
      const course = courses.find(c => c.id === sch.courseId);
      return course &&
             course.trimester === currentSectionViewTrimester &&
             course.year_level === currentSectionViewYearLevel &&
             sch.dayType === dayType &&
             sch.time === timeSlot &&
             (sch.section === section || sch.section2 === section) &&
             sch.col === 0; // Section View entries
    });
    
    if (!isOccupied) {
      return timeSlot;
    }
  }
  
  return null; // No available slot found
}

function setupAssignmentModeListeners() {
  // No need to handle radio button changes as we only have separate mode now
  // Just ensure separate assignment div is visible
  document.getElementById("combined-assignment").style.display = "none";
  document.getElementById("separate-assignment").style.display = "block";
  
  // Add listeners for day changes to update time slots
  document.getElementById("lec-day").addEventListener('change', function() {
    populateTimeSlots("lec-time", this.value);
  });
  
  document.getElementById("lab-day").addEventListener('change', function() {
    populateTimeSlots("lab-time", this.value);
  });
  
  // Add listeners for room group radio buttons in the Lec/Lab assignment section
  const lecLabRoomGroupRadios = document.querySelectorAll('#separate-assignment input[name="leclab-roomGroup"]');
  lecLabRoomGroupRadios.forEach(radio => {
    radio.addEventListener('change', async function() {
      // Store the selected group in the data attribute
      document.getElementById("separate-assignment").dataset.selectedRoomGroup = this.value;
      // Update both room dropdowns with the same room group
      await populateRoomDropdown("lec-room");
      await populateRoomDropdown("lab-room");
    });
  });
}

async function populateRoomDropdown(elementId) {
  const roomSelect = document.getElementById(elementId);
  const allColumns = await getAllRoomColumns();
  
  // Clear existing options except the first one
  while (roomSelect.options.length > 1) {
    roomSelect.remove(1);
  }
  
  // Determine which set of radio buttons to use based on the element ID
  let roomGroup;
  if (elementId === "lec-room" || elementId === "lab-room") {
    // Use the Lec/Lab section radio buttons
    const lecLabRadio = document.querySelector('#separate-assignment input[name="leclab-roomGroup"]:checked');
    roomGroup = lecLabRadio ? lecLabRadio.value : "A"; // Default to Group A if none selected
    
    // Store the selected group in a data attribute on the separate-assignment div
    // This ensures both lec-room and lab-room use the same group
    document.getElementById("separate-assignment").dataset.selectedRoomGroup = roomGroup;
  } else {
    // Use the regular room assignment section radio buttons
    const regularRadio = document.querySelector('.room-assignment-section input[name="roomGroup"]:checked');
    roomGroup = regularRadio ? regularRadio.value : "A"; // Default to Group A if none selected
  }
  
  // For Lec/Lab components, always use the stored room group to ensure consistency
  if (elementId === "lec-room" || elementId === "lab-room") {
    roomGroup = document.getElementById("separate-assignment").dataset.selectedRoomGroup || "A";
  }
  
  // Filter rooms based on the selected group and get their original column indices
  const filteredRooms = [];
  for (let i = 0; i < allColumns.length; i++) {
    if (allColumns[i].endsWith(` ${roomGroup}`)) {
      filteredRooms.push({
        name: allColumns[i],
        col: i + 1 // Room columns are 1-indexed
      });
    }
  }
  
  // Add room options with correct column values
   filteredRooms.forEach(room => {
     const option = document.createElement("option");
     option.value = room.col; // Use the actual column number
     option.textContent = room.name;
     roomSelect.appendChild(option);
   });
}

async function setExistingRoomAssignments(courseId, unitType, section, dayType, time) {
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");
  const allColumns = await getAllRoomColumns();
  
  // Find existing room assignments for Lecture component
  const lecRoomEntry = schedules.find(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    return sch.courseId === courseId &&
           sch.unitType === "Lec" &&
           (sch.section === section || sch.section2 === section) &&
           course &&
           course.trimester === currentSectionViewTrimester &&
           course.year_level === currentSectionViewYearLevel &&
           sch.col > 0; // Room View entry
  });
  
  // Find existing room assignments for Lab component
  const labRoomEntry = schedules.find(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    return sch.courseId === courseId &&
           sch.unitType === "Lab" &&
           (sch.section === section || sch.section2 === section) &&
           course &&
           course.trimester === currentSectionViewTrimester &&
           course.year_level === currentSectionViewYearLevel &&
           sch.col > 0; // Room View entry
  });
  
  // Set the room values if they exist
  if (lecRoomEntry) {
    document.getElementById("lec-day").value = lecRoomEntry.dayType;
    document.getElementById("lec-time").value = lecRoomEntry.time;
    
    // Determine the room group from the existing room and set the radio button
    if (lecRoomEntry.col > 0) {
      const roomName = allColumns[lecRoomEntry.col - 1];
      if (roomName) {
        const roomGroup = roomName.endsWith(' A') ? 'A' : (roomName.endsWith(' B') ? 'B' : 'A');
        document.getElementById("separate-assignment").dataset.selectedRoomGroup = roomGroup;
        
        // Set the corresponding radio button
        const radioButton = document.querySelector(`#separate-assignment input[name="leclab-roomGroup"][value="${roomGroup}"]`);
        if (radioButton) {
          radioButton.checked = true;
        }
        
        // Repopulate room dropdowns with the correct group
        await populateRoomDropdown("lec-room");
        await populateRoomDropdown("lab-room");
        
        // Now set the actual room value
        document.getElementById("lec-room").value = lecRoomEntry.col;
      }
    }
  }
  
  if (labRoomEntry) {
    document.getElementById("lab-day").value = labRoomEntry.dayType;
    document.getElementById("lab-time").value = labRoomEntry.time;
    
    // Determine the room group from the existing room and set the radio button
    if (labRoomEntry.col > 0) {
      const roomName = allColumns[labRoomEntry.col - 1];
      if (roomName) {
        const roomGroup = roomName.endsWith(' A') ? 'A' : (roomName.endsWith(' B') ? 'B' : 'A');
        document.getElementById("separate-assignment").dataset.selectedRoomGroup = roomGroup;
        
        // Set the corresponding radio button
        const radioButton = document.querySelector(`#separate-assignment input[name="leclab-roomGroup"][value="${roomGroup}"]`);
        if (radioButton) {
          radioButton.checked = true;
        }
        
        // Repopulate room dropdowns with the correct group
        await populateRoomDropdown("lec-room");
        await populateRoomDropdown("lab-room");
        
        // Now set the actual room value
        document.getElementById("lab-room").value = labRoomEntry.col;
      }
    }
  }
}

document.getElementById("btn-save-sectionview").addEventListener("click", async () => {
  const lecLabSection = document.getElementById("leclab-assignment-section");
  
  if (lecLabSection.style.display !== "none") {
    // Handle LecLab assignment - only separate mode is available now
    await saveSeparateLecLab();
  } else {
    // Handle regular assignment (existing logic)
    await saveRegularAssignment();
  }
});

async function saveRegularAssignment() {
  const sectionviewCourseOfferingSelect = document.getElementById("sectionview-courseOffering");
  const sectionviewSection2Select = document.getElementById("sectionview-section2");
  const sectionviewRoomSelect = document.getElementById("sectionview-room");
  const courseOfferingId = sectionviewCourseOfferingSelect.value;
  const section2 = sectionviewSection2Select.value || null;
  const selectedRoomCol = sectionviewRoomSelect.value || null;
  
  if (!courseOfferingId) {
    showConflictNotification("Please select a course offering.");
    return;
  }
  
  const offerings = await apiGet("course_offerings");
  const selectedOffering = offerings.find(off => off.id == courseOfferingId);
  if (!selectedOffering) {
    showConflictNotification("Invalid course offering selected.");
    return;
  }
  
  const courseId = selectedOffering.courseId;
  const unitType = selectedOffering.type;
  // Use the section from the selected offering
  const section = document.getElementById("sectionview-section").value;
  
  const dayType = document.getElementById("sectionview-dayType").value;
  const time = document.getElementById("sectionview-time").value;
  
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");
  const rooms = await apiGet("rooms");
  const allColumns = await getAllRoomColumns();
  const existingId = document.getElementById("sectionview-id").value;
  
  // Check for conflicting schedules for this section, but only within Section View
  const conflict = schedules.find(sch => 
    sch.dayType === dayType &&
    sch.time === time &&
    (sch.section === section || sch.section2 === section) &&
    sch.col === 0 && // Only check Section View entries
    sch.id.toString() !== existingId
  );
  
  if (conflict) {
    const conflictCourse = courses.find(c => c.id === conflict.courseId);
    showConflictNotification(`Section "${section}" already has a class at ${dayType} ${time}.\n` +
      `Conflict with: ${conflictCourse?.subject || 'Unknown'} - ${conflict.unitType}`);
    return;
  }
  
  // Check if section2 is busy at this time slot
  if (section2) {
    const section2Conflict = schedules.find(sch => 
      sch.dayType === dayType &&
      sch.time === time &&
      (sch.section === section2 || sch.section2 === section2) &&
      sch.col === 0 && // Only check Section View entries
      sch.id.toString() !== existingId
    );
    
    if (section2Conflict) {
      const conflictCourse = courses.find(c => c.id === section2Conflict.courseId);
      showConflictNotification(`Section "${section2}" already has a class at ${dayType} ${time}.\n` +
        `Conflict with: ${conflictCourse?.subject || 'Unknown'} - ${section2Conflict.unitType}`);
      return;
    }
  }

  // Get the current course details
  const currentCourse = courses.find(c => c.id === courseId);
  if (!currentCourse) {
    showConflictNotification("Could not find course details.");
    return;
  }

  // Check for duplicate subjects in the same section (allowing different components: Lec/Lab)
  const duplicateSubject = schedules.find(sch => {
    // Skip comparing with the current entry being edited
    if (sch.id.toString() === existingId) return false;
    
    // Only check Section View entries
    if (sch.col !== 0) return false;
    
    // Check if this is for the same section
    if (sch.section !== section && sch.section2 !== section) return false;
    
    // Get subject details for this schedule entry
    const schCourse = courses.find(c => c.id === sch.courseId);
    if (!schCourse) return false;
    
    // Check if this is the same subject name
    if (schCourse.subject !== currentCourse.subject) return false;
    
    // Check if this is the same unit type (we allow different types like Lec vs Lab)
    return sch.unitType === unitType;
  });
  
  if (duplicateSubject) {
    showConflictNotification(`Duplicate subject: "${currentCourse.subject}" (${unitType}) is already scheduled for section "${section}".`);
    return;
  }
  
  // Same check for section2 if it exists
  if (section2) {
    const duplicateSubjectSection2 = schedules.find(sch => {
      // Skip comparing with the current entry being edited
      if (sch.id.toString() === existingId) return false;
      
      // Only check Section View entries
      if (sch.col !== 0) return false;
      
      // Check if this is for the same section
      if (sch.section !== section2 && sch.section2 !== section2) return false;
      
      // Get subject details for this schedule entry
      const schCourse = courses.find(c => c.id === sch.courseId);
      if (!schCourse) return false;
      
      // Check if this is the same subject name
      if (schCourse.subject !== currentCourse.subject) return false;
      
      // Check if this is the same unit type (we allow different types like Lec vs Lab)
      return sch.unitType === unitType;
    });
    
    if (duplicateSubjectSection2) {
      showConflictNotification(`Duplicate subject: "${currentCourse.subject}" (${unitType}) is already scheduled for section "${section2}".`);
      return;
    }
  }
  
  // First, save to Section View
  const sectionViewData = {
    dayType,
    time,
    col: 0, // Use 0 to indicate Section View entries
    roomId: null, // No room association in Section View
    courseId,
    color: "#e9f1fb",
    unitType,
    section,
    section2
  };
  
  let sectionViewEntryId;
  if (existingId) {
    await apiPut("schedules", existingId, sectionViewData);
    sectionViewEntryId = existingId;
  } else {
    const newEntry = await apiPost("schedules", sectionViewData);
    sectionViewEntryId = newEntry.id;
  }
  
  // Now handle the Room View assignment if a room was selected
  if (selectedRoomCol) {
    const currentCourse = courses.find(c => c.id === courseId);
    
    // If the room has been selected, we need to check if we should create a new entry or update an existing one
    const existingRoomViewEntry = schedules.find(sch => {
      const schCourse = courses.find(c => c.id === sch.courseId);
      return sch.dayType === dayType &&
        sch.time === time &&
        sch.courseId === courseId &&
        sch.unitType === unitType &&
        (sch.section === section || sch.section2 === section) &&
        schCourse && schCourse.trimester === currentSectionViewTrimester &&
        schCourse.year_level === currentSectionViewYearLevel &&
        sch.col > 0; // Room View entries
    });
    
    // Run all the room view validations before saving
    
    // Check for subjects in different year levels
    if (currentCourse && currentCourse.year_level !== currentSectionViewYearLevel) {
      showConflictNotification(`Year level mismatch: This course (${currentCourse?.subject || 'Unknown'}) is for ${currentCourse?.year_level || 'unknown'} year level, but you're currently in ${currentSectionViewYearLevel} view.`);
      return;
    }
    
    // Check for room conflicts in the same year level
    const roomConflict = schedules.find(sch => {
      const schCourse = courses.find(c => c.id === sch.courseId);
      return sch.dayType === dayType &&
        sch.time === time &&
        sch.col.toString() === selectedRoomCol &&
        schCourse && schCourse.trimester === currentSectionViewTrimester &&
        schCourse.year_level === currentSectionViewYearLevel &&
        sch.col > 0 && // Room View entries
        sch.id.toString() !== (existingRoomViewEntry ? existingRoomViewEntry.id.toString() : "-1");
    });
    
    if (roomConflict) {
      const conflictCourse = courses.find(c => c.id === roomConflict.courseId);
      const colIndex = parseInt(selectedRoomCol) - 1;
      const roomName = colIndex >= 0 && colIndex < allColumns.length ? allColumns[colIndex] : "Unknown Room";
      showConflictNotification(
        `Room ${roomName} at ${dayType} ${time} already has ${conflictCourse?.subject || 'Unknown'} scheduled.\n` +
        `Please choose a different room, day, or time.`
      );
      return;
    }
    
    // Check for cross-year conflicts
    const crossYearRoomConflict = schedules.find(sch => {
      const schCourse = courses.find(c => c.id === sch.courseId);
      return sch.dayType === dayType &&
        sch.time === time &&
        sch.col.toString() === selectedRoomCol &&
        schCourse && schCourse.trimester === currentSectionViewTrimester &&
        schCourse.year_level !== currentSectionViewYearLevel && // Different year level
        sch.col > 0 && // Room View entries
        sch.id.toString() !== (existingRoomViewEntry ? existingRoomViewEntry.id.toString() : "-1");
    });
    
    if (crossYearRoomConflict) {
      const conflictCourse = courses.find(c => c.id === crossYearRoomConflict.courseId);
      const colIndex = parseInt(selectedRoomCol) - 1;
      const roomName = colIndex >= 0 && colIndex < allColumns.length ? allColumns[colIndex] : "Unknown Room";
      showConflictNotification(
        `Cross-year conflict: Room ${roomName} at ${dayType} ${time} is already occupied in ${conflictCourse?.year_level || 'unknown'}.\n` +
        `Subject: ${conflictCourse?.subject || 'Unknown'}, Trimester: ${currentSectionViewTrimester}.\n` +
        `Please choose a different room, day, or time.`
      );
      return;
    }
    
    // Check for section conflicts across year levels
    const sectionAssignedInOtherYearLevel = schedules.find(sch => {
      const schCourse = courses.find(c => c.id === sch.courseId);
      return (sch.section === section || sch.section2 === section ||
              (section2 && (sch.section === section2 || sch.section2 === section2))) &&
        sch.dayType === dayType &&
        sch.time === time &&
        schCourse && schCourse.trimester === currentSectionViewTrimester &&
        schCourse.year_level !== currentSectionViewYearLevel && // Different year level
        sch.col > 0 && // Room View entries
        sch.id.toString() !== (existingRoomViewEntry ? existingRoomViewEntry.id.toString() : "-1");
    });
    
    if (sectionAssignedInOtherYearLevel) {
      const conflictCourse = courses.find(c => c.id === sectionAssignedInOtherYearLevel.courseId);
      const colIndex = sectionAssignedInOtherYearLevel.col - 1;
      const roomName = colIndex >= 0 && colIndex < allColumns.length ? allColumns[colIndex] : "Unknown Room";
      showConflictNotification(
        `Section conflict: Section ${section} is already assigned to room ${roomName} at ${dayType} ${time} for ${conflictCourse?.year_level || 'unknown'}.\n` +
        `Subject: ${conflictCourse?.subject || 'Unknown'}, Type: ${sectionAssignedInOtherYearLevel.unitType}\n` +
        `This is not allowed as a section cannot be in two places at once.`
      );
      return;
    }
    
    // Determine the room ID based on the column selected
    const colIndex = parseInt(selectedRoomCol) - 1;
    const roomName = colIndex >= 0 && colIndex < allColumns.length ? allColumns[colIndex] : null;
    const baseRoomName = roomName ? roomName.replace(/ (A|B)$/, '') : null;
    let roomId = null;
    
    if (baseRoomName) {
      const room = rooms.find(r => r.name === baseRoomName);
      if (room) {
        roomId = room.id;
      }
    }
    
    // Save to Room View
    const roomViewData = {
      dayType,
      time,
      col: parseInt(selectedRoomCol),
      roomId: roomId,
      courseId,
      color: "#e9f1fb",
      unitType,
      section,
      section2
    };
    
    if (existingRoomViewEntry) {
      await apiPut("schedules", existingRoomViewEntry.id, roomViewData);
    } else {
      await apiPost("schedules", roomViewData);
    }
  } else {
    // If no room is selected but there was a room view entry before, delete it
    const existingRoomViewEntry = schedules.find(sch => {
      const schCourse = courses.find(c => c.id === sch.courseId);
      return sch.dayType === dayType &&
        sch.time === time &&
        sch.courseId === courseId &&
        sch.unitType === unitType &&
        (sch.section === section || sch.section2 === section) &&
        schCourse && schCourse.trimester === currentSectionViewTrimester &&
        schCourse.year_level === currentSectionViewYearLevel &&
        sch.col > 0; // Room View entries
    });
    
    if (existingRoomViewEntry) {
      // Remove the room assignment
      await apiDelete("schedules", existingRoomViewEntry.id);
    }
  }
  
  hideModal(modalSectionView);
  
  // Only update the specific time slot that was changed, rather than refreshing the entire view
  const sectionDayType = document.getElementById("sectionview-dayType").value;
  const sectionTime = document.getElementById("sectionview-time").value;
  const sectionName = document.getElementById("sectionview-section").value;
  
  // Get and update the specific cell that was changed
  await updateSectionViewCell(sectionDayType, sectionTime, sectionName);
  
  // If this is a Lec/Lab component, also update its complementary component cell if it exists
  if (unitType === "Lec" || unitType === "Lab") {
    // Get all section view schedules after the update
    const updatedSchedules = await apiGet("schedules");
    
    // Find complementary component to update its cell as well
    const complementaryType = unitType === "Lec" ? "Lab" : "Lec";
    const complementaryEntry = updatedSchedules.find(s => {
      const course = courses.find(c => c.id === s.courseId);
      return s.col === 0 && // Section view entry
             s.dayType === sectionDayType &&
             s.courseId === courseId &&
             (s.section === sectionName || s.section2 === sectionName) &&
             s.unitType === complementaryType &&
             course &&
             course.trimester === currentSectionViewTrimester &&
             course.year_level === currentSectionViewYearLevel;
    });
    
    if (complementaryEntry) {
      // Update the complementary cell to remove warning styling
      await updateSectionViewCell(complementaryEntry.dayType, complementaryEntry.time,
        complementaryEntry.section === sectionName ? complementaryEntry.section2 || complementaryEntry.section : complementaryEntry.section);
    }
  }
  
  // Update Room View as well since they're connected
  await renderRoomViewTables();
  await validateAllComplementary();
}

/**************************************************************
 * Enhanced LecLab Save Functions
 **************************************************************/

async function saveCombinedLecLab() {
  const courseOfferingId = document.getElementById("sectionview-courseOffering").value;
  const section2 = document.getElementById("sectionview-section2").value || null;
  const selectedRoomCol = document.getElementById("sectionview-room").value || null;
  
  if (!courseOfferingId) {
    showConflictNotification("Please select a course offering.");
    return;
  }
  
  const offerings = await apiGet("course_offerings");
  const courses = await apiGet("courses");
  const schedules = await apiGet("schedules");
  
  // Find both Lec and Lab offerings for this course
  const selectedOffering = offerings.find(off => off.id == courseOfferingId);
  if (!selectedOffering) {
    showConflictNotification("Invalid course offering selected.");
    return;
  }
  
  const courseId = selectedOffering.courseId;
  const section = document.getElementById("sectionview-section").value;
  const dayType = document.getElementById("sectionview-dayType").value;
  const time = document.getElementById("sectionview-time").value;
  
  // Find both Lec and Lab offerings for this course and section
  const lecOffering = offerings.find(off =>
    off.courseId === courseId && off.section === section && off.type === "Lec"
  );
  const labOffering = offerings.find(off =>
    off.courseId === courseId && off.section === section && off.type === "Lab"
  );
  
  if (!lecOffering || !labOffering) {
    showConflictNotification("Both Lecture and Lab offerings must exist for this course and section.");
    return;
  }
  
  // Validate no conflicts exist for this time slot
  const existingId = document.getElementById("sectionview-id").value;
  const conflict = schedules.find(sch =>
    sch.dayType === dayType &&
    sch.time === time &&
    (sch.section === section || sch.section2 === section) &&
    sch.col === 0 && // Only check Section View entries
    sch.id.toString() !== existingId
  );
  
  if (conflict) {
    const conflictCourse = courses.find(c => c.id === conflict.courseId);
    showConflictNotification(`Section "${section}" already has a class at ${dayType} ${time}.\n` +
      `Conflict with: ${conflictCourse?.subject || 'Unknown'} - ${conflict.unitType}`);
    return;
  }
  
  // Save both components to the same time slot
  await saveLecLabComponent(courseId, "Lec", section, section2, dayType, time, selectedRoomCol, existingId);
  await saveLecLabComponent(courseId, "Lab", section, section2, dayType, time, selectedRoomCol, null);
  
  hideModal(document.getElementById("modal-sectionview"));
  await renderSectionViewTables();
  await renderRoomViewTables();
  await validateAllComplementary();
}

async function saveSeparateLecLab() {
  const courseOfferingId = document.getElementById("sectionview-courseOffering").value;
  const section2 = document.getElementById("sectionview-section2").value || null;
  
  if (!courseOfferingId) {
    showConflictNotification("Please select a course offering.");
    return;
  }
  
  const offerings = await apiGet("course_offerings");
  const courses = await apiGet("courses");
  const schedules = await apiGet("schedules");
  
  const selectedOffering = offerings.find(off => off.id == courseOfferingId);
  if (!selectedOffering) {
    showConflictNotification("Invalid course offering selected.");
    return;
  }
  
  const courseId = selectedOffering.courseId;
  const section = document.getElementById("sectionview-section").value;
  
  // Get separate time slots and room selections for Lec and Lab
  const lecDay = document.getElementById("lec-day").value;
  const lecTime = document.getElementById("lec-time").value;
  const lecRoomCol = document.getElementById("lec-room").value || null;
  
  const labDay = document.getElementById("lab-day").value;
  const labTime = document.getElementById("lab-time").value;
  const labRoomCol = document.getElementById("lab-room").value || null;
  
  // Validate both components have time slots selected
  if (!lecTime || !labTime) {
    showConflictNotification("Please select time slots for both Lecture and Lab components.");
    return;
  }
  
  // Check for conflicts for both time slots
  const existingId = document.getElementById("sectionview-id").value;
  
  const lecConflict = schedules.find(sch =>
    sch.dayType === lecDay &&
    sch.time === lecTime &&
    (sch.section === section || sch.section2 === section) &&
    sch.col === 0 && // Only check Section View entries
    sch.id.toString() !== existingId
  );
  
  if (lecConflict) {
    const conflictCourse = courses.find(c => c.id === lecConflict.courseId);
    showConflictNotification(`Lecture time conflict: Section "${section}" already has a class at ${lecDay} ${lecTime}.\n` +
      `Conflict with: ${conflictCourse?.subject || 'Unknown'} - ${lecConflict.unitType}`);
    return;
  }
  
  const labConflict = schedules.find(sch =>
    sch.dayType === labDay &&
    sch.time === labTime &&
    (sch.section === section || sch.section2 === section) &&
    sch.col === 0 && // Only check Section View entries
    sch.id.toString() !== existingId
  );
  
  if (labConflict) {
    const conflictCourse = courses.find(c => c.id === labConflict.courseId);
    showConflictNotification(`Lab time conflict: Section "${section}" already has a class at ${labDay} ${labTime}.\n` +
      `Conflict with: ${conflictCourse?.subject || 'Unknown'} - ${labConflict.unitType}`);
    return;
  }
  
  // Save components to separate time slots with their respective room assignments
  await saveLecLabComponent(courseId, "Lec", section, section2, lecDay, lecTime, lecRoomCol, existingId);
  await saveLecLabComponent(courseId, "Lab", section, section2, labDay, labTime, labRoomCol, null);
  
  hideModal(document.getElementById("modal-sectionview"));
  await renderSectionViewTables();
  await renderRoomViewTables();
  await validateAllComplementary();
}

async function saveLecLabComponent(courseId, unitType, section, section2, dayType, time, selectedRoomCol, existingId) {
  const courses = await apiGet("courses");
  const rooms = await apiGet("rooms");
  const allColumns = await getAllRoomColumns();
  const schedules = await apiGet("schedules");
  
  // Get the current course details
  const currentCourse = courses.find(c => c.id === courseId);
  if (!currentCourse) {
    showConflictNotification("Could not find course details.");
    return;
  }

  // Check for duplicate subjects in the same section (allowing different components: Lec/Lab)
  const duplicateSubject = schedules.find(sch => {
    // Skip comparing with the current entry being edited
    if (sch.id.toString() === existingId) return false;
    
    // Only check Section View entries
    if (sch.col !== 0) return false;
    
    // Check if this is for the same section
    if (sch.section !== section && sch.section2 !== section) return false;
    
    // Get subject details for this schedule entry
    const schCourse = courses.find(c => c.id === sch.courseId);
    if (!schCourse) return false;
    
    // Check if this is the same subject name
    if (schCourse.subject !== currentCourse.subject) return false;
    
    // Check if this is the same unit type (we allow different types like Lec vs Lab)
    return sch.unitType === unitType;
  });
  
  if (duplicateSubject) {
    showConflictNotification(`Duplicate subject: "${currentCourse.subject}" (${unitType}) is already scheduled for section "${section}".`);
    return;
  }
  
  // Same check for section2 if it exists
  if (section2) {
    const duplicateSubjectSection2 = schedules.find(sch => {
      // Skip comparing with the current entry being edited
      if (sch.id.toString() === existingId) return false;
      
      // Only check Section View entries
      if (sch.col !== 0) return false;
      
      // Check if this is for the same section
      if (sch.section !== section2 && sch.section2 !== section2) return false;
      
      // Get subject details for this schedule entry
      const schCourse = courses.find(c => c.id === sch.courseId);
      if (!schCourse) return false;
      
      // Check if this is the same subject name
      if (schCourse.subject !== currentCourse.subject) return false;
      
      // Check if this is the same unit type (we allow different types like Lec vs Lab)
      return sch.unitType === unitType;
    });
    
    if (duplicateSubjectSection2) {
      showConflictNotification(`Duplicate subject: "${currentCourse.subject}" (${unitType}) is already scheduled for section "${section2}".`);
      return;
    }
  }
  
  // First, save to Section View
  const sectionViewData = {
    dayType,
    time,
    col: 0, // Use 0 to indicate Section View entries
    roomId: null, // No room association in Section View
    courseId,
    color: "#e9f1fb",
    unitType,
    section,
    section2
  };
  
  let sectionViewEntryId;
  if (existingId && unitType === "Lec") {
    // Update existing entry for Lec component
    await apiPut("schedules", existingId, sectionViewData);
    sectionViewEntryId = existingId;
  } else {
    // Create new entry
    const newEntry = await apiPost("schedules", sectionViewData);
    sectionViewEntryId = newEntry.id;
  }
  
  // Handle Room View assignment if a room was selected
  if (selectedRoomCol) {
    const colIndex = parseInt(selectedRoomCol) - 1;
    const roomName = colIndex >= 0 && colIndex < allColumns.length ? allColumns[colIndex] : null;
    const baseRoomName = roomName ? roomName.replace(/ (A|B)$/, '') : null;
    let roomId = null;
    
    if (baseRoomName) {
      const room = rooms.find(r => r.name === baseRoomName);
      if (room) {
        roomId = room.id;
      }
    }
    
    // Check if room is available
    const roomConflict = schedules.find(sch => {
      const schCourse = courses.find(c => c.id === sch.courseId);
      return sch.dayType === dayType &&
        sch.time === time &&
        sch.col.toString() === selectedRoomCol &&
        schCourse && schCourse.trimester === currentSectionViewTrimester &&
        sch.col > 0; // Room View entries
    });
    
    if (!roomConflict) {
      // Save to Room View
      const roomViewData = {
        dayType,
        time,
        col: parseInt(selectedRoomCol),
        roomId: roomId,
        courseId,
        color: "#e9f1fb",
        unitType,
        section,
        section2
      };
      
      await apiPost("schedules", roomViewData);
    }
  }
}

// Function to update a specific cell in the Section View table
async function updateSectionViewCell(dayType, time, section) {
  // Clear the API cache for schedules to get fresh data
  clearApiCache("schedules");
  
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");
  const offerings = await apiGet("course_offerings");
  const allColumns = await getAllRoomColumns();
  
  // Find the target cell in the table
  const targetCell = document.querySelector(`.clickable-cell[data-daytype="${dayType}"][data-time="${time}"][data-section="${section}"]`);
  if (!targetCell) return;
  
  // Remove transition for smooth animation
  targetCell.style.transition = "";
  
  // Find the schedule for this cell
  const scheduleEntries = schedules.filter(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    return course && 
           course.trimester === currentSectionViewTrimester &&
           course.year_level === currentSectionViewYearLevel &&
           sch.dayType === dayType &&
           sch.time === time &&
           (sch.section === section || sch.section2 === section) &&
           sch.col === 0; // Only show Section View entries (col = 0)
  });
  
  // Reset the cell styling
  targetCell.style.backgroundColor = "";
  targetCell.style.border = "";
  targetCell.title = "";
  
  if (scheduleEntries.length > 0) {
    const sch = scheduleEntries[0]; // Assuming one schedule per section per time slot
    const course = courses.find(c => c.id === sch.courseId);
    
    // Find if there's a corresponding Room View entry
    const roomViewEntry = schedules.find(roomSch => {
      return roomSch.courseId === sch.courseId &&
             roomSch.unitType === sch.unitType &&
             roomSch.section === sch.section &&
             roomSch.section2 === sch.section2 &&
             roomSch.dayType === dayType &&
             roomSch.time === time &&
             roomSch.col > 0; // Room View entry
    });
    
    // Get course offering to get degree information
    const courseOffering = offerings.find(off => 
      off.courseId === sch.courseId && 
      off.type === sch.unitType && 
      (off.section === sch.section || off.section === sch.section2)
    );
    
    // Get degree information from offering or course
    const degree = courseOffering && courseOffering.degree ? 
                  courseOffering.degree : 
                  (course ? course.degree : "");
    
    let cellContent = course ? 
      `${course.subject} (${degree})<br>${sch.unitType}` : 
      "Unknown";
    
    // Add section2 info if it exists
    if (sch.section2) {
      cellContent += `<br><span class="secondary-section">With: ${sch.section2}</span>`;
    }
    
    // If there's a room assigned, add it to the display
    if (roomViewEntry && roomViewEntry.col > 0) {
      const colIndex = roomViewEntry.col - 1;
      if (colIndex >= 0 && colIndex < allColumns.length) {
        const roomName = allColumns[colIndex];
        cellContent += `<br><span class="room-label">Room: ${roomName}</span>`;
      }
    } else {
      // Highlight missing room assignment with a red border
      targetCell.style.border = "2px solid #ff6666";
      cellContent += `<br><span class="room-label" style="color:#ff6666;">No room assigned</span>`;
    }
    
    // Check for missing complementary component (Lec/Lab)
    if (sch.unitType === "Lec" || sch.unitType === "Lab") {
      const complementary = sch.unitType === "Lec" ? "Lab" : "Lec";
      const compEntry = schedules.find(s => {
        const sCourse = courses.find(c => c.id === s.courseId);
        return s.col === 0 && // Section view entry
               s.dayType === dayType &&
               s.courseId === sch.courseId &&
               (s.section === section || s.section2 === section) &&
               s.unitType === complementary &&
               sCourse &&
               sCourse.trimester === currentSectionViewTrimester &&
               sCourse.year_level === currentSectionViewYearLevel;
      });
      
      if (!compEntry) {
        // Add warning indicator for missing complementary component
        targetCell.style.backgroundColor = "#fff3cd"; // Light yellow warning color
        targetCell.title = `Missing ${complementary} component for this course`;
        cellContent = `⚠️ ${cellContent}`;
      }
      
      // Add visual indicators for Lec/Lab components
      targetCell.classList.remove('schedule-lec-component', 'schedule-lab-component');
      if (sch.unitType === "Lec") {
        targetCell.classList.add('schedule-lec-component');
      } else if (sch.unitType === "Lab") {
        targetCell.classList.add('schedule-lab-component');
      }
    }
    
    targetCell.innerHTML = cellContent;
    if (!targetCell.style.backgroundColor) {
      targetCell.style.backgroundColor = sch.color || "#e9f1fb";
    }
    
    // Add animation to highlight the change
    targetCell.style.transition = "background-color 0.3s ease, transform 0.3s ease";
    targetCell.style.transform = "scale(1.02)";
    setTimeout(() => {
      targetCell.style.transform = "scale(1)";
    }, 300);
  } else {
    targetCell.textContent = "";
  }
}

document.getElementById("btn-delete-sectionview").addEventListener("click", async () => {
  const id = document.getElementById("sectionview-id").value;
  if (!id) return;
  if (!confirm("Are you sure you want to delete this schedule entry?")) return;
  
  // Get the existing entry details before deletion
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");
  const existingEntry = schedules.find(sch => sch.id.toString() === id);
  
  // Save the values we need before deletion
  let dayType, time, section = "";
  if (existingEntry) {
    dayType = existingEntry.dayType;
    time = existingEntry.time;
    section = existingEntry.section;
    
    // Delete the Section View entry
    await apiDelete("schedules", id);
    
    // Check if there's a corresponding entry in Room View and delete it too
    const courseId = existingEntry.courseId;
    const unitType = existingEntry.unitType;
    const section2 = existingEntry.section2;
    
    const roomViewEntry = schedules.find(sch => {
      const course = courses.find(c => c.id === sch.courseId);
      return sch.courseId === courseId &&
             sch.unitType === unitType &&
             sch.section === section &&
             sch.section2 === section2 &&
             sch.dayType === dayType &&
             sch.time === time &&
             course && 
             course.trimester === currentSectionViewTrimester &&
             course.year_level === currentSectionViewYearLevel &&
             sch.col > 0; // Room View entry
    });
    
    if (roomViewEntry) {
      await apiDelete("schedules", roomViewEntry.id);
    }
  }
  
  hideModal(modalSectionView);
  
  // Update the specific cell that was changed
  if (dayType && time && section) {
    await updateSectionViewCell(dayType, time, section);
  }
  
  // Update Room View tables since they're connected
  await renderRoomViewTables();
  await validateAllComplementary();
});

/**************************************************************
 * Complementary Validation for Lec/Lab + Duplicate Check
 **************************************************************/
async function validateAllComplementary() {
  const schedules = await apiGet("schedules");
  const rooms = await apiGet("rooms");
  const courses = await apiGet("courses");
  const allColumns = await getAllRoomColumns();

  // Clear previous notifications
  clearConflictNotification();
  
  // Get both Room View and Section View schedules for current trimester only
  const currentTrimester = getCurrentViewTrimester();
  
  // Room View schedules for current trimester
  const roomViewSchedules = schedules.filter(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    return course && 
           course.trimester === currentRoomViewTrimester && 
           course.year_level === currentRoomViewYearLevel &&
           sch.col > 0; // Only Room View entries
  });
  
  // Section View schedules for current trimester
  const sectionViewSchedules = schedules.filter(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    return course && 
           course.trimester === currentSectionViewTrimester && 
           course.year_level === currentSectionViewYearLevel &&
           sch.col === 0; // Only Section View entries
  });

  // Split Room View into groups
  const groupA = roomViewSchedules.filter(sch => {
    const colIndex = sch.col - 1;
    return colIndex >= 0 && allColumns[colIndex].endsWith(" A");
  });
  const groupB = roomViewSchedules.filter(sch => {
    const colIndex = sch.col - 1;
    return colIndex >= 0 && allColumns[colIndex].endsWith(" B");
  });

  function validateGroup(schedulesGroup, groupName) {
    const lecLabSchedules = schedulesGroup.filter(sch => sch.unitType === "Lec" || sch.unitType === "Lab");
    let conflictMessages = [];

    for (let sch of lecLabSchedules) {
      const sections = [sch.section, sch.section2].filter(s => s);
      for (const section of sections) {
        const complementary = sch.unitType === "Lec" ? "Lab" : "Lec";
        const compEntry = schedulesGroup.find(s =>
          s.dayType === sch.dayType &&
          s.courseId === sch.courseId &&
          (s.section === section || s.section2 === section) &&
          s.unitType === complementary
        );
        if (!compEntry) {
          const course = courses.find(c => c.id === sch.courseId);
          const subjectName = course ? course.subject : "Unknown Subject";
          const times = getTimesArray(sch.dayType);
          const currentIndex = times.indexOf(sch.time);
          let recommendedTime = "None available";
          const sectionSchedules = schedulesGroup.filter(s => s.dayType === sch.dayType && (s.section === section || s.section2 === section));
          for (let i = currentIndex + 1; i < times.length; i++) {
            if (!sectionSchedules.some(s => s.time === times[i])) {
              recommendedTime = times[i];
              break;
            }
          }
          if (sch.unitType === "Lec") {
            conflictMessages.push(`[${groupName}] [${currentRoomViewTrimester}] [${currentRoomViewYearLevel}] Lab portion missing for ${subjectName} - (${section}). Recommended slot: ${recommendedTime}.`);
          } else {
            conflictMessages.push(`[${groupName}] [${currentRoomViewTrimester}] [${currentRoomViewYearLevel}] Lec portion missing for ${subjectName} - (${section}). Recommended slot: ${recommendedTime}.`);
          }
        }
      }
    }

    let scheduleMap = new Map();
    for (let sch of schedulesGroup) {
      if (sch.courseId) {
        const sections = [sch.section, sch.section2].filter(s => s);
        for (const sec of sections) {
          let key = `${sch.dayType}|${sch.time}|${sch.courseId}|${sec}|${sch.unitType}`;
          if (!scheduleMap.has(key)) scheduleMap.set(key, []);
          scheduleMap.get(key).push(sch);
        }
      }
    }
    scheduleMap.forEach((group, key) => {
      if (group.length > 1) {
        const parts = key.split('|');
        const time = parts[1];
        const courseId = parts[2];
        const section = parts[3];
        const unitType = parts[4];
        const course = courses.find(c => c.id == courseId);
        const subjectName = course ? course.subject : "Unknown Subject";
        conflictMessages.push(`[${groupName}] [${currentRoomViewTrimester}] [${currentRoomViewYearLevel}] Duplicate schedule: ${subjectName} - (${section}) - ${unitType} is scheduled at ${time} more than once.`);
      }
    });

    return conflictMessages;
  }
  
  // Determine which view is currently active to show appropriate validation
  function getCurrentViewTrimester() {
    const sectionViewVisible = !document.getElementById("section-section-view").classList.contains("hidden");
    const roomViewVisible = !document.getElementById("section-room-view").classList.contains("hidden");
    
    if (sectionViewVisible) {
      return currentSectionViewTrimester;
    } else if (roomViewVisible) {
      return currentRoomViewTrimester;
    }
    
    // Default to section view trimester
    return currentSectionViewTrimester;
  }
  
  // Validate Section View for missing complementary components
  function validateSectionView() {
    const lecLabSchedules = sectionViewSchedules.filter(sch => sch.unitType === "Lec" || sch.unitType === "Lab");
    let conflictMessages = [];

    for (let sch of lecLabSchedules) {
      const sections = [sch.section, sch.section2].filter(s => s);
      for (const section of sections) {
        const complementary = sch.unitType === "Lec" ? "Lab" : "Lec";
        const compEntry = sectionViewSchedules.find(s =>
          s.dayType === sch.dayType &&
          s.courseId === sch.courseId &&
          (s.section === section || s.section2 === section) &&
          s.unitType === complementary
        );
        if (!compEntry) {
          const course = courses.find(c => c.id === sch.courseId);
          const subjectName = course ? course.subject : "Unknown Subject";
          const times = getTimesArray(sch.dayType);
          const currentIndex = times.indexOf(sch.time);
          let recommendedTime = "None available";
          const sectionSchedules = sectionViewSchedules.filter(s => s.dayType === sch.dayType && (s.section === section || s.section2 === section));
          for (let i = currentIndex + 1; i < times.length; i++) {
            if (!sectionSchedules.some(s => s.time === times[i])) {
              recommendedTime = times[i];
              break;
            }
          }
          if (sch.unitType === "Lec") {
            conflictMessages.push(`[Section View] [${currentSectionViewTrimester}] [${currentSectionViewYearLevel}] Lab portion missing for ${subjectName} - (${section}). Recommended slot: ${recommendedTime}.`);
          } else {
            conflictMessages.push(`[Section View] [${currentSectionViewTrimester}] [${currentSectionViewYearLevel}] Lec portion missing for ${subjectName} - (${section}). Recommended slot: ${recommendedTime}.`);
          }
        }
      }
    }

    // Check for missing room assignments but only if we're in the same trimester as Room View
    // to avoid cross-trimester validation issues
    if (currentSectionViewTrimester === currentRoomViewTrimester && 
        currentSectionViewYearLevel === currentRoomViewYearLevel) {
      for (let sch of sectionViewSchedules) {
        const roomAssignment = roomViewSchedules.find(roomSch => 
          roomSch.dayType === sch.dayType &&
          roomSch.time === sch.time && 
          roomSch.courseId === sch.courseId &&
          roomSch.unitType === sch.unitType &&
          roomSch.section === sch.section &&
          roomSch.section2 === sch.section2
        );
        
        if (!roomAssignment) {
          const course = courses.find(c => c.id === sch.courseId);
          const subjectName = course ? course.subject : "Unknown Subject";
          conflictMessages.push(`[Section View] [${currentSectionViewTrimester}] [${currentSectionViewYearLevel}] Missing room assignment for ${subjectName} - ${sch.unitType} - (${sch.section}) at ${sch.dayType} ${sch.time}.`);
        }
      }
    }

    // Check for duplicate sections in the same time slot
    let sectionTimeMap = new Map();
    for (let sch of sectionViewSchedules) {
      const sections = [sch.section, sch.section2].filter(s => s);
      for (const section of sections) {
        let key = `${sch.dayType}|${sch.time}|${section}`;
        if (!sectionTimeMap.has(key)) sectionTimeMap.set(key, []);
        sectionTimeMap.get(key).push(sch);
      }
    }
    
    sectionTimeMap.forEach((schGroup, key) => {
      if (schGroup.length > 1) {
        const parts = key.split('|');
        const dayType = parts[0];
        const time = parts[1];
        const section = parts[2];
        
        const subjects = schGroup.map(sch => {
          const course = courses.find(c => c.id === sch.courseId);
          return `${course?.subject || 'Unknown'} (${sch.unitType})`;
        }).join(', ');
        
        conflictMessages.push(`[Section View] [${currentSectionViewTrimester}] [${currentSectionViewYearLevel}] Section "${section}" has multiple classes at ${dayType} ${time}: ${subjects}`);
      }
    });

    return conflictMessages;
  }

  // Only validate the current view to avoid cross-trimester issues
  const activeSection = document.querySelector("section:not(.hidden)").id;
  let allConflicts = [];
  
  if (activeSection === "section-room-view") {
    const groupAConflicts = validateGroup(groupA, "Group A");
    const groupBConflicts = validateGroup(groupB, "Group B");
    allConflicts = [...groupAConflicts, ...groupBConflicts];
  } else if (activeSection === "section-section-view") {
    const sectionViewConflicts = validateSectionView();
    allConflicts = [...sectionViewConflicts];
  }

  if (allConflicts.length > 0) {
    showConflictNotification(allConflicts.join("\n"));
  } else {
    clearConflictNotification();
  }
}

function getTimesArray(dayType) {
  return [
    "7:30 - 8:50", "8:50 - 10:10", "10:10 - 11:30", "11:30 - 12:50",
    "12:50 - 2:10", "2:10 - 3:30", "3:30 - 4:50", "4:50 - 6:10", "6:10 - 7:30"
  ];
}

/**************************************************************
 * Conflict notification popup
 **************************************************************/
function showConflictNotification(message) {
  const popup = document.getElementById("conflict-popup");
  popup.textContent = message;
  popup.classList.remove("hidden");
}

function clearConflictNotification() {
  const popup = document.getElementById("conflict-popup");
  popup.classList.add("hidden");
}

/**************************************************************
 * Modal Show/Hide
 **************************************************************/
document.querySelectorAll(".close-button").forEach(btn => {
  btn.addEventListener("click", () => {
    const modalId = btn.getAttribute("data-close-modal");
    hideModal(document.getElementById(modalId));
  });
});
document.querySelectorAll(".modal").forEach(m => {
  m.addEventListener("click", e => {
    if (e.target.classList.contains("modal")) {
      hideModal(m);
    }
  });
});
function showModal(modal) {
  modal.classList.remove("hidden");
}
function hideModal(modal) {
  modal.classList.add("hidden");
  
  // Clear duplicate warnings if this is the course offering modal
  if (modal.id === "modal-course-offering") {
    const existingWarnings = document.querySelectorAll('.duplicate-warning, .bulk-duplicate-warning');
    existingWarnings.forEach(warning => warning.remove());
  }
}

/**************************************************************
 * INITIAL PAGE LOAD
 **************************************************************/
(async function initialLoad() {
  // Initial loading for all tables
  await renderCoursesTable();
  await renderCourseOfferingTable();
  await renderRoomsTable();
  
  // Setup trimester tabs
  setupTrimesterTabs();
  setupRoomViewTrimesterTabs();
  setupSectionViewTrimesterTabs();
  
  // Initialize section code inputs/previews
  updateSectionCodePreview();
  updateBulkSectionCodePreview();
  
  // Initialize course offering modal tabs
  initCourseOfferingTabs();
  
  // Setup modal close buttons
  setupModalCloseButtons();
  
  // Add event listeners for clear all buttons
  document.getElementById('btn-clear-courses').addEventListener('click', clearAllCourses);
  document.getElementById('btn-clear-courseOffering').addEventListener('click', clearAllCourseOfferings);
  
  // Primary navigation menu event listeners
  document.getElementById("btn-courses").addEventListener("click", openCoursesSection);
  document.getElementById("btn-course-offering").addEventListener("click", () => showSection("course-offering"));
  document.getElementById("btn-section-view").addEventListener("click", async () => {
    showSection("section-view");
    await renderSectionViewTables();
    await validateAllComplementary();
  });
  document.getElementById("btn-room-view").addEventListener("click", async () => {
    showSection("room-view");
    await renderRoomViewTables();
    await validateAllComplementary();
  });
  
  // Show Courses View by default if logged in, else show login modal
  if (isLoggedIn()) {
    openCoursesSection();
  } else {
    showModal(document.getElementById('modal-login'));
  }
})();

/**************************************************************
 * HELPER FUNCTIONS
 **************************************************************/
async function clearAllCourses() {
  if (!confirm("Are you sure you want to delete ALL courses? This will also delete all course offerings and schedule entries.")) return;
  
  showLoadingOverlay('Clearing all courses...');
  
  try {
    const courses = await apiGet("courses");
    const offerings = await apiGet("course_offerings");
    const schedules = await apiGet("schedules");
    
    // Delete schedules first (foreign key constraints)
    for (const schedule of schedules) {
      await apiDelete("schedules", schedule.id);
    }
    
    // Delete course offerings next
    for (const offering of offerings) {
      await apiDelete("course_offerings", offering.id);
    }
    
    // Delete courses last
    for (const course of courses) {
      await apiDelete("courses", course.id);
    }
    
    // Clear cache
    clearApiCache("courses");
    clearApiCache("course_offerings");
    clearApiCache("schedules");
    
    // Refresh tables
    await renderCoursesTable();
    await renderCourseOfferingTable();
    
    hideLoadingOverlay();
  } catch (error) {
    console.error("Error clearing all courses:", error);
    hideLoadingOverlay();
    alert("An error occurred while clearing all courses. Please try again.");
  }
}

// Modified clear all course offerings function to use loading overlay
async function clearAllCourseOfferings() {
  if (!confirm("Are you sure you want to delete ALL course offerings? This will also delete all schedule entries.")) return;
  
  showLoadingOverlay('Clearing all course offerings...');
  
  try {
    const offerings = await apiGet("course_offerings");
    const schedules = await apiGet("schedules");
    
    // Delete schedules first (foreign key constraints)
    for (const schedule of schedules) {
      await apiDelete("schedules", schedule.id);
    }
    
    // Delete course offerings
    for (const offering of offerings) {
      await apiDelete("course_offerings", offering.id);
    }
    
    // Clear cache
    clearApiCache("course_offerings");
    clearApiCache("schedules");
    
    // Refresh table
    await renderCourseOfferingTable();
    
    hideLoadingOverlay();
  } catch (error) {
    console.error("Error clearing all course offerings:", error);
    hideLoadingOverlay();
    alert("An error occurred while clearing all course offerings. Please try again.");
  }
}

/* 
 * Schedule Summary Section Functionality 
 */
function setupScheduleSummaryTrimesterTabs() {
  // Clone all tabs to remove existing event listeners
  const freshTabs = [];
  const freshYearTabs = [];
  
  document.querySelectorAll("#section-schedule-summary .trimester-tabs .tab-btn").forEach(tab => {
    const newTab = tab.cloneNode(true);
    tab.parentNode.replaceChild(newTab, tab);
    freshTabs.push(newTab);
  });
  
  document.querySelectorAll("#section-schedule-summary .year-level-tabs .year-tab-btn").forEach(tab => {
    const newTab = tab.cloneNode(true);
    tab.parentNode.replaceChild(newTab, tab);
    freshYearTabs.push(newTab);
  });

  // Add event listeners to trimester tabs
  freshTabs.forEach(tab => {
    tab.addEventListener("click", async () => {
      currentScheduleSummaryTrimester = tab.getAttribute("data-trimester");
      freshTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      await generateScheduleSummary();
    });
  });

  // Add event listeners to year level tabs
  freshYearTabs.forEach(tab => {
    tab.addEventListener("click", async () => {
      currentScheduleSummaryYearLevel = tab.getAttribute("data-year");
      freshYearTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      await generateScheduleSummary();
    });
  });

  // Ensure only one tab is active by default
  const activeTab = document.querySelector(`#section-schedule-summary .trimester-tabs .tab-btn[data-trimester="${currentScheduleSummaryTrimester}"]`);
  if (activeTab) {
    freshTabs.forEach(t => t.classList.remove("active"));
    activeTab.classList.add("active");
  }
  
  const activeYearTab = document.querySelector(`#section-schedule-summary .year-level-tabs .year-tab-btn[data-year="${currentScheduleSummaryYearLevel}"]`);
  if (activeYearTab) {
    freshYearTabs.forEach(t => t.classList.remove("active"));
    activeYearTab.classList.add("active");
  }
}

async function initializeScheduleSummarySection() {
  setupScheduleSummaryTrimesterTabs();
  
  const summaryContent = document.getElementById("schedule-summary-content");
  const sectionFilter = document.getElementById("summary-section-filter");
  
  // Clear previous content
  summaryContent.innerHTML = "";
  
  // Get all sections for the current trimester and year level
  const sections = await getUniqueSectionsForTrimesterAndYear(currentScheduleSummaryTrimester, currentScheduleSummaryYearLevel);
  
  // Populate section filter dropdown
  sectionFilter.innerHTML = '<option value="">All Sections</option>';
  sections.forEach(section => {
    const option = document.createElement("option");
    option.value = section;
    option.textContent = section;
    sectionFilter.appendChild(option);
  });
  
  // Remove existing event listeners and add new ones
  const newSectionFilter = sectionFilter.cloneNode(true);
  sectionFilter.parentNode.replaceChild(newSectionFilter, sectionFilter);
  newSectionFilter.addEventListener("change", generateScheduleSummary);
  
  // Remove existing event listeners and add new ones for export button
  const exportBtn = document.getElementById("btn-export-excel");
  const newExportBtn = exportBtn.cloneNode(true);
  exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
  newExportBtn.addEventListener("click", exportAllSchedulesToExcel);
  
  // Generate summary content for all sections initially
  await generateScheduleSummary();
}

/* 
 * Old showScheduleSummary function removed - now using section-based approach 
 */

async function generateScheduleSummary() {
  const summaryContent = document.getElementById("schedule-summary-content");
  const selectedSection = document.getElementById("summary-section-filter").value;
  
  // Clear previous content
  summaryContent.innerHTML = "";
  
  // Get data
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");
  const rooms = await apiGet("rooms");
  const columns = await getAllRoomColumns();
  const offerings = await apiGet("course_offerings");
  
  // Get all sections or filter by selected section
  const sections = selectedSection ? 
    [selectedSection] : 
    await getUniqueSectionsForTrimesterAndYear(currentScheduleSummaryTrimester, currentScheduleSummaryYearLevel);
  
  if (sections.length === 0) {
    summaryContent.innerHTML = '<div class="no-data-message">No sections found for the current trimester and year level.</div>';
    return;
  }
  
  for (const section of sections) {
    // Create a section container
    const sectionDiv = document.createElement("div");
    sectionDiv.className = "summary-section";
    
    // Get degree for this section
    let sectionDegree = "";
    const sectionOffering = offerings.find(off => 
      off.section === section && 
      courses.find(c => c.id === off.courseId)?.trimester === currentScheduleSummaryTrimester && 
      courses.find(c => c.id === off.courseId)?.year_level === currentScheduleSummaryYearLevel
    );
    
    if (sectionOffering) {
      sectionDegree = sectionOffering.degree || 
                      courses.find(c => c.id === sectionOffering.courseId)?.degree || 
                      "Unknown";
    } else {
      // Try to find degree from any schedule for this section
      const scheduleForSection = schedules.find(sch => 
        (sch.section === section || sch.section2 === section) &&
        courses.find(c => c.id === sch.courseId)?.trimester === currentScheduleSummaryTrimester && 
        courses.find(c => c.id === sch.courseId)?.year_level === currentScheduleSummaryYearLevel
      );
      
      if (scheduleForSection) {
        const course = courses.find(c => c.id === scheduleForSection.courseId);
        sectionDegree = course?.degree || "Unknown";
      } else {
        sectionDegree = "Unknown";
      }
    }
    
    sectionDiv.innerHTML = `<h4>Section ${section} - ${sectionDegree}</h4>`;
    
    // Get all schedules for this section
    const sectionSchedules = schedules.filter(sch => {
      const course = courses.find(c => c.id === sch.courseId);
      return (sch.section === section || sch.section2 === section) && 
             course && 
             course.trimester === currentScheduleSummaryTrimester && 
             course.year_level === currentScheduleSummaryYearLevel;
    });

    if (sectionSchedules.length === 0) {
      sectionDiv.innerHTML += '<div class="no-data-message">No schedules found for this section.</div>';
      summaryContent.appendChild(sectionDiv);
      continue;
    }

    // Create MWF and TTHS tables
    const dayTypes = ["MWF", "TTHS"];
    
    for (const dayType of dayTypes) {
      // Filter schedules for this day type and deduplicate entries
      const dayTypeSchedules = sectionSchedules
        .filter(sch => sch.dayType === dayType)
        .reduce((unique, sch) => {
          // Create a key that uniquely identifies a schedule entry
          const key = `${sch.courseId}-${sch.time}-${sch.unitType}-${sch.section}-${sch.section2}`;
          
          // If this is a Room View entry (col > 0), use it
          // If we haven't seen this schedule before, or if this is a Room View entry, keep it
          if (!unique.has(key) || sch.col > 0) {
            unique.set(key, sch);
          }
          return unique;
        }, new Map());

      // Convert back to array
      const uniqueDayTypeSchedules = Array.from(dayTypeSchedules.values());
      
      if (uniqueDayTypeSchedules.length === 0) continue;
      
      const dayTypeHeading = document.createElement("h5");
      dayTypeHeading.textContent = `${dayType} Schedule`;
      dayTypeHeading.style.marginTop = "15px";
      dayTypeHeading.style.marginBottom = "8px";
      sectionDiv.appendChild(dayTypeHeading);
      
      const table = document.createElement("table");
      table.className = "summary-table";
      
      // Create table header
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      ["Course", "Description", "Units", "Time", "Day", "Room", "Shared With"].forEach(headerText => {
        const th = document.createElement("th");
        th.textContent = headerText;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);
      
      // Create table body
      const tbody = document.createElement("tbody");
      
      // Sort schedules by time (to match Section View's top-to-bottom ordering)
      const sortedSchedules = uniqueDayTypeSchedules.sort((a, b) => {
        const times = getTimesArray(dayType);
        const timeIndexA = times.indexOf(a.time);
        const timeIndexB = times.indexOf(b.time);
        return timeIndexA - timeIndexB;
      });
      
      // Add rows sorted by time
      for (const sch of sortedSchedules) {
        const tr = document.createElement("tr");
        const course = courses.find(c => c.id === sch.courseId);
        
        // Course
        const tdCourse = document.createElement("td");
        tdCourse.textContent = course ? `${course.subject} (${sch.unitType})` : "Unknown";
        tr.appendChild(tdCourse);
        
        // Description
        const tdDescription = document.createElement("td");
        tdDescription.textContent = course && course.description ? course.description : "No description";
        tdDescription.classList.add("description-cell");
        tr.appendChild(tdDescription);
        
        // Units
        const tdUnits = document.createElement("td");
        const offering = offerings.find(off => 
          off.courseId === sch.courseId && 
          off.type === sch.unitType &&
          (off.section === sch.section || off.section === sch.section2)
        );
        tdUnits.textContent = offering ? offering.units : "N/A";
        tr.appendChild(tdUnits);
        
        // Time
        const tdTime = document.createElement("td");
        tdTime.textContent = sch.time;
        tr.appendChild(tdTime);
        
        // Day
        const tdDay = document.createElement("td");
        tdDay.textContent = dayType;
        tr.appendChild(tdDay);
        
        // Room
        const tdRoom = document.createElement("td");
        if (sch.col > 0) {
          const colIndex = sch.col - 1;
          if (colIndex >= 0 && colIndex < columns.length) {
            tdRoom.textContent = columns[colIndex];
          } else {
            tdRoom.textContent = "Not assigned";
            tdRoom.style.color = "#ff6666";
          }
        } else {
          // Find matching room view entry
          const roomViewEntry = schedules.find(roomSch => {
            return roomSch.courseId === sch.courseId &&
                   roomSch.unitType === sch.unitType &&
                   roomSch.section === sch.section &&
                   roomSch.section2 === sch.section2 &&
                   roomSch.dayType === dayType &&
                   roomSch.time === sch.time &&
                   roomSch.col > 0;
          });
          
          if (roomViewEntry && roomViewEntry.col > 0) {
            const colIndex = roomViewEntry.col - 1;
            if (colIndex >= 0 && colIndex < columns.length) {
              tdRoom.textContent = columns[colIndex];
            } else {
              tdRoom.textContent = "Not assigned";
              tdRoom.style.color = "#ff6666";
            }
          } else {
            tdRoom.textContent = "Not assigned";
            tdRoom.style.color = "#ff6666";
          }
        }
        tr.appendChild(tdRoom);
        
        // Shared With
        const tdShared = document.createElement("td");
        const sharedSection = sch.section === section ? sch.section2 : sch.section;
        tdShared.textContent = sharedSection || "None";
        tr.appendChild(tdShared);
        
        tbody.appendChild(tr);
      }
      
      table.appendChild(tbody);
      sectionDiv.appendChild(table);
    }
    
    summaryContent.appendChild(sectionDiv);
  }
  
  // Modal close button removed - schedule summary now uses section-based approach
}

// Add this new function to set up all close buttons including the schedule summary modal
function setupModalCloseButtons() {
  document.querySelectorAll('.close-button').forEach(btn => {
    const modalId = btn.getAttribute('data-close-modal');
    btn.addEventListener('click', () => {
      hideModal(document.getElementById(modalId));
    });
  });
}

/*
 * Excel Export Functionality
 */
async function exportAllSchedulesToExcel() {
  try {
    // Fetch all data
    const schedules = await apiGet("schedules");
    const courses = await apiGet("courses");
    const offerings = await apiGet("course_offerings");
    const allColumns = await getAllRoomColumns();
    const yearLevels = ["1st yr", "2nd yr", "3rd yr"];
    const trimesters = ["1st Trimester", "2nd Trimester", "3rd Trimester"];

    // Create a new Excel workbook
    const workbook = XLSX.utils.book_new();

    // Create one sheet per trimester, including all year-level schedules
    for (const trimester of trimesters) {
      const wsData = [];
      // Loop through each year level
      for (const yearLevel of yearLevels) {
        // Year-level header row
        wsData.push([yearLevel]);
        // Get all sections for this trimester & year level
        const sections = await getUniqueSectionsForTrimesterAndYear(trimester, yearLevel);
        if (sections.length === 0) {
          wsData.push([]); // spacer if no sections
          continue;
        }
        // Process each section block
        for (const section of sections) {
          // Filter section schedules
          const sectionSchedules = schedules.filter(sch => {
            const course = courses.find(c => c.id === sch.courseId);
            return (sch.section === section || sch.section2 === section) &&
                   course && course.trimester === trimester && course.year_level === yearLevel;
          });
          if (sectionSchedules.length === 0) continue;

          // Determine degree for this section
          let degree = "Unknown";
          const offeringMatch = offerings.find(off =>
            off.section === section &&
            courses.find(c => c.id === off.courseId)?.trimester === trimester &&
            courses.find(c => c.id === off.courseId)?.year_level === yearLevel
          );
          if (offeringMatch) {
            degree = offeringMatch.degree || courses.find(c => c.id === offeringMatch.courseId)?.degree || "Unknown";
          }

          // Determine group A/B based on room assignments
          let countA = 0, countB = 0;
          sectionSchedules.forEach(sch => {
            if (sch.col > 0) {
              const roomName = allColumns[sch.col - 1] || "";
              if (roomName.endsWith(" A")) countA++;
              else if (roomName.endsWith(" B")) countB++;
            }
          });
          const group = countA >= countB ? "A" : "B";

          // Section header rows
          wsData.push([`${degree}, ${yearLevel}, ${trimester}`]);
          wsData.push([`${section} - Group ${group}`]);

          // Handle schedules by day type
          for (const dayType of ["MWF", "TTHS"]) {
            const dayList = sectionSchedules.filter(sch => sch.dayType === dayType);
            if (!dayList.length) continue;
            // Column titles
            if (dayType === "MWF") {
              wsData.push(["Course", "Description", "Units", "Time", "Day", "Room", "Shared With"]);
            }
            // Deduplicate and sort by time
            const map = new Map();
            dayList.forEach(sch => {
              const key = `${sch.courseId}-${sch.time}-${sch.unitType}-${sch.section}-${sch.section2}`;
              if (!map.has(key) || sch.col > 0) map.set(key, sch);
            });
            const sorted = Array.from(map.values()).sort((a, b) => {
              const times = getTimesArray(dayType);
              return times.indexOf(a.time) - times.indexOf(b.time);
            });
            // Add rows
            sorted.forEach(sch => {
              const course = courses.find(c => c.id === sch.courseId);
              let roomName = "Not assigned";
              if (sch.col > 0) roomName = allColumns[sch.col - 1] || roomName;
              const off = offerings.find(off =>
                off.courseId === sch.courseId && off.type === sch.unitType &&
                (off.section === sch.section || off.section2 === sch.section2)
              );
              const shared = sch.section === section ? sch.section2 : sch.section;
              wsData.push([
                course ? `${course.subject} (${sch.unitType})` : "Unknown",
                course?.description || "No description",
                off?.units || "N/A",
                sch.time,
                dayType,
                roomName,
                shared || "None"
              ]);
            });
            wsData.push([]); // spacer after each day type
          }
        }
        wsData.push([]); // spacer after each year level
      }

      // Create worksheet and append
      const worksheet = XLSX.utils.aoa_to_sheet(wsData);
      // Set custom column widths for better readability
      worksheet['!cols'] = [
        {wch:25}, // Course
        {wch:50}, // Description
        {wch:7},  // Units
        {wch:12}, // Time
        {wch:7},  // Day
        {wch:15}, // Room
        {wch:12}  // Shared With
      ];
      // Freeze the first row so headers stay visible
      worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
      // Enable autofilter on the full data range
      worksheet['!autofilter'] = { ref: worksheet['!ref'] };
      // Style each header row that starts with "Course"
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const first = XLSX.utils.encode_cell({ c: 0, r: R });
        const cell = worksheet[first];
        if (cell && cell.v === 'Course') {
          for (let C = 0; C < 7; ++C) {
            const addr = XLSX.utils.encode_cell({ c: C, r: R });
            if (worksheet[addr]) {
              worksheet[addr].s = {
                fill: { fgColor: { rgb: 'FF2E7D32' } },
                font: { bold: true, color: { rgb: 'FFFFFFFF' } },
                alignment: { horizontal: 'center' }
              };
            }
          }
        }
      }
      XLSX.utils.book_append_sheet(workbook, worksheet, trimester);
    }

    // Trigger file download
    XLSX.writeFile(workbook, `All_Schedules_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    alert("Error exporting to Excel. Please try again.");
  }
}

/**************************************************************
 * Sidebar (hamburger) toggle                                 *
 **************************************************************/
(function setupSidebarToggle() {
  const toggleBtn = document.getElementById('nav-toggle');
  const navEl = document.querySelector('nav');
  if (!toggleBtn || !navEl) return;

  // Collapse by default on narrow screens
  function setInitialState() {
    const collapseNeeded = window.innerWidth < 700;
    navEl.classList.toggle('collapsed', collapseNeeded);
    document.body.classList.toggle('nav-collapsed', collapseNeeded);
    toggleBtn.classList.toggle('active', !collapseNeeded);
  }
  setInitialState();
  window.addEventListener('resize', setInitialState);

  toggleBtn.addEventListener('click', () => {
    const isCollapsed = navEl.classList.toggle('collapsed');
    document.body.classList.toggle('nav-collapsed', isCollapsed);
    toggleBtn.classList.toggle('active', !isCollapsed);
  });
  
  // Add ripple effect to sidebar buttons
  const sidebarButtons = document.querySelectorAll("nav button");
  sidebarButtons.forEach(button => {
    button.addEventListener("click", function(e) {
      // Remove any existing ripple effect
      this.classList.remove("ripple-effect");
      
      // Force a reflow to ensure the animation plays again
      void this.offsetWidth;
      
      // Add the ripple effect class
      this.classList.add("ripple-effect");
    });
    
    // Remove the animation class when it ends to allow it to be triggered again
    button.addEventListener("animationend", function() {
      this.classList.remove("ripple-effect");
    });
  });
})();

// Login modal logic (placed near other modal helpers)
const modalLogin = document.getElementById('modal-login');
if (modalLogin) {
  document.getElementById('btn-login-submit').addEventListener('click', async () => {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    try {
      await loginRequest(username, password);
      hideModal(modalLogin);
      openCoursesSection();
    } catch (err) {
      alert('Login failed. Please check your credentials.');
    }
  });
}