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
  const offerings = await apiGet("course_offerings");
  const roomState = getRoomViewState();
  let existing = schedules.find(sch =>
    sch.dayType === dayType &&
    sch.time === time &&
    sch.col === col && (
      ((sch.section && sch.section.startsWith("INTERNATIONAL ")) || (sch.section2 && sch.section2.startsWith("INTERNATIONAL ")))
        ? offerings.some(off =>
            off.courseId === sch.courseId &&
            off.type === sch.unitType &&
            off.trimester === roomState.trimester &&
            ((sch.section && off.section === sch.section) || (sch.section2 && off.section === sch.section2))
          )
        : courses.find(c => c.id === sch.courseId)?.trimester === roomState.trimester
    )
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
      courses.find(c => c.id === off.courseId)?.trimester === roomState.trimester
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
  const roomState = getRoomViewState();
  const sectionViewSchedules = schedules.filter(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    return sch.col === 0 && // Section View entries
           sch.dayType === dayType &&
           sch.time === time &&
           course && (
             ((sch.section && sch.section.startsWith("INTERNATIONAL ")) || (sch.section2 && sch.section2.startsWith("INTERNATIONAL ")))
               ? offerings.some(off =>
                   off.courseId === sch.courseId &&
                   off.trimester === roomState.trimester &&
                   ((sch.section && off.section === sch.section) || (sch.section2 && off.section === sch.section2))
                 )
               : course.trimester === roomState.trimester
           );
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
      off.trimester === roomState.trimester
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
  const roomState = getRoomViewState();
  const sectionViewSchedules = schedules.filter(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    const isInternationalOff = selectedOffering.section && selectedOffering.section.startsWith("INTERNATIONAL ");
    return sch.col === 0 && // Section View entries
           sch.dayType === dayType &&
           sch.time === time &&
           sch.courseId === selectedOffering.courseId &&
           sch.unitType === selectedOffering.type && (
             isInternationalOff
               ? (selectedOffering.trimester === roomState.trimester &&
                  ((sch.section && sch.section === selectedOffering.section) || (sch.section2 && sch.section2 === selectedOffering.section)))
               : (course && course.trimester === roomState.trimester)
           );
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
  const roomState = getRoomViewState();
  const sectionScheduled = schedules.some(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    const isInternationalOff = selectedOffering.section && selectedOffering.section.startsWith("INTERNATIONAL ");
    return sch.col === 0 && // Section View entries
           sch.dayType === dayType &&
           sch.time === time &&
           sch.courseId === courseId &&
           sch.unitType === unitType &&
           (sch.section === section || sch.section2 === section ||
            (section2 && (sch.section === section2 || sch.section2 === section2))) &&
           course && (
             isInternationalOff
               ? selectedOffering.trimester === roomState.trimester
               : course.trimester === roomState.trimester
           );
  });

  if (!sectionScheduled) {
    showConflictNotification("This course and section is not scheduled in the Section View for this time slot. Please schedule it in Section View first.");
    return;
  }

  const currentCourse = courses.find(c => c.id === courseId);

  // Rest of the original validation code
  for (const sec of sectionsToCheck) {
    const existingSubjectSectionUnitType = schedules.find(sch => {
      const schCourse = courses.find(c => c.id === sch.courseId);
      return sch.courseId === courseId &&
      (sch.section === sec || sch.section2 === sec) &&
      sch.unitType === unitType &&
        schCourse && schCourse.trimester === roomState.trimester &&
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
        `Duplicate detected: ${subjectName} - (${sec}) - ${unitType} is already scheduled in ${roomState.trimester}.\n` +
        `Details: Days: ${existingSubjectSectionUnitType.dayType}, Room: ${fullRoomName}, Group: ${group}, Time: ${existingSubjectSectionUnitType.time}`
      );
      return;
    }
  }

  const existingTimeRoomConflict = schedules.find(sch => {
    const schCourse = courses.find(c => c.id === sch.courseId);
    if (!(schCourse && sch.dayType === dayType && sch.time === time && sch.col === parseInt(col, 10) && sch.col > 0 && sch.id.toString() !== existingId)) {
      return false;
    }
    const schIsInternational = (sch.section && sch.section.startsWith("INTERNATIONAL ")) ||
                               (sch.section2 && sch.section2.startsWith("INTERNATIONAL "));
    if (schIsInternational) {
      return offerings.some(off =>
        off.courseId === sch.courseId &&
        off.type === sch.unitType &&
        off.trimester === roomState.trimester &&
        ((sch.section && off.section === sch.section) || (sch.section2 && off.section === sch.section2))
      );
    }
    return schCourse.trimester === roomState.trimester;
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

  // Check if any of the sections are already assigned to a room at this time (any year level)
  const allSections = [section, section2].filter(s => s);
  for (const sec of allSections) {
    const sectionAssignedConflict = schedules.find(sch => {
      const schCourse = courses.find(c => c.id === sch.courseId);
      if (!(schCourse && (sch.section === sec || sch.section2 === sec) && sch.dayType === dayType && sch.time === time && sch.col > 0 && sch.id.toString() !== existingId)) {
        return false;
      }
      const schIsInternational = (sch.section && sch.section.startsWith("INTERNATIONAL ")) ||
                                 (sch.section2 && sch.section2.startsWith("INTERNATIONAL "));
      if (schIsInternational) {
        return offerings.some(off =>
          off.courseId === sch.courseId &&
          off.type === sch.unitType &&
          off.trimester === roomState.trimester &&
          ((sch.section && off.section === sch.section) || (sch.section2 && off.section === sch.section2))
        );
      }
      return schCourse.trimester === roomState.trimester;
    });

    if (sectionAssignedConflict) {
      const conflictCourse = courses.find(c => c.id === sectionAssignedConflict.courseId);
      if (conflictCourse) {
        const colIndex = sectionAssignedConflict.col - 1;
        const roomName = colIndex >= 0 && colIndex < allColumns.length ? allColumns[colIndex] : "Unknown Room";
        
        showConflictNotification(
          `Section conflict: Section ${sec} is already assigned to room ${roomName} at ${dayType} ${time}.\n` +
          `Subject: ${conflictCourse.subject}, Type: ${sectionAssignedConflict.unitType}\n` +
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
  await forceValidateAllComplementary();
});

document.getElementById("btn-delete-roomview").addEventListener("click", async () => {
  const id = document.getElementById("roomview-id").value;
  if (!id) return;
  if (!confirm("Are you sure you want to delete this schedule entry?")) return;
  await apiDelete("schedules", id);
  hideModal(modalRoomView);
  await renderRoomViewTables();
  await forceValidateAllComplementary();
});

/**************************************************************
 * ROOM MANAGEMENT CRUD
 **************************************************************/
// btnManageRooms is defined in 11-room-management-crud.js
// modalManageRooms is defined in 11-room-management-crud.js
// tableRoomsBody is defined in 11-room-management-crud.js
// btnAddRoom is defined in 11-room-management-crud.js
// modalAddRoom is defined in 11-room-management-crud.js
// roomIdInput is defined in 11-room-management-crud.js
// roomNameInput is defined in 11-room-management-crud.js
// btnSaveRoom is defined in 11-room-management-crud.js

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
        <div class="action-buttons-container">
          <button class="action-edit-btn" onclick="editRoom(${room.id})">Edit</button>
          <button class="action-delete-btn" onclick="deleteRoom(${room.id})">Delete</button>
        </div>
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
    await validateAllComplementary(); // Debounced validation
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
  await validateAllComplementary(); // Debounced validation
};

