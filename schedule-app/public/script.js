/**************************************************************
 * API wrapper functions for backend calls
 **************************************************************/
async function apiGet(table) {
  const response = await fetch(`/api/${table}`);
  return response.json();
}

async function apiPost(table, data) {
  const response = await fetch(`/api/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
}

async function apiPut(table, id, data) {
  const response = await fetch(`/api/${table}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
}

async function apiDelete(table, id) {
  const response = await fetch(`/api/${table}/${id}`, {
    method: 'DELETE'
  });
  return response.json();
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
const sectionCourseOffering = document.getElementById("section-course-offering");
const sectionSchedule = document.getElementById("section-schedule");
const sectionRoomView = document.getElementById("section-room-view");

function hideAllSections() {
  sectionFaculty.classList.add("hidden");
  sectionRooms.classList.add("hidden");
  sectionCourses.classList.add("hidden");
  sectionCourseOffering.classList.add("hidden");
  sectionSchedule.classList.add("hidden");
  sectionRoomView.classList.add("hidden");
}

document.getElementById("btn-faculty").addEventListener("click", async () => {
  hideAllSections();
  sectionFaculty.classList.remove("hidden");
  await renderFacultyTable();
});
document.getElementById("btn-rooms").addEventListener("click", async () => {
  hideAllSections();
  sectionRooms.classList.remove("hidden");
  await renderRoomsTable();
});
document.getElementById("btn-courses").addEventListener("click", async () => {
  hideAllSections();
  sectionCourses.classList.remove("hidden");
  await renderCoursesTable();
});
document.getElementById("btn-schedule").addEventListener("click", async () => {
  hideAllSections();
  sectionSchedule.classList.remove("hidden");
  await renderScheduleTables();
});
document.getElementById("btn-room-view").addEventListener("click", async () => {
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

async function renderFacultyTable() {
  const facultyList = await apiGet("faculty");
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

btnSaveFaculty.addEventListener("click", async () => {
  const id = facultyIdInput.value;
  const name = facultyNameInput.value.trim();
  if (!name) {
    alert("Enter a faculty name.");
    return;
  }
  if (id) {
    await apiPut("faculty", id, { name });
  } else {
    await apiPost("faculty", { name });
  }
  hideModal(modalFaculty);
  await renderFacultyTable();
});

window.editFaculty = async function(id) {
  const facultyList = await apiGet("faculty");
  const found = facultyList.find(f => f.id == id);
  if (!found) return;
  facultyIdInput.value = found.id;
  facultyNameInput.value = found.name;
  document.getElementById("modal-faculty-title").textContent = "Edit Faculty";
  showModal(modalFaculty);
};

window.deleteFaculty = async function(id) {
  if (!confirm("Are you sure?")) return;
  await apiDelete("faculty", id);
  await renderFacultyTable();
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

async function renderRoomsTable() {
  const roomsList = await apiGet("rooms");
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

btnSaveRoom.addEventListener("click", async () => {
  const id = roomIdInput.value;
  const name = roomNameInput.value.trim();
  if (!name) {
    alert("Enter a room name.");
    return;
  }
  if (id) {
    await apiPut("rooms", id, { name });
  } else {
    await apiPost("rooms", { name });
  }
  hideModal(modalRoom);
  await renderRoomsTable();
});

window.editRoom = async function(id) {
  const roomsList = await apiGet("rooms");
  const found = roomsList.find(r => r.id == id);
  if (!found) return;
  roomIdInput.value = found.id;
  roomNameInput.value = found.name;
  document.getElementById("modal-room-title").textContent = "Edit Room";
  showModal(modalRoom);
};

window.deleteRoom = async function(id) {
  if (!confirm("Are you sure?")) return;
  await apiDelete("rooms", id);
  await renderRoomsTable();
};

/**************************************************************
 * 6) COURSES CRUD
 **************************************************************/
const tableCoursesBody = document.querySelector("#table-courses tbody");
const btnAddCourse = document.getElementById("btn-add-course");
const modalCourse = document.getElementById("modal-course");
const courseIdInput = document.getElementById("course-id");
const courseSubjectInput = document.getElementById("course-subject");
const courseUnitsInput = document.getElementById("course-units");
const btnSaveCourse = document.getElementById("btn-save-course");

async function renderCoursesTable() {
  const coursesList = await apiGet("courses");
  tableCoursesBody.innerHTML = "";
  coursesList.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.subject}</td>
      <td>${c.unit_category}</td>
      <td>${c.units}</td>
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
  courseUnitsInput.value = "";
  // Reset radio buttons to default PureLec
  document.getElementById("purelec").checked = true;
  document.getElementById("modal-course-title").textContent = "Add Course";
  showModal(modalCourse);
});

btnSaveCourse.addEventListener("click", async () => {
  const id = courseIdInput.value;
  const subject = courseSubjectInput.value.trim();
  const units = courseUnitsInput.value.trim();
  const unitCategory = document.querySelector('input[name="unitCategory"]:checked').value;
  if (!subject || !units) {
    alert("Please fill out subject and units.");
    return;
  }
  if (id) {
    await apiPut("courses", id, { subject, unitCategory, units });
  } else {
    await apiPost("courses", { subject, unitCategory, units });
  }
  hideModal(modalCourse);
  await renderCoursesTable();
});

window.editCourse = async function(id) {
  const coursesList = await apiGet("courses");
  const found = coursesList.find(c => c.id == id);
  if (!found) return;
  courseIdInput.value = found.id;
  courseSubjectInput.value = found.subject;
  if (found.unit_category === "PureLec") {
    document.getElementById("purelec").checked = true;
  } else {
    document.getElementById("leclab").checked = true;
  }
  courseUnitsInput.value = found.units;
  document.getElementById("modal-course-title").textContent = "Edit Course";
  showModal(modalCourse);
};

window.deleteCourse = async function(id) {
  if (!confirm("Are you sure?")) return;
  await apiDelete("courses", id);
  await renderCoursesTable();
};

/**************************************************************
 * 7) COURSE OFFERING CRUD
 **************************************************************/
const tableCourseOfferingBody = document.querySelector("#table-courseOffering tbody");
const btnAddCourseOffering = document.getElementById("btn-add-courseOffering");
const modalCourseOffering = document.getElementById("modal-course-offering");
const courseOfferingIdInput = document.getElementById("courseOffering-id");
const courseOfferingCourseSelect = document.getElementById("courseOffering-course");
const courseOfferingSectionInput = document.getElementById("courseOffering-section");
const courseOfferingUnitsInput = document.getElementById("courseOffering-units");
const btnSaveCourseOffering = document.getElementById("btn-save-courseOffering");

// Radio buttons and labels for course offering type
const courseOfferingLecRadio = document.getElementById("courseOffering-lec");
const courseOfferingLabRadio = document.getElementById("courseOffering-lab");
const courseOfferingPurelecRadio = document.getElementById("courseOffering-purelec");
const labelLec = document.getElementById("label-lec");
const labelLab = document.getElementById("label-lab");
const labelPurelec = document.getElementById("label-purelec");

document.getElementById("btn-course-offering").addEventListener("click", async () => {
  hideAllSections();
  sectionCourseOffering.classList.remove("hidden");
  await renderCourseOfferingTable();
});

async function populateCourseOfferingCourses() {
  let coursesList = await apiGet("courses");
  courseOfferingCourseSelect.innerHTML = `<option value="">-- Select Course --</option>`;
  coursesList.forEach(c => {
    courseOfferingCourseSelect.innerHTML += `<option value="${c.id}" data-unit-category="${c.unit_category}">${c.subject} (${c.unit_category})</option>`;
  });
}

courseOfferingCourseSelect.addEventListener("change", function() {
  const selectedOption = courseOfferingCourseSelect.options[courseOfferingCourseSelect.selectedIndex];
  const unitCategory = selectedOption.getAttribute("data-unit-category");
  labelLec.style.display = "none";
  labelLab.style.display = "none";
  labelPurelec.style.display = "none";
  if (unitCategory === "PureLec") {
    labelPurelec.style.display = "inline-block";
    courseOfferingPurelecRadio.checked = true;
    courseOfferingUnitsInput.value = "3";
  } else if (unitCategory === "Lec/Lab") {
    labelLec.style.display = "inline-block";
    labelLab.style.display = "inline-block";
    courseOfferingLecRadio.checked = true;
    courseOfferingUnitsInput.value = "2";
  }
});

document.querySelectorAll('input[name="courseOfferingType"]').forEach(radio => {
  radio.addEventListener("change", function() {
    const type = document.querySelector('input[name="courseOfferingType"]:checked').value;
    if (type === "Lec") {
      courseOfferingUnitsInput.value = "2";
    } else if (type === "Lab") {
      courseOfferingUnitsInput.value = "1";
    } else if (type === "PureLec") {
      courseOfferingUnitsInput.value = "3";
    }
  });
});

btnAddCourseOffering.addEventListener("click", async () => {
  courseOfferingIdInput.value = "";
  courseOfferingCourseSelect.value = "";
  courseOfferingSectionInput.value = "";
  labelLec.style.display = "none";
  labelLab.style.display = "none";
  labelPurelec.style.display = "none";
  courseOfferingUnitsInput.value = "";
  document.getElementById("modal-course-offering-title").textContent = "Add Course Offering";
  await populateCourseOfferingCourses();
  showModal(modalCourseOffering);
});

async function renderCourseOfferingTable() {
  const offerings = await apiGet("course_offerings");
  let coursesList = await apiGet("courses");
  tableCourseOfferingBody.innerHTML = "";
  offerings.forEach(off => {
    const course = coursesList.find(c => c.id == off.courseId);
    const courseDisplay = course ? course.subject : off.courseId;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${off.id}</td>
      <td>${courseDisplay}</td>
      <td>${off.section}</td>
      <td>${off.type}</td>
      <td>${off.units}</td>
      <td>
        <button onclick="editCourseOffering(${off.id})">Edit</button>
        <button onclick="deleteCourseOffering(${off.id})">Delete</button>
      </td>
    `;
    tableCourseOfferingBody.appendChild(tr);
  });
}

btnSaveCourseOffering.addEventListener("click", async () => {
  const id = courseOfferingIdInput.value;
  const courseId = courseOfferingCourseSelect.value;
  const section = courseOfferingSectionInput.value.trim();
  const type = document.querySelector('input[name="courseOfferingType"]:checked') ? document.querySelector('input[name="courseOfferingType"]:checked').value : "";
  const units = courseOfferingUnitsInput.value;
  if (!courseId || !section || !type || !units) {
    alert("Please fill out all fields.");
    return;
  }
  if (id) {
    await apiPut("course_offerings", id, { courseId, section, type, units });
  } else {
    await apiPost("course_offerings", { courseId, section, type, units });
  }
  hideModal(modalCourseOffering);
  await renderCourseOfferingTable();
});

window.editCourseOffering = async function(id) {
  const offerings = await apiGet("course_offerings");
  const offering = offerings.find(off => off.id == id);
  if (!offering) return;
  courseOfferingIdInput.value = offering.id;
  await populateCourseOfferingCourses();
  courseOfferingCourseSelect.value = offering.courseId;
  const event = new Event('change');
  courseOfferingCourseSelect.dispatchEvent(event);
  courseOfferingSectionInput.value = offering.section;
  if (offering.type === "Lec") {
    courseOfferingLecRadio.checked = true;
  } else if (offering.type === "Lab") {
    courseOfferingLabRadio.checked = true;
  } else if (offering.type === "PureLec") {
    courseOfferingPurelecRadio.checked = true;
  }
  courseOfferingUnitsInput.value = offering.units;
  document.getElementById("modal-course-offering-title").textContent = "Edit Course Offering";
  showModal(modalCourseOffering);
};

window.deleteCourseOffering = async function(id) {
  if (!confirm("Are you sure?")) return;
  await apiDelete("course_offerings", id);
  await renderCourseOfferingTable();
};

/**************************************************************
 * 8) SCHEDULE: Conflict Validation, Color Picker Fix,
 *     Double Timeslot Assignment, and Conflict Resolution Suggestions
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

async function renderScheduleTables() {
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
  const schedules = await apiGet("schedules");
  schedules.forEach(sch => {
    fillScheduleCell(sch);
  });
}

async function openScheduleModal(dayType, time, col) {
  await populateScheduleDropdowns();
  const schedules = await apiGet("schedules");
  const existing = schedules.find(s => 
    s.dayType === dayType && s.time === time && s.col === col
  );
  if (existing) {
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

async function fillScheduleCell(scheduleObj) {
  const tableBody = scheduleObj.dayType === "MWF" ? mwfTableBody : tthsTableBody;
  if (!tableBody) return;
  const cell = tableBody.querySelector(
    `.clickable-cell[data-dayType="${scheduleObj.dayType}"][data-time="${scheduleObj.time}"][data-col="${scheduleObj.col}"]`
  );
  if (!cell) return;
  const facultyList = await apiGet("faculty");
  const roomsList = await apiGet("rooms");
  const coursesList = await apiGet("courses");
  const fac = facultyList.find(f => f.id === scheduleObj.facultyId);
  const room = roomsList.find(r => r.id === scheduleObj.roomId);
  const crs = coursesList.find(c => c.id === scheduleObj.courseId);
  const facultyName = fac ? fac.name : "Unknown";
  const roomName = room ? room.name : "NoRoom";
  const courseLabel = crs
    ? `${crs.subject} (${crs.unit_category}) - ${crs.units}`
    : "NoCourse";
  cell.textContent = `${courseLabel} (${facultyName}) @ ${roomName}`;
  cell.style.backgroundColor = scheduleObj.color || "#ffffff";
}

async function populateScheduleDropdowns() {
  let facultyList = await apiGet("faculty");
  scheduleFacultySelect.innerHTML = `<option value="">-- Select Faculty --</option>`;
  facultyList.forEach(f => {
    scheduleFacultySelect.innerHTML += `<option value="${f.id}">${f.name}</option>`;
  });
  let roomsList = await apiGet("rooms");
  scheduleRoomSelect.innerHTML = `<option value="">-- Select Room --</option>`;
  roomsList.forEach(r => {
    scheduleRoomSelect.innerHTML += `<option value="${r.id}">${r.name}</option>`;
  });
  let coursesList = await apiGet("courses");
  scheduleCourseSelect.innerHTML = `<option value="">-- Select Course --</option>`;
  coursesList.forEach(c => {
    scheduleCourseSelect.innerHTML += `<option value="${c.id}">${c.subject} (${c.unit_category}) - ${c.units}</option>`;
  });
}

async function checkForConflicts(dayType, time, facultyId, roomId, scheduleId) {
  const schedules = await apiGet("schedules");
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

async function getConflictSuggestions(dayType, time, facultyId, roomId, scheduleId) {
  let suggestions = [];
  let timesArray = (dayType === "MWF") ? MWF_TIMES : TTHS_TIMES;
  for (let t of timesArray) {
    if (t === time) continue;
    let conflicts = await checkForConflicts(dayType, t, facultyId, roomId, scheduleId);
    if (conflicts.length === 0) {
      suggestions.push(`Try scheduling at time: ${t}`);
    }
  }
  let rooms = await apiGet("rooms");
  for (let r of rooms) {
    if (parseInt(r.id) === roomId) continue;
    let conflicts = await checkForConflicts(dayType, time, facultyId, parseInt(r.id), scheduleId);
    if (conflicts.length === 0) {
      suggestions.push(`Try using room: ${r.name}`);
    }
  }
  return suggestions;
}

async function showConflictPopup(conflicts, dayType, time, facultyId, roomId, scheduleId) {
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
  for (let conflict of conflicts) {
    const sch = conflict.schedule;
    const facultyList = await apiGet("faculty");
    const roomsList = await apiGet("rooms");
    const coursesList = await apiGet("courses");
    const fac = facultyList.find(f => f.id === sch.facultyId);
    const room = roomsList.find(r => r.id === sch.roomId);
    const crs = coursesList.find(c => c.id === sch.courseId);
    if (conflict.type === "faculty") {
      msg += `- Faculty "${fac?.name || "Unknown"}" is already assigned to ${
        crs ? crs.subject + " (" + crs.unit_category + ") - " + crs.units : "an unknown course"
      } in room "${room?.name || "Unknown"}" at ${sch.time} on ${sch.dayType}.<br>`;
    } else if (conflict.type === "room") {
      msg += `- Room "${room?.name || "Unknown"}" is already in use for ${
        crs ? crs.subject + " (" + crs.unit_category + ") - " + crs.units : "an unknown course"
      } by faculty "${fac?.name || "Unknown"}" at ${sch.time} on ${sch.dayType}.<br>`;
    }
  }
  const suggestions = await getConflictSuggestions(dayType, time, facultyId, roomId, scheduleId);
  if (suggestions.length > 0) {
    msg += "<br>Suggestions:<br>" + suggestions.join("<br>");
  }
  conflictPopup.innerHTML = msg;
  document.body.appendChild(conflictPopup);
  setTimeout(() => {
    conflictPopup.remove();
  }, 5000);
}

btnSaveSchedule.addEventListener("click", async () => {
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
  const color = scheduleColorInput.value;
  const conflicts = await checkForConflicts(dayType, time, facultyId, roomId, schId);
  if (conflicts.length > 0) {
    await showConflictPopup(conflicts, dayType, time, facultyId, roomId, schId);
    return;
  }
  if (schId) {
    await apiPut("schedules", schId, { dayType, time, col, facultyId, roomId, courseId, color });
  } else {
    await apiPost("schedules", { dayType, time, col, facultyId, roomId, courseId, color });
    if (applyNextCheckbox.checked) {
      let timesArray = (dayType === "MWF") ? MWF_TIMES : TTHS_TIMES;
      let currentIndex = timesArray.indexOf(time);
      if (currentIndex === -1 || currentIndex === timesArray.length - 1) {
        alert("No next timeslot available for the selected day type.");
        return;
      }
      let nextTime = timesArray[currentIndex + 1];
      const conflictsNext = await checkForConflicts(dayType, nextTime, facultyId, roomId, "");
      if (conflictsNext.length > 0) {
        await showConflictPopup(conflictsNext, dayType, nextTime, facultyId, roomId, "");
        return;
      }
      await apiPost("schedules", { dayType, time: nextTime, col, facultyId, roomId, courseId, color });
    }
  }
  hideModal(modalSchedule);
  await renderScheduleTables();
});

btnDeleteSchedule.addEventListener("click", async () => {
  const schId = scheduleIdInput.value;
  if (!schId) return;
  if (!confirm("Are you sure?")) return;
  await apiDelete("schedules", schId);
  hideModal(modalSchedule);
  await renderScheduleTables();
});

/**************************************************************
 * 9) ROOM VIEW: Two Separate Tables (MWF, TTHS)
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

async function buildRoomViewTable(dayType) {
  const columns = getAllRoomColumns();
  const times = dayType === "MWF" ? MWF_TIMES : TTHS_TIMES;
  const tbody = document.getElementById(
    dayType === "MWF" ? "room-view-mwf-tbody" : "room-view-tths-tbody"
  );
  tbody.innerHTML = "";
  const rooms = await apiGet("rooms");
  for (let time of times) {
    const tr = document.createElement("tr");
    const timeTd = document.createElement("td");
    timeTd.textContent = time;
    tr.appendChild(timeTd);
    for (let roomName of columns) {
      const td = document.createElement("td");
      const schedules = await apiGet("schedules");
      const schedule = schedules.find((sch) => {
        if (sch.dayType !== dayType) return false;
        if (sch.time !== time) return false;
        const r = rooms.find(r => r.id === sch.roomId);
        const currentRoomName = r ? r.name : "";
        return currentRoomName === roomName;
      });
      if (schedule) {
        const facultyList = await apiGet("faculty");
        const coursesList = await apiGet("courses");
        const faculty = facultyList.find((f) => f.id === schedule.facultyId);
        const course = coursesList.find((c) => c.id === schedule.courseId);
        td.textContent = `${
          course ? course.subject + " (" + course.unit_category + ") - " + course.units : "No Course"
        } (${faculty ? faculty.name : "No Faculty"})`;
        td.style.backgroundColor = schedule.color || "#e9f1fb";
      } else {
        td.textContent = "";
      }
      td.classList.add("clickable-cell");
      tr.appendChild(td);
    }
    const extraTd = document.createElement("td");
    extraTd.textContent = "";
    tr.appendChild(extraTd);
    tbody.appendChild(tr);
  }
}

/**************************************************************
 * 10) Modal Show/Hide
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
 * 11) INITIAL PAGE LOAD
 **************************************************************/
(async function initialLoad() {
  hideAllSections();
  sectionSchedule.classList.remove("hidden"); // Default view
  await renderScheduleTables();
})();
