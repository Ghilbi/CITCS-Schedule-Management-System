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
 * Global variables for Room View columns
 **************************************************************/
const predefinedRooms = ["M301", "M303", "M304", "M305", "M306", "M306", "S311", "S312"];
let extraColumns = []; // Additional room columns if user chooses

function getAllRoomColumns() {
  return predefinedRooms.concat(extraColumns);
}

/**************************************************************
 * Navigation
 **************************************************************/
const sectionFaculty = document.getElementById("section-faculty");
const sectionCourses = document.getElementById("section-courses");
const sectionCourseOffering = document.getElementById("section-course-offering");
const sectionRoomView = document.getElementById("section-room-view");

function hideAllSections() {
  sectionFaculty.classList.add("hidden");
  sectionCourses.classList.add("hidden");
  sectionCourseOffering.classList.add("hidden");
  sectionRoomView.classList.add("hidden");
}

document.getElementById("btn-faculty").addEventListener("click", async () => {
  hideAllSections();
  sectionFaculty.classList.remove("hidden");
  await renderFacultyTable();
});
document.getElementById("btn-courses").addEventListener("click", async () => {
  hideAllSections();
  sectionCourses.classList.remove("hidden");
  await renderCoursesTable();
});
document.getElementById("btn-course-offering").addEventListener("click", async () => {
  hideAllSections();
  sectionCourseOffering.classList.remove("hidden");
  await renderCourseOfferingTable();
});
document.getElementById("btn-room-view").addEventListener("click", async () => {
  hideAllSections();
  sectionRoomView.classList.remove("hidden");
  renderRoomViewHeaders();
  renderRoomViewTables();
  await validateAllComplementary();
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
  await validateAllComplementary();
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
  await validateAllComplementary();
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
    // For Lec/Lab courses, we auto-add two entries so ignore unit input.
    courseOfferingUnitsInput.value = "";
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
  const selectedOption = courseOfferingCourseSelect.options[courseOfferingCourseSelect.selectedIndex];
  const unitCategory = selectedOption ? selectedOption.getAttribute("data-unit-category") : "";
  const type = document.querySelector('input[name="courseOfferingType"]:checked') 
               ? document.querySelector('input[name="courseOfferingType"]:checked').value 
               : "";
  const units = courseOfferingUnitsInput.value;
  if (!courseId || !section) {
    alert("Please fill out all fields.");
    return;
  }
  
  // If the selected course is Lec/Lab and we're adding a new offering, auto-add two entries:
  if (!id && unitCategory === "Lec/Lab") {
    await apiPost("course_offerings", { courseId, section, type: "Lec", units: 2 });
    await apiPost("course_offerings", { courseId, section, type: "Lab", units: 1 });
  } else {
    if (id) {
      await apiPut("course_offerings", id, { courseId, section, type, units });
    } else {
      await apiPost("course_offerings", { courseId, section, type, units });
    }
  }
  hideModal(modalCourseOffering);
  await renderCourseOfferingTable();
  await validateAllComplementary();
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
  await validateAllComplementary();
};

/**************************************************************
 * ROOM VIEW: Build headers and tables, and add cell click for pop up
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
  const times = dayType === "MWF"
    ? ["7:30 - 8:50","8:50 - 10:10","10:10 - 11:30","11:30 - 12:50","12:50 - 2:10","2:10 - 3:30","3:30 - 4:50","4:50 - 6:10","6:10 - 7:30"]
    : ["7:30 - 8:50","8:50 - 10:10","10:10 - 11:30","11:30 - 12:50","12:50 - 2:10","2:10 - 3:30","3:30 - 4:50","4:50 - 6:10","6:10 - 7:30"];
  const tbody = document.getElementById(
    dayType === "MWF" ? "room-view-mwf-tbody" : "room-view-tths-tbody"
  );
  tbody.innerHTML = "";
  const rooms = await apiGet("rooms");
  const schedules = await apiGet("schedules");
  
  for (let time of times) {
    const tr = document.createElement("tr");
    const timeTd = document.createElement("td");
    timeTd.textContent = time;
    tr.appendChild(timeTd);
    for (const [index, roomName] of columns.entries()) {
      const td = document.createElement("td");
      td.classList.add("clickable-cell");
      td.setAttribute("data-dayType", dayType);
      td.setAttribute("data-time", time);
      td.setAttribute("data-col", index + 1);
      td.addEventListener("click", () => openRoomViewModal(dayType, time, roomName, index + 1));
      const room = rooms.find(r => r.name === roomName);
      let schedule;
      if (room) {
        schedule = schedules.find(sch =>
          sch.dayType === dayType &&
          sch.time === time &&
          sch.roomId === room.id
        );
      }
      if (!schedule) {
        schedule = schedules.find(sch =>
          sch.dayType === dayType &&
          sch.time === time &&
          sch.col === index + 1
        );
      }
      if (schedule) {
        const coursesList = await apiGet("courses");
        const course = coursesList.find(c => c.id === schedule.courseId);
        td.textContent = course ? `${course.subject} - (${schedule.section}) - Type: ${schedule.unitType}` : "No Course";
        td.style.backgroundColor = schedule.color || "#e9f1fb";
      } else {
        td.textContent = "";
      }
      tr.appendChild(td);
    }
    const extraTd = document.createElement("td");
    extraTd.textContent = "";
    tr.appendChild(extraTd);
    tbody.appendChild(tr);
  }
}

/**************************************************************
 * ROOM VIEW Modal: Open, populate, and save with complementary validation
 **************************************************************/
const modalRoomView = document.getElementById("modal-roomview");

async function openRoomViewModal(dayType, time, roomName, col) {
  let roomsList = await apiGet("rooms");
  const room = roomsList.find(r => r.name === roomName);
  const schedules = await apiGet("schedules");
  let existing;
  if (room) {
    existing = schedules.find(sch =>
      sch.dayType === dayType &&
      sch.time === time &&
      sch.roomId === room.id
    );
  } else {
    existing = schedules.find(sch =>
      sch.dayType === dayType &&
      sch.time === time &&
      sch.col === col
    );
  }
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
  // Populate the course dropdown from course_offerings
  await populateRoomViewCourseDropdown();
  // Pre-select values if editing an existing schedule
  if (existing) {
    document.getElementById("roomview-course").value = existing.courseId;
    document.getElementById("roomview-course").dispatchEvent(new Event("change"));
    await populateRoomViewSectionDropdown();
    document.getElementById("roomview-section").value = existing.section;
    if (existing.unitType === "PureLec") {
      document.getElementById("roomview-unitCategory").value = "PureLec";
      document.getElementById("roomview-radio-group").style.display = "none";
      document.getElementById("roomview-units-container").style.display = "block";
      document.getElementById("roomview-units").value = "3";
    } else {
      document.getElementById("roomview-unitCategory").value = "Lec/Lab";
      document.getElementById("roomview-radio-group").style.display = "flex";
      document.getElementById("roomview-units-container").style.display = "none";
      document.querySelector(`input[name="roomviewType"][value="${existing.unitType}"]`).checked = true;
    }
  } else {
    document.getElementById("roomview-course").value = "";
    document.getElementById("roomview-section").innerHTML = `<option value="">-- Select Section --</option>`;
    document.getElementById("roomview-unitCategory").value = "Lec/Lab";
    document.getElementById("roomview-radio-group").style.display = "flex";
    document.getElementById("roomview-units-container").style.display = "none";
    document.querySelector('input[name="roomviewType"][value="Lec"]').checked = true;
  }
  showModal(modalRoomView);
}

document.getElementById("roomview-course").addEventListener("change", function() {
  const selectedOption = this.options[this.selectedIndex];
  const unitCategory = selectedOption.getAttribute("data-unit-category");
  const roomviewUnitCategory = document.getElementById("roomview-unitCategory");
  const roomviewRadioGroup = document.getElementById("roomview-radio-group");
  const roomviewUnitsContainer = document.getElementById("roomview-units-container");
  if (unitCategory === "PureLec") {
    roomviewUnitCategory.value = "PureLec";
    roomviewRadioGroup.style.display = "none";
    roomviewUnitsContainer.style.display = "block";
    document.getElementById("roomview-units").value = "3";
  } else {
    roomviewUnitCategory.value = "Lec/Lab";
    roomviewRadioGroup.style.display = "flex";
    roomviewUnitsContainer.style.display = "none";
    const lecRadio = document.querySelector('input[name="roomviewType"][value="Lec"]');
    if (lecRadio) lecRadio.checked = true;
  }
  populateRoomViewSectionDropdown();
});

document.getElementById("btn-delete-roomview").addEventListener("click", async () => {
  const id = document.getElementById("roomview-id").value;
  if (!id) return;
  if (!confirm("Are you sure you want to delete this schedule entry?")) return;
  await apiDelete("schedules", id);
  hideModal(modalRoomView);
  renderRoomViewTables();
  await validateAllComplementary();
});

/**************************************************************
 * Populate RoomView Course & Section dropdowns
 **************************************************************/
async function populateRoomViewCourseDropdown() {
  const roomviewCourseSelect = document.getElementById("roomview-course");
  const offerings = await apiGet("course_offerings");
  const courses = await apiGet("courses");
  const uniqueCourseIds = [...new Set(offerings.map(off => off.courseId))];
  roomviewCourseSelect.innerHTML = `<option value="">-- Select Course --</option>`;
  uniqueCourseIds.forEach(courseId => {
    const course = courses.find(c => c.id == courseId);
    if (course) {
      roomviewCourseSelect.innerHTML += `<option value="${course.id}" data-unit-category="${course.unit_category}">${course.subject} (${course.unit_category}) - ${course.units}</option>`;
    }
  });
}

async function populateRoomViewSectionDropdown() {
  const roomviewSectionSelect = document.getElementById("roomview-section");
  roomviewSectionSelect.innerHTML = `<option value="">-- Select Section --</option>`;
  const courseId = document.getElementById("roomview-course").value;
  if (!courseId) return;
  const offerings = await apiGet("course_offerings");
  const filtered = offerings.filter(off => off.courseId == courseId);
  const distinctSections = [...new Set(filtered.map(off => off.section))];
  distinctSections.forEach(sec => {
    roomviewSectionSelect.innerHTML += `<option value="${sec}">${sec}</option>`;
  });
}

/**************************************************************
 * SAVE schedule (with front-end duplicate check using conflict popup)
 **************************************************************/
document.getElementById("btn-save-roomview").addEventListener("click", async () => {
  const roomviewCourseSelect = document.getElementById("roomview-course");
  const roomviewUnitCategorySelect = document.getElementById("roomview-unitCategory");
  const roomviewSectionSelect = document.getElementById("roomview-section");
  const courseId = roomviewCourseSelect.value;
  const unitCategory = roomviewUnitCategorySelect.value;
  let unitType = (unitCategory === "Lec/Lab")
    ? document.querySelector('input[name="roomviewType"]:checked').value
    : "PureLec";
  const section = roomviewSectionSelect.value;
  if (!courseId || !section) {
    showConflictNotification("Please select a course and section before saving.");
    return;
  }
  const dayType = document.getElementById("roomview-dayType").value;
  const time = document.getElementById("roomview-time").value;
  const col = document.getElementById("roomview-col").value;
  const roomId = document.getElementById("roomview-roomId").value;

  const schedules = await apiGet("schedules");

  const existingId = document.getElementById("roomview-id").value;
  const existingDuplicate = schedules.find(sch =>
    sch.dayType === dayType &&
    sch.time === time &&
    sch.courseId === parseInt(courseId, 10) &&
    sch.section === section &&
    sch.id.toString() !== existingId
  );
  if (existingDuplicate) {
    showConflictNotification(
      "Cannot schedule the same subject & section in the same timeslot.\nPlease choose a different timeslot or section."
    );
    return;
  }

  let existing = schedules.find(sch => sch.dayType === dayType && sch.time === time && sch.col == col);
  const data = {
    dayType,
    time,
    col: parseInt(col, 10),
    facultyId: null,
    roomId: roomId ? parseInt(roomId, 10) : null,
    courseId: parseInt(courseId, 10),
    color: "#e9f1fb",
    unitType,
    section
  };

  if (existing) {
    await apiPut("schedules", existing.id, data);
  } else {
    await apiPost("schedules", data);
  }
  hideModal(modalRoomView);
  renderRoomViewTables();
  await validateAllComplementary();
});

/**************************************************************
 * Complementary Validation for Lec/Lab + Duplicate Check
 **************************************************************/
async function validateAllComplementary() {
  const schedules = await apiGet("schedules");
  const lecLabSchedules = schedules.filter(sch => sch.unitType === "Lec" || sch.unitType === "Lab");
  let conflictMessages = [];
  
  for (let sch of lecLabSchedules) {
    const complementary = (sch.unitType === "Lec") ? "Lab" : "Lec";
    const compEntry = schedules.find(s =>
      s.dayType === sch.dayType &&
      s.courseId === sch.courseId &&
      s.section === sch.section &&
      s.unitType === complementary
    );
    if (!compEntry) {
      const courses = await apiGet("courses");
      const course = courses.find(c => c.id === sch.courseId);
      const subjectName = course ? course.subject : "Unknown Subject";
      const section = sch.section || "Unknown Section";
      const times = getTimesArray(sch.dayType);
      const currentIndex = times.indexOf(sch.time);
      let recommendedTime = "None available";
      const sectionSchedules = schedules.filter(s => s.dayType === sch.dayType && s.section === sch.section);
      for (let i = currentIndex + 1; i < times.length; i++) {
        if (!sectionSchedules.some(s => s.time === times[i])) {
          recommendedTime = times[i];
          break;
        }
      }
      if (sch.unitType === "Lec") {
        conflictMessages.push(`Lab portion missing for ${subjectName} - (${section}). Recommended slot: ${recommendedTime}.`);
      } else {
        conflictMessages.push(`Lec portion missing for ${subjectName} - (${section}). Recommended slot: ${recommendedTime}.`);
      }
    }
  }
  
  const courses = await apiGet("courses");
  let scheduleMap = new Map();
  for (let sch of schedules) {
    if (sch.courseId && sch.section) {
      let key = `${sch.dayType}|${sch.time}|${sch.courseId}|${sch.section}`;
      if (!scheduleMap.has(key)) scheduleMap.set(key, []);
      scheduleMap.get(key).push(sch);
    }
  }
  scheduleMap.forEach((group, key) => {
    if (group.length > 1) {
      const parts = key.split('|');
      const time = parts[1];
      const courseId = parts[2];
      const section = parts[3];
      const course = courses.find(c => c.id == courseId);
      const subjectName = course ? course.subject : "Unknown Subject";
      conflictMessages.push(`Duplicate schedule: ${subjectName} - (${section}) is scheduled at ${time} more than once.`);
    }
  });
  
  if (conflictMessages.length > 0) {
    showConflictNotification(conflictMessages.join("\n"));
  } else {
    clearConflictNotification();
  }
}

function getTimesArray(dayType) {
  return [
    "7:30 - 8:50",
    "8:50 - 10:10",
    "10:10 - 11:30",
    "11:30 - 12:50",
    "12:50 - 2:10",
    "2:10 - 3:30",
    "3:30 - 4:50",
    "4:50 - 6:10",
    "6:10 - 7:30"
  ];
}

/**************************************************************
 * Conflict notification popup
 **************************************************************/
function showConflictNotification(message) {
  const popup = document.getElementById("conflict-popup");
  popup.textContent = message;
  popup.classList.remove("hidden");
}

function clearConflictNotification() {
  const popup = document.getElementById("conflict-popup");
  popup.classList.add("hidden");
}

/**************************************************************
 * Modal Show/Hide
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
(async function initialLoad() {
  hideAllSections();
  sectionRoomView.classList.remove("hidden");
  renderRoomViewHeaders();
  renderRoomViewTables();
  await validateAllComplementary();
})();
