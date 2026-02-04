// Modal Show/Hide

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
  
  if (modal.id === "modal-course-offering") {
    const existingWarnings = document.querySelectorAll('.duplicate-warning, .bulk-duplicate-warning');
    existingWarnings.forEach(warning => warning.remove());
  }
}

// Initial Page Load

(async function initialLoad() {
  if (isFirstVisit()) {
    initStartupAnimation();
  } else {
    skipStartupAnimation();
  }
  
  await renderCoursesTable();
  await renderCourseOfferingTable();
  await renderRoomsTable();
  
  setupTrimesterTabs();
  setupRoomViewTrimesterTabs();
  setupSectionViewTrimesterTabs();
  
  updateSectionCodePreview();
  updateBulkSectionCodePreview();
  
  initCourseOfferingTabs();
  setupModalCloseButtons();
  
  document.getElementById('btn-clear-courses').addEventListener('click', showSelectiveDeletionModal);
  document.getElementById('btn-clear-courseOffering').addEventListener('click', clearAllCourseOfferings);
  
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
  
  showSection('analytics');
  await loadAnalyticsData();
})();

