/**************************************************************
 * Loading Overlay Functions
 **************************************************************/
function showLoadingOverlay(message = 'Processing...') {
  const overlay = document.querySelector('.loading-overlay');
  const messageElement = overlay.querySelector('.loading-message');
  messageElement.textContent = message;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent scrolling while loading
}

function hideLoadingOverlay() {
  const overlay = document.querySelector('.loading-overlay');
  overlay.classList.remove('active');
  document.body.style.overflow = 'auto'; // Restore scrolling
}

