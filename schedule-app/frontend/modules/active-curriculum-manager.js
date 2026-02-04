// Active Curriculum Manager - manages curriculum state and UI
let activeCurriculum = null;
let activeCurriculumManagerCurriculaList = [];
let activeCurriculumChangeListeners = [];

const DEFAULT_CURRICULUM = "2024-2025";

// Load curricula from database and set active curriculum
async function loadCurriculaAndSetActive() {
  try {
    activeCurriculumManagerCurriculaList = await apiGet("curricula");
    
    if (!activeCurriculum) {
      if (activeCurriculumManagerCurriculaList.length > 0) {
        const defaultCurr = activeCurriculumManagerCurriculaList.find(c => c.year === DEFAULT_CURRICULUM);
        activeCurriculum = defaultCurr ? defaultCurr.year : activeCurriculumManagerCurriculaList[0].year;
      } else {
        activeCurriculum = DEFAULT_CURRICULUM;
      }
      
      localStorage.setItem('activeCurriculum', activeCurriculum);
      notifyActiveCurriculumChange();
    }
  } catch (error) {
    console.error('Error loading curricula:', error);
    if (!activeCurriculum) {
      activeCurriculum = DEFAULT_CURRICULUM;
      notifyActiveCurriculumChange();
    }
  }
}

// Set active curriculum
function setActiveCurriculum(curriculumYear) {
  if (curriculumYear && curriculumYear !== activeCurriculum) {
    activeCurriculum = curriculumYear;
    notifyActiveCurriculumChange();
    localStorage.setItem('activeCurriculum', curriculumYear);
  }
}

// Get current active curriculum
function getActiveCurriculum() {
  return activeCurriculum || DEFAULT_CURRICULUM;
}

// Get all available curricula
function getAllCurricula() {
  return [...activeCurriculumManagerCurriculaList];
}

// Check if curriculum exists
function curriculumExists(curriculumYear) {
  return activeCurriculumManagerCurriculaList.some(c => c.year === curriculumYear);
}

// Add listener for curriculum changes
function addActiveCurriculumChangeListener(callback) {
  if (typeof callback === 'function') {
    activeCurriculumChangeListeners.push(callback);
  }
}

// Remove listener for curriculum changes
function removeActiveCurriculumChangeListener(callback) {
  const index = activeCurriculumChangeListeners.indexOf(callback);
  if (index > -1) {
    activeCurriculumChangeListeners.splice(index, 1);
  }
}

// Notify all listeners about curriculum change
function notifyActiveCurriculumChange() {
  activeCurriculumChangeListeners.forEach(callback => {
    try {
      callback(activeCurriculum);
    } catch (error) {
      console.error('Error in curriculum change listener:', error);
    }
  });
}

// Update curricula list
function updateCurriculaList(newCurriculaList) {
  activeCurriculumManagerCurriculaList = [...newCurriculaList];
  
  // Reset to default if active curriculum no longer exists
  if (activeCurriculum && !curriculumExists(activeCurriculum)) {
    if (activeCurriculumManagerCurriculaList.length > 0) {
      const defaultCurr = activeCurriculumManagerCurriculaList.find(c => c.year === DEFAULT_CURRICULUM);
      setActiveCurriculum(defaultCurr ? defaultCurr.year : activeCurriculumManagerCurriculaList[0].year);
    } else {
      setActiveCurriculum(DEFAULT_CURRICULUM);
    }
  }
}

// Create and manage curriculum indicator UI
function createActiveCurriculumIndicator() {
  const coursesSection = document.getElementById('section-courses');
  if (!coursesSection || coursesSection.classList.contains('hidden')) {
    const indicator = document.getElementById('active-curriculum-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
    return;
  }

  const indicator = document.getElementById('active-curriculum-indicator');
  if (!indicator) {
    return;
  }
  
  indicator.removeAttribute('style');
  
  if (!indicator.classList.contains('subtle-curriculum-btn')) {
    indicator.classList.add('subtle-curriculum-btn');
  }
  
  if (!indicator.hasAttribute('data-listener-added')) {
    indicator.addEventListener('click', showActiveCurriculumSelector);
    indicator.setAttribute('data-listener-added', 'true');
  }
  
  indicator.style.display = 'flex';
  indicator.textContent = `${getActiveCurriculum()}`;
  indicator.title = 'Click to change active curriculum';
}

// Hide curriculum indicator
function hideActiveCurriculumIndicator() {
  const indicator = document.getElementById('active-curriculum-indicator');
  if (indicator) {
    indicator.style.display = 'none';
  }
}

// Show curriculum selector modal
function showActiveCurriculumSelector() {
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
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }
  
  const listContainer = document.getElementById('curriculum-selector-list');
  listContainer.innerHTML = '';
  
  const currentActive = getActiveCurriculum();
  
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

// Initialize curriculum manager
async function initializeActiveCurriculumManager() {
  const stored = localStorage.getItem('activeCurriculum');
  if (stored) {
    activeCurriculum = stored;
  }
  
  await loadCurriculaAndSetActive();
  
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

// Export to global window object
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