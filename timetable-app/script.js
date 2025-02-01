/**************************************************************
 * 1) Initialize LocalStorage for faculty, rooms, courses, schedules
 **************************************************************/
function initData() {
  if (!localStorage.getItem("faculty")) {
    localStorage.setItem("faculty", JSON.stringify([]));
  }
  if (!localStorage.getItem("rooms")) {
    localStorage.setItem("rooms", JSON.stringify([]));
  }
  if (!localStorage.getItem("courses")) {
    localStorage.setItem("courses", JSON.stringify([]));
  }
  if (!localStorage.getItem("schedules")) {
    localStorage.setItem("schedules", JSON.stringify([]));
  }
}
initData();

// Helper to read/write arrays in LocalStorage
function getData(key) {
  return JSON.parse(localStorage.getItem(key)) || [];
}
function setData(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}

// Generate a new ID
function getNewId(arr) {
  if (arr.length === 0) return 1;
  return Math.max(...arr.map(i => i.id)) + 1;
}

/**************************************************************
 * 2) Navigation & Section Handling
 **************************************************************/
const sectionFaculty = document.getElementById("section-faculty");
const sectionRooms   = document.getElementById("section-rooms");
const sectionCourses = document.getElementById("section-courses");
const sectionSchedule= document.getElementById("section-schedule");
const sectionRoomView= document.getElementById("section-room-view");

function hideAllSections() {
  sectionFaculty.classList.add("hidden");
  sectionRooms.classList.add("hidden");
  sectionCourses.classList.add("hidden");
  sectionSchedule.classList.add("hidden");
  sectionRoomView.classList.add("hidden");
}

document.getElementById("btn-faculty").addEventListener("click", () => {
  hideAllSections();
  sectionFaculty.classList.remove("hidden");
  renderFacultyTable();
});
document.getElementById("btn-rooms").addEventListener("click", () => {
  hideAllSections();
  sectionRooms.classList.remove("hidden");
  renderRoomsTable();
});
document.getElementById("btn-courses").addEventListener("click", () => {
  hideAllSections();
  sectionCourses.classList.remove("hidden");
  renderCoursesTable();
});
document.getElementById("btn-schedule").addEventListener("click", () => {
  hideAllSections();
  sectionSchedule.classList.remove("hidden");
  renderScheduleTables();
});
document.getElementById("btn-room-view").addEventListener("click", () => {
  hideAllSections();
  sectionRoomView.classList.remove("hidden");
  renderRoomDropdown();
  renderRoomViewTable();
});

/**************************************************************
 * 3) FACULTY CRUD
 **************************************************************/
const tableFacultyBody = document.querySelector("#table-faculty tbody");
const btnAddFaculty = document.getElementById("btn-add-faculty");
const modalFaculty  = document.getElementById("modal-faculty");
const facultyIdInput= document.getElementById("faculty-id");
const facultyNameInput= document.getElementById("faculty-name");
const btnSaveFaculty= document.getElementById("btn-save-faculty");

