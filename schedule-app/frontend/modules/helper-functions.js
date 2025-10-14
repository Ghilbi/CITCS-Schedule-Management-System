/**************************************************************
 * HELPER FUNCTIONS
 **************************************************************/
// Original clearAllCourses function removed - replaced by selective deletion functionality

// Selective course deletion function
async function selectiveClearCourses(deletionType, filters = {}) {
  showLoadingOverlay('Deleting courses...');
  
  try {
    const courses = await apiGet("courses");
    const offerings = await apiGet("course_offerings");
    const schedules = await apiGet("schedules");
    
    let coursesToDelete = [];
    
    // Filter courses based on deletion type
    switch (deletionType) {
      case 'all':
        coursesToDelete = courses;
        break;
      case 'year-level':
        coursesToDelete = courses.filter(course => course.year_level === filters.yearLevel);
        break;
      case 'trimester':
        coursesToDelete = courses.filter(course => course.trimester === filters.trimester);
        break;
      case 'degree':
        coursesToDelete = courses.filter(course => course.degree === filters.degree);
        break;
      default:
        throw new Error('Invalid deletion type');
    }
    
    if (coursesToDelete.length === 0) {
      hideLoadingOverlay();
      alert('No courses found matching the selected criteria.');
      return;
    }
    
    const courseIds = coursesToDelete.map(course => course.id);
    
    // Find related offerings and schedules
    const relatedOfferings = offerings.filter(offering => courseIds.includes(offering.courseId));
    const relatedSchedules = schedules.filter(schedule => courseIds.includes(schedule.courseId));
    
    // Delete schedules first (foreign key constraints)
    for (const schedule of relatedSchedules) {
      await apiDelete("schedules", schedule.id);
    }
    
    // Delete course offerings next
    for (const offering of relatedOfferings) {
      await apiDelete("course_offerings", offering.id);
    }
    
    // Delete courses last
    for (const course of coursesToDelete) {
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
    
    // Show success message
    const deletedCount = coursesToDelete.length;
    const relatedCount = relatedOfferings.length + relatedSchedules.length;
    alert(`Successfully deleted ${deletedCount} course(s) and ${relatedCount} related offering(s) and schedule(s).`);
    
  } catch (error) {
    console.error("Error in selective course deletion:", error);
    hideLoadingOverlay();
    alert("An error occurred while deleting courses. Please try again.");
  }
}

// Function to count courses for deletion preview
async function countCoursesForDeletion(deletionType, filters = {}) {
  try {
    const courses = await apiGet("courses");
    const offerings = await apiGet("course_offerings");
    const schedules = await apiGet("schedules");
    
    let coursesToDelete = [];
    
    switch (deletionType) {
      case 'all':
        coursesToDelete = courses;
        break;
      case 'year-level':
        coursesToDelete = courses.filter(course => course.year_level === filters.yearLevel);
        break;
      case 'trimester':
        coursesToDelete = courses.filter(course => course.trimester === filters.trimester);
        break;
      case 'degree':
        coursesToDelete = courses.filter(course => course.degree === filters.degree);
        break;
      default:
        return { courses: 0, offerings: 0, schedules: 0 };
    }
    
    const courseIds = coursesToDelete.map(course => course.id);
    const relatedOfferings = offerings.filter(offering => courseIds.includes(offering.courseId));
    const relatedSchedules = schedules.filter(schedule => courseIds.includes(schedule.courseId));
    
    return {
      courses: coursesToDelete.length,
      offerings: relatedOfferings.length,
      schedules: relatedSchedules.length
    };
  } catch (error) {
    console.error("Error counting courses for deletion:", error);
    return { courses: 0, offerings: 0, schedules: 0 };
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
    
    // Check if this is an international section to exclude degree display
    const isInternational = section && section.startsWith("INTERNATIONAL ");
    sectionDiv.innerHTML = isInternational ? 
      `<h4>Section ${section}</h4>` : 
      `<h4>Section ${section} - ${sectionDegree}</h4>`;
    
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
            tdRoom.style.color = window.colorUtils ? window.colorUtils.roomError : "#ff6666";
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
              tdRoom.style.color = window.colorUtils ? window.colorUtils.roomError : "#ff6666";
            }
          } else {
            tdRoom.textContent = "Not assigned";
            tdRoom.style.color = window.colorUtils ? window.colorUtils.roomError : "#ff6666";
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
// Utility: load image as base64 data URL for embedding in Excel
async function loadImageAsBase64(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function exportAllSchedulesToExcel() {
  try {
    showLoadingOverlay('Preparing Excel export...');

    const [schedules, courses, offerings, allColumns] = await Promise.all([
      apiGet('schedules'),
      apiGet('courses'),
      apiGet('course_offerings'),
      getAllRoomColumns()
    ]);

    const yearLevels = ['1st yr', '2nd yr', '3rd yr'];
    const trimesters = ['1st Trimester', '2nd Trimester', '3rd Trimester'];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CITCS Schedule App';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Compute School Year label (SY YYYY - YYYY+1)
    const now = new Date();
    const syStartYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1; // Start around June
    const schoolYearLabel = `${syStartYear} - ${syStartYear + 1}`;

    for (const trimester of trimesters) {
      const sheet = workbook.addWorksheet(trimester, {
        properties: { defaultRowHeight: 18 }
      });

      // Set columns with widths and number formatting (no auto header row)
      sheet.columns = [
        { key: 'course', width: 25 },
        { key: 'desc', width: 50 },
        { key: 'units', width: 7, style: { numFmt: '0' } },
        { key: 'time', width: 12 },
        { key: 'day', width: 7 },
        { key: 'room', width: 15 },
        { key: 'shared', width: 16 }
      ];

      // No frozen panes or fixed header rows to keep sheet fully editable

      // Styling constants
      const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };
      const headerFont = { bold: true, color: { argb: 'FFFFFFFF' } };
      const topGreyFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }; // light grey
      const subGreyFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDBDBD' } }; // darker grey
      const zebraFillA = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FC' } };
      const zebraFillB = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      const borderThin = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
      };

      // Build content per year level and section
      for (const yearLevel of yearLevels) {
        const sections = await getUniqueSectionsForTrimesterAndYear(trimester, yearLevel);
        if (sections.length === 0) {
          sheet.addRow(['']).commit();
          continue;
        }

        for (const section of sections) {
          const sectionSchedules = schedules.filter(sch => {
            const course = courses.find(c => c.id === sch.courseId);
            return (sch.section === section || sch.section2 === section) &&
                   course && course.trimester === trimester && course.year_level === yearLevel;
          });
          if (sectionSchedules.length === 0) continue;

          // Determine degree for this section
          let degree = 'Unknown';
          const offeringMatch = offerings.find(off =>
            off.section === section &&
            courses.find(c => c.id === off.courseId)?.trimester === trimester &&
            courses.find(c => c.id === off.courseId)?.year_level === yearLevel
          );
          if (offeringMatch) {
            degree = offeringMatch.degree || courses.find(c => c.id === offeringMatch.courseId)?.degree || 'Unknown';
          }

          // Determine group A/B based on room assignments
          let countA = 0, countB = 0;
          sectionSchedules.forEach(sch => {
            if (sch.col > 0) {
              const roomName = allColumns[sch.col - 1] || '';
              if (roomName.endsWith(' A')) countA++;
              else if (roomName.endsWith(' B')) countB++;
            }
          });
          const group = countA >= countB ? 'A' : 'B';

          // Section header rows styled per provided screenshot
          const isInternational = section && section.startsWith('INTERNATIONAL ');
          const yearLabel = yearLevel
            .replace('1st yr', 'First Year')
            .replace('2nd yr', 'Second Year')
            .replace('3rd yr', 'Third Year');
          const termLabel = trimester.replace('Trimester', 'Term');
          const header1 = isInternational
            ? `${yearLabel}, ${termLabel}, SY ${schoolYearLabel}`
            : `${degree}, ${yearLabel}, ${termLabel}, SY ${schoolYearLabel}`;

          const rowTop = sheet.addRow([header1]);
          // Merge across all 7 columns and apply style
          sheet.mergeCells(rowTop.number, 1, rowTop.number, 7);
          rowTop.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
          rowTop.getCell(1).fill = topGreyFill;
          rowTop.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };

          // Sub header: BLOCK X - GROUP A/B
          const blockText = section ? section.replace(/\s*-\s*/, '').replace(/^.*?\s(\d)/, '$1') : section; // keep section label simple
          const subHeaderText = `BLOCK ${blockText || section} - GROUP ${group}`;
          const rowSub = sheet.addRow([subHeaderText]);
          sheet.mergeCells(rowSub.number, 1, rowSub.number, 7);
          rowSub.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
          rowSub.getCell(1).fill = subGreyFill;
          rowSub.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };

          // Add column headers only once per section; skip repeating for TTHS
          let headerAdded = false;
          for (const dayType of ['MWF', 'TTHS']) {
            const dayList = sectionSchedules.filter(sch => sch.dayType === dayType);
            if (!dayList.length) continue;

            // Column header — only once per section (e.g., for MWF). If MWF is empty,
            // header will be added for TTHS so the table remains readable.
            if (!headerAdded) {
              const hdr = sheet.addRow(['Course', 'Description', 'Units', 'Time', 'Day', 'Room', 'Shared With']);
              hdr.eachCell(cell => {
                cell.fill = headerFill;
                cell.font = headerFont;
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = borderThin;
              });
              headerAdded = true;
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

            // Add rows with alternating colors and conditional styling
            let zebraToggle = false;
            sorted.forEach(sch => {
              const course = courses.find(c => c.id === sch.courseId);
              let roomName = 'Not assigned';
              if (sch.col > 0) {
                roomName = allColumns[sch.col - 1] || roomName;
                roomName = roomName.replace(/\s+[A-Z]$/, '');
              }
              const off = offerings.find(off =>
                off.courseId === sch.courseId && off.type === sch.unitType &&
                (off.section === sch.section || off.section2 === sch.section2)
              );
              const shared = sch.section === section ? sch.section2 : sch.section;

              const courseDescription = course?.description || 'No description';
              const unitTypeDescription = `${courseDescription} (${sch.unitType})`;

              const dataRow = sheet.addRow([
                course ? course.subject : 'Unknown',
                unitTypeDescription,
                off?.units ?? null,
                sch.time,
                dayType,
                roomName,
                shared || 'None'
              ]);

              dataRow.eachCell((cell, colNumber) => {
                cell.border = borderThin;
                cell.alignment = { vertical: 'middle' };
                // Alternating zebra fills for data rows
                cell.fill = zebraToggle ? zebraFillA : zebraFillB;

                // Conditional styling
                if (colNumber === 6 && roomName === 'Not assigned') { // Room column
                  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCDD2' } }; // light red
                }
                if (colNumber === 7 && shared && shared !== 'None') { // Shared With column
                  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } }; // light yellow
                }
                if (colNumber === 3 && typeof cell.value === 'number' && cell.value > 3) { // Units > 3
                  cell.font = { bold: true };
                }
              });
              zebraToggle = !zebraToggle;
            });

            // Spacer row after each day type
            sheet.addRow(['']);
          }
        }

        // Spacer after each year level
        sheet.addRow(['']);
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const filename = `All_Schedules_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    hideLoadingOverlay();
  } catch (error) {
    hideLoadingOverlay();
    console.error('Error exporting to Excel:', error);
    alert('Error exporting to Excel. Please try again.');
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

// Logout function for dedicated login system
function logout() {
  localStorage.removeItem('authToken');
  window.location.href = 'login.html';
}

// Add logout functionality to navigation if needed
if (typeof window !== 'undefined') {
  window.logout = logout;
}



// Remove All Schedules button event listener
document.getElementById('btn-remove-all-schedules').addEventListener('click', async () => {
  const button = document.getElementById('btn-remove-all-schedules');
  const icon = button.querySelector('.btn-icon');
  const text = button.querySelector('.btn-text');
  
  // Get current trimester and year level
  const trimester = getSectionViewState().trimester;
  const yearLevel = getSectionViewState().yearLevel;
  
  // Confirm deletion
  const confirmMessage = `Are you sure you want to remove ALL schedules for ${yearLevel} in ${trimester}?\n\nThis action cannot be undone.`;
  if (!confirm(confirmMessage)) {
    return;
  }
  
  try {
    // Show loading state
    button.classList.add('loading');
    icon.textContent = '⟳';
    text.textContent = 'Removing...';
    showLoadingOverlay('Removing all scheduled subjects...');
    
    // Get all schedules and courses
    const schedules = await apiGet('schedules');
    const courses = await apiGet('courses');
    
    // Filter schedules for current trimester and year level
    const schedulesToDelete = schedules.filter(schedule => {
      const course = courses.find(c => c.id === schedule.courseId);
      return course && 
             course.trimester === trimester && 
             course.year_level === yearLevel;
    });
    
    if (schedulesToDelete.length === 0) {
      throw new Error('No schedules found for the selected trimester and year level.');
    }
    
    // Delete all matching schedules
    let deletedCount = 0;
    for (const schedule of schedulesToDelete) {
      try {
        await apiDelete('schedules', schedule.id);
        deletedCount++;
      } catch (error) {
        console.error('Failed to delete schedule:', error, schedule);
      }
    }
    
    // Show success state
    button.classList.remove('loading');
    button.classList.add('success');
    icon.textContent = '✓';
    text.textContent = 'Schedules Removed!';
    
    // Show results
    alert(`Successfully removed ${deletedCount} scheduled classes!`);
    
    // Clear API cache and refresh all views
    clearApiCache('schedules');
    await renderSectionViewTables();
    await renderRoomViewTables();
    await validateAllComplementary(); // Debounced validation
    
    // Reset button after delay
    setTimeout(() => {
      button.classList.remove('success');
      icon.textContent = '🗑️';
      text.textContent = 'Clear All';
    }, 3000);
    
  } catch (error) {
    console.error('Remove all schedules failed:', error);
    
    // Show error state
    button.classList.remove('loading');
    icon.textContent = '⚠';
    text.textContent = 'Removal Failed';
    
    alert('Failed to remove schedules: ' + error.message);
    
    // Reset button after delay
    setTimeout(() => {
      icon.textContent = '🗑️';
      text.textContent = 'Clear All';
    }, 3000);
  } finally {
    hideLoadingOverlay();
  }
});