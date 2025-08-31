/**************************************************************
 * Complementary Validation for Lec/Lab + Duplicate Check
 **************************************************************/

// Debounce validation to prevent excessive calls
let validationTimeout = null;
let isValidating = false;

// Optimized validation that only runs when necessary
async function validateAllComplementary(force = false) {
  // Skip if already validating unless forced
  if (isValidating && !force) {
    return;
  }
  
  // Clear existing timeout
  if (validationTimeout) {
    clearTimeout(validationTimeout);
  }
  
  // Debounce validation calls (wait 300ms before executing)
  if (!force) {
    validationTimeout = setTimeout(() => {
      executeValidation();
    }, 300);
    return;
  }
  
  // Execute immediately if forced
  await executeValidation();
}

// Internal validation function
async function executeValidation() {
  if (isValidating) return;
  
  isValidating = true;
  
  try {
  const schedules = await apiGet("schedules");
  const rooms = await apiGet("rooms");
  const courses = await apiGet("courses");
  const allColumns = await getAllRoomColumns();

  // Clear previous notifications
  clearConflictNotification();
  
  // Get current view states from global state manager
  const roomViewState = getRoomViewState();
  const sectionViewState = getSectionViewState();
  
  // Room View schedules for current trimester
  const roomViewSchedules = schedules.filter(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    return course && 
           course.trimester === roomViewState.trimester && 
           course.year_level === roomViewState.yearLevel &&
           sch.col > 0; // Only Room View entries
  });
  
  // Section View schedules for current trimester
  const sectionViewSchedules = schedules.filter(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    return course && 
           course.trimester === sectionViewState.trimester && 
           course.year_level === sectionViewState.yearLevel &&
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
          const currentState = getRoomViewState();
          if (sch.unitType === "Lec") {
            conflictMessages.push(`[${groupName}] [${currentState.trimester}] [${currentState.yearLevel}] Lab portion missing for ${subjectName} - (${section}). Recommended slot: ${recommendedTime}.`);
          } else {
            conflictMessages.push(`[${groupName}] [${currentState.trimester}] [${currentState.yearLevel}] Lec portion missing for ${subjectName} - (${section}). Recommended slot: ${recommendedTime}.`);
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
        const currentState = getRoomViewState();
        conflictMessages.push(`[${groupName}] [${currentState.trimester}] [${currentState.yearLevel}] Duplicate schedule: ${subjectName} - (${section}) - ${unitType} is scheduled at ${time} more than once.`);
      }
    });

    return conflictMessages;
  }
  
  // Determine which view is currently active to show appropriate validation
  function getCurrentViewTrimester() {
    const sectionViewVisible = !document.getElementById("section-section-view").classList.contains("hidden");
    const roomViewVisible = !document.getElementById("section-room-view").classList.contains("hidden");
    
    if (sectionViewVisible) {
      return getSectionViewState().trimester;
    } else if (roomViewVisible) {
      return getRoomViewState().trimester;
    }
    
    // Default to section view trimester
    return getSectionViewState().trimester;
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
          const currentState = getSectionViewState();
          if (sch.unitType === "Lec") {
            conflictMessages.push(`[Section View] [${currentState.trimester}] [${currentState.yearLevel}] Lab portion missing for ${subjectName} - (${section}). Recommended slot: ${recommendedTime}.`);
          } else {
            conflictMessages.push(`[Section View] [${currentState.trimester}] [${currentState.yearLevel}] Lec portion missing for ${subjectName} - (${section}). Recommended slot: ${recommendedTime}.`);
          }
        }
      }
    }

    // Check for missing room assignments but only if we're in the same trimester as Room View
    // to avoid cross-trimester validation issues
    const roomState = getRoomViewState();
    const sectionState = getSectionViewState();
    if (sectionState.trimester === roomState.trimester && 
        sectionState.yearLevel === roomState.yearLevel) {
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
          const currentState = getSectionViewState();
          conflictMessages.push(`[Section View] [${currentState.trimester}] [${currentState.yearLevel}] Missing room assignment for ${subjectName} - ${sch.unitType} - (${sch.section}) at ${sch.dayType} ${sch.time}.`);
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
        
        const currentState = getSectionViewState();
        conflictMessages.push(`[Section View] [${currentState.trimester}] [${currentState.yearLevel}] Section "${section}" has multiple classes at ${dayType} ${time}: ${subjects}`);
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
  } finally {
    isValidating = false;
  }
}

// Force validation (for critical operations like save/delete)
async function forceValidateAllComplementary() {
  await validateAllComplementary(true);
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
  
  // Auto-hide the conflict notification after 6 seconds
  setTimeout(() => {
    clearConflictNotification();
  }, 6000);
}

function clearConflictNotification() {
  const popup = document.getElementById("conflict-popup");
  popup.classList.add("hidden");
}

