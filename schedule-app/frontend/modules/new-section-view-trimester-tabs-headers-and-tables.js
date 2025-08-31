/**************************************************************
 * NEW SECTION VIEW: Trimester Tabs, Headers, and Tables
 **************************************************************/
// Global state variables are now managed in 00-1-global-state-manager.js

function setupSectionViewTrimesterTabs() {
  // Global state is now managed in 00-1-global-state-manager.js
  
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
      
      setSectionViewState(btn.dataset.trimester, null);
      
      // Update content immediately without animations
      await renderSectionViewTables();
      await validateAllComplementary(); // Debounced validation
    });
  });
  
  // Add year level tab functionality for Section View (to the new elements)
  document.querySelectorAll("#section-section-view .year-level-tabs .year-tab-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll("#section-section-view .year-level-tabs .year-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      setSectionViewState(null, btn.dataset.year);
      
      // Update content immediately without animations
      await renderSectionViewTables();
      await validateAllComplementary(); // Debounced validation
    });
  });
  
  // Re-apply active classes based on current selections
  const sectionState = getSectionViewState();
  document.querySelector(`#section-section-view .trimester-tabs .tab-btn[data-trimester="${sectionState.trimester}"]`).classList.add("active");
  document.querySelector(`#section-section-view .year-level-tabs .year-tab-btn[data-year="${sectionState.yearLevel}"]`).classList.add("active");
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

// isRenderingSectionView is defined in 12-section-view-functionality-existing.js

