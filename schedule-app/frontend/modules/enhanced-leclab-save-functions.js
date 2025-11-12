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
  await forceValidateAllComplementary();
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
  await forceValidateAllComplementary();
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
           course.trimester === getSectionViewState().trimester &&
    course.year_level === getSectionViewState().yearLevel &&
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
	const offerings = await apiGet("course_offerings");
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
    
	const isInternationalView = currentSectionViewYearLevel === "International";
	const roomViewEntry = schedules.find(sch => {
	  const course = courses.find(c => c.id === sch.courseId);
	  if (!(sch.courseId === courseId &&
			sch.unitType === unitType &&
			sch.section === section &&
			sch.section2 === section2 &&
			sch.dayType === dayType &&
			sch.time === time &&
			course &&
			sch.col > 0)) {
		return false;
	  }
	  if (isInternationalView) {
		return offerings.some(off =>
		  off.courseId === sch.courseId &&
		  off.type === sch.unitType &&
		  off.trimester === currentSectionViewTrimester &&
		  ((section && off.section === section) || (section2 && off.section === section2))
		);
	  }
	  return course.trimester === currentSectionViewTrimester &&
			 course.year_level === currentSectionViewYearLevel;
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

