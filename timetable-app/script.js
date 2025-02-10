/**************************************************************
 * 1) Initialize LocalStorage
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

function getData(key) {
  return JSON.parse(localStorage.getItem(key)) || [];
}
function setData(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}
function getNewId(arr) {
  if (arr.length === 0) return 1;
  return Math.max(...arr.map(i => i.id)) + 1;
}

/**************************************************************
 * 2) Global variables for Room View columns
 **************************************************************/
const predefinedRooms = ["M301", "M303", "M304", "M305", "M306", "M306", "S311", "S312"];
let extraColumns = []; // Additional room columns if user chooses

function getAllRoomColumns() {
  return predefinedRooms.concat(extraColumns);
}

/**************************************************************
 * 3) Navigation
 **************************************************************/
const sectionFaculty = document.getElementById("section-faculty");
const sectionRooms = document.getElementById("section-rooms");
const sectionCourses = document.getElementById("section-courses");
const sectionSchedule = document.getElementById("section-schedule");
const sectionRoomView = document.getElementById("section-room-view");

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
  renderRoomViewHeaders();
  renderRoomViewTables();
});

/**************************************************************
 * 4) FACULTY CRUD
 **************************************************************/
const tableFacultyBody = document.querySelector("#table-faculty tbody");
const btnAddFaculty = document.getElementById("btn-add-faculty");
const modalFaculty = document.getElementById("modal-faculty");
const facultyIdInput = document.getElementById("faculty-id");
const facultyNameInput = document.getElementById("faculty-name");
const btnSaveFaculty = document.getElementById("btn-save-faculty");

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
    const idx = facultyList.findIndex(f => f.id == id);
    if (idx > -1) {
      facultyList[idx].name = name;
    }
  } else {
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
 * 5) ROOMS CRUD
 **************************************************************/
const tableRoomsBody = document.querySelector("#table-rooms tbody");
const btnAddRoom = document.getElementById("btn-add-room");
const modalRoom = document.getElementById("modal-room");
const roomIdInput = document.getElementById("room-id");
const roomNameInput = document.getElementById("room-name");
const btnSaveRoom = document.getElementById("btn-save-room");

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
 * 6) COURSES CRUD
 **************************************************************/
const tableCoursesBody = document.querySelector("#table-courses tbody");
const btnAddCourse = document.getElementById("btn-add-course");
const modalCourse = document.getElementById("modal-course");
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
 * 7) SCHEDULE: Conflict Validation, Color Picker Fix,
 *     and New Feature: Option to assign two consecutive timeslots.
 **************************************************************/
const mwfTableBody = document.querySelector("#mwf-table tbody");
const tthsTableBody = document.querySelector("#tths-table tbody");
const modalSchedule = document.getElementById("modal-schedule");

const scheduleDayTypeInput = document.getElementById("schedule-dayType");
const scheduleTimeInput = document.getElementById("schedule-time");
const scheduleColInput = document.getElementById("schedule-col");
const scheduleIdInput = document.getElementById("schedule-id");

const scheduleFacultySelect = document.getElementById("schedule-faculty");
const scheduleRoomSelect = document.getElementById("schedule-room");
const scheduleCourseSelect = document.getElementById("schedule-course");
const scheduleColorInput = document.getElementById("schedule-color");
const applyNextCheckbox = document.getElementById("apply-next");

const btnSaveSchedule = document.getElementById("btn-save-schedule");
const btnDeleteSchedule = document.getElementById("btn-delete-schedule");

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