async function renderSectionViewTables() {
  // Prevent concurrent rendering to avoid duplication
  if (isRenderingSectionView) {
    return;
  }
  
  isRenderingSectionView = true;
  
  try {
    // Clear the container first to prevent duplication, but preserve the remove button
    const container = document.getElementById("section-view-container");
    
    // Remove transition styles
    container.style.transition = "";
    
    // Remove only table containers, preserve the remove button
    const tableContainers = container.querySelectorAll('.table-container');
    tableContainers.forEach(tc => tc.remove());
    
    // Also remove any "no sections" messages
     const noSectionsMessages = container.querySelectorAll('div:not(.remove-all-btn-small):not(button)');
     noSectionsMessages.forEach(msg => {
       if (msg.textContent && msg.textContent.includes('No sections found')) {
         msg.remove();
       }
     });
     
     // Ensure the remove button exists
     if (!container.querySelector('#btn-remove-all-schedules')) {
       const removeBtn = document.createElement('button');
       removeBtn.id = 'btn-remove-all-schedules';
       removeBtn.className = 'remove-all-btn-small';
       removeBtn.innerHTML = '<span class="btn-icon">🗑️</span><span class="btn-text">Clear All</span>';
       container.appendChild(removeBtn);
     }

  const sectionState = getSectionViewState();
  const sections = await getUniqueSectionsForTrimesterAndYear(sectionState.trimester, sectionState.yearLevel);
  
  // Show message if no sections found
  if (sections.length === 0) {
    const noSectionsMsg = document.createElement("div");
    noSectionsMsg.textContent = `No sections found for ${sectionState.yearLevel} in ${sectionState.trimester}`;
    noSectionsMsg.style.textAlign = "center";
    noSectionsMsg.style.padding = "20px";
    noSectionsMsg.style.color = "#666";
    noSectionsMsg.style.marginBottom = "60px"; // Add margin to avoid overlapping with button
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
                 course.trimester === sectionState.trimester &&
                 course.year_level === sectionState.yearLevel &&
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
          
          // Check if this is an international section to exclude (BSIT) display
          const isInternational = sch.section && sch.section.startsWith("INTERNATIONAL ");
          
          let cellContent = course ? 
            (isInternational ? 
              `${course.subject}<br>${sch.unitType}` : 
              `${course.subject} (${degree})<br>${sch.unitType}`) : 
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
                     sCourse.trimester === sectionState.trimester &&
                     sCourse.year_level === sectionState.yearLevel;
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
// modalSectionView is defined in 14-new-section-view-modal-open-populate-and-save.js

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
  const sectionState = getSectionViewState();
  const existing = schedules.find(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    return course && course.trimester === sectionState.trimester &&
           course && course.year_level === sectionState.yearLevel &&
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
             course.trimester === sectionState.trimester &&
             course.year_level === sectionState.yearLevel &&
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
  const sectionState = getSectionViewState();
  const existingRoomViewEntry = existingId ? 
    schedules.find(sch => {
      const course = courses.find(c => c.id === sch.courseId);
      return sch.id.toString() === existingId && 
             sch.col === 0 && // Section View entry
             course && 
             course.trimester === sectionState.trimester && 
             course.year_level === sectionState.yearLevel;
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
             course.trimester === sectionState.trimester && 
             course.year_level === sectionState.yearLevel &&
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
           course.trimester === sectionState.trimester; // Check all year levels in current trimester
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
  const schedules = await apiGet("schedules");
  const sectionviewCourseOfferingSelect = document.getElementById("sectionview-courseOffering");
  sectionviewCourseOfferingSelect.innerHTML = `<option value="">-- Select Course Offering --</option>`;
  
  // Get already scheduled subjects for this section to exclude them
  const scheduledSubjects = new Set();
  schedules.forEach(sch => {
    if (sch.col === 0 && (sch.section === section || sch.section2 === section)) {
      const course = courses.find(c => c.id === sch.courseId);
      const sectionState = getSectionViewState();
      if (course && course.trimester === sectionState.trimester && course.year_level === sectionState.yearLevel) {
        // Create a unique key for subject + unit type to allow different components (Lec/Lab)
        scheduledSubjects.add(`${course.subject}_${sch.unitType}`);
      }
    }
  });
  
  // Filter offerings that match the current trimester and year level
  const sectionState = getSectionViewState();
  const filteredOfferings = offerings.filter(off => {
    const course = courses.find(c => c.id === off.courseId);
    return off.section === section && 
           off.trimester === sectionState.trimester && 
           course && course.year_level === sectionState.yearLevel;
  });
  
  // If no offerings found with exact section match, show all offerings for the current trimester and year level
  let offeringsToShow = filteredOfferings;
  if (offeringsToShow.length === 0) {
    offeringsToShow = offerings.filter(off => {
      const course = courses.find(c => c.id === off.courseId);
      return off.trimester === sectionState.trimester && 
             course && course.year_level === sectionState.yearLevel;
    });
  }
  
  // Filter out already scheduled subjects
  offeringsToShow = offeringsToShow.filter(off => {
    const course = courses.find(c => c.id === off.courseId);
    if (!course) return false;
    const subjectKey = `${course.subject}_${off.type}`;
    return !scheduledSubjects.has(subjectKey);
  });
  
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
      // Check if this is an international section to exclude (BSIT) display
      const isInternational = group.section && group.section.startsWith("INTERNATIONAL ");
      const displayText = isInternational ? 
        `${group.subject} - ${group.section}` : 
        `${group.subject} (${group.degree}) - ${group.section}`;
      sectionviewCourseOfferingSelect.innerHTML += `<option value="${lecOffering.id}" data-course-id="${lecOffering.courseId}" data-unit-type="${lecOffering.type}">${displayText}</option>`;
    } else {
      // For non-LecLab subjects, show each offering with its type
      group.offerings.forEach(off => {
        // Check if this is an international section to exclude (BSIT) display
        const isInternational = off.section && off.section.startsWith("INTERNATIONAL ");
        const displayText = isInternational ? 
          `${group.subject} - ${off.type} - ${off.section}` : 
          `${group.subject} (${group.degree}) - ${off.type} - ${off.section}`;
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
  const sectionState = getSectionViewState();
  offerings.forEach(off => {
    const course = courses.find(c => c.id === off.courseId);
    if (course && 
        course.trimester === sectionState.trimester && 
        course.year_level === sectionState.yearLevel && 
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

