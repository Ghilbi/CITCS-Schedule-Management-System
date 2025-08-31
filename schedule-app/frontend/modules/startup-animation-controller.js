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

/**************************************************************
 * API wrapper functions for backend calls
 **************************************************************/
// Utility: debounce to limit frequent calls on inputs
function debounce(func, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
}

// Parse section input supporting both ranges (A-D) and comma-separated values (A,B,C)
function parseSectionInput(input) {
  if (!input || !input.trim()) {
    return [];
  }
  
  const sections = [];
  const parts = input.split(',').map(part => part.trim()).filter(part => part);
  
  for (const part of parts) {
    // Check if it's a range (e.g., A-D, a-d)
    const rangeMatch = part.match(/^([a-zA-Z])\s*-\s*([a-zA-Z])$/);
    if (rangeMatch) {
      const start = rangeMatch[1].toUpperCase();
      const end = rangeMatch[2].toUpperCase();
      const startCode = start.charCodeAt(0);
      const endCode = end.charCodeAt(0);
      
      if (startCode <= endCode) {
        // Generate range from start to end
        for (let i = startCode; i <= endCode; i++) {
          sections.push(String.fromCharCode(i));
        }
      } else {
        // Invalid range, treat as individual letters
        sections.push(start, end);
      }
    } else {
      // Single letter or invalid format, add as-is (converted to uppercase)
      sections.push(part.toUpperCase());
    }
  }
  
  // Remove duplicates and return
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

// API caching is handled in 02-api-wrapper-functions-for-backend-calls.js

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

// API POST caching is handled in 02-api-wrapper-functions-for-backend-calls.js

// API PUT caching is handled in 02-api-wrapper-functions-for-backend-calls.js

// API DELETE caching is handled in 02-api-wrapper-functions-for-backend-calls.js