function renderFacultyTable() {
  const facultyList = getData("faculty");
  tableFacultyBody.innerHTML = "";
  facultyList.forEach(f => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${f.id}</td>
      <td>${f.name}</td>
      <td>
        <button onclick="editFaculty(${f.id})">Edit</button>
        <button onclick="deleteFaculty(${f.id})">Delete</button>
      </td>
    `;
    tableFacultyBody.appendChild(tr);
  });
}

btnAddFaculty.addEventListener("click", () => {
  facultyIdInput.value = "";
  facultyNameInput.value = "";
  document.getElementById("modal-faculty-title").textContent = "Add Faculty";
  showModal(modalFaculty);
});

btnSaveFaculty.addEventListener("click", () => {
  const id = facultyIdInput.value;
  const name = facultyNameInput.value.trim();
  if (!name) {
    alert("Enter a faculty name.");
    return;
  }
  let facultyList = getData("faculty");
  if (id) {
    // Update
    const idx = facultyList.findIndex(f => f.id == id);
    if (idx > -1) {
      facultyList[idx].name = name;
    }
  } else {
    // Create
    const newId = getNewId(facultyList);
    facultyList.push({ id: newId, name });
  }
  setData("faculty", facultyList);
  hideModal(modalFaculty);
  renderFacultyTable();
});

window.editFaculty = function(id) {
  const facultyList = getData("faculty");
  const found = facultyList.find(f => f.id == id);
  if (!found) return;
  facultyIdInput.value = found.id;
  facultyNameInput.value = found.name;
  document.getElementById("modal-faculty-title").textContent = "Edit Faculty";
  showModal(modalFaculty);
};

window.deleteFaculty = function(id) {
  if (!confirm("Are you sure?")) return;
  let facultyList = getData("faculty");
  facultyList = facultyList.filter(f => f.id !== id);
  setData("faculty", facultyList);
  renderFacultyTable();
};

/**************************************************************
 * 4) ROOMS CRUD
 **************************************************************/
const tableRoomsBody = document.querySelector("#table-rooms tbody");
const btnAddRoom = document.getElementById("btn-add-room");
const modalRoom  = document.getElementById("modal-room");
const roomIdInput= document.getElementById("room-id");
const roomNameInput= document.getElementById("room-name");
const btnSaveRoom= document.getElementById("btn-save-room");

function renderRoomsTable() {
  const roomsList = getData("rooms");
  tableRoomsBody.innerHTML = "";
  roomsList.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.id}</td>
      <td>${r.name}</td>
      <td>
        <button onclick="editRoom(${r.id})">Edit</button>
        <button onclick="deleteRoom(${r.id})">Delete</button>
      </td>
    `;
    tableRoomsBody.appendChild(tr);
  });
}

btnAddRoom.addEventListener("click", () => {
  roomIdInput.value = "";
  roomNameInput.value = "";
  document.getElementById("modal-room-title").textContent = "Add Room";
  showModal(modalRoom);
});

btnSaveRoom.addEventListener("click", () => {
  const id = roomIdInput.value;
  const name = roomNameInput.value.trim();
  if (!name) {
    alert("Enter a room name.");
    return;
  }
  let roomsList = getData("rooms");
  if (id) {
    const idx = roomsList.findIndex(r => r.id == id);
    if (idx > -1) {
      roomsList[idx].name = name;
    }
  } else {
    const newId = getNewId(roomsList);
    roomsList.push({ id: newId, name });
  }
  setData("rooms", roomsList);
  hideModal(modalRoom);
  renderRoomsTable();
});

window.editRoom = function(id) {
  const roomsList = getData("rooms");
  const found = roomsList.find(r => r.id == id);
  if (!found) return;
  roomIdInput.value = found.id;
  roomNameInput.value = found.name;
  document.getElementById("modal-room-title").textContent = "Edit Room";
  showModal(modalRoom);
};

window.deleteRoom = function(id) {
  if (!confirm("Are you sure?")) return;
  let roomsList = getData("rooms");
  roomsList = roomsList.filter(r => r.id !== id);
  setData("rooms", roomsList);
  renderRoomsTable();
};

/**************************************************************
 * 5) COURSES CRUD
 **************************************************************/
const tableCoursesBody = document.querySelector("#table-courses tbody");
const btnAddCourse  = document.getElementById("btn-add-course");
const modalCourse   = document.getElementById("modal-course");
const courseIdInput = document.getElementById("course-id");
const courseSubjectInput = document.getElementById("course-subject");
const courseSectionInput = document.getElementById("course-section");
const btnSaveCourse = document.getElementById("btn-save-course");

