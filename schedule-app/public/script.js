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
const predefinedRooms = [
  "M301", "M303", "M304", "M305", "M306", "M307", 
  "S311", "S312", "U405", "U406", "U705", "U706"
];

async function getAllRoomColumns() {
  const rooms = await apiGet("rooms");
  const roomNames = rooms.map(room => room.name);
  const allRooms = [...new Set([...predefinedRooms, ...roomNames])];
  const doubled = [];
  allRooms.forEach(room => {
    doubled.push(`${room} A`);
    doubled.push(`${room} B`);
  });
  return doubled;
}

/**************************************************************
 * Navigation
 **************************************************************/
const sectionFaculty = document.getElementById("section-faculty");
const sectionCourses = document.getElementById("section-courses");
const sectionCourseOffering = document.getElementById("section-course-offering");
const sectionRoomView = document.getElementById("section-room-view");
const sectionSectionView = document.getElementById("section-section-view");
const sectionFacultyView = document.getElementById("section-faculty-view");

function hideAllSections() {
  sectionFaculty.classList.add("hidden");
  sectionCourses.classList.add("hidden");
  sectionCourseOffering.classList.add("hidden");
  sectionRoomView.classList.add("hidden");
  sectionSectionView.classList.add("hidden");
  sectionFacultyView.classList.add("hidden");
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
  setupTrimesterTabs();
});
// New Event Listener for Section View
document.getElementById("btn-section-view").addEventListener("click", async () => {
  hideAllSections();
  sectionSectionView.classList.remove("hidden");
  setupSectionViewTrimesterTabs();
  await renderSectionViewTables();
});
document.getElementById("btn-room-view").addEventListener("click", async () => {
  hideAllSections();
  sectionRoomView.classList.remove("hidden");
  setupRoomViewTrimesterTabs();
  await renderRoomViewTables();
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
 * 6) COURSES CRUD with Search, Filter, and Sort
 **************************************************************/
const tableCoursesBody = document.querySelector("#table-courses tbody");
const btnAddCourse = document.getElementById("btn-add-course");
const modalCourse = document.getElementById("modal-course");
const courseIdInput = document.getElementById("course-id");
const courseSubjectInput = document.getElementById("course-subject");
const courseUnitsInput = document.getElementById("course-units");
const courseDegreeSelect = document.getElementById("course-degree");
const courseTrimesterSelect = document.getElementById("course-trimester");
const btnSaveCourse = document.getElementById("btn-save-course");
const courseSearch = document.getElementById("course-search");
const courseFilterDegree = document.getElementById("course-filter-degree");
const courseSort = document.getElementById("course-sort");

async function renderCoursesTable() {
  let coursesList = await apiGet("courses");
  const searchTerm = courseSearch.value.toLowerCase();
  const filterDegree = courseFilterDegree.value;
  const sortValue = courseSort.value;

  if (searchTerm) {
    coursesList = coursesList.filter(c => 
      c.subject.toLowerCase().includes(searchTerm) ||
      c.degree.toLowerCase().includes(searchTerm) ||
      c.trimester.toLowerCase().includes(searchTerm)
    );
  }

  if (filterDegree) {
    coursesList = coursesList.filter(c => c.degree === filterDegree);
  }

  if (sortValue) {
    const [field, direction] = sortValue.split('-');
    coursesList.sort((a, b) => {
      if (field === 'subject') {
        return direction === 'asc' 
          ? a.subject.localeCompare(b.subject) 
          : b.subject.localeCompare(a.subject);
      } else if (field === 'units') {
        return direction === 'asc' 
          ? parseFloat(a.units) - parseFloat(b.units) 
          : parseFloat(b.units) - parseFloat(a.units);
      }
    });
  }

  tableCoursesBody.innerHTML = "";
  coursesList.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.subject}</td>
      <td>${c.unit_category}</td>
      <td>${c.units}</td>
      <td>${c.year_level}</td>
      <td>${c.degree}</td>
      <td>${c.trimester}</td>
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
  document.getElementById("year-1st").checked = true;
  courseDegreeSelect.value = "BSIT";
  courseTrimesterSelect.value = "1st Trimester";
  document.getElementById("modal-course-title").textContent = "Add Course";
  showModal(modalCourse);
});

btnSaveCourse.addEventListener("click", async () => {
  const id = courseIdInput.value;
  const subject = courseSubjectInput.value.trim();
  const units = courseUnitsInput.value.trim();
  const unitCategory = document.querySelector('input[name="unitCategory"]:checked').value;
  const yearLevel = document.querySelector('input[name="yearLevel"]:checked').value;
  const degree = courseDegreeSelect.value;
  const trimester = courseTrimesterSelect.value;
  if (!subject || !units) {
    alert("Please fill out subject and units.");
    return;
  }
  if (id) {
    await apiPut("courses", id, { subject, unitCategory, units, yearLevel, degree, trimester });
  } else {
    await apiPost("courses", { subject, unitCategory, units, yearLevel, degree, trimester });
  }
  hideModal(modalCourse);
  await renderCoursesTable();
  await validateAllComplementary();
});

window.editCourse = async function(id) {
  const coursesList = await apiGet("courses");
  const found = coursesList.find(c => c.id == id);
  if (!found) {
    console.error(`Course with ID ${id} not found`);
    return;
  }
  courseIdInput.value = found.id;
  courseSubjectInput.value = found.subject;
  courseUnitsInput.value = found.units;
  courseDegreeSelect.value = found.degree;
  courseTrimesterSelect.value = found.trimester;
  if (found.unit_category === "PureLec") {
    document.getElementById("purelec").checked = true;
  } else if (found.unit_category === "Lec/Lab") {
    document.getElementById("leclab").checked = true;
  }
  const yearLevelId = `year-${found.year_level.split(" ")[0].toLowerCase()}`;
  const yearRadio = document.getElementById(yearLevelId);
  if (yearRadio) {
    yearRadio.checked = true;
  } else {
    console.error(`Year level radio button with ID ${yearLevelId} not found`);
    document.getElementById("year-1st").checked = true;
  }
  document.getElementById("modal-course-title").textContent = "Edit Course";
  showModal(modalCourse);
};

window.deleteCourse = async function(id) {
  if (!confirm("Are you sure?")) return;
  fulfilledapiDelete("courses", id);
  await renderCoursesTable();
  await validateAllComplementary();
};

courseSearch.addEventListener("input", renderCoursesTable);
courseFilterDegree.addEventListener("change", renderCoursesTable);
courseSort.addEventListener("change", renderCoursesTable);

/**************************************************************
 * 7) COURSE OFFERING CRUD with Search, Filter, Sort, and Trimester Tabs
 **************************************************************/
