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
    return course && course.trimester === getSectionViewState().trimester &&
           course && course.year_level === getSectionViewState().yearLevel &&
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
             course.trimester === getSectionViewState().trimester &&
             course.year_level === getSectionViewState().yearLevel &&
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
  const schedules = await apiGet("schedules");
  const sectionviewCourseOfferingSelect = document.getElementById("sectionview-courseOffering");
  sectionviewCourseOfferingSelect.innerHTML = `<option value="">-- Select Course Offering --</option>`;
  
  // Get already scheduled subjects for this section to exclude them
  const scheduledSubjects = new Set();
  schedules.forEach(sch => {
    if (sch.col === 0 && (sch.section === section || sch.section2 === section)) {
      const course = courses.find(c => c.id === sch.courseId);
      if (course && course.trimester === getSectionViewState().trimester && course.year_level === getSectionViewState().yearLevel) {
        // Create a unique key for subject + unit type to allow different components (Lec/Lab)
        scheduledSubjects.add(`${course.subject}_${sch.unitType}`);
      }
    }
  });
  
  // Filter offerings that match the current trimester and year level
  const filteredOfferings = offerings.filter(off => {
    const course = courses.find(c => c.id === off.courseId);
    return off.section === section && 
           off.trimester === getSectionViewState().trimester && 
           course && course.year_level === getSectionViewState().yearLevel;
  });
  
  // If no offerings found with exact section match, show all offerings for the current trimester and year level
  let offeringsToShow = filteredOfferings;
  if (offeringsToShow.length === 0) {
    offeringsToShow = offerings.filter(off => {
      const course = courses.find(c => c.id === off.courseId);
      return off.trimester === getSectionViewState().trimester && 
             course && course.year_level === getSectionViewState().yearLevel;
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
  await forceValidateAllComplementary();
}

