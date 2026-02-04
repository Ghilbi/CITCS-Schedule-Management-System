// Startup Animation Controller

function initStartupAnimation() {
  const loader = document.getElementById('startup-loader');
  const mainApp = document.getElementById('main-app');
  
  if (!loader || !mainApp) {
    console.warn('Startup animation skipped: required elements not found.');
    document.body.classList.add('app-loaded');
    document.body.style.overflow = 'auto';
    return;
  }
  
  loader.style.display = 'flex';
  
  setTimeout(() => {
    loader.classList.add('fade-out');
    document.body.classList.add('app-loaded');
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
  
  if (!loader || !mainApp) {
    document.body.classList.add('app-loaded');
    document.body.style.overflow = 'auto';
    return;
  }
  
  loader.style.display = 'none';
  document.body.classList.add('app-loaded');
  document.body.style.overflow = 'auto';
  mainApp.classList.add('loaded');
  mainApp.style.animationDelay = '0s';
}

// Debounce utility
function debounce(func, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
}

// Parse section input (supports ranges like A-D and comma-separated like A,B,C)
function parseSectionInput(input) {
  if (!input || !input.trim()) {
    return [];
  }
  
  const sections = [];
  const parts = input.split(',').map(part => part.trim()).filter(part => part);
  
  for (const part of parts) {
    const rangeMatch = part.match(/^([a-zA-Z])\s*-\s*([a-zA-Z])$/);
    if (rangeMatch) {
      const start = rangeMatch[1].toUpperCase();
      const end = rangeMatch[2].toUpperCase();
      const startCode = start.charCodeAt(0);
      const endCode = end.charCodeAt(0);
      
      if (startCode <= endCode) {
        for (let i = startCode; i <= endCode; i++) {
          sections.push(String.fromCharCode(i));
        }
      } else {
        sections.push(start, end);
      }
    } else {
      sections.push(part.toUpperCase());
    }
  }
  
  return [...new Set(sections)];
}

async function apiGet(table) {
  const response = await fetch(`/api/${table}`, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  return response.json();
}

async function apiPost(table, data) {
  try {
    const response = await fetch(`/api/${table}`, {
      method: 'POST',
      headers: addAuthHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}) for POST to ${table}:`, errorText);
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error(`Failed to POST to ${table}:`, error, data);
    throw error;
  }
}