const tableCourseOfferingBody = document.querySelector("#table-courseOffering tbody");
const btnAddCourseOffering = document.getElementById("btn-add-courseOffering");
const modalCourseOffering = document.getElementById("modal-course-offering");
const courseOfferingIdInput = document.getElementById("courseOffering-id");
const courseOfferingCourseSelect = document.getElementById("courseOffering-course");
const courseOfferingSectionInput = document.getElementById("courseOffering-section");
const courseOfferingUnitsInput = document.getElementById("courseOffering-units");
const courseOfferingTrimesterInput = document.getElementById("courseOffering-trimester");
const btnSaveCourseOffering = document.getElementById("btn-save-courseOffering");
const offeringSearch = document.getElementById("offering-search");
const offeringFilterType = document.getElementById("offering-filter-type");
const offeringSort = document.getElementById("offering-sort");

const courseOfferingLecRadio = document.getElementById("courseOffering-lec");
const courseOfferingLabRadio = document.getElementById("courseOffering-lab");
const courseOfferingPurelecRadio = document.getElementById("courseOffering-purelec");
const labelLec = document.getElementById("label-lec");
const labelLab = document.getElementById("label-lab");
const labelPurelec = document.getElementById("label-purelec");

let currentTrimesterFilter = "all";

function setupTrimesterTabs() {
  const tabs = document.querySelectorAll("#section-course-offering .trimester-tabs .tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentTrimesterFilter = tab.getAttribute("data-trimester");
      renderCourseOfferingTable();
    });
  });
}

async function populateCourseOfferingCourses() {
  let coursesList = await apiGet("courses");
  courseOfferingCourseSelect.innerHTML = `<option value="">-- Select Course --</option>`;
  
  if (currentTrimesterFilter !== "all") {
    coursesList = coursesList.filter(c => c.trimester === currentTrimesterFilter);
  }
  
  coursesList.forEach(c => {
    courseOfferingCourseSelect.innerHTML += `<option value="${c.id}" data-unit-category="${c.unit_category}" data-trimester="${c.trimester}">${c.subject} (${c.unit_category}) - ${c.trimester}</option>`;
  });
}

courseOfferingCourseSelect.addEventListener("change", async function() {
  const selectedOption = courseOfferingCourseSelect.options[courseOfferingCourseSelect.selectedIndex];
  const unitCategory = selectedOption.getAttribute("data-unit-category");
  const trimester = selectedOption.getAttribute("data-trimester");
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
  courseOfferingTrimesterInput.value = trimester || "";
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
  courseOfferingTrimesterInput.value = "";
  document.getElementById("modal-course-offering-title").textContent = "Add Course Offering";
  await populateCourseOfferingCourses();
  showModal(modalCourseOffering);
});

