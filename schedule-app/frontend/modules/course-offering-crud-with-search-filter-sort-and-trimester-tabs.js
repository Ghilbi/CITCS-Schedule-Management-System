/**************************************************************
 * 7) COURSE OFFERING CRUD with Search, Filter, Sort, and Trimester Tabs
 **************************************************************/
// tableCourseOfferingBody, btnAddCourseOffering, modalCourseOffering, courseOfferingIdInput, courseOfferingCourseSelect, courseOfferingSectionInput, btnSaveCourseOffering, offeringSearch are defined in 03-global-variables-for-room-view-columns.js
// const courseOfferingSectionInput = document.getElementById("courseOffering-section"); // now global
const courseOfferingUnitsInput = document.getElementById("courseOffering-units");
const courseOfferingTrimesterInput = document.getElementById("courseOffering-trimester");
// const btnSaveCourseOffering = document.getElementById("btn-save-courseOffering"); // now global
// const offeringSearch = document.getElementById("offering-search"); // now global
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

let currentTrimesterFilter = "1st Trimester";

// Validation helper functions
function showValidationFeedback(inputElement, message) {
  // Remove any existing feedback
  clearValidationFeedback(inputElement);
  
  // Create feedback element
  const feedback = document.createElement('div');
  feedback.className = 'validation-feedback';
  feedback.textContent = message;
  feedback.style.color = '#dc3545';
  feedback.style.fontSize = '0.875rem';
  feedback.style.marginTop = '4px';
  feedback.style.display = 'block';
  
  // Add feedback after the input element
  inputElement.parentNode.insertBefore(feedback, inputElement.nextSibling);
  
  // Add error styling to input
  inputElement.style.borderColor = '#dc3545';
  inputElement.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    clearValidationFeedback(inputElement);
  }, 3000);
}

function clearValidationFeedback(inputElement) {
  // Remove feedback element
  const feedback = inputElement.parentNode.querySelector('.validation-feedback');
  if (feedback) {
    feedback.remove();
  }
  
  // Reset input styling
  inputElement.style.borderColor = '';
  inputElement.style.boxShadow = '';
}

// Function to update the section code preview for manual entry
async function updateSectionCodePreview() {
  const year = courseOfferingYearSelect.value;
  const sectionLetter = courseOfferingSectionLetter.value.toUpperCase();
  let sectionCode;
  
  if (year === "INTERNATIONAL") {
    sectionCode = "INTERNATIONAL " + sectionLetter;
  } else {
    sectionCode = year + sectionLetter;
  }
  
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
          
          // Auto-hide the warning after 5 seconds
          setTimeout(() => {
            if (warningEl && warningEl.parentNode) {
              warningEl.remove();
            }
          }, 5000);
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
      
      // Check each section code for any existing offerings
      for (const sectionCode of sectionCodes) {
        // Get all existing offerings for this section and trimester
        const offerings = await apiGet("course_offerings");
        const existingOfferings = offerings.filter(off => 
          off.section === sectionCode && off.trimester === selectedTrimester
        );
        
        if (existingOfferings.length > 0) {
          hasDuplicates = true;
          const courses = await apiGet("courses");
          
          // Group by course to show cleaner messages
          const courseGroups = {};
          existingOfferings.forEach(off => {
            const course = courses.find(c => c.id === off.courseId);
            const courseName = course ? course.subject : 'Unknown Course';
            if (!courseGroups[courseName]) {
              courseGroups[courseName] = [];
            }
            courseGroups[courseName].push(off.type);
          });
          
          // Create warning messages
          Object.entries(courseGroups).forEach(([courseName, types]) => {
            const warningEl = document.createElement('div');
            warningEl.textContent = `Warning: Section "${sectionCode}" already has "${courseName}" (${types.join(', ')}) in ${selectedTrimester}`;
            warningEl.style.margin = '3px 0';
            warningsContainer.appendChild(warningEl);
          });
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
        
        // Auto-hide the bulk warnings after 8 seconds (longer since there might be multiple warnings)
        setTimeout(() => {
          if (warningsContainer && warningsContainer.parentNode) {
            warningsContainer.remove();
          }
        }, 8000);
      }
    }
  }
}

