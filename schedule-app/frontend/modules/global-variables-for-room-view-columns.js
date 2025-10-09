/**************************************************************
 * Global variables for Room View columns
 **************************************************************/
// Global state variables are now managed in 00-1-global-state-manager.js
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
const sectionCourses = document.getElementById("section-courses");
const sectionCourseOffering = document.getElementById("section-course-offering");
const sectionRoomView = document.getElementById("section-room-view");
const sectionSectionView = document.getElementById("section-section-view");

/**************************************************************
 * Shared Course Management Variables
 **************************************************************/
const tableCoursesBody = document.querySelector("#table-courses tbody");
const btnAddCourse = document.getElementById("btn-add-course");
const modalCourse = document.getElementById("modal-course");
const btnSaveCourse = document.getElementById("btn-save-course");
const courseSearch = document.getElementById("course-search");

const courseFilterYearLevel = document.getElementById("course-filter-year-level");
const courseFilterDegree = document.getElementById("course-filter-degree");
const courseFilterTrimester = document.getElementById("course-filter-trimester");
const courseSort = document.getElementById("course-sort");
const btnImportCsv = document.getElementById("btn-import-csv");
const btnExportCsv = document.getElementById("btn-export-csv");
const csvFileInput = document.getElementById("csv-file-input");
const tableCourseOfferingBody = document.querySelector("#table-courseOffering tbody");
const btnAddCourseOffering = document.getElementById("btn-add-courseOffering");
const modalCourseOffering = document.getElementById("modal-course-offering");
const courseOfferingIdInput = document.getElementById("courseOffering-id");
const courseOfferingCourseSelect = document.getElementById("courseOffering-course");
const courseOfferingSectionInput = document.getElementById("courseOffering-section");
const btnSaveCourseOffering = document.getElementById("btn-save-courseOffering");
const offeringSearch = document.getElementById("offering-search");
const btnManageRooms = document.getElementById("btn-manage-rooms");
const modalManageRooms = document.getElementById("modal-manage-rooms");
const tableRoomsBody = document.querySelector("#table-rooms tbody");
const btnAddRoom = document.getElementById("btn-add-room");
const modalAddRoom = document.getElementById("modal-add-room");
const btnSaveRoom = document.getElementById("btn-save-room");

// Add fade animation helper
function applyFadeAnimation(element) {
  element.classList.add("fade-in");
  element.addEventListener("animationend", () => element.classList.remove("fade-in"), { once: true });
}

function hideAllSections() {
  // remove fade-in from all sections
  document.querySelectorAll("[id^='section-']").forEach(sec => sec.classList.remove("fade-in"));
  document.getElementById("section-courses").classList.add("hidden");
  document.getElementById("section-course-offering").classList.add("hidden");
  document.getElementById("section-section-view").classList.add("hidden");
  document.getElementById("section-room-view").classList.add("hidden");
  document.getElementById("section-schedule-summary").classList.add("hidden");
}

function showSection(section) {
  hideAllSections();
  const secEl = document.getElementById(`section-${section}`);
  secEl.classList.remove("hidden");
  applyFadeAnimation(secEl);
  
  // Update active button in navigation
  document.querySelectorAll("nav button").forEach(btn => btn.classList.remove("active"));
  document.getElementById(`btn-${section}`).classList.add("active");
  
  // Additional actions for specific sections
  if (section === "courses") {
    renderCoursesTable();
  } else if (section === "course-offering") {
    renderCourseOfferingTable();
  }
}

// After the apiCache helper, add auth helpers
let authToken = localStorage.getItem('authToken') || null;

function isLoggedIn() {
  return !!authToken;
}

function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
    // Start JWT monitoring when token is set
    if (window.jwtMonitor) {
      window.jwtMonitor.startMonitoring();
    }
  } else {
    localStorage.removeItem('authToken');
    // Stop JWT monitoring when token is removed
    if (window.jwtMonitor) {
      window.jwtMonitor.stopMonitoring();
    }
  }
}

async function loginRequest(username, password) {
  const resp = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!resp.ok) {
    throw new Error('Invalid credentials');
  }
  const data = await resp.json();
  setAuthToken(data.token);
}

function addAuthHeader(headers = {}) {
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

// Navigation: replace inline listener for btn-courses with auth-check helper
function openCoursesSection() {
  if (!isLoggedIn()) {
    showModal(document.getElementById('modal-login'));
    return;
  }
  hideAllSections();
  sectionCourses.classList.remove('hidden');
  applyFadeAnimation(sectionCourses);
  // Set active navigation button
  document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
  document.getElementById('btn-courses').classList.add('active');
  renderCoursesTable();
}

// Update navigation event bindings
document.getElementById('btn-courses').addEventListener('click', openCoursesSection);

document.getElementById("btn-course-offering").addEventListener("click", async () => {
  hideAllSections();
  sectionCourseOffering.classList.remove("hidden");
  applyFadeAnimation(sectionCourseOffering);
  
  // Update active button in navigation
  document.querySelectorAll("nav button").forEach(btn => btn.classList.remove("active"));
  document.getElementById("btn-course-offering").classList.add("active");
  
  await renderCourseOfferingTable();
  setupTrimesterTabs();
});
// New Event Listener for Section View
document.getElementById("btn-section-view").addEventListener("click", async () => {
  hideAllSections();
  sectionSectionView.classList.remove("hidden");
  applyFadeAnimation(sectionSectionView);
  
  // Update active button in navigation
  document.querySelectorAll("nav button").forEach(btn => btn.classList.remove("active"));
  document.getElementById("btn-section-view").classList.add("active");
  
  // Preserve currentSectionViewTrimester and yearLevel
  setupSectionViewTrimesterTabs();
  await renderSectionViewTables();
  await validateAllComplementary(); // Debounced validation
});
document.getElementById("btn-room-view").addEventListener("click", async () => {
  hideAllSections();
  sectionRoomView.classList.remove("hidden");
  applyFadeAnimation(sectionRoomView);
  
  // Update active button in navigation
  document.querySelectorAll("nav button").forEach(btn => btn.classList.remove("active"));
  document.getElementById("btn-room-view").classList.add("active");
  
  setupRoomViewTrimesterTabs();
  await renderRoomViewTables();
    await validateAllComplementary(); // Debounced validation
});

document.getElementById("btn-schedule-summary").addEventListener("click", async () => {
  hideAllSections();
  const sectionScheduleSummary = document.getElementById("section-schedule-summary");
  sectionScheduleSummary.classList.remove("hidden");
  applyFadeAnimation(sectionScheduleSummary);
  
  // Update active button in navigation
  document.querySelectorAll("nav button").forEach(btn => btn.classList.remove("active"));
  document.getElementById("btn-schedule-summary").classList.add("active");
  
  await initializeScheduleSummarySection();
});

