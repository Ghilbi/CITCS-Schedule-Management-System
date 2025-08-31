/**************************************************************
 * SECTION VIEW FUNCTIONALITY (Existing)
 **************************************************************/
// Removed View Sections functionality

/**************************************************************
 * NEW SECTION VIEW: Trimester Tabs, Headers, and Tables
 **************************************************************/
// Global state variables are now managed in 00-1-global-state-manager.js

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

  const sections = await getUniqueSectionsForTrimesterAndYear(currentSectionViewTrimester, currentSectionViewYearLevel);
  
  // Show message if no sections found
  if (sections.length === 0) {
    const noSectionsMsg = document.createElement("div");
    noSectionsMsg.textContent = `No sections found for ${currentSectionViewYearLevel} in ${currentSectionViewTrimester}`;
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