function renderScheduleTables() {
  mwfTableBody.innerHTML = "";
  tthsTableBody.innerHTML = "";

  // Build MWF table
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

  // Build TTHS table
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

function openScheduleModal(dayType, time, col) {
  populateScheduleDropdowns();

  const schedules = getData("schedules");
  const existing = schedules.find(s => 
    s.dayType === dayType && s.time === time && s.col === col
  );

  if (existing) {
    // Editing an existing schedule
    scheduleIdInput.value = existing.id;
    scheduleDayTypeInput.value = existing.dayType;
    scheduleTimeInput.value = existing.time;
    scheduleColInput.value = existing.col;
    scheduleFacultySelect.value = existing.facultyId || "";
    scheduleRoomSelect.value = existing.roomId || "";
    scheduleCourseSelect.value = existing.courseId || "";
    scheduleColorInput.value = existing.color || "#e9f1fb";
    applyNextCheckbox.checked = false;
    applyNextCheckbox.disabled = true;
    btnDeleteSchedule.style.display = "block";
  } else {
    // Creating a new schedule
    scheduleIdInput.value = "";
    scheduleDayTypeInput.value = dayType;
    scheduleTimeInput.value = time;
    scheduleColInput.value = col;
    scheduleFacultySelect.value = "";
    scheduleRoomSelect.value = "";
    scheduleCourseSelect.value = "";
    scheduleColorInput.value = "#e9f1fb";
    applyNextCheckbox.checked = false;
    applyNextCheckbox.disabled = false;
    btnDeleteSchedule.style.display = "none";
  }

  showModal(modalSchedule);
}

function fillScheduleCell(scheduleObj) {
  const tableBody = scheduleObj.dayType === "MWF" ? mwfTableBody : tthsTableBody;
  if (!tableBody) return;

  const cell = tableBody.querySelector(
    `.clickable-cell[data-dayType="${scheduleObj.dayType}"][data-time="${scheduleObj.time}"][data-col="${scheduleObj.col}"]`
  );
  if (!cell) return;

  const fac = getData("faculty").find(f => f.id === scheduleObj.facultyId);
  const room = getData("rooms").find(r => r.id === scheduleObj.roomId);
  const crs = getData("courses").find(c => c.id === scheduleObj.courseId);

  const facultyName = fac ? fac.name : "Unknown";
  const roomName = room ? room.name : "NoRoom";
  const courseLabel = crs ? `${crs.subject}-${crs.section}` : "NoCourse";

  cell.textContent = `${courseLabel} (${facultyName}) @ ${roomName}`;
  cell.style.backgroundColor = scheduleObj.color || "#ffffff";
}

function populateScheduleDropdowns() {
  const facultyList = getData("faculty");
  scheduleFacultySelect.innerHTML = `<option value="">-- Select Faculty --</option>`;
  facultyList.forEach(f => {
    scheduleFacultySelect.innerHTML += `<option value="${f.id}">${f.name}</option>`;
  });

  const roomsList = getData("rooms");
  scheduleRoomSelect.innerHTML = `<option value="">-- Select Room --</option>`;
  roomsList.forEach(r => {
    scheduleRoomSelect.innerHTML += `<option value="${r.id}">${r.name}</option>`;
  });

  const coursesList = getData("courses");
  scheduleCourseSelect.innerHTML = `<option value="">-- Select Course --</option>`;
  coursesList.forEach(c => {
    scheduleCourseSelect.innerHTML += `<option value="${c.id}">${c.subject}-${c.section}</option>`;
  });
}

/* 
  Robust conflict check: For a given day and time, ensure that neither the
  selected faculty nor room is already assigned in any other schedule (regardless of column).
  Returns an array of conflict objects.
*/
function checkForConflicts(dayType, time, facultyId, roomId, scheduleId) {
  const schedules = getData("schedules");
  let conflicts = [];
  schedules.forEach(sch => {
    if (sch.dayType === dayType && sch.time === time && sch.id != scheduleId) {
      if (sch.facultyId === facultyId) {
        conflicts.push({ type: "faculty", schedule: sch });
      }
      if (sch.roomId === roomId) {
        conflicts.push({ type: "room", schedule: sch });
      }
    }
  });
  return conflicts;
}

/* 
  New function: getConflictSuggestions() returns an array of suggestion strings 
  for alternative times and/or rooms.
*/
function getConflictSuggestions(dayType, time, facultyId, roomId, scheduleId) {
  let suggestions = [];
  // Suggest alternative times (same day type)
  let timesArray = (dayType === "MWF") ? MWF_TIMES : TTHS_TIMES;
  for (let t of timesArray) {
    if (t === time) continue;
    if (checkForConflicts(dayType, t, facultyId, roomId, scheduleId).length === 0) {
      suggestions.push(`Try scheduling at time: ${t}`);
      // Optionally, break after one suggestion.
      // break;
    }
  }
  // Suggest alternative rooms (at the same time)
  let rooms = getData("rooms");
  for (let r of rooms) {
    if (parseInt(r.id) === roomId) continue;
    if (checkForConflicts(dayType, time, facultyId, parseInt(r.id), scheduleId).length === 0) {
      suggestions.push(`Try using room: ${r.name}`);
      // Optionally, break after one suggestion.
      // break;
    }
  }
  return suggestions;
}

/* 
  Modified showConflictPopup(): In addition to the conflict messages, 
  suggestions are appended if available.
*/
function showConflictPopup(conflicts, dayType, time, facultyId, roomId, scheduleId) {
  // If parameters are missing, try to get from modal fields.
  dayType = dayType || scheduleDayTypeInput.value;
  time = time || scheduleTimeInput.value;
  facultyId = facultyId || parseInt(scheduleFacultySelect.value) || null;
  roomId = roomId || parseInt(scheduleRoomSelect.value) || null;
  scheduleId = scheduleId || scheduleIdInput.value;
  
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

  let msg = "Conflict(s) detected:<br>";
  conflicts.forEach(conflict => {
    const sch = conflict.schedule;
    const fac = getData("faculty").find(f => f.id === sch.facultyId);
    const room = getData("rooms").find(r => r.id === sch.roomId);
    const crs = getData("courses").find(c => c.id === sch.courseId);
    if (conflict.type === "faculty") {
      msg += `- Faculty "${fac?.name || "Unknown"}" is already assigned to ${crs ? crs.subject + "-" + crs.section : "an unknown course"} in room "${room?.name || "Unknown"}" at ${sch.time} on ${sch.dayType}.<br>`;
    } else if (conflict.type === "room") {
      msg += `- Room "${room?.name || "Unknown"}" is already in use for ${crs ? crs.subject + "-" + crs.section : "an unknown course"} by faculty "${fac?.name || "Unknown"}" at ${sch.time} on ${sch.dayType}.<br>`;
    }
  });
  // Append suggestions if available.
  const suggestions = getConflictSuggestions(dayType, time, facultyId, roomId, scheduleId);
  if (suggestions.length > 0) {
    msg += "<br>Suggestions:<br>" + suggestions.join("<br>");
  }
  conflictPopup.innerHTML = msg;
  document.body.appendChild(conflictPopup);
  setTimeout(() => {
    conflictPopup.remove();
  }, 5000);
}

btnSaveSchedule.addEventListener("click", () => {
  const schId = scheduleIdInput.value;
  const dayType = scheduleDayTypeInput.value;
  const time = scheduleTimeInput.value;
  const col = parseInt(scheduleColInput.value, 10);

  const facultyId = parseInt(scheduleFacultySelect.value) || null;
  const roomId = parseInt(scheduleRoomSelect.value) || null;
  const courseId = parseInt(scheduleCourseSelect.value) || null;

  if (!facultyId || !roomId || !courseId) {
    alert("Please select faculty, room, and course.");
    return;
  }

  // Get the selected color from the color picker.
  const color = scheduleColorInput.value;

  // Check conflict for the current timeslot.
  const conflicts = checkForConflicts(dayType, time, facultyId, roomId, schId);
  if (conflicts.length > 0) {
    showConflictPopup(conflicts, dayType, time, facultyId, roomId, schId);
    return;
  }

  let schedules = getData("schedules");
  let newSchedules = [];

  if (schId) {
    // Edit existing schedule.
    const idx = schedules.findIndex(s => s.id == schId);
    if (idx > -1) {
      schedules[idx].facultyId = facultyId;
      schedules[idx].roomId = roomId;
      schedules[idx].courseId = courseId;
      schedules[idx].color = color;
    }
  } else {
    // Create new schedule entry.
    const newId = getNewId(schedules);
    newSchedules.push({
      id: newId,
      dayType,
      time,
      col,
      facultyId,
      roomId,
      courseId,
      color: color
    });
    // If "Apply to next timeslot" is checked, attempt to add for the next timeslot.
    if (applyNextCheckbox.checked) {
      let timesArray = (dayType === "MWF") ? MWF_TIMES : TTHS_TIMES;
      let currentIndex = timesArray.indexOf(time);
      if (currentIndex === -1 || currentIndex === timesArray.length - 1) {
        alert("No next timeslot available for the selected day type.");
        return;
      }
      let nextTime = timesArray[currentIndex + 1];
      const conflictsNext = checkForConflicts(dayType, nextTime, facultyId, roomId, "");
      if (conflictsNext.length > 0) {
        showConflictPopup(conflictsNext, dayType, nextTime, facultyId, roomId, "");
        return;
      }
      const newId2 = newId + 1; // Simple new id generation.
      newSchedules.push({
        id: newId2,
        dayType,
        time: nextTime,
        col, // same column
        facultyId,
        roomId,
        courseId,
        color: color
      });
    }
  }

  if (newSchedules.length > 0 && !schId) {
    schedules = schedules.concat(newSchedules);
  }
  setData("schedules", schedules);
  hideModal(modalSchedule);
  renderScheduleTables();
});

btnDeleteSchedule.addEventListener("click", () => {
  const schId = scheduleIdInput.value;
  if (!schId) return;
  if (!confirm("Are you sure?")) return;
  let schedules = getData("schedules");
  schedules = schedules.filter(s => s.id != schId);
  setData("schedules", schedules);
  hideModal(modalSchedule);
  renderScheduleTables();
});

/**************************************************************
 * 8) ROOM VIEW: Two Separate Tables (MWF, TTHS)
 **************************************************************/
function renderRoomViewHeaders() {
  buildRoomViewHeader("MWF");
  buildRoomViewHeader("TTHS");
}

function buildRoomViewHeader(dayType) {
  const columns = getAllRoomColumns();
  const thead = document.getElementById(
    dayType === "MWF" ? "room-view-mwf-thead" : "room-view-tths-thead"
  );
  thead.innerHTML = "";

  const headerRow = document.createElement("tr");
  const timeTh = document.createElement("th");
  timeTh.textContent = "Time";
  headerRow.appendChild(timeTh);

  columns.forEach((roomName) => {
    const th = document.createElement("th");
    const input = document.createElement("input");
    input.type = "text";
    input.classList.add("extra-column-input");
    input.value = roomName;
    if (predefinedRooms.includes(roomName)) {
      input.disabled = true;
    } else {
      input.addEventListener("change", () => {
        const idx = extraColumns.indexOf(roomName);
        if (idx !== -1) {
          extraColumns[idx] = input.value;
          renderRoomViewTables();
        }
      });
    }
    th.appendChild(input);
    headerRow.appendChild(th);
  });

  const addTh = document.createElement("th");
  const addBtn = document.createElement("button");
  addBtn.textContent = "Add Column";
  addBtn.classList.add("add-column-btn");
  addBtn.addEventListener("click", () => {
    const newColName = prompt("Enter new room column name:");
    if (newColName) {
      extraColumns.push(newColName);
      renderRoomViewHeaders();
      renderRoomViewTables();
    }
  });
  addTh.appendChild(addBtn);
  headerRow.appendChild(addTh);

  thead.appendChild(headerRow);
}

function renderRoomViewTables() {
  buildRoomViewTable("MWF");
  buildRoomViewTable("TTHS");
}

function buildRoomViewTable(dayType) {
  const columns = getAllRoomColumns();
  const times = dayType === "MWF" ? MWF_TIMES : TTHS_TIMES;
  const tbody = document.getElementById(
    dayType === "MWF" ? "room-view-mwf-tbody" : "room-view-tths-tbody"
  );
  tbody.innerHTML = "";

  times.forEach((time) => {
    const tr = document.createElement("tr");
    const timeTd = document.createElement("td");
    timeTd.textContent = time;
    tr.appendChild(timeTd);

    columns.forEach((roomName) => {
      const td = document.createElement("td");
      const schedules = getData("schedules");
      const schedule = schedules.find((sch) => {
        if (sch.dayType !== dayType) return false;
        if (sch.time !== time) return false;
        const currentRoomName = getRoomName(sch.roomId);
        return currentRoomName === roomName;
      });

      if (schedule) {
        const faculty = getData("faculty").find((f) => f.id === schedule.facultyId);
        const course = getData("courses").find((c) => c.id === schedule.courseId);
        td.textContent = `${course ? course.subject + "-" + course.section : "No Course"} (${faculty ? faculty.name : "No Faculty"})`;
        td.style.backgroundColor = schedule.color || "#e9f1fb";
      } else {
        td.textContent = "";
      }
      td.classList.add("clickable-cell");
      tr.appendChild(td);
    });

    const extraTd = document.createElement("td");
    extraTd.textContent = "";
    tr.appendChild(extraTd);

    tbody.appendChild(tr);
  });
}

/**************************************************************
 * Helper Functions
 **************************************************************/
function getRoomName(roomId) {
  const room = getData("rooms").find((r) => r.id === roomId);
  return room ? room.name : "";
}

/**************************************************************
 * 9) Modal Show/Hide
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
sectionSchedule.classList.remove("hidden"); // Default view
renderScheduleTables();
