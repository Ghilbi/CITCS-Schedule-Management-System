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
             course.trimester === getSectionViewState().trimester &&
             course.year_level === getSectionViewState().yearLevel &&
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
  
  // Add listeners for day changes to update time slots and room dropdowns
  document.getElementById("lec-day").addEventListener('change', async function() {
    populateTimeSlots("lec-time", this.value);
    // Update room dropdowns when day changes to refresh filtering
    await populateRoomDropdown("lec-room");
    await populateRoomDropdown("lab-room");
  });
  
  document.getElementById("lab-day").addEventListener('change', async function() {
    populateTimeSlots("lab-time", this.value);
    // Update room dropdowns when day changes to refresh filtering
    await populateRoomDropdown("lec-room");
    await populateRoomDropdown("lab-room");
  });
  
  // Add listeners for time changes to update room dropdowns
  document.getElementById("lec-time").addEventListener('change', async function() {
    // Update room dropdowns when time changes to refresh filtering
    await populateRoomDropdown("lec-room");
    await populateRoomDropdown("lab-room");
  });
  
  document.getElementById("lab-time").addEventListener('change', async function() {
    // Update room dropdowns when time changes to refresh filtering
    await populateRoomDropdown("lec-room");
    await populateRoomDropdown("lab-room");
  });
  
  // Add listeners for room group radio buttons in the Lec/Lab assignment section
  const lecLabRoomGroupRadios = document.querySelectorAll('#separate-assignment input[name="leclab-roomGroup"]');
  lecLabRoomGroupRadios.forEach(radio => {
    radio.addEventListener('change', async function() {
      // Store the selected group in the data attribute
      document.getElementById("separate-assignment").dataset.selectedRoomGroup = this.value;
      // Update both room dropdowns with the same room group and filtering
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
  
  // For Lec/Lab assignment, add room filtering logic similar to main popup
  if (elementId === "lec-room" || elementId === "lab-room") {
    const schedules = await apiGet("schedules");
    const courses = await apiGet("courses");
    
    // Get the current assignment details
    const lecDay = document.getElementById("lec-day").value;
    const lecTime = document.getElementById("lec-time").value;
    const labDay = document.getElementById("lab-day").value;
    const labTime = document.getElementById("lab-time").value;
    
    // Find existing room assignments for this course and section
    const courseId = document.getElementById("sectionview-courseOffering").selectedOptions[0]?.getAttribute("data-course-id");
    const section = document.getElementById("sectionview-section").value;
    
    let existingLecRoomCol = null;
    let existingLabRoomCol = null;
    
    if (courseId && section) {
      // Find existing Lec room assignment
      const lecRoomEntry = schedules.find(sch => {
        const course = courses.find(c => c.id === sch.courseId);
        return sch.courseId == courseId &&
               sch.unitType === "Lec" &&
               (sch.section === section || sch.section2 === section) &&
               course &&
               course.trimester === currentSectionViewTrimester &&
               course.year_level === currentSectionViewYearLevel &&
               sch.col > 0; // Room View entry
      });
      
      // Find existing Lab room assignment
      const labRoomEntry = schedules.find(sch => {
        const course = courses.find(c => c.id === sch.courseId);
        return sch.courseId == courseId &&
               sch.unitType === "Lab" &&
               (sch.section === section || sch.section2 === section) &&
               course &&
               course.trimester === currentSectionViewTrimester &&
               course.year_level === currentSectionViewYearLevel &&
               sch.col > 0; // Room View entry
      });
      
      existingLecRoomCol = lecRoomEntry ? lecRoomEntry.col : null;
      existingLabRoomCol = labRoomEntry ? labRoomEntry.col : null;
    }
    
    // Find occupied rooms for the specific day and time this dropdown is for
    const targetDay = elementId === "lec-room" ? lecDay : labDay;
    const targetTime = elementId === "lec-room" ? lecTime : labTime;
    
    const occupiedCols = schedules.filter(sch => {
      const course = courses.find(c => c.id === sch.courseId);
      return sch.dayType === targetDay &&
             sch.time === targetTime &&
             sch.col > 0 && // Room View entries only
             course && 
             course.trimester === currentSectionViewTrimester; // Check all year levels in current trimester
    }).map(sch => sch.col);
    
    // Filter rooms based on the selected group and availability
    allColumns.forEach((roomName, index) => {
      const colValue = index + 1; // Column values start at 1
      
      // Check if the room belongs to the selected group
      const isGroupA = roomName.endsWith(" A");
      const isGroupB = roomName.endsWith(" B");
      const matchesSelectedGroup = 
        (roomGroup === "A" && isGroupA) || 
        (roomGroup === "B" && isGroupB);
      
      // Determine if this room is already assigned to the current Lec/Lab components
      const isCurrentlyAssigned = 
        (elementId === "lec-room" && colValue === existingLecRoomCol) ||
        (elementId === "lab-room" && colValue === existingLabRoomCol);
      
      // Only add the room if:
      // 1. It matches the selected group, AND
      // 2. It's not occupied OR it's already assigned to this Lec/Lab component
      if (matchesSelectedGroup && (!occupiedCols.includes(colValue) || isCurrentlyAssigned)) {
        const option = document.createElement("option");
        option.value = colValue;
        option.textContent = roomName;
        roomSelect.appendChild(option);
      }
    });
  } else {
    // For non-Lec/Lab dropdowns, use the original logic
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
           course.trimester === getSectionViewState().trimester &&
           course.year_level === getSectionViewState().yearLevel &&
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

// Note: Event listener for btn-save-sectionview has been moved to module 14
// to avoid duplicate event handlers and ensure single execution

// Note: saveRegularAssignment function has been moved to module 14
// to avoid duplication and ensure single source of truth for save operations

// Note: Save functions have been moved to module 16-enhanced-leclab-save-functions.js
// to avoid duplication and ensure single source of truth for save operations


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
               sCourse.trimester === getSectionViewState().trimester &&
               sCourse.year_level === getSectionViewState().yearLevel;
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
  await forceValidateAllComplementary();
});

