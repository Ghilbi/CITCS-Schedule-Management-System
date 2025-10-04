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
  
  // Clear duplicate warnings if this is the course offering modal
  if (modal.id === "modal-course-offering") {
    const existingWarnings = document.querySelectorAll('.duplicate-warning, .bulk-duplicate-warning');
    existingWarnings.forEach(warning => warning.remove());
  }
}

/**************************************************************
 * INITIAL PAGE LOAD
 **************************************************************/
(async function initialLoad() {
  // Check if this is the first visit and show startup animation
  if (isFirstVisit()) {
    initStartupAnimation();
  } else {
    skipStartupAnimation();
  }
  
  // Initial loading for all tables
  await renderCoursesTable();
  await renderCourseOfferingTable();
  await renderRoomsTable();
  
  // Setup trimester tabs
  setupTrimesterTabs();
  setupRoomViewTrimesterTabs();
  setupSectionViewTrimesterTabs();
  
  // Initialize section code inputs/previews
  updateSectionCodePreview();
  updateBulkSectionCodePreview();
  
  // Initialize course offering modal tabs
  initCourseOfferingTabs();
  
  // Setup modal close buttons
  setupModalCloseButtons();
  
  // Add event listeners for clear all buttons
  document.getElementById('btn-clear-courses').addEventListener('click', clearAllCourses);
  document.getElementById('btn-clear-courseOffering').addEventListener('click', clearAllCourseOfferings);
  
  // Primary navigation menu event listeners
  document.getElementById("btn-courses").addEventListener("click", openCoursesSection);
  document.getElementById("btn-course-offering").addEventListener("click", () => showSection("course-offering"));
  document.getElementById("btn-section-view").addEventListener("click", async () => {
    showSection("section-view");
    await renderSectionViewTables();
    await validateAllComplementary(); // Debounced validation
  });
  document.getElementById("btn-room-view").addEventListener("click", async () => {
    showSection("room-view");
    await renderRoomViewTables();
    await validateAllComplementary(); // Debounced validation
  });
  
  // Show Analytics by default (authentication handled at HTML level)
  showSection('analytics');
  await loadAnalyticsData();
})();