async function renderCourseOfferingTable() {
  const offerings = await apiGet("course_offerings");
  let coursesList = await apiGet("courses");
  const searchTerm = offeringSearch.value.toLowerCase();
  const filterType = offeringFilterType.value;
  const sortValue = offeringSort.value;

  let filteredOfferings = offerings;

  if (currentTrimesterFilter !== "all") {
    filteredOfferings = filteredOfferings.filter(off => {
      const course = coursesList.find(c => c.id == off.courseId);
      return course && course.trimester === currentTrimesterFilter;
    });
  }

  if (searchTerm) {
    filteredOfferings = filteredOfferings.filter(off => {
      const course = coursesList.find(c => c.id == off.courseId);
      const courseDisplay = course ? course.subject : off.courseId;
      return (
        courseDisplay.toLowerCase().includes(searchTerm) ||
        off.section.toLowerCase().includes(searchTerm) ||
        off.trimester.toLowerCase().includes(searchTerm)
      );
    });
  }

  if (filterType) {
    filteredOfferings = filteredOfferings.filter(off => off.type === filterType);
  }

  if (sortValue) {
    const [field, direction] = sortValue.split('-');
    filteredOfferings.sort((a, b) => {
      const courseA = coursesList.find(c => c.id == a.courseId);
      const courseB = coursesList.find(c => c.id == b.courseId);
      if (field === 'course') {
        const nameA = courseA ? courseA.subject : a.courseId;
        const nameB = courseB ? courseB.subject : b.courseId;
        return direction === 'asc' 
          ? nameA.localeCompare(nameB) 
          : nameB.localeCompare(nameA);
      } else if (field === 'section') {
        return direction === 'asc' 
          ? a.section.localeCompare(b.section) 
          : b.section.localeCompare(a.section);
      }
    });
  }

  tableCourseOfferingBody.innerHTML = "";
  filteredOfferings.forEach(off => {
    const course = coursesList.find(c => c.id == off.courseId);
    const courseDisplay = course ? course.subject : off.courseId;
    const trimester = course ? course.trimester : off.trimester;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${off.id}</td>
      <td>${courseDisplay}</td>
      <td>${off.section}</td>
      <td>${off.type}</td>
      <td>${off.units}</td>
      <td>${trimester}</td>
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
  const trimester = selectedOption ? selectedOption.getAttribute("data-trimester") : "";
  const type = document.querySelector('input[name="courseOfferingType"]:checked') 
               ? document.querySelector('input[name="courseOfferingType"]:checked').value 
               : "";
  const units = courseOfferingUnitsInput.value;
  if (!courseId || !section || !type) {
    alert("Please fill out all fields.");
    return;
  }
  
  if (!id && unitCategory === "Lec/Lab") {
    await apiPost("course_offerings", { courseId, section, type: "Lec", units: 2, trimester });
    await apiPost("course_offerings", { courseId, section, type: "Lab", units: 1, trimester });
  } else {
    if (id) {
      await apiPut("course_offerings", id, { courseId, section, type, units, trimester });
    } else {
      await apiPost("course_offerings", { courseId, section, type, units, trimester });
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
  courseOfferingTrimesterInput.value = offering.trimester;
  document.getElementById("modal-course-offering-title").textContent = "Edit Course Offering";
  showModal(modalCourseOffering);
};

window.deleteCourseOffering = async function(id) {
  if (!confirm("Are you sure?")) return;
  await apiDelete("course_offerings", id);
  await renderCourseOfferingTable();
  await validateAllComplementary();
};

offeringSearch.addEventListener("input", renderCourseOfferingTable);
offeringFilterType.addEventListener("change", renderCourseOfferingTable);
offeringSort.addEventListener("change", renderCourseOfferingTable);

/**************************************************************
 * ROOM VIEW: Trimester Tabs, Headers, and Tables
 **************************************************************/
let currentRoomViewTrimester = "1st Trimester";

function setupRoomViewTrimesterTabs() {
  const tabs = document.querySelectorAll("#section-room-view .trimester-tabs .tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", async () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentRoomViewTrimester = tab.getAttribute("data-trimester");
      await renderRoomViewTables();
      await validateAllComplementary();
    });
  });
}

async function renderRoomViewTables() {
  const columns = await getAllRoomColumns();
  const times = [
    "7:30 - 8:50", "8:50 - 10:10", "10:10 - 11:30", "11:30 - 12:50",
    "12:50 - 2:10", "2:10 - 3:30", "3:30 - 4:50", "4:50 - 6:10", "6:10 - 7:30"
  ];
  const rooms = await apiGet("rooms");
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");

  const dayTypes = ["MWF", "TTHS"];
  for (const dayType of dayTypes) {
    const thead = document.getElementById(
      dayType === "MWF" ? "room-view-mwf-thead" : "room-view-tths-thead"
    );
    const tbody = document.getElementById(
      dayType === "MWF" ? "room-view-mwf-tbody" : "room-view-tths-tbody"
    );
    
    // Build Header
    thead.innerHTML = "";
    const headerRow = document.createElement("tr");
    const timeTh = document.createElement("th");
    timeTh.textContent = "Time";
    headerRow.appendChild(timeTh);
    columns.forEach((roomName) => {
      const baseRoomName = roomName.replace(/ (A|B)$/, '');
      const th = document.createElement("th");
      const input = document.createElement("input");
      input.type = "text";
      input.classList.add("extra-column-input");
      input.value = baseRoomName;
      input.disabled = true;
      th.appendChild(input);
      const abSpan = document.createElement("div");
      abSpan.textContent = roomName.endsWith(" A") ? "A" : "B";
      abSpan.style.fontSize = "0.8em";
      th.appendChild(abSpan);
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Build Table Body
    tbody.innerHTML = "";
    const filteredSchedules = schedules.filter(sch => {
      const course = courses.find(c => c.id === sch.courseId);
      return course && course.trimester === currentRoomViewTrimester && sch.dayType === dayType;
    });

    for (let time of times) {
      const tr = document.createElement("tr");
      const timeTd = document.createElement("td");
      timeTd.textContent = time;
      tr.appendChild(timeTd);
      
      for (const [index, roomName] of columns.entries()) {
        const baseRoomName = roomName.replace(/ (A|B)$/, '');
        const td = document.createElement("td");
        td.classList.add("clickable-cell");
        td.setAttribute("data-dayType", dayType);
        td.setAttribute("data-time", time);
        td.setAttribute("data-col", index + 1);
        td.addEventListener("click", () => openRoomViewModal(dayType, time, roomName, index + 1));
        
        const room = rooms.find(r => r.name === baseRoomName);
        let schedule = filteredSchedules.find(sch =>
          sch.dayType === dayType &&
          sch.time === time &&
          sch.col === index + 1
        );

        if (schedule) {
          const course = courses.find(c => c.id === schedule.courseId);
          const sections = [schedule.section, schedule.section2].filter(s => s).join(", ");
          td.textContent = course ? `${course.subject} - ${sections} - Type: ${schedule.unitType}` : "No Course";
          td.style.backgroundColor = schedule.color || "#e9f1fb";
        } else {
          td.textContent = "";
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }
}

/**************************************************************
 * ROOM VIEW Modal: Open, populate, and save with trimester filter
 **************************************************************/
const modalRoomView = document.getElementById("modal-roomview");

async function openRoomViewModal(dayType, time, roomName, col) {
  let roomsList = await apiGet("rooms");
  const baseRoomName = roomName.replace(/ (A|B)$/, '');
  const room = roomsList.find(r => r.name === baseRoomName);
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");
  let existing = schedules.find(sch =>
    sch.dayType === dayType &&
    sch.time === time &&
    sch.col === col &&
    courses.find(c => c.id === sch.courseId)?.trimester === currentRoomViewTrimester
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
      courses.find(c => c.id === off.courseId)?.trimester === currentRoomViewTrimester
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
  const offerings = await apiGet("course_offerings");
  const courses = await apiGet("courses");
  roomviewCourseSelect.innerHTML = `<option value="">-- Select Course Offering --</option>`;

  const seenCombinations = new Set();
  const uniqueOfferings = [];

  offerings.forEach(off => {
    const course = courses.find(c => c.id === off.courseId);
    if (course && course.trimester === currentRoomViewTrimester) {
      const combination = `${course.subject}-${off.trimester}-${off.type}`;
      if (!seenCombinations.has(combination)) {
        seenCombinations.add(combination);
        uniqueOfferings.push(off);
      }
    }
  });

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
  const offerings = await apiGet("course_offerings");
  const selectedOffering = offerings.find(off => off.id == courseOfferingId);
  if (selectedOffering) {
    const relatedOfferings = offerings.filter(off => off.courseId === selectedOffering.courseId);
    const distinctSections = [...new Set(relatedOfferings.map(off => off.section))];
    distinctSections.forEach(sec => {
      roomviewSectionSelect.innerHTML += `<option value="${sec}">${sec}</option>`;
      roomviewSection2Select.innerHTML += `<option value="${sec}">${sec}</option>`;
    });
  }
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

  const sectionsToCheck = [section, section2].filter(s => s);
  for (const sec of sectionsToCheck) {
    const existingSubjectSectionUnitType = schedules.find(sch =>
      sch.courseId === courseId &&
      (sch.section === sec || sch.section2 === sec) &&
      sch.unitType === unitType &&
      courses.find(c => c.id === sch.courseId)?.trimester === currentRoomViewTrimester &&
      sch.id.toString() !== existingId
    );
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
        `Duplicate detected: ${subjectName} - (${sec}) - ${unitType} is already scheduled in ${currentRoomViewTrimester}.\n` +
        `Details: Days: ${existingSubjectSectionUnitType.dayType}, Room: ${fullRoomName}, Group: ${group}, Time: ${existingSubjectSectionUnitType.time}`
      );
      return;
    }
  }

  const existingTimeRoomConflict = schedules.find(sch =>
    sch.dayType === dayType &&
    sch.time === time &&
    sch.col === parseInt(col, 10) &&
    courses.find(c => c.id === sch.courseId)?.trimester === currentRoomViewTrimester &&
    sch.id.toString() !== existingId
  );
  if (existingTimeRoomConflict) {
    showConflictNotification(
      `This timeslot (${time}) and room are already occupied in ${dayType}. Please choose a different timeslot or room.`
    );
    return;
  }

  const data = {
    dayType,
    time,
    col: parseInt(col, 10),
    facultyId: null,
    roomId: roomId ? parseInt(roomId, 10) : null,
    courseId: courseId,
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
  await validateAllComplementary();
});

document.getElementById("btn-delete-roomview").addEventListener("click", async () => {
  const id = document.getElementById("roomview-id").value;
  if (!id) return;
  if (!confirm("Are you sure you want to delete this schedule entry?")) return;
  await apiDelete("schedules", id);
  hideModal(modalRoomView);
  await renderRoomViewTables();
  await validateAllComplementary();
});

/**************************************************************
 * ROOM MANAGEMENT CRUD
 **************************************************************/
const btnManageRooms = document.getElementById("btn-manage-rooms");
const modalManageRooms = document.getElementById("modal-manage-rooms");
const tableRoomsBody = document.querySelector("#table-rooms tbody");
const btnAddRoom = document.getElementById("btn-add-room");
const modalAddRoom = document.getElementById("modal-add-room");
const roomIdInput = document.getElementById("room-id");
const roomNameInput = document.getElementById("room-name");
const btnSaveRoom = document.getElementById("btn-save-room");

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
        <button onclick="editRoom(${room.id})">Edit</button>
        <button onclick="deleteRoom(${room.id})">Delete</button>
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
  const id = roomIdInput.value;
  const name = roomNameInput.value.trim();
  if (!name) {
    alert("Please enter a room name.");
    return;
  }
  const rooms = await apiGet("rooms");
  const existingRoom = rooms.find(r => r.name.toLowerCase() === name.toLowerCase() && r.id != id);
  if (existingRoom) {
    alert("This room name already exists.");
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
  await validateAllComplementary();
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
  await validateAllComplementary();
};

/**************************************************************
 * SECTION VIEW FUNCTIONALITY (Existing)
 **************************************************************/
const btnViewSections = document.getElementById("btn-view-sections");
const modalSectionSelection = document.getElementById("modal-section-selection");
const sectionSelect = document.getElementById("section-select");
const btnViewSectionSchedule = document.getElementById("btn-view-section-schedule");
const modalSectionSchedule = document.getElementById("modal-section-schedule");
const sectionScheduleTableBody = document.querySelector("#section-schedule-table tbody");

btnViewSections.addEventListener("click", async () => {
  await populateSectionDropdown();
  showModal(modalSectionSelection);
});

async function populateSectionDropdown() {
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");
  const filteredSchedules = schedules.filter(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    return course && course.trimester === currentRoomViewTrimester;
  });
  
  const sections = new Set();
  filteredSchedules.forEach(sch => {
    if (sch.section) sections.add(sch.section);
    if (sch.section2) sections.add(sch.section2);
  });
  
  sectionSelect.innerHTML = `<option value="">-- Select Section --</option>`;
  [...sections].sort().forEach(section => {
    sectionSelect.innerHTML += `<option value="${section}">${section}</option>`;
  });
}

btnViewSectionSchedule.addEventListener("click", async () => {
  const selectedSection = sectionSelect.value;
  if (!selectedSection) {
    showConflictNotification("Please select a section.");
    return;
  }
  
  hideModal(modalSectionSelection);
  await renderSectionSchedule(selectedSection);
  showModal(modalSectionSchedule);
});

async function renderSectionSchedule(section) {
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");
  const rooms = await apiGet("rooms");
  const allColumns = await getAllRoomColumns();
  
  const sectionSchedules = schedules.filter(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    return course && 
           course.trimester === currentRoomViewTrimester && 
           (sch.section === section || sch.section2 === section);
  });

  sectionSchedules.sort((a, b) => {
    const dayOrder = { "MWF": 1, "TTHS": 2 };
    const timeOrder = getTimesArray("MWF").indexOf(a.time) - getTimesArray("MWF").indexOf(b.time);
    return dayOrder[a.dayType] - dayOrder[b.dayType] || timeOrder;
  });

  document.getElementById("modal-section-schedule-title").textContent = `Schedule for Section ${section}`;
  sectionScheduleTableBody.innerHTML = "";

  sectionSchedules.forEach(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    const colIndex = sch.col - 1; // col is 1-based, array is 0-based
    let fullRoomName = "Unassigned";
    
    // Use column position as primary source for room name
    if (colIndex >= 0 && colIndex < allColumns.length) {
      fullRoomName = allColumns[colIndex];
    } else if (sch.roomId) {
      // Fallback to room database if column index is invalid
      const room = rooms.find(r => r.id === sch.roomId);
      fullRoomName = room ? room.name : "Unassigned";
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${sch.dayType}</td>
      <td>${sch.time}</td>
      <td>${course ? course.subject : "Unknown"}</td>
      <td>${sch.unitType}</td>
      <td>${fullRoomName}</td>
    `;
    sectionScheduleTableBody.appendChild(tr);
  });

  if (sectionSchedules.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5">No schedule found for this section.</td>`;
    sectionScheduleTableBody.appendChild(tr);
  }
}

/**************************************************************
 * NEW SECTION VIEW: Trimester Tabs, Headers, and Tables
 **************************************************************/
let currentSectionViewTrimester = "1st Trimester";

function setupSectionViewTrimesterTabs() {
  const tabs = document.querySelectorAll("#section-section-view .trimester-tabs .tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", async () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentSectionViewTrimester = tab.getAttribute("data-trimester");
      await renderSectionViewTables();
    });
  });
}

async function getUniqueSectionsForTrimester(trimester) {
  const offerings = await apiGet("course_offerings");
  const sections = new Set();
  offerings.forEach(off => {
    if (off.trimester === trimester) {
      sections.add(off.section);
    }
  });
  return [...sections].sort();
}

async function renderSectionViewTables() {
  const container = document.getElementById("section-view-container");
  container.innerHTML = "";

  const sections = await getUniqueSectionsForTrimester(currentSectionViewTrimester);
  const times = [
    "7:30 - 8:50", "8:50 - 10:10", "10:10 - 11:30", "11:30 - 12:50",
    "12:50 - 2:10", "2:10 - 3:30", "3:30 - 4:50", "4:50 - 6:10", "6:10 - 7:30"
  ];
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");
  const allColumns = await getAllRoomColumns();

  const dayTypes = ["MWF", "TTHS"];
  for (const dayType of dayTypes) {
    const tableContainer = document.createElement("div");
    tableContainer.className = "table-container";
    
    const heading = document.createElement("h3");
    heading.textContent = `${dayType} Section View`;
    tableContainer.appendChild(heading);

    const table = document.createElement("table");
    table.className = "schedule-table";
    table.id = `section-view-${dayType.toLowerCase()}-table`;

    // Create header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const timeTh = document.createElement("th");
    timeTh.textContent = "Time";
    headerRow.appendChild(timeTh);
    sections.forEach(section => {
      const th = document.createElement("th");
      th.textContent = section;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body
    const tbody = document.createElement("tbody");
    for (let time of times) {
      const tr = document.createElement("tr");
      const timeTd = document.createElement("td");
      timeTd.textContent = time;
      tr.appendChild(timeTd);
      
      for (const section of sections) {
        const td = document.createElement("td");
        td.classList.add("clickable-cell");
        td.setAttribute("data-dayType", dayType);
        td.setAttribute("data-time", time);
        td.setAttribute("data-section", section);
        td.addEventListener("click", () => openSectionViewModal(dayType, time, section));
        
        const scheduleEntries = schedules.filter(sch => {
          const course = courses.find(c => c.id === sch.courseId);
          return course && course.trimester === currentSectionViewTrimester &&
                 sch.dayType === dayType &&
                 sch.time === time &&
                 (sch.section === section || sch.section2 === section);
        });
        
        if (scheduleEntries.length > 0) {
          const sch = scheduleEntries[0]; // Assuming one schedule per section per time slot
          const course = courses.find(c => c.id === sch.courseId);
          const colIndex = sch.col - 1;
          const roomName = colIndex >= 0 && colIndex < allColumns.length ? allColumns[colIndex] : "Unknown";
          td.textContent = course ? `${course.subject} - ${sch.unitType} - ${roomName}` : "Unknown";
          td.style.backgroundColor = sch.color || "#e9f1fb";
        } else {
          td.textContent = "";
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    tableContainer.appendChild(table);
    container.appendChild(tableContainer);
  }
}

/**************************************************************
 * NEW SECTION VIEW Modal: Open, populate, and save
 **************************************************************/
const modalSectionView = document.getElementById("modal-sectionview");

async function openSectionViewModal(dayType, time, section) {
  document.getElementById("sectionview-dayType").value = dayType;
  document.getElementById("sectionview-time").value = time;
  document.getElementById("sectionview-section").value = section;
  
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");
  const existing = schedules.find(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    return course && course.trimester === currentSectionViewTrimester &&
           sch.dayType === dayType &&
           sch.time === time &&
           (sch.section === section || sch.section2 === section);
  });
  
  if (existing) {
    document.getElementById("sectionview-id").value = existing.id;
    document.getElementById("btn-delete-sectionview").style.display = "block";
  } else {
    document.getElementById("sectionview-id").value = "";
    document.getElementById("btn-delete-sectionview").style.display = "none";
  }
  
  await populateSectionViewCourseOfferingDropdown(section);
  await populateSectionViewRoomDropdown();
  
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
    }
    const allColumns = await getAllRoomColumns();
    const colIndex = existing.col - 1;
    if (colIndex >= 0 && colIndex < allColumns.length) {
      document.getElementById("sectionview-room").value = allColumns[colIndex];
    }
  } else {
    document.getElementById("sectionview-courseOffering").value = "";
    document.getElementById("sectionview-section2").innerHTML = `<option value="">-- Select Section --</option>`;
    document.getElementById("sectionview-room").value = "";
  }
  showModal(modalSectionView);
}

async function populateSectionViewCourseOfferingDropdown(section) {
  const offerings = await apiGet("course_offerings");
  const courses = await apiGet("courses");
  const sectionviewCourseOfferingSelect = document.getElementById("sectionview-courseOffering");
  sectionviewCourseOfferingSelect.innerHTML = `<option value="">-- Select Course Offering --</option>`;
  
  const filteredOfferings = offerings.filter(off => off.section === section && off.trimester === currentSectionViewTrimester);
  
  filteredOfferings.forEach(off => {
    const course = courses.find(c => c.id === off.courseId);
    if (course) {
      const displayText = `${course.subject} - ${off.type}`;
      sectionviewCourseOfferingSelect.innerHTML += `<option value="${off.id}" data-course-id="${off.courseId}" data-unit-type="${off.type}">${displayText}</option>`;
    }
  });
}

async function populateSectionViewSection2Dropdown(courseId, type) {
  const offerings = await apiGet("course_offerings");
  const sectionviewSection2Select = document.getElementById("sectionview-section2");
  sectionviewSection2Select.innerHTML = `<option value="">-- Select Section --</option>`;
  
  const relatedOfferings = offerings.filter(off => off.courseId === courseId && off.type === type && off.trimester === currentSectionViewTrimester);
  const distinctSections = [...new Set(relatedOfferings.map(off => off.section))];
  distinctSections.forEach(sec => {
    if (sec !== document.getElementById("sectionview-section").value) {
      sectionviewSection2Select.innerHTML += `<option value="${sec}">${sec}</option>`;
    }
  });
}

async function populateSectionViewRoomDropdown() {
  const allColumns = await getAllRoomColumns();
  const sectionviewRoomSelect = document.getElementById("sectionview-room");
  sectionviewRoomSelect.innerHTML = `<option value="">-- Select Room --</option>`;
  allColumns.forEach(roomName => {
    sectionviewRoomSelect.innerHTML += `<option value="${roomName}">${roomName}</option>`;
  });
}

document.getElementById("sectionview-courseOffering").addEventListener("change", async function() {
  const selectedOption = this.options[this.selectedIndex];
  const courseId = selectedOption.getAttribute("data-course-id");
  const unitType = selectedOption.getAttribute("data-unit-type");
  if (courseId && unitType) {
    await populateSectionViewSection2Dropdown(courseId, unitType);
  } else {
    document.getElementById("sectionview-section2").innerHTML = `<option value="">-- Select Section --</option>`;
  }
});

document.getElementById("btn-save-sectionview").addEventListener("click", async () => {
  const sectionviewCourseOfferingSelect = document.getElementById("sectionview-courseOffering");
  const sectionviewSection2Select = document.getElementById("sectionview-section2");
  const sectionviewRoomSelect = document.getElementById("sectionview-room");
  const courseOfferingId = sectionviewCourseOfferingSelect.value;
  const section2 = sectionviewSection2Select.value || null;
  const roomName = sectionviewRoomSelect.value;
  
  if (!courseOfferingId || !roomName) {
    showConflictNotification("Please select a course offering and a room.");
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
  const section = document.getElementById("sectionview-section").value;
  
  const dayType = document.getElementById("sectionview-dayType").value;
  const time = document.getElementById("sectionview-time").value;
  
  const allColumns = await getAllRoomColumns();
  const col = allColumns.indexOf(roomName) + 1; // 1-based index
  
  if (col === 0) {
    showConflictNotification("Invalid room selected.");
    return;
  }
  
  const baseRoomName = roomName.replace(/ (A|B)$/, '');
  const rooms = await apiGet("rooms");
  const room = rooms.find(r => r.name === baseRoomName);
  const roomId = room ? room.id : null;
  
  const schedules = await apiGet("schedules");
  const existingId = document.getElementById("sectionview-id").value;
  const conflict = schedules.find(sch => 
    sch.dayType === dayType &&
    sch.time === time &&
    sch.col === col &&
    sch.id.toString() !== existingId
  );
  if (conflict) {
    showConflictNotification("This room is already scheduled at this time.");
    return;
  }
  
  const data = {
    dayType,
    time,
    col,
    facultyId: null,
    roomId,
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
  hideModal(modalSectionView);
  await renderSectionViewTables();
  await validateAllComplementary();
});

document.getElementById("btn-delete-sectionview").addEventListener("click", async () => {
  const id = document.getElementById("sectionview-id").value;
  if (!id) return;
  if (!confirm("Are you sure you want to delete this schedule entry?")) return;
  await apiDelete("schedules", id);
  hideModal(modalSectionView);
  await renderSectionViewTables();
  await validateAllComplementary();
});

/**************************************************************
 * Complementary Validation for Lec/Lab + Duplicate Check
 **************************************************************/
async function validateAllComplementary() {
  const schedules = await apiGet("schedules");
  const rooms = await apiGet("rooms");
  const courses = await apiGet("courses");
  const allColumns = await getAllRoomColumns();

  const filteredSchedules = schedules.filter(sch => {
    const course = courses.find(c => c.id === sch.courseId);
    return course && course.trimester === currentRoomViewTrimester;
  });

  const groupA = filteredSchedules.filter(sch => {
    const colIndex = sch.col - 1;
    return colIndex >= 0 && allColumns[colIndex].endsWith(" A");
  });
  const groupB = filteredSchedules.filter(sch => {
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
            conflictMessages.push(`[${groupName}] Lab portion missing for ${subjectName} - (${section}). Recommended slot: ${recommendedTime}.`);
          } else {
            conflictMessages.push(`[${groupName}] Lec portion missing for ${subjectName} - (${section}). Recommended slot: ${recommendedTime}.`);
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
        conflictMessages.push(`[${groupName}] Duplicate schedule: ${subjectName} - (${section}) - ${unitType} is scheduled at ${time} more than once.`);
      }
    });

    return conflictMessages;
  }

  const groupAConflicts = validateGroup(groupA, "Group A");
  const groupBConflicts = validateGroup(groupB, "Group B");
  const allConflicts = [...groupAConflicts, ...groupBConflicts];

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
  setupRoomViewTrimesterTabs();
  await renderRoomViewTables();
  await validateAllComplementary();
})();

/**************************************************************
 * FACULTY VIEW FUNCTIONALITY
 **************************************************************/
const modalFacultyView = document.getElementById("modal-facultyview");
let currentFacultyViewTrimester = "1st Trimester";

// Add Faculty View button to navigation
document.getElementById("btn-faculty-view").addEventListener("click", async () => {
  hideAllSections();
  sectionFacultyView.classList.remove("hidden");
  setupFacultyViewTrimesterTabs();
  await renderFacultyViewTables();
});

// Add trimester tab functionality for Faculty View
document.querySelectorAll("#section-faculty-view .tab-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    document.querySelectorAll("#section-faculty-view .tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFacultyViewTrimester = btn.dataset.trimester;
    await renderFacultyViewTables();
  });
});

