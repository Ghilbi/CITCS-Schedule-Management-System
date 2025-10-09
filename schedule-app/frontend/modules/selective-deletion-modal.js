/**************************************************************
 * SELECTIVE DELETION MODAL FUNCTIONALITY
 **************************************************************/

// Global variables for the selective deletion modal
let selectedDeletionType = null;
let currentFilters = {};

// Initialize the selective deletion modal
function initializeSelectiveDeletionModal() {
  const modal = document.getElementById('modal-selective-deletion');
  const deletionOptions = document.querySelectorAll('.deletion-option');
  const filtersSection = document.getElementById('deletion-filters');
  const summarySection = document.getElementById('deletion-summary');
  const summaryText = document.getElementById('deletion-summary-text');
  const confirmButton = document.getElementById('btn-confirm-deletion');
  const cancelButton = document.getElementById('btn-cancel-deletion');
  
  // Filter elements
  const yearLevelSelect = document.getElementById('deletion-year-level');
  const trimesterSelect = document.getElementById('deletion-trimester');
  const degreeSelect = document.getElementById('deletion-degree');
  
  // Handle deletion option selection
  deletionOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Remove selected class from all options
      deletionOptions.forEach(opt => opt.classList.remove('selected'));
      
      // Add selected class to clicked option
      option.classList.add('selected');
      
      // Get the deletion type
      selectedDeletionType = option.getAttribute('data-deletion-type');
      
      // Show/hide filters based on selection
      if (selectedDeletionType === 'all') {
        filtersSection.classList.add('hidden');
        updateDeletionSummary();
      } else {
        filtersSection.classList.remove('hidden');
        showRelevantFilters(selectedDeletionType);
        updateDeletionSummary();
      }
    });
  });
  
  // Handle filter changes
  [yearLevelSelect, trimesterSelect, degreeSelect].forEach(select => {
    select.addEventListener('change', () => {
      updateCurrentFilters();
      updateDeletionSummary();
    });
  });
  
  // Handle confirm deletion
  confirmButton.addEventListener('click', async () => {
    if (!selectedDeletionType) return;
    
    try {
      await selectiveClearCourses(selectedDeletionType, currentFilters);
      hideModal(modal);
      resetModal();
    } catch (error) {
      console.error('Error during selective deletion:', error);
      alert('An error occurred during deletion. Please try again.');
    }
  });
  
  // Handle cancel
  cancelButton.addEventListener('click', () => {
    hideModal(modal);
    resetModal();
  });
}

// Show relevant filters based on deletion type
function showRelevantFilters(deletionType) {
  const yearLevelSection = document.querySelector('#deletion-filters .filter-section:nth-child(1)');
  const trimesterSection = document.querySelector('#deletion-filters .filter-section:nth-child(2)');
  const degreeSection = document.querySelector('#deletion-filters .filter-section:nth-child(3)');
  
  // Hide all filters first
  yearLevelSection.style.display = 'none';
  trimesterSection.style.display = 'none';
  degreeSection.style.display = 'none';
  
  // Show relevant filter
  switch (deletionType) {
    case 'year-level':
      yearLevelSection.style.display = 'block';
      break;
    case 'trimester':
      trimesterSection.style.display = 'block';
      break;
    case 'degree':
      degreeSection.style.display = 'block';
      break;
  }
}

// Update current filters object
function updateCurrentFilters() {
  const yearLevelSelect = document.getElementById('deletion-year-level');
  const trimesterSelect = document.getElementById('deletion-trimester');
  const degreeSelect = document.getElementById('deletion-degree');
  
  currentFilters = {};
  
  if (selectedDeletionType === 'year-level' && yearLevelSelect.value) {
    currentFilters.yearLevel = yearLevelSelect.value;
  } else if (selectedDeletionType === 'trimester' && trimesterSelect.value) {
    currentFilters.trimester = trimesterSelect.value;
  } else if (selectedDeletionType === 'degree' && degreeSelect.value) {
    currentFilters.degree = degreeSelect.value;
  }
}

// Update deletion summary
async function updateDeletionSummary() {
  const summarySection = document.getElementById('deletion-summary');
  const summaryText = document.getElementById('deletion-summary-text');
  const confirmButton = document.getElementById('btn-confirm-deletion');
  
  if (!selectedDeletionType) {
    summarySection.classList.add('hidden');
    confirmButton.disabled = true;
    return;
  }
  
  updateCurrentFilters();
  
  // Check if filters are required and provided
  const filtersRequired = selectedDeletionType !== 'all';
  const filtersProvided = Object.keys(currentFilters).length > 0;
  
  if (filtersRequired && !filtersProvided) {
    summarySection.classList.add('hidden');
    confirmButton.disabled = true;
    return;
  }
  
  try {
    // Get count of items to be deleted
    const counts = await countCoursesForDeletion(selectedDeletionType, currentFilters);
    
    if (counts.courses === 0) {
      summaryText.textContent = 'No courses found matching the selected criteria.';
      confirmButton.disabled = true;
    } else {
      let summaryMessage = '';
      
      switch (selectedDeletionType) {
        case 'all':
          summaryMessage = `This will delete ALL ${counts.courses} course(s)`;
          break;
        case 'year-level':
          summaryMessage = `This will delete ${counts.courses} course(s) for ${currentFilters.yearLevel}`;
          break;
        case 'trimester':
          summaryMessage = `This will delete ${counts.courses} course(s) for ${currentFilters.trimester}`;
          break;
        case 'degree':
          summaryMessage = `This will delete ${counts.courses} course(s) for ${currentFilters.degree}`;
          break;
      }
      
      summaryMessage += `, ${counts.offerings} course offering(s), and ${counts.schedules} schedule(s).`;
      summaryText.textContent = summaryMessage;
      confirmButton.disabled = false;
    }
    
    summarySection.classList.remove('hidden');
  } catch (error) {
    console.error('Error updating deletion summary:', error);
    summaryText.textContent = 'Error loading deletion preview. Please try again.';
    confirmButton.disabled = true;
    summarySection.classList.remove('hidden');
  }
}

// Reset modal to initial state
function resetModal() {
  selectedDeletionType = null;
  currentFilters = {};
  
  // Remove selected class from all options
  document.querySelectorAll('.deletion-option').forEach(opt => opt.classList.remove('selected'));
  
  // Hide filters and summary
  document.getElementById('deletion-filters').classList.add('hidden');
  document.getElementById('deletion-summary').classList.add('hidden');
  
  // Reset filter values
  document.getElementById('deletion-year-level').value = '';
  document.getElementById('deletion-trimester').value = '';
  document.getElementById('deletion-degree').value = '';
  
  // Disable confirm button
  document.getElementById('btn-confirm-deletion').disabled = true;
}

// Show the selective deletion modal
function showSelectiveDeletionModal() {
  const modal = document.getElementById('modal-selective-deletion');
  resetModal();
  showModal(modal);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeSelectiveDeletionModal();
});

// Make functions available globally
window.showSelectiveDeletionModal = showSelectiveDeletionModal;