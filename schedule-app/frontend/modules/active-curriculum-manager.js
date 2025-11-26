/**************************************************************
 * ACTIVE CURRICULUM MANAGER
 * Centralized management of active curriculum state
 * Extends the global state manager pattern
 **************************************************************/

// Active curriculum state - single source of truth
let activeCurriculum = null;
let activeCurriculumManagerCurriculaList = [];
let activeCurriculumChangeListeners = [];

// Initialize with default curriculum
const DEFAULT_CURRICULUM = "2024-2025";

/**
 * Load curricula from database and set active curriculum
 */
async function loadCurriculaAndSetActive() {
  try {
    activeCurriculumManagerCurriculaList = await apiGet("curricula");
    
    // If no active curriculum is set, use the first available or default
    if (!activeCurriculum) {
      if (activeCurriculumManagerCurriculaList.length > 0) {
        // Try to find the default curriculum first
        const defaultCurr = activeCurriculumManagerCurriculaList.find(c => c.year === DEFAULT_CURRICULUM);
        activeCurriculum = defaultCurr ? defaultCurr.year : activeCurriculumManagerCurriculaList[0].year;
      } else {
        activeCurriculum = DEFAULT_CURRICULUM;
      }
      
      // Save to localStorage
      localStorage.setItem('activeCurriculum', activeCurriculum);
      // Notify all listeners about the curriculum change
      notifyActiveCurriculumChange();
    }
  } catch (error) {
    console.error('Error loading curricula:', error);
    // Fallback to default curriculum
    if (!activeCurriculum) {
      activeCurriculum = DEFAULT_CURRICULUM;
      notifyActiveCurriculumChange();
    }
  }
}

/**
 * Set the active curriculum
 * @param {string} curriculumYear - The curriculum year to set as active
 */
function setActiveCurriculum(curriculumYear) {
  if (curriculumYear && curriculumYear !== activeCurriculum) {
    activeCurriculum = curriculumYear;
    notifyActiveCurriculumChange();
    
    // Store in localStorage for persistence
    localStorage.setItem('activeCurriculum', curriculumYear);
  }
}

/**
 * Get the current active curriculum
 * @returns {string} The active curriculum year
 */
function getActiveCurriculum() {
  return activeCurriculum || DEFAULT_CURRICULUM;
}

/**
 * Get all available curricula
 * @returns {Array} Array of curriculum objects
 */
function getAllCurricula() {
  return [...activeCurriculumManagerCurriculaList];
}

/**
 * Check if a curriculum exists in the list
 * @param {string} curriculumYear - The curriculum year to check
 * @returns {boolean} True if curriculum exists
 */
function curriculumExists(curriculumYear) {
  return activeCurriculumManagerCurriculaList.some(c => c.year === curriculumYear);
}

/**
 * Add a listener for active curriculum changes
 * @param {Function} callback - Function to call when active curriculum changes
 */
function addActiveCurriculumChangeListener(callback) {
  if (typeof callback === 'function') {
    activeCurriculumChangeListeners.push(callback);
  }
}

/**
 * Remove a listener for active curriculum changes
 * @param {Function} callback - Function to remove from listeners
 */
function removeActiveCurriculumChangeListener(callback) {
  const index = activeCurriculumChangeListeners.indexOf(callback);
  if (index > -1) {
    activeCurriculumChangeListeners.splice(index, 1);
  }
}

/**
 * Notify all listeners about active curriculum change
 */
function notifyActiveCurriculumChange() {
  activeCurriculumChangeListeners.forEach(callback => {
    try {
      callback(activeCurriculum);
    } catch (error) {
      console.error('Error in curriculum change listener:', error);
    }
  });
}

/**
 * Update curricula list (called when curricula are added/edited/deleted)
 * @param {Array} newCurriculaList - Updated list of curricula
 */
function updateCurriculaList(newCurriculaList) {
  activeCurriculumManagerCurriculaList = [...newCurriculaList];
  
  // Check if active curriculum still exists
  if (activeCurriculum && !curriculumExists(activeCurriculum)) {
    // Active curriculum was deleted, set to first available or default
    if (activeCurriculumManagerCurriculaList.length > 0) {
      const defaultCurr = activeCurriculumManagerCurriculaList.find(c => c.year === DEFAULT_CURRICULUM);
      setActiveCurriculum(defaultCurr ? defaultCurr.year : activeCurriculumManagerCurriculaList[0].year);
    } else {
      setActiveCurriculum(DEFAULT_CURRICULUM);
    }
  }
}

/**
 * Create and manage active curriculum indicator UI
 */
