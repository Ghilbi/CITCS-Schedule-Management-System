/**************************************************************
 * Navigation
 **************************************************************/
// sectionCourses is defined in 03-global-variables-for-room-view-columns.js
// sectionCourseOffering is defined in 03-global-variables-for-room-view-columns.js
// sectionRoomView is defined in 03-global-variables-for-room-view-columns.js
// sectionSectionView is defined in 03-global-variables-for-room-view-columns.js

// Add fade animation helper
function applyFadeAnimation(element) {
  element.classList.add("fade-in");
  element.addEventListener("animationend", () => element.classList.remove("fade-in"), { once: true });
}

function hideAllSections() {
  // remove fade-in from all sections
  document.querySelectorAll("[id^='section-']").forEach(sec => sec.classList.remove("fade-in"));
  document.getElementById("section-dashboard").classList.add("hidden");
  document.getElementById("section-courses").classList.add("hidden");
  document.getElementById("section-course-offering").classList.add("hidden");
  document.getElementById("section-section-view").classList.add("hidden");
  document.getElementById("section-room-view").classList.add("hidden");
  document.getElementById("section-schedule-summary").classList.add("hidden");
  
  // Hide curriculum indicator when leaving courses page
  if (window.ActiveCurriculumManager) {
    window.ActiveCurriculumManager.hideActiveCurriculumIndicator();
  }
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
    // Show curriculum indicator only on courses page
    if (window.ActiveCurriculumManager) {
      // Use a small delay to ensure the section is visible
      setTimeout(() => {
        window.ActiveCurriculumManager.createActiveCurriculumIndicator();
      }, 100);
    }
  } else if (section === "course-offering") {
    renderCourseOfferingTable();
  } else if (section === "dashboard") {
    // Initialize dashboard data when showing dashboard section
    if (typeof loadDashboardData === 'function' && typeof renderDashboardStats === 'function' && typeof renderDashboardCharts === 'function') {
      setTimeout(async () => {
        try {
          await loadDashboardData();
          await renderDashboardStats();
          await renderDashboardCharts();
        } catch (error) {
          console.error('Error loading dashboard:', error);
        }
      }, 100);
    }
  }
}

// After the apiCache helper, add auth helpers
// authToken is defined in 03-global-variables-for-room-view-columns.js

function isLoggedIn() {
  return !!authToken;
}

function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
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

// Navigation: courses section access (authentication handled at app level)
function openCoursesSection() {
  hideAllSections();
  sectionCourses.classList.remove('hidden');
  applyFadeAnimation(sectionCourses);
  // Set active navigation button
  document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
  document.getElementById('btn-courses').classList.add('active');
  renderCoursesTable();
  
  // Show curriculum indicator only on courses page
  if (window.ActiveCurriculumManager) {
    // Use a small delay to ensure the section is visible
    setTimeout(() => {
      window.ActiveCurriculumManager.createActiveCurriculumIndicator();
    }, 100);
  }
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
  
  // Initialize section view state
  setSectionViewState("1st Trimester", "1st yr");
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
  
  // Initialize room view state
  setRoomViewState("1st Trimester", "1st yr");
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

document.getElementById("btn-dashboard").addEventListener("click", async () => {
  if (typeof showDashboard === 'function') {
    showDashboard();
  } else {
    console.error('Dashboard function not available');
  }
});

/**************************************************************
 * (FACULTY SECTION REMOVED)
 **************************************************************/

