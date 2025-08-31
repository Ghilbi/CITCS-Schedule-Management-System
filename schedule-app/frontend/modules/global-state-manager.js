/**************************************************************
 * GLOBAL STATE MANAGER
 * Centralized management of application state variables
 **************************************************************/

// Current view state variables - single source of truth
let currentRoomViewTrimester = "1st Trimester";
let currentRoomViewYearLevel = "1st yr";
let currentSectionViewTrimester = "1st Trimester";
let currentSectionViewYearLevel = "1st yr";
let currentScheduleSummaryTrimester = "1st Trimester";
let currentScheduleSummaryYearLevel = "1st yr";

// State management functions
function setRoomViewState(trimester, yearLevel) {
  if (trimester) currentRoomViewTrimester = trimester;
  if (yearLevel) currentRoomViewYearLevel = yearLevel;
}

function setSectionViewState(trimester, yearLevel) {
  if (trimester) currentSectionViewTrimester = trimester;
  if (yearLevel) currentSectionViewYearLevel = yearLevel;
}

function setScheduleSummaryState(trimester, yearLevel) {
  if (trimester) currentScheduleSummaryTrimester = trimester;
  if (yearLevel) currentScheduleSummaryYearLevel = yearLevel;
}

// Getter functions for safe access
function getRoomViewState() {
  return {
    trimester: currentRoomViewTrimester,
    yearLevel: currentRoomViewYearLevel
  };
}

function getSectionViewState() {
  return {
    trimester: currentSectionViewTrimester,
    yearLevel: currentSectionViewYearLevel
  };
}

function getScheduleSummaryState() {
  return {
    trimester: currentScheduleSummaryTrimester,
    yearLevel: currentScheduleSummaryYearLevel
  };
}

// Initialize state on load
function initializeGlobalState() {
  // Ensure default values are set
  if (!currentRoomViewTrimester) currentRoomViewTrimester = "1st Trimester";
  if (!currentRoomViewYearLevel) currentRoomViewYearLevel = "1st yr";
  if (!currentSectionViewTrimester) currentSectionViewTrimester = "1st Trimester";
  if (!currentSectionViewYearLevel) currentSectionViewYearLevel = "1st yr";
  if (!currentScheduleSummaryTrimester) currentScheduleSummaryTrimester = "1st Trimester";
  if (!currentScheduleSummaryYearLevel) currentScheduleSummaryYearLevel = "1st yr";
}

// Call initialization
initializeGlobalState();