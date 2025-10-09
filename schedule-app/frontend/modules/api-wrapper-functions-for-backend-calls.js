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

async function apiGet(table, forceRefresh = false) {
  const response = await fetch(`/api/${table}`, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  return response.json();
}

// Performance: cache GET calls to avoid redundant network requests
const apiCache = {};
const originalApiGet = apiGet;
apiGet = async (table, forceRefresh = false) => {
  if (forceRefresh || !apiCache[table]) {
    apiCache[table] = await originalApiGet(table);
  }
  return apiCache[table];
};
const clearApiCache = (table) => {
  if (table) {
    delete apiCache[table];
  } else {
    // Clear all cache if no table specified
    Object.keys(apiCache).forEach(key => delete apiCache[key]);
  }
};

async function apiPost(table, data) {
  try {
    const response = await fetch(`/api/${table}`, {
      method: 'POST',
      headers: addAuthHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data)
    });
    
    // Check for token expiration
    if (response.status === 401) {
      const errorData = await response.json();
      if (errorData.expired) {
        handleTokenExpiration();
        throw new Error('Session expired');
      }
    }
    
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

// Clear cache on POST/PUT/DELETE to keep data consistent
const originalApiPost = apiPost;
apiPost = async (table, data) => {
  clearApiCache(table);
  return originalApiPost(table, data);
};

async function apiPut(table, id, data) {
  const response = await fetch(`/api/${table}/${id}`, {
    method: 'PUT',
    headers: addAuthHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  
  // Check for token expiration
  if (response.status === 401) {
    const errorData = await response.json();
    if (errorData.expired) {
      handleTokenExpiration();
      throw new Error('Session expired');
    }
  }
  
  return response.json();
}

// Clear cache on POST/PUT/DELETE to keep data consistent
const originalApiPut = apiPut;
apiPut = async (table, id, data) => {
  clearApiCache(table);
  return originalApiPut(table, id, data);
};

async function apiDelete(table, id) {
  const response = await fetch(`/api/${table}/${id}`, {
    method: 'DELETE',
    headers: addAuthHeader()
  });
  
  // Check for token expiration
  if (response.status === 401) {
    const errorData = await response.json();
    if (errorData.expired) {
      handleTokenExpiration();
      throw new Error('Session expired');
    }
  }
  
  return response.json();
}

// Handle token expiration across the application
function handleTokenExpiration() {
  // Clear the token
  localStorage.removeItem('authToken');
  
  // Notify JWT monitor if available
  if (window.jwtMonitor) {
    window.jwtMonitor.handleTokenExpired();
  } else {
    // Fallback if JWT monitor is not available
    alert('Your session has expired. You will be redirected to the login page.');
    window.location.href = 'login.html';
  }
}

// Clear cache on POST/PUT/DELETE to keep data consistent
const originalApiDelete = apiDelete;
apiDelete = async (table, id) => {
  clearApiCache(table);
  return originalApiDelete(table, id);
};

/**************************************************************
 * Global variables for Room View columns
 **************************************************************/
// predefinedRooms is defined in 03-global-variables-for-room-view-columns.js

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