async function renderFacultyViewTables() {
  const container = document.getElementById("faculty-view-container");
  container.innerHTML = "";

  const trimester = document.querySelector("#section-faculty-view .tab-btn.active").dataset.trimester;
  const faculty = await apiGet("faculty");
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");

  // Create MWF and TTHS tables
  const dayTypes = ["MWF", "TTHS"];
  dayTypes.forEach(dayType => {
    const tableContainer = document.createElement("div");
    tableContainer.className = "table-container";
    
    const heading = document.createElement("h3");
    heading.textContent = `${dayType} Faculty View`;
    tableContainer.appendChild(heading);

    const table = document.createElement("table");
    table.className = "schedule-table";
    table.id = `faculty-view-${dayType.toLowerCase()}-table`;

    // Create header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerRow.innerHTML = "<th>Time</th>";
    faculty.forEach(f => {
      headerRow.innerHTML += `<th>${f.name}</th>`;
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body
    const tbody = document.createElement("tbody");
    const times = getTimesArray(dayType);
    times.forEach(time => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${time}</td>`;
      
      faculty.forEach(f => {
        const cell = document.createElement("td");
        cell.dataset.facultyId = f.id;
        cell.dataset.dayType = dayType;
        cell.dataset.time = time;
        
        const schedule = schedules.find(s => {
          const course = courses.find(c => c.id === s.courseId);
          return s.facultyId === f.id && 
                 s.dayType === dayType && 
                 s.time === time &&
                 course && course.trimester === trimester;
        });
        
        if (schedule) {
          const course = courses.find(c => c.id === schedule.courseId);
          // Include the unit type (Lec, Lab, or PureLec) in the display
          cell.textContent = course ? `${course.subject} ${schedule.section} (${schedule.unitType})` : "";
          cell.dataset.courseId = schedule.courseId;
        }
        
        cell.addEventListener("click", () => openFacultyViewModal(dayType, time, f.id));
        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });

    // Add total units row
    const totalRow = document.createElement("tr");
    totalRow.innerHTML = "<td><strong>Total Units</strong></td>";
    faculty.forEach(f => {
      const totalCell = document.createElement("td");
      totalCell.className = "total-units";
      totalCell.dataset.facultyId = f.id;
      totalRow.appendChild(totalCell);
    });
    tbody.appendChild(totalRow);

    table.appendChild(tbody);
    tableContainer.appendChild(table);
    container.appendChild(tableContainer);
  });

  await calculateFacultyTotalUnits();
}

// Replace updateTotalUnits with this new implementation
async function calculateFacultyTotalUnits() {
  // Get all required data
  const faculty = await apiGet("faculty");
  const schedules = await apiGet("schedules");
  const offerings = await apiGet("course_offerings");
  const courses = await apiGet("courses");
  
  // Calculate total units for each faculty member
  const facultyUnits = {};
  faculty.forEach(f => {
    facultyUnits[f.id] = 0;
  });
  
  // Process each schedule entry
  schedules.forEach(schedule => {
    // Skip if no faculty assigned or doesn't match current trimester
    if (!schedule.facultyId) return;
    
    const course = courses.find(c => c.id === schedule.courseId);
    if (!course || course.trimester !== currentFacultyViewTrimester) return;
    
    // Find matching offering to get units
    const offering = offerings.find(off => 
      off.courseId === schedule.courseId && 
      off.type === schedule.unitType &&
      off.section === schedule.section
    );
    
    if (offering) {
      const units = parseFloat(offering.units);
      facultyUnits[schedule.facultyId] = (facultyUnits[schedule.facultyId] || 0) + units;
    }
  });
  
  // Update the total cells in all tables
  const totalCells = document.querySelectorAll(".total-units");
  totalCells.forEach(cell => {
    const facultyId = parseInt(cell.dataset.facultyId);
    const total = facultyUnits[facultyId] || 0;
    cell.textContent = total.toFixed(1);
  });
}

async function openFacultyViewModal(dayType, time, facultyId) {
  document.getElementById("facultyview-dayType").value = dayType;
  document.getElementById("facultyview-time").value = time;
  document.getElementById("facultyview-facultyId").value = facultyId;
  
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");
  const existing = schedules.find(sch => 
    sch.facultyId === facultyId && 
    sch.dayType === dayType && 
    sch.time === time &&
    courses.find(c => c.id === sch.courseId)?.trimester === currentFacultyViewTrimester
  );
  
  if (existing) {
    document.getElementById("facultyview-id").value = existing.id;
    document.getElementById("btn-delete-facultyview").style.display = "block";
  } else {
    document.getElementById("facultyview-id").value = "";
    document.getElementById("btn-delete-facultyview").style.display = "none";
  }
  
  await populateFacultyViewCourseDropdown();
  
  if (existing) {
    const value = `${existing.courseId}-${existing.unitType}`;
    document.getElementById("facultyview-course").value = value;
    await populateFacultyViewSectionDropdown(existing.courseId, existing.unitType);
    document.getElementById("facultyview-section").value = existing.section;
  } else {
    document.getElementById("facultyview-course").value = "";
    document.getElementById("facultyview-section").innerHTML = `<option value="">-- Select Section --</option>`;
  }
  
  showModal(modalFacultyView);
}

async function populateFacultyViewCourseDropdown() {
  const select = document.getElementById("facultyview-course");
  select.innerHTML = `<option value="">-- Select Course Offering --</option>`;
  
  const offerings = await apiGet("course_offerings");
  const courses = await apiGet("courses");
  
  // Filter offerings for current trimester
  const filteredOfferings = offerings.filter(off => off.trimester === currentFacultyViewTrimester);
  
  // Group by courseId and type
  const groupedOfferings = {};
  filteredOfferings.forEach(off => {
    const key = `${off.courseId}-${off.type}`;
    if (!groupedOfferings[key]) {
      const course = courses.find(c => c.id === off.courseId);
      if (course) {  // Only add if course exists
        groupedOfferings[key] = {
          courseId: off.courseId,
          type: off.type,
          subject: course.subject,
          units: off.units
        };
      }
    }
  });
  
  // Create options
  Object.values(groupedOfferings)
    .sort((a, b) => a.subject.localeCompare(b.subject))
    .forEach(group => {
      const value = `${group.courseId}-${group.type}`;
      const displayText = `${group.subject} - ${group.type} (${group.units} units)`;
      select.innerHTML += `<option value="${value}" data-course-id="${group.courseId}" data-unit-type="${group.type}" data-units="${group.units}">${displayText}</option>`;
    });
}

async function populateFacultyViewSectionDropdown(courseId, type) {
  const select = document.getElementById("facultyview-section");
  select.innerHTML = `<option value="">-- Select Section --</option>`;
  
  const offerings = await apiGet("course_offerings");
  
  const courseIdInt = parseInt(courseId, 10);
  
  // Filter offerings for the selected course and type in current trimester
  const filteredOfferings = offerings.filter(off => 
    off.courseId === courseIdInt && 
    off.type === type &&
    off.trimester === currentFacultyViewTrimester
  );
  
  // Get unique sections and sort them
  const uniqueSections = [...new Set(filteredOfferings.map(off => off.section))];
  uniqueSections.sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.[0] || 0);
    const numB = parseInt(b.match(/\d+/)?.[0] || 0);
    return numA - numB;
  });
  
  // Add sections to dropdown
  uniqueSections.forEach(section => {
    select.innerHTML += `<option value="${section}">${section}</option>`;
  });
}

// Update the course dropdown change event listener
document.getElementById("facultyview-course").addEventListener("change", async function() {
  const value = this.value;
  if (value) {
    const [courseId, unitType] = value.split('-');
    await populateFacultyViewSectionDropdown(courseId, unitType);
    document.getElementById("facultyview-section").value = "";
  } else {
    document.getElementById("facultyview-section").innerHTML = `<option value="">-- Select Section --</option>`;
  }
});

// Replace the existing btn-save-facultyview click handler with this updated version
document.getElementById("btn-save-facultyview").addEventListener("click", async () => {
  const facultyviewCourseSelect = document.getElementById("facultyview-course");
  const facultyviewSectionSelect = document.getElementById("facultyview-section");
  const existingId = document.getElementById("facultyview-id").value;
  const dayType = document.getElementById("facultyview-dayType").value;
  const time = document.getElementById("facultyview-time").value;
  const facultyId = document.getElementById("facultyview-facultyId").value;
  
  const selectedValue = facultyviewCourseSelect.value;
  const section = facultyviewSectionSelect.value;
  
  if (!selectedValue || !section) {
    showConflictNotification("Please select both course and section.");
    return;
  }
  
  const [courseIdStr, unitType] = selectedValue.split('-');
  const courseId = parseInt(courseIdStr, 10);
  
  const offerings = await apiGet("course_offerings");
  const selectedOffering = offerings.find(off => off.courseId === courseId && off.type === unitType && off.section === section);
  if (!selectedOffering) return;
  
  // Get relevant data for constraint checking
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");
  
  // Get all schedules for this faculty
  const facultySchedules = schedules.filter(sch => 
    sch.facultyId === parseInt(facultyId) &&
    courses.find(c => c.id === sch.courseId)?.trimester === currentFacultyViewTrimester
  );
  
  // Time index for checking consecutive slots
  const timesArray = ["7:30 - 8:50", "8:50 - 10:10", "10:10 - 11:30", "11:30 - 12:50",
    "12:50 - 2:10", "2:10 - 3:30", "3:30 - 4:50", "4:50 - 6:10", "6:10 - 7:30"];
  const timeIndex = timesArray.indexOf(time);
  
  // CONSTRAINT 1: Duplicate sections constraint removed
  
  // CONSTRAINT 2: No continuous subjects of the same type (Lec, Lab, PureLec)
  if (timeIndex > 0) {
    const prevTimeslot = timesArray[timeIndex - 1];
    const prevSchedule = facultySchedules.find(sch => 
      sch.dayType === dayType && 
      sch.time === prevTimeslot
    );
    
    if (prevSchedule && prevSchedule.unitType === unitType) {
      showConflictNotification(`Faculty Constraint Violation: Cannot have continuous ${unitType} subjects. Please choose a different time or subject type.`);
      return;
    }
  }
  
  if (timeIndex < timesArray.length - 1) {
    const nextTimeslot = timesArray[timeIndex + 1];
    const nextSchedule = facultySchedules.find(sch => 
      sch.dayType === dayType && 
      sch.time === nextTimeslot
    );
    
    if (nextSchedule && nextSchedule.unitType === unitType) {
      showConflictNotification(`Faculty Constraint Violation: Cannot have continuous ${unitType} subjects. Please choose a different time or subject type.`);
      return;
    }
  }
  
  // CONSTRAINT 3: Maximum of 2 subjects in a row
  let consecutiveCount = 1; // Current subject
  
  // Check backward
  let currentIndex = timeIndex;
  while (currentIndex > 0) {
    const prevTime = timesArray[currentIndex - 1];
    const prevSchedule = facultySchedules.find(sch => 
      sch.dayType === dayType && 
      sch.time === prevTime
    );
    
    if (prevSchedule) {
      consecutiveCount++;
    } else {
      break;
    }
    currentIndex--;
  }
  
  // Check forward
  currentIndex = timeIndex;
  while (currentIndex < timesArray.length - 1) {
    const nextTime = timesArray[currentIndex + 1];
    const nextSchedule = facultySchedules.find(sch => 
      sch.dayType === dayType && 
      sch.time === nextTime
    );
    
    if (nextSchedule) {
      consecutiveCount++;
    } else {
      break;
    }
    currentIndex++;
  }
  
  if (consecutiveCount > 2) {
    showConflictNotification("Faculty Constraint Violation: Cannot have more than 2 consecutive subjects in a row.");
    return;
  }
  
  // CONSTRAINT 4: Max 8.5 units only
  let totalUnits = 0;
  
  // Calculate total units for this faculty member
  facultySchedules.forEach(schedule => {
    if (schedule.id.toString() === existingId) return; // Skip current schedule if editing
    
    const offering = offerings.find(o => 
      o.courseId === schedule.courseId && 
      o.type === schedule.unitType &&
      o.section === schedule.section
    );
    
    if (offering) {
      totalUnits += parseFloat(offering.units);
    }
  });
  
  // Add new schedule units
  totalUnits += parseFloat(selectedOffering.units);
  
  if (totalUnits > 8.5) {
    showConflictNotification(`Faculty Constraint Violation: Total units (${totalUnits.toFixed(1)}) would exceed the maximum of 8.5 units.`);
    return;
  }
  
  // All constraints passed, proceed with saving
  const data = {
    dayType,
    time,
    col: 1, // Default column for faculty view
    facultyId: parseInt(facultyId),
    roomId: null,
    courseId: courseId,
    color: "#e9f1fb",
    unitType: unitType,
    section: section,
    section2: null
  };
  
  // Clear any existing notifications
  clearConflictNotification();
  
  if (existingId) {
    await apiPut("schedules", existingId, data);
  } else {
    await apiPost("schedules", data);
  }
  
  hideModal(modalFacultyView);
  await renderFacultyViewTables();
  await calculateFacultyTotalUnits();
});

// Also need to clear notifications when opening the faculty view modal
async function openFacultyViewModal(dayType, time, facultyId) {
  // Clear any existing notifications
  clearConflictNotification();
  
  // Rest of the existing function...
  document.getElementById("facultyview-dayType").value = dayType;
  document.getElementById("facultyview-time").value = time;
  document.getElementById("facultyview-facultyId").value = facultyId;
  
  const schedules = await apiGet("schedules");
  const courses = await apiGet("courses");
  const existing = schedules.find(sch => 
    sch.facultyId === facultyId && 
    sch.dayType === dayType && 
    sch.time === time &&
    courses.find(c => c.id === sch.courseId)?.trimester === currentFacultyViewTrimester
  );
  
  if (existing) {
    document.getElementById("facultyview-id").value = existing.id;
    document.getElementById("btn-delete-facultyview").style.display = "block";
  } else {
    document.getElementById("facultyview-id").value = "";
    document.getElementById("btn-delete-facultyview").style.display = "none";
  }
  
  await populateFacultyViewCourseDropdown();
  
  if (existing) {
    const value = `${existing.courseId}-${existing.unitType}`;
    document.getElementById("facultyview-course").value = value;
    await populateFacultyViewSectionDropdown(existing.courseId, existing.unitType);
    document.getElementById("facultyview-section").value = existing.section;
  } else {
    document.getElementById("facultyview-course").value = "";
    document.getElementById("facultyview-section").innerHTML = `<option value="">-- Select Section --</option>`;
  }
  
  showModal(modalFacultyView);
}

// Similarly update the delete handler
document.getElementById("btn-delete-facultyview").addEventListener("click", async () => {
  const existingId = document.getElementById("facultyview-id").value;
  if (!existingId) return;
  
  if (!confirm("Are you sure you want to delete this schedule?")) return;
  
  await apiDelete("schedules", existingId);
  hideModal(modalFacultyView);
  await renderFacultyViewTables();
  // Make sure we calculate totals after deleting a subject
  await calculateFacultyTotalUnits();
});

// Faculty View Functions
function setupFacultyViewTrimesterTabs() {
  const tabs = document.querySelectorAll("#section-faculty-view .tab-btn");
  tabs.forEach(tab => {
    // Remove any existing event listeners
    tab.replaceWith(tab.cloneNode(true));
    // Get the fresh reference after replacement
    const freshTab = document.querySelector(`#section-faculty-view .tab-btn[data-trimester="${tab.dataset.trimester}"]`);
    
    // Set initial active state
    if (freshTab.dataset.trimester === currentFacultyViewTrimester) {
      freshTab.classList.add("active");
    } else {
      freshTab.classList.remove("active");
    }
    
    freshTab.addEventListener("click", async () => {
      // Remove active class from all tabs
      document.querySelectorAll("#section-faculty-view .tab-btn").forEach(t => {
        t.classList.remove("active");
      });
      // Add active class to clicked tab
      freshTab.classList.add("active");
      currentFacultyViewTrimester = freshTab.dataset.trimester;
      await renderFacultyViewTables();
    });
  });
}