/**************************************************************
 * STARTUP ANIMATION CONTROLLER
 **************************************************************/
function initStartupAnimation() {
  const loader = document.getElementById('startup-loader');
  const mainApp = document.getElementById('main-app');
  
  // Ensure the loader is visible initially
  loader.style.display = 'flex';
  
  // Start the fade out sequence after content is loaded
  setTimeout(() => {
    // Add fade-out class to loader
    loader.classList.add('fade-out');
    
    // Enable scrolling and show main app
    document.body.style.overflow = 'auto';
    mainApp.classList.add('loaded');
    
    // Remove loader from DOM after animation completes
    setTimeout(() => {
      loader.style.display = 'none';
    }, 800);
  }, 3500); // Total loading time: 3.5 seconds
}

// Check if this is the first visit
function isFirstVisit() {
  const hasVisited = localStorage.getItem('schedule-app-visited');
  if (!hasVisited) {
    localStorage.setItem('schedule-app-visited', 'true');
    return true;
  }
  return false;
}

// Skip animation for returning users
function skipStartupAnimation() {
  const loader = document.getElementById('startup-loader');
  const mainApp = document.getElementById('main-app');
  
  loader.style.display = 'none';
  document.body.style.overflow = 'auto';
  mainApp.classList.add('loaded');
  mainApp.style.animationDelay = '0s';
}

