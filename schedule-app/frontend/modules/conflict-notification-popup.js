/**************************************************************
 * Conflict notification popup
 **************************************************************/
function showConflictNotification(message) {
  const popup = document.getElementById("conflict-popup");
  popup.textContent = message;
  popup.classList.remove("hidden");
  
  // Auto-hide the conflict notification after 6 seconds
  setTimeout(() => {
    clearConflictNotification();
  }, 6000);
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
  
  // Clear duplicate warnings if this is the course offering modal
  if (modal.id === "modal-course-offering") {
    const existingWarnings = document.querySelectorAll('.duplicate-warning, .bulk-duplicate-warning');
    existingWarnings.forEach(warning => warning.remove());
  }
}

