// Startup Animation Controller

function initStartupAnimation() {
  const loader = document.getElementById('startup-loader');
  const mainApp = document.getElementById('main-app');
  
  loader.style.display = 'flex';
  
  setTimeout(() => {
    loader.classList.add('fade-out');
    document.body.style.overflow = 'auto';
    mainApp.classList.add('loaded');
    
    setTimeout(() => {
      loader.style.display = 'none';
    }, 800);
  }, 3500);
}

function isFirstVisit() {
  const hasVisited = localStorage.getItem('schedule-app-visited');
  if (!hasVisited) {
    localStorage.setItem('schedule-app-visited', 'true');
    return true;
  }
  return false;
}

function skipStartupAnimation() {
  const loader = document.getElementById('startup-loader');
  const mainApp = document.getElementById('main-app');
  
  loader.style.display = 'none';
  document.body.style.overflow = 'auto';
  mainApp.classList.add('loaded');
  mainApp.style.animationDelay = '0s';
}