function renderCoursesTable() {
  const coursesList = getData("courses");
  tableCoursesBody.innerHTML = "";
  coursesList.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.subject}</td>
      <td>${c.section}</td>
      <td>
        <button onclick="editCourse(${c.id})">Edit</button>
        <button onclick="deleteCourse(${c.id})">Delete</button>
      </td>
    `;
    tableCoursesBody.appendChild(tr);
  });
}

btnAddCourse.addEventListener("click", () => {
  courseIdInput.value = "";
  courseSubjectInput.value = "";
  courseSectionInput.value = "";
  document.getElementById("modal-course-title").textContent = "Add Course";
  showModal(modalCourse);
});

btnSaveCourse.addEventListener("click", () => {
  const id = courseIdInput.value;
  const subject = courseSubjectInput.value.trim();
  const section = courseSectionInput.value.trim();
  if (!subject || !section) {
    alert("Please fill out subject and section.");
    return;
  }
  let coursesList = getData("courses");
  if (id) {
    const idx = coursesList.findIndex(c => c.id == id);
    if (idx > -1) {
      coursesList[idx].subject = subject;
      coursesList[idx].section = section;
    }
  } else {
    const newId = getNewId(coursesList);
    coursesList.push({ id: newId, subject, section });
  }
  setData("courses", coursesList);
  hideModal(modalCourse);
  renderCoursesTable();
});

window.editCourse = function(id) {
  const coursesList = getData("courses");
  const found = coursesList.find(c => c.id == id);
  if (!found) return;
  courseIdInput.value = found.id;
  courseSubjectInput.value = found.subject;
  courseSectionInput.value = found.section;
  document.getElementById("modal-course-title").textContent = "Edit Course";
  showModal(modalCourse);
};

window.deleteCourse = function(id) {
  if (!confirm("Are you sure?")) return;
  let coursesList = getData("courses");
  coursesList = coursesList.filter(c => c.id !== id);
  setData("courses", coursesList);
  renderCoursesTable();
};

/**************************************************************
 * 6) SCHEDULE: Conflict Validation
 **************************************************************/
const mwfTableBody   = document.querySelector("#mwf-table tbody");
const tthsTableBody  = document.querySelector("#tths-table tbody");
const modalSchedule  = document.getElementById("modal-schedule");

const scheduleDayTypeInput  = document.getElementById("schedule-dayType");
const scheduleTimeInput     = document.getElementById("schedule-time");
const scheduleColInput      = document.getElementById("schedule-col");
const scheduleIdInput       = document.getElementById("schedule-id");

const scheduleFacultySelect = document.getElementById("schedule-faculty");
const scheduleRoomSelect    = document.getElementById("schedule-room");
const scheduleCourseSelect  = document.getElementById("schedule-course");

const btnSaveSchedule    = document.getElementById("btn-save-schedule");
const btnDeleteSchedule  = document.getElementById("btn-delete-schedule");

// Example times
const MWF_TIMES = [
  "7:30 - 8:50", "8:50 - 10:10", "10:10 - 11:30",
  "11:30 - 12:50", "12:50 - 2:10", "2:10 - 3:30",
  "3:30 - 4:50", "4:50 - 6:10", "6:10 - 7:30"
];
const TTHS_TIMES = [
  "7:30 - 8:50", "8:50 - 10:10", "10:10 - 11:30",
  "11:30 - 12:50", "12:50 - 2:10", "2:10 - 3:30",
  "3:30 - 4:50", "4:50 - 6:10", "6:10 - 7:30"
];

// Build the MWF & TTHS tables
function renderScheduleTables() {
  mwfTableBody.innerHTML = "";
  tthsTableBody.innerHTML= "";

  // MWF with 6 columns
  MWF_TIMES.forEach(time => {
    const tr = document.createElement("tr");
    const timeTd = document.createElement("td");
    timeTd.textContent = time;
    tr.appendChild(timeTd);

    for (let col = 1; col <= 6; col++) {
      const cell = document.createElement("td");
      cell.classList.add("clickable-cell");
      cell.setAttribute("data-dayType", "MWF");
      cell.setAttribute("data-time", time);
      cell.setAttribute("data-col", col);
      cell.addEventListener("click", () => openScheduleModal("MWF", time, col));
      tr.appendChild(cell);
    }
    mwfTableBody.appendChild(tr);
  });

  // TTHS with 6 columns
  TTHS_TIMES.forEach(time => {
    const tr = document.createElement("tr");
    const timeTd = document.createElement("td");
    timeTd.textContent = time;
    tr.appendChild(timeTd);

    for (let col = 1; col <= 6; col++) {
      const cell = document.createElement("td");
      cell.classList.add("clickable-cell");
      cell.setAttribute("data-dayType", "TTHS");
      cell.setAttribute("data-time", time);
      cell.setAttribute("data-col", col);
      cell.addEventListener("click", () => openScheduleModal("TTHS", time, col));
      tr.appendChild(cell);
    }
    tthsTableBody.appendChild(tr);
  });

  // Fill existing schedule data
  const schedules = getData("schedules");
  schedules.forEach(sch => fillScheduleCell(sch));
}

// Show the schedule modal & populate dropdowns
function openScheduleModal(dayType, time, col) {
  populateScheduleDropdowns();

  const schedules = getData("schedules");
  const existing = schedules.find(s =>
    s.dayType === dayType && s.time === time && s.col === col
  );

  if (existing) {
    // Editing
    scheduleIdInput.value = existing.id;
    scheduleDayTypeInput.value = existing.dayType;
    scheduleTimeInput.value     = existing.time;
    scheduleColInput.value      = existing.col;

    // Set the selects
    scheduleFacultySelect.value = existing.facultyId || "";
    scheduleRoomSelect.value    = existing.roomId    || "";
    scheduleCourseSelect.value  = existing.courseId  || "";

    btnDeleteSchedule.style.display = "block";
  } else {
    // New
    scheduleIdInput.value = "";
    scheduleDayTypeInput.value = dayType;
    scheduleTimeInput.value    = time;
    scheduleColInput.value     = col;

    scheduleFacultySelect.value = "";
    scheduleRoomSelect.value    = "";
    scheduleCourseSelect.value  = "";

    btnDeleteSchedule.style.display = "none";
  }

  showModal(modalSchedule);
}

// Fill the text of the table cell
function fillScheduleCell(scheduleObj) {
  const tableBody = scheduleObj.dayType === "MWF" ? mwfTableBody : tthsTableBody;
  if (!tableBody) return;

  const cell = tableBody.querySelector(
    `.clickable-cell[data-dayType="${scheduleObj.dayType}"]` +
    `[data-time="${scheduleObj.time}"]` +
    `[data-col="${scheduleObj.col}"]`
  );
  if (!cell) return;

  // Look up the actual data from ID references
  const facultyList = getData("faculty");
  const roomsList   = getData("rooms");
  const coursesList = getData("courses");

  const fac  = facultyList.find(f => f.id === scheduleObj.facultyId);
  const room = roomsList.find(r => r.id === scheduleObj.roomId);
  const crs  = coursesList.find(c => c.id === scheduleObj.courseId);

  const facultyName = fac ? fac.name : "Unknown";
  const roomName    = room ? room.name : "NoRoom";
  const courseLabel = crs ? `${crs.subject}-${crs.section}` : "NoCourse";

  cell.textContent = `${courseLabel} (${facultyName}) @ ${roomName}`;
  cell.style.backgroundColor = scheduleObj.color || "#ffffff"; // Default to white if no color is set
}

function populateScheduleDropdowns() {
  // Fill faculty
  const facultyList = getData("faculty");
  scheduleFacultySelect.innerHTML = `<option value="">-- Select Faculty --</option>`;
  facultyList.forEach(f => {
    scheduleFacultySelect.innerHTML += `<option value="${f.id}">${f.name}</option>`;
  });

  // Fill rooms
  const roomsList = getData("rooms");
  scheduleRoomSelect.innerHTML = `<option value="">-- Select Room --</option>`;
  roomsList.forEach(r => {
    scheduleRoomSelect.innerHTML += `<option value="${r.id}">${r.name}</option>`;
  });

  // Fill courses
  const coursesList = getData("courses");
  scheduleCourseSelect.innerHTML = `<option value="">-- Select Course --</option>`;
  coursesList.forEach(c => {
    scheduleCourseSelect.innerHTML += `<option value="${c.id}">${c.subject}-${c.section}</option>`;
  });
}

// Function to check for conflicts
function checkForConflicts(dayType, time, col, facultyId, roomId, scheduleId) {
  const schedules = getData("schedules");

  // Check for conflicts in the same time slot for the same room or faculty
  const conflicts = schedules.filter(sch => {
    return (
      sch.dayType === dayType &&
      sch.time === time &&
      sch.col === col &&
      sch.id !== scheduleId && // Exclude the current schedule being edited
      (sch.roomId === roomId || sch.facultyId === facultyId)
    );
  });

  return conflicts;
}

// Function to show conflict pop-up
function showConflictPopup(conflicts) {
  const conflictPopup = document.createElement("div");
  conflictPopup.id = "conflict-popup";
  conflictPopup.style.position = "fixed";
  conflictPopup.style.top = "20px";
  conflictPopup.style.right = "20px";
  conflictPopup.style.backgroundColor = "#ffebee";
  conflictPopup.style.color = "#c62828";
  conflictPopup.style.padding = "10px";
  conflictPopup.style.borderRadius = "4px";
  conflictPopup.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
  conflictPopup.style.zIndex = "1000";

  let conflictMessage = "Conflict(s) detected:<br>";
  conflicts.forEach(conflict => {
    const faculty = getData("faculty").find(f => f.id === conflict.facultyId);
    const room = getData("rooms").find(r => r.id === conflict.roomId);
    const course = getData("courses").find(c => c.id === conflict.courseId);

    conflictMessage += `
      - ${faculty?.name || "Unknown Faculty"} is already assigned to ${course?.subject || "Unknown Course"} 
      in ${room?.name || "Unknown Room"} at ${conflict.time} on ${conflict.dayType}.<br>
    `;
  });

  conflictPopup.innerHTML = conflictMessage;

  // Append the popup to the body
  document.body.appendChild(conflictPopup);

  // Remove the popup after 5 seconds
  setTimeout(() => {
    document.body.removeChild(conflictPopup);
  }, 5000);
}

// Modify the save schedule logic to check for conflicts
btnSaveSchedule.addEventListener("click", () => {
  const schId = scheduleIdInput.value;
  const dayType = scheduleDayTypeInput.value;
  const time = scheduleTimeInput.value;
  const col = parseInt(scheduleColInput.value, 10);

  const facultyId = parseInt(scheduleFacultySelect.value) || null;
  const roomId = parseInt(scheduleRoomSelect.value)    || null;
  const courseId = parseInt(scheduleCourseSelect.value)  || null;

  if (!facultyId || !roomId || !courseId) {
    alert("Please select faculty, room, and course.");
    return;
  }

  // Check for conflicts
  const conflicts = checkForConflicts(dayType, time, col, facultyId, roomId, schId);

  if (conflicts.length > 0) {
    // Show conflict pop-up
    showConflictPopup(conflicts);
    return; // Prevent saving if there is a conflict
  }

  let schedules = getData("schedules");

  if (schId) {
    // Update existing
    const index = schedules.findIndex(s => s.id == schId);
    if (index > -1) {
      schedules[index].facultyId = facultyId;
      schedules[index].roomId    = roomId;
      schedules[index].courseId  = courseId;
    }
  } else {
    // Create
    const newId = getNewId(schedules);
    schedules.push({
      id: newId,
      dayType, time, col,
      facultyId, roomId, courseId,
      color: "#e9f1fb" // Default color
    });
  }

  setData("schedules", schedules);
  hideModal(modalSchedule);
  renderScheduleTables();
});

// Delete schedule
btnDeleteSchedule.addEventListener("click", () => {
  const schId = scheduleIdInput.value;
  if (!schId) return;

  if (!confirm("Are you sure you want to delete this schedule?")) return;

  let schedules = getData("schedules");
  schedules = schedules.filter(s => s.id != schId);
  setData("schedules", schedules);

  hideModal(modalSchedule);
  renderScheduleTables();
});

/**************************************************************
 * 7) ROOM VIEW: Render Room View Table
 **************************************************************/
const selectRoomView = document.getElementById("select-room-view");
const roomViewMwfTableBody = document.querySelector("#room-view-mwf-table tbody");
const roomViewTthsTableBody = document.querySelector("#room-view-tths-table tbody");

function renderRoomViewTable() {
  const roomId = parseInt(selectRoomView.value, 10);
  roomViewMwfTableBody.innerHTML = "";
  roomViewTthsTableBody.innerHTML = "";

  if (!roomId) return;

  // Get all rooms
  const roomsList = getData("rooms");

  // Render MWF Table
  MWF_TIMES.forEach(time => {
    const tr = document.createElement("tr");
    const timeTd = document.createElement("td");
    timeTd.textContent = time;
    tr.appendChild(timeTd);

    // Add rooms column
    const roomsTd = document.createElement("td");
    const roomInput = document.createElement("input");
    roomInput.type = "text";
    roomInput.value = roomsList.find(r => r.id === roomId)?.name || "";
    roomInput.classList.add("editable-room");
    roomInput.setAttribute("data-room-id", roomId);
    roomsTd.appendChild(roomInput);
    tr.appendChild(roomsTd);

    // Add schedule columns
    for (let col = 1; col <= 6; col++) {
      const cell = document.createElement("td");
      const schedules = getData("schedules");
      const schedule = schedules.find(sch => sch.roomId === roomId && sch.dayType === "MWF" && sch.time === time && sch.col === col);
      const faculty = schedule ? getData("faculty").find(f => f.id === schedule.facultyId) : null;
      const course = schedule ? getData("courses").find(c => c.id === schedule.courseId) : null;

      cell.textContent = schedule ? `${course?.subject || "No Course"} (${faculty?.name || "No Faculty"})` : "";
      cell.classList.add("clickable-cell");
      tr.appendChild(cell);
    }
    roomViewMwfTableBody.appendChild(tr);
  });

  // Render TTHS Table
  TTHS_TIMES.forEach(time => {
    const tr = document.createElement("tr");
    const timeTd = document.createElement("td");
    timeTd.textContent = time;
    tr.appendChild(timeTd);

    // Add rooms column
    const roomsTd = document.createElement("td");
    const roomInput = document.createElement("input");
    roomInput.type = "text";
    roomInput.value = roomsList.find(r => r.id === roomId)?.name || "";
    roomInput.classList.add("editable-room");
    roomInput.setAttribute("data-room-id", roomId);
    roomsTd.appendChild(roomInput);
    tr.appendChild(roomsTd);

    // Add schedule columns
    for (let col = 1; col <= 6; col++) {
      const cell = document.createElement("td");
      const schedules = getData("schedules");
      const schedule = schedules.find(sch => sch.roomId === roomId && sch.dayType === "TTHS" && sch.time === time && sch.col === col);
      const faculty = schedule ? getData("faculty").find(f => f.id === schedule.facultyId) : null;
      const course = schedule ? getData("courses").find(c => c.id === schedule.courseId) : null;

      cell.textContent = schedule ? `${course?.subject || "No Course"} (${faculty?.name || "No Faculty"})` : "";
      cell.classList.add("clickable-cell");
      tr.appendChild(cell);
    }
    roomViewTthsTableBody.appendChild(tr);
  });

  // Add event listeners for editable rooms
  document.querySelectorAll(".editable-room").forEach(input => {
    input.addEventListener("change", (e) => {
      const roomId = e.target.getAttribute("data-room-id");
      const newName = e.target.value.trim();

      if (newName) {
        let roomsList = getData("rooms");
        const roomIndex = roomsList.findIndex(r => r.id == roomId);
        if (roomIndex > -1) {
          roomsList[roomIndex].name = newName;
          setData("rooms", roomsList);
          renderRoomDropdown(); // Refresh the dropdown
          renderRoomViewTable(); // Refresh the room view table
        }
      }
    });
  });
}

function renderRoomDropdown() {
  const roomsList = getData("rooms");
  selectRoomView.innerHTML = `<option value="">-- Select Room --</option>`;
  roomsList.forEach(r => {
    selectRoomView.innerHTML += `<option value="${r.id}">${r.name}</option>`;
  });
}

/**************************************************************
 * 8) Modal Show/Hide
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
}

/**************************************************************
 * INITIAL PAGE LOAD
 **************************************************************/
hideAllSections();
sectionSchedule.classList.remove("hidden"); // default view
renderScheduleTables();