// Add event listeners to update the section code preview when year or letter changes
courseOfferingYearSelect.addEventListener('change', async function() {
  await updateSectionCodePreview().catch(error => console.error("Error checking for duplicates:", error));
  // Refresh course dropdown to filter out already added courses for this section
  await populateCourseOfferingCourses().catch(error => console.error("Error populating courses:", error));
});
courseOfferingSectionLetter.addEventListener('input', async function() {
  // Only allow alphabetical characters (A-Z, a-z)
  const value = this.value;
  const alphabeticalOnly = value.replace(/[^A-Za-z]/g, '');
  
  if (value !== alphabeticalOnly) {
    this.value = alphabeticalOnly;
    // Show validation feedback
    showValidationFeedback(this, 'Only alphabetical characters are allowed for section letters.');
  } else {
    // Clear any existing validation feedback
    clearValidationFeedback(this);
  }
  
  await updateSectionCodePreview().catch(error => console.error("Error checking for duplicates:", error));
  // Refresh course dropdown to filter out already added courses for this section
  await populateCourseOfferingCourses().catch(error => console.error("Error populating courses:", error));
});

// Add event listener for the section letters in bulk mode
courseOfferingSectionLetters.addEventListener('input', function() {
  // Only allow alphabetical characters, commas, hyphens, and spaces (A-Z, a-z, ,, -, space)
  const value = this.value;
  const validCharsOnly = value.replace(/[^A-Za-z,\-\s]/g, '');
  
  if (value !== validCharsOnly) {
    this.value = validCharsOnly;
    // Show validation feedback
    showValidationFeedback(this, 'Only alphabetical characters, commas, and hyphens are allowed for section letters.');
  } else {
    // Clear any existing validation feedback
    clearValidationFeedback(this);
  }
  
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
  
  // Filter by active curriculum first
  if (window.ActiveCurriculumManager) {
    const activeCurriculum = window.ActiveCurriculumManager.getActiveCurriculum();
    coursesList = coursesList.filter(c => (c.curriculum || activeCurriculum) === activeCurriculum);
  }
  
  // Get the selected degree filter value - use the manual tab's degree filter
  const degreeFilter = document.getElementById("courseOffering-degree").value;
  
  // Get the selected trimester filter value from manual add section
  const trimesterFilter = document.querySelector('input[name="manualTrimester"]:checked').value;
  const internationalSelected = courseOfferingYearSelect.value === "INTERNATIONAL";
  
  // Filter by trimester if selected
  if (trimesterFilter && !internationalSelected) {
    coursesList = coursesList.filter(c => c.trimester === trimesterFilter);
  }
  
  // Filter by degree if selected
  if (degreeFilter && !internationalSelected) {
    coursesList = coursesList.filter(c => c.degree === degreeFilter);
  }
  
  // Get the current section to filter out already added courses
  const yearValue = courseOfferingYearSelect.value;
  const sectionLetter = courseOfferingSectionLetter.value.trim().toUpperCase();
  
  // If both year and section letter are selected, filter out already added courses
  if (yearValue && sectionLetter) {
    const currentSection = yearValue === "INTERNATIONAL" ? `INTERNATIONAL ${sectionLetter}` : `${yearValue}${sectionLetter}`;
    const existingOfferings = await apiGet("course_offerings");
    
    // Get course IDs that already have offerings for this section
    const existingCourseIds = new Set(
      existingOfferings
        .filter(off => off.section === currentSection)
        .map(off => off.courseId)
    );
    
    // Filter out courses that already have offerings for this section
    coursesList = coursesList.filter(c => !existingCourseIds.has(c.id));
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
  
  // Apply restrictions based on degree (INTERNATIONAL is always available)
  if (selectedDegree === "BSIT") {
    // For BSIT, only 1st year (value="1") and INTERNATIONAL are available
    document.querySelectorAll('#courseOffering-year option[value="2"], #courseOffering-year option[value="3"]').forEach(option => {
      option.disabled = true;
    });
    // INTERNATIONAL remains enabled
    document.querySelector('#courseOffering-year option[value="INTERNATIONAL"]').disabled = false;
    courseOfferingYearSelect.value = "1";
  } 
  else if (selectedDegree === "BSIT(Webtech)" || selectedDegree === "BSIT(NetSec)" || selectedDegree === "BSIT(ERP)") {
    // For specialization tracks, 1st year is not available but INTERNATIONAL is
    document.querySelector('#courseOffering-year option[value="1"]').disabled = true;
    // INTERNATIONAL remains enabled
    document.querySelector('#courseOffering-year option[value="INTERNATIONAL"]').disabled = false;
    
    // If current selection is 1st year, change to 2nd year
    if (courseOfferingYearSelect.value === "1") {
      courseOfferingYearSelect.value = "2";
    }
  }
  
  // Update the section code preview
  await updateSectionCodePreview();
});

// Add event listeners for trimester radio buttons in manual add section
document.querySelectorAll('input[name="manualTrimester"]').forEach(radio => {
  radio.addEventListener('change', async function() {
    // Update course list based on trimester filter
    await populateCourseOfferingCourses();
  });
});

// We don't need to add functionality to the bulk degree dropdown as it's only used on the button click

// Add event listener to control year level options based on selected degree in bulk add
document.getElementById("courseOffering-degree-bulk").addEventListener("change", function() {
  const selectedDegree = this.value;
  
  // Get all year level radio buttons
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
  } 
  else if (selectedDegree === "BSIT(Webtech)" || selectedDegree === "BSIT(NetSec)" || selectedDegree === "BSIT(ERP)") {
    // For specialization tracks, 1st year is not selectable
    year1st.disabled = true;
    year2nd.disabled = false;
    year3rd.disabled = false;
    year1st.parentElement.style.opacity = 0.5;
    
    // If 1st year was selected, change to 2nd year
    if (year1st.checked) {
      year2nd.checked = true;
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
  document.body.style.overflow = 'auto'; // Restore scrolling
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
  
  // Get all courses for the selected degree to check for duplicates
  let coursesToAdd = await apiGet("courses");
  
  // Filter by active curriculum first
  if (window.ActiveCurriculumManager) {
    const activeCurriculum = window.ActiveCurriculumManager.getActiveCurriculum();
    coursesToAdd = coursesToAdd.filter(course => (course.curriculum || activeCurriculum) === activeCurriculum);
  }
  
  coursesToAdd = coursesToAdd.filter(course =>
    course.degree === selectedDegree &&
    (!selectedTrimesterBulk || course.trimester === selectedTrimesterBulk)
  );
  
  // Apply year level filter if one is selected
  if (selectedYearLevel) {
    coursesToAdd = coursesToAdd.filter(course => course.year_level === selectedYearLevel);
  }
  
  // Check for duplicate course offerings (same course, same section, same trimester)
  const duplicateOfferings = [];
  const existingOfferings = await apiGet("course_offerings");
  
  for (const course of coursesToAdd) {
    for (const section of sections) {
      // Check if this course already exists in this section and trimester
      const existingOffering = existingOfferings.find(off => 
        off.courseId == course.id && 
        off.section === section && 
        off.trimester === course.trimester
      );
      
      if (existingOffering) {
        duplicateOfferings.push(`${course.subject} (${existingOffering.type}) already exists in section ${section} for ${course.trimester}`);
      }
    }
  }
  
  if (duplicateOfferings.length > 0) {
    showConflictNotification("Duplicate course offerings detected:\n" + duplicateOfferings.join("\n"));
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
    
    // Clear caches so Section View sees the latest offerings immediately
    clearApiCache('course_offerings');
    clearApiCache('courses');
    
    // If Section View is visible, refresh it to reflect new offerings (including International)
    try {
      const sectionEl = document.getElementById('section-section-view');
      if (sectionEl && !sectionEl.classList.contains('hidden')) {
        if (typeof requestSectionViewRefresh === 'function') {
          requestSectionViewRefresh();
        } else {
          await renderSectionViewTables();
          await validateAllComplementary(); // Debounced validation
        }
      }
    } catch (e) {
      console.error('Section View refresh after bulk add failed:', e);
    }
  } catch (error) {
    console.error("Error adding all courses:", error);
    hideLoadingOverlay();
    alert("An error occurred while adding all courses. Please try again.");
  }
});

// Add a helper function to check for duplicate sections before the btnSaveCourseOffering handler
// Function to check if a section already exists in course offerings
async function checkDuplicateSection(section, trimester, courseId = null, id = null, type = null) {
  const offerings = await apiGet("course_offerings");
  const courses = await apiGet("courses");
  
  // Filter offerings for the exact same course, section, trimester, and type combination
  const duplicates = offerings.filter(off => {
    // Skip comparing with the current offering if we're editing
    if (id && off.id == id) return false;
    
    // Check for duplicates of the same course, section, trimester, AND type
    // This allows Lec and Lab to coexist for the same course/section/trimester
    return off.courseId == courseId && off.section === section && off.trimester === trimester && off.type === type;
  });
  
  if (duplicates.length > 0) {
    // Find details about the duplicate for better error messages
    const duplicate = duplicates[0];
    const course = courses.find(c => c.id === duplicate.courseId);
    const degree = duplicate.degree || (course ? course.degree : "Unknown");
    return {
      isDuplicate: true,
      message: `Duplicate offering: "${course ? course.subject : 'Unknown'}" (${type}) is already offered for section "${section}" in ${trimester}`
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
  document.querySelector('input[id="year-1st-bulk"]').checked = true; // Reset year level to "1st Year"
  
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
  const isInternationalYear = courseOfferingYearSelect.value === "INTERNATIONAL";
  if (isInternationalYear) {
    const manualTrim = document.querySelector('input[name="manualTrimester"]:checked').value;
    courseOfferingTrimesterInput.value = manualTrim || "";
  } else {
    courseOfferingTrimesterInput.value = trimester || "";
  }
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
    filteredOfferings = filteredOfferings.filter(off => off.trimester === currentTrimesterFilter);
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
    
    let categoryKey;
    
    // Check if this is an INTERNATIONAL section
    if (off.section && off.section.startsWith("INTERNATIONAL ")) {
      categoryKey = "International";
    } else {
      const yearPrefix = off.section ? off.section.charAt(0) : "?";
      const yearLabel = 
        yearPrefix === "1" ? "1st Year" :
        yearPrefix === "2" ? "2nd Year" :
        yearPrefix === "3" ? "3rd Year" : "Other";
      
      categoryKey = `${yearLabel} - ${degree}`;
    }
    
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
    
    // Further group by section
    const sectionGroups = {};
    offerings.forEach(off => {
      const section = off.section || 'Unassigned';
      
      if (!sectionGroups[section]) {
        sectionGroups[section] = [];
      }
      
      sectionGroups[section].push(off);
    });
    
    // Create category group
    const categoryGroup = document.createElement('div');
    categoryGroup.className = 'category-group';
    
    // Create header
    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'category-header';
    categoryHeader.innerHTML = `
      <span>${categoryKey}</span>
      <span class="category-count">${Object.keys(sectionGroups).length}</span>
    `;
    
    // Create content container
    const categoryContent = document.createElement('div');
    categoryContent.className = 'category-content';
    
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
        <button class="section-delete-btn" onclick="deleteSection('${section}', '${categoryKey}'); event.stopPropagation();" title="Delete Section">×</button>
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
        const trimester = off ? off.trimester : (course ? course.trimester : "");
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
            <div class="action-buttons-container">
              <button class="action-edit-btn" onclick="editCourseOffering(${off.id})">Edit</button>
              <button class="action-delete-btn" onclick="deleteCourseOffering(${off.id})">Delete</button>
            </div>
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
  let trimester = selectedOption ? selectedOption.getAttribute("data-trimester") : "";
  const degree = document.getElementById("courseOffering-selected-degree").value;
  const checkedRadio = document.querySelector('input[name="courseOfferingType"]:checked');
  const type = checkedRadio ? checkedRadio.value : "";
  let units = courseOfferingUnitsInput.value;
  const isInternationalYear = courseOfferingYearSelect.value === "INTERNATIONAL";
  if (isInternationalYear) {
    const manualTrim = document.querySelector('input[name="manualTrimester"]:checked').value;
    if (!manualTrim) {
      alert("Please select a trimester for International sections.");
      return;
    }
    trimester = manualTrim;
  }
  
  if (!courseId || !section || !type) {
    alert("Please fill out all fields.");
    return;
  }
  
  // Check for duplicate section (include type to allow Lec/Lab coexistence)
  const duplicateCheck = await checkDuplicateSection(section, trimester, courseId, id, type);
  if (duplicateCheck.isDuplicate) {
    showConflictNotification(duplicateCheck.message);
    return;
  }
  
  // Validate section based on degree (skip validation for INTERNATIONAL sections)
  if (section && section.length >= 2 && !section.startsWith("INTERNATIONAL ")) {
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
    // For new Lec/Lab courses, check duplicates for both Lec and Lab separately
    const lecDuplicateCheck = await checkDuplicateSection(section, trimester, courseId, null, "Lec");
    const labDuplicateCheck = await checkDuplicateSection(section, trimester, courseId, null, "Lab");
    
    if (lecDuplicateCheck.isDuplicate) {
      showConflictNotification(lecDuplicateCheck.message);
      return;
    }
    
    if (labDuplicateCheck.isDuplicate) {
      showConflictNotification(labDuplicateCheck.message);
      return;
    }
    
    // Create both Lec and Lab entries
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
  clearApiCache('courses');
  clearApiCache('course_offerings');
  await renderCourseOfferingTable();
  await forceValidateAllComplementary();
  // If Section View is visible, refresh it to reflect offering changes (including International)
  try {
    const sectionEl = document.getElementById('section-section-view');
    if (sectionEl && !sectionEl.classList.contains('hidden')) {
      if (typeof requestSectionViewRefresh === 'function') {
        requestSectionViewRefresh();
      } else {
        await renderSectionViewTables();
        await validateAllComplementary(); // Debounced validation
      }
    }
  } catch (e) {
    console.error('Section View refresh after offering save failed:', e);
  }
});

window.editCourseOffering = async function(id) {
  const offerings = await apiGet("course_offerings");
  const courses = await apiGet("courses");
  const offering = offerings.find(off => off.id == id);
  if (!offering) return;
  
  // Reset the degree filter when editing
  document.getElementById("courseOffering-degree").value = "";
  // Reset year level to "1st Year"
  document.querySelector('input[id="year-1st-bulk"]').checked = true;
  
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
      
      // Auto-hide the warning after 5 seconds
      setTimeout(() => {
        if (warningEl && warningEl.parentNode) {
          warningEl.remove();
        }
      }, 5000);
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
  clearApiCache('courses');
  clearApiCache('course_offerings');
  await renderCourseOfferingTable();
  await forceValidateAllComplementary();
  // Refresh Section View if visible to reflect deletion
  try {
    const sectionEl = document.getElementById('section-section-view');
    if (sectionEl && !sectionEl.classList.contains('hidden')) {
      if (typeof requestSectionViewRefresh === 'function') {
        requestSectionViewRefresh();
      } else {
        await renderSectionViewTables();
        await validateAllComplementary(); // Debounced validation
      }
    }
  } catch (e) {
    console.error('Section View refresh after offering delete failed:', e);
  }
};

window.deleteSection = async function(section, categoryKey) {
  if (!confirm(`Are you sure you want to delete section "${section}" and all its contents? This will also remove any associated schedules.`)) return;
  
  // Find the delete button that was clicked
  const deleteButton = event.target;
  const originalContent = deleteButton.innerHTML;
  
  try {
    // Show loading state
    deleteButton.innerHTML = '⟳';
    deleteButton.style.animation = 'spin 1s linear infinite';
    deleteButton.disabled = true;
    
    // Get all course offerings for this section
    const offerings = await apiGet("course_offerings");
    const sectionOfferings = offerings.filter(off => off.section === section);
    
    // Get all schedules that reference this section
    const schedules = await apiGet("schedules");
    const sectionSchedules = schedules.filter(sch => sch.section === section || sch.section2 === section);
    
    // Delete all schedules for this section
    for (const schedule of sectionSchedules) {
      await apiDelete("schedules", schedule.id);
    }
    
    // Delete all course offerings for this section
    for (const offering of sectionOfferings) {
      await apiDelete("course_offerings", offering.id);
    }
    
    // Refresh the table and validate complementary courses
    clearApiCache('courses');
    clearApiCache('course_offerings');
    clearApiCache('schedules');
    await renderCourseOfferingTable();
    await validateAllComplementary(); // Debounced validation
    
    // Refresh Section View if visible to reflect section deletion
    try {
      const sectionEl = document.getElementById('section-section-view');
      if (sectionEl && !sectionEl.classList.contains('hidden')) {
        if (typeof requestSectionViewRefresh === 'function') {
          requestSectionViewRefresh();
        } else {
          await renderSectionViewTables();
          await validateAllComplementary(); // Debounced validation
        }
      }
    } catch (e) {
      console.error('Section View refresh after section delete failed:', e);
    }
    
    alert(`Section "${section}" and all its contents have been deleted successfully.`);
  } catch (error) {
    console.error('Error deleting section:', error);
    alert('An error occurred while deleting the section. Please try again.');
    
    // Restore button state on error
    deleteButton.innerHTML = originalContent;
    deleteButton.style.animation = '';
    deleteButton.disabled = false;
  }
};

// Debounced controls for Course Offerings
offeringSearch.addEventListener("input", debounce(renderCourseOfferingTable, 200));
offeringFilterType.addEventListener("change", debounce(renderCourseOfferingTable, 200));
offeringSort.addEventListener("change", debounce(renderCourseOfferingTable, 200));

// Listen for active curriculum changes and refresh course offerings
if (window.ActiveCurriculumManager) {
  window.ActiveCurriculumManager.addActiveCurriculumChangeListener(async () => {
    // Refresh the course dropdown when curriculum changes
    await populateCourseOfferingCourses();
    // Refresh the course offering table
    await renderCourseOfferingTable();
  });
}

// Collapsible filter functionality for Course Offerings
const offeringFilterToggleBtn = document.getElementById("offering-filter-toggle-btn");
const offeringFilterSection = document.getElementById("offering-filter-section");

if (offeringFilterToggleBtn && offeringFilterSection) {
  offeringFilterToggleBtn.addEventListener("click", () => {
    offeringFilterSection.classList.toggle("collapsed");
    offeringFilterToggleBtn.classList.toggle("active");
    
    // Update the text and arrow
    const filterText = offeringFilterToggleBtn.querySelector(".filter-text");
    const filterArrow = offeringFilterToggleBtn.querySelector(".filter-arrow");
    
    if (offeringFilterSection.classList.contains("collapsed")) {
      if (filterText) filterText.textContent = "Show Filters";
      if (filterArrow) filterArrow.textContent = "▼";
    } else {
      if (filterText) filterText.textContent = "Hide Filters";
      if (filterArrow) filterArrow.textContent = "▲";
    }
  });
}

