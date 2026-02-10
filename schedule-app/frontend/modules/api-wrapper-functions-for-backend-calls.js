// API wrapper functions for backend calls

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

// Cache GET calls
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
    return await handleAuthorizedResponse(response);
  } catch (error) {
    console.error(`Failed to POST to ${table}:`, error, data);
    throw error;
  }
}

// Clear cache on POST/PUT/DELETE
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
  return handleAuthorizedResponse(response);
}

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
  return handleAuthorizedResponse(response);
}

// Handle token expiration
function handleTokenExpiration() {
  localStorage.removeItem('authToken');
  
  if (window.jwtMonitor) {
    window.jwtMonitor.handleTokenExpired();
  } else {
    alert('Your session has expired. You will be redirected to the login page.');
    window.location.href = 'login.html';
  }
}

const originalApiDelete = apiDelete;
apiDelete = async (table, id) => {
  clearApiCache(table);
  return originalApiDelete(table, id);
};

async function handleAuthorizedResponse(response) {
  if (response.status === 401) {
    let errorData = {};
    try {
      errorData = await response.json();
    } catch (parseError) {
      // Ignore parse errors
    }
    if (errorData.expired) {
      handleTokenExpiration();
      throw new Error('Session expired');
    }
    throw new Error(errorData.error || 'Unauthorized request');
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

// Get all room columns
async function getAllRoomColumns() {
  const rooms = await apiGet("rooms");
  const roomNames = rooms.map(room => room.name);
  const doubled = [];
  roomNames.forEach(room => {
    doubled.push(`${room} A`);
    doubled.push(`${room} B`);
  });
  return doubled;
}