function createActiveCurriculumIndicator() {
  // Only show indicator on course catalog page
  const coursesSection = document.getElementById('section-courses');
  if (!coursesSection || coursesSection.classList.contains('hidden')) {
    // Hide indicator if not on courses page
    const indicator = document.getElementById('active-curriculum-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
    return;
  }

  // Get indicator element from page header
  const indicator = document.getElementById('active-curriculum-indicator');
  if (!indicator) {
    return;
  }
  
  // Remove any inline styles that might have been added
  indicator.removeAttribute('style');
  
  // Ensure class is set
  if (!indicator.classList.contains('subtle-curriculum-btn')) {
    indicator.classList.add('subtle-curriculum-btn');
  }
  
  // Add click handler to show curriculum selector if not already added
  if (!indicator.hasAttribute('data-listener-added')) {
    indicator.addEventListener('click', showActiveCurriculumSelector);
    indicator.setAttribute('data-listener-added', 'true');
  }
  
  // Show indicator and update text
  indicator.style.display = 'flex';
  indicator.textContent = `${getActiveCurriculum()}`;
  indicator.title = 'Click to change active curriculum';
}

/**
 * Hide the active curriculum indicator
 */
function hideActiveCurriculumIndicator() {
  const indicator = document.getElementById('active-curriculum-indicator');
  if (indicator) {
    indicator.style.display = 'none';
  }
}

/**
 * Show active curriculum selector modal
 */
function showActiveCurriculumSelector() {
  // Create modal if it doesn't exist
  let modal = document.getElementById('active-curriculum-selector-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'active-curriculum-selector-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      min-width: 300px;
      max-width: 400px;
    `;
    
    modalContent.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: #1f2937;">Select Active Curriculum</h3>
      <div id="curriculum-selector-list" style="margin-bottom: 16px;"></div>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="cancel-curriculum-selector" style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
        <button id="confirm-curriculum-selector" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Confirm</button>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('cancel-curriculum-selector').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    document.getElementById('confirm-curriculum-selector').addEventListener('click', () => {
      const selected = document.querySelector('input[name="curriculum-selector"]:checked');
      if (selected) {
        setActiveCurriculum(selected.value);
      }
      modal.style.display = 'none';
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }
  
  // Populate curriculum list
  const listContainer = document.getElementById('curriculum-selector-list');
  listContainer.innerHTML = '';
  
  const currentActive = getActiveCurriculum();
  
  // Add available curricula
  activeCurriculumManagerCurriculaList.forEach(curriculum => {
    const label = document.createElement('label');
    label.style.cssText = 'display: block; margin-bottom: 8px; cursor: pointer;';
    
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'curriculum-selector';
    radio.value = curriculum.year;
    radio.checked = curriculum.year === currentActive;
    radio.style.marginRight = '8px';
    
    label.appendChild(radio);
    label.appendChild(document.createTextNode(curriculum.year));
    listContainer.appendChild(label);
  });
  
  // If no curricula available, add default option
  if (activeCurriculumManagerCurriculaList.length === 0) {
    const label = document.createElement('label');
    label.style.cssText = 'display: block; margin-bottom: 8px; cursor: pointer;';
    
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'curriculum-selector';
    radio.value = DEFAULT_CURRICULUM;
    radio.checked = true;
    radio.style.marginRight = '8px';
    
    label.appendChild(radio);
    label.appendChild(document.createTextNode(DEFAULT_CURRICULUM + ' (Default)'));
    listContainer.appendChild(label);
  }
  
  modal.style.display = 'flex';
}

/**
 * Initialize active curriculum manager
 */
async function initializeActiveCurriculumManager() {
  // Try to restore from localStorage
  const stored = localStorage.getItem('activeCurriculum');
  if (stored) {
    activeCurriculum = stored;
  }
  
  // Load curricula and set active
  await loadCurriculaAndSetActive();
  
  // Don't create UI indicator by default - only show on courses page
  // createActiveCurriculumIndicator();
  
  // Add listener to update indicator when curriculum changes
  addActiveCurriculumChangeListener(() => {
    createActiveCurriculumIndicator();
  });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeActiveCurriculumManager);
} else {
  initializeActiveCurriculumManager();
}

// Export functions to global window object
window.ActiveCurriculumManager = {
  setActiveCurriculum,
  getActiveCurriculum,
  getAllCurricula,
  curriculumExists,
  addActiveCurriculumChangeListener,
  removeActiveCurriculumChangeListener,
  updateCurriculaList,
  loadCurriculaAndSetActive,
  hideActiveCurriculumIndicator,
  createActiveCurriculumIndicator
};