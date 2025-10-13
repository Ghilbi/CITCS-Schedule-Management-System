/**************************************************************
 * Analytics Module - Statistics and Analytics
 **************************************************************/

// Analytics data cache
let analyticsData = {
  courses: [],
  courseOfferings: [],
  schedules: [],
  rooms: [],
  curricula: []
};

// Note: predefinedRooms is defined globally in global-variables-for-room-view-columns.js

// Analytics refresh interval (5 minutes)
let analyticsRefreshInterval = null;

/**
 * Get all available rooms (predefined + database rooms)
 */
function getAllAvailableRooms() {
  const databaseRoomNames = analyticsData.rooms.map(room => room.name);
  const allUniqueRooms = [...new Set([...predefinedRooms, ...databaseRoomNames])];
  
  // Each room has A and B variants
  const allRoomVariants = [];
  allUniqueRooms.forEach(room => {
    allRoomVariants.push(`${room} A`);
    allRoomVariants.push(`${room} B`);
  });
  
  return allRoomVariants;
}

/**
 * Initialize Analytics
 */
async function initializeAnalytics() {
  try {
    showLoadingOverlay('Loading analytics data...');
    await loadAnalyticsData();
    renderAnalyticsStats();
    renderAnalyticsCharts();
    renderPredictiveAnalyticsUI();
    startAnalyticsAutoRefresh();
    hideLoadingOverlay();
  } catch (error) {
    console.error('Error initializing analytics:', error);
    hideLoadingOverlay();
    alert('Error loading analytics data: ' + error.message);
  }
}

/**
 * Load all analytics data
 */
async function loadAnalyticsData() {
  try {
    const [courses, courseOfferings, schedules, rooms, curricula] = await Promise.all([
      apiGet('courses', true),
      apiGet('course_offerings', true),
      apiGet('schedules', true),
      apiGet('rooms', true),
      apiGet('curricula', true)
    ]);
    
    analyticsData = {
      courses: courses || [],
      courseOfferings: courseOfferings || [],
      schedules: schedules || [],
      rooms: rooms || [],
      curricula: curricula || []
    };
  } catch (error) {
    console.error('Error loading analytics data:', error);
    throw error;
  }
}

/**
 * Calculate analytics statistics
 */
async function calculateAnalyticsStats() {
  // Get all available rooms (predefined + database rooms)
  const allAvailableRooms = getAllAvailableRooms();
  
  const stats = {
    totalCourses: analyticsData.courses.length,
    totalCourseOfferings: analyticsData.courseOfferings.length,
    totalScheduledSessions: analyticsData.schedules.length,
    totalRooms: allAvailableRooms.length,
    totalCurricula: analyticsData.curricula.length
  };

  // Calculate degree distribution
  const degreeDistribution = {};
  analyticsData.courses.forEach(course => {
    const degree = course.degree || 'Unknown';
    degreeDistribution[degree] = (degreeDistribution[degree] || 0) + 1;
  });

  // Calculate trimester distribution
  const trimesterDistribution = {};
  analyticsData.courseOfferings.forEach(offering => {
    const trimester = offering.trimester || 'Unknown';
    trimesterDistribution[trimester] = (trimesterDistribution[trimester] || 0) + 1;
  });

  // Calculate offering type distribution
  const offeringTypeDistribution = {};
  analyticsData.courseOfferings.forEach(offering => {
    const type = offering.type || 'Unknown';
    offeringTypeDistribution[type] = (offeringTypeDistribution[type] || 0) + 1;
  });

  // Calculate room utilization based on col assignments
  const roomUtilization = {};
  analyticsData.schedules.forEach(schedule => {
    // Check if this is a room view entry (col > 0)
    if (schedule.col && schedule.col > 0) {
      const colIndex = schedule.col - 1; // Convert to 0-based index
      if (colIndex >= 0 && colIndex < allAvailableRooms.length) {
        const roomName = allAvailableRooms[colIndex];
        roomUtilization[roomName] = (roomUtilization[roomName] || 0) + 1;
      }
    }
  });

  // Calculate year level distribution
  const yearLevelDistribution = {};
  analyticsData.courses.forEach(course => {
    const yearLevel = course.year_level || 'Unknown';
    yearLevelDistribution[yearLevel] = (yearLevelDistribution[yearLevel] || 0) + 1;
  });

  // Calculate curriculum distribution
  const curriculumDistribution = {};
  analyticsData.courses.forEach(course => {
    const curriculum = course.curriculum || 'Unknown';
    curriculumDistribution[curriculum] = (curriculumDistribution[curriculum] || 0) + 1;
  });

  return {
    ...stats,
    degreeDistribution,
    trimesterDistribution,
    offeringTypeDistribution,
    roomUtilization,
    yearLevelDistribution,
    curriculumDistribution
  };
}

/**
 * Render analytics statistics cards
 */
async function renderAnalyticsStats() {
  const stats = await calculateAnalyticsStats();
  
  // Update stat cards
  document.getElementById('stat-total-courses').textContent = stats.totalCourses;
  document.getElementById('stat-total-offerings').textContent = stats.totalCourseOfferings;
  document.getElementById('stat-total-schedules').textContent = stats.totalScheduledSessions;
  document.getElementById('stat-total-rooms').textContent = stats.totalRooms;
  document.getElementById('stat-total-curricula').textContent = stats.totalCurricula;
  // Calculate room utilization percentage
  const totalRooms = stats.totalRooms;
  const usedRooms = Object.keys(stats.roomUtilization).length;
  const utilizationPercentage = totalRooms > 0 ? Math.round((usedRooms / totalRooms) * 100) : 0;
  document.getElementById('stat-room-utilization').textContent = utilizationPercentage + '%';
}

/**
 * Render analytics charts
 */
async function renderAnalyticsCharts() {
  const stats = await calculateAnalyticsStats();
  
  // Render all charts
  renderDegreeDistributionChart(stats.degreeDistribution);
  renderTrimesterDistributionChart(stats.trimesterDistribution);
  renderOfferingTypeChart(stats.offeringTypeDistribution);
  renderRoomUtilizationChart(stats.roomUtilization);
  renderYearLevelChart(stats.yearLevelDistribution);
}

/**
 * Predictive Analytics: compute sections per course given student count and capacity
 */
function computePredictedOfferings({ degree, yearLevel, trimester, students, capacity }) {
  if (!students || !capacity || students <= 0 || capacity <= 0) {
    return { courses: [], perCourseSections: 0, totalPredictedOfferings: 0, currentOfferingsTotal: 0 };
  }
  const perCourseSections = Math.ceil(students / capacity);
  const activeCurriculum = window.ActiveCurriculumManager ? window.ActiveCurriculumManager.getActiveCurriculum() : null;
  const filteredCourses = (analyticsData.courses || []).filter(c => {
    const matchesDegree = degree ? c.degree === degree : true;
    const matchesYear = yearLevel ? c.year_level === yearLevel : true;
    const matchesTrimester = trimester ? c.trimester === trimester : true;
    const matchesCurriculum = activeCurriculum ? (c.curriculum || activeCurriculum) === activeCurriculum : true;
    return matchesDegree && matchesYear && matchesTrimester && matchesCurriculum;
  });

  // Count current offerings per course
  const offeringsByCourseId = new Map();
  (analyticsData.courseOfferings || []).forEach(off => {
    offeringsByCourseId.set(off.courseId, (offeringsByCourseId.get(off.courseId) || 0) + 1);
  });

  const courses = filteredCourses.map(c => {
    const current = offeringsByCourseId.get(c.id) || 0;
    return {
      id: c.id,
      subject: c.subject,
      unitCategory: c.unit_category,
      predictedSections: perCourseSections,
      currentOfferings: current,
      gap: perCourseSections - current
    };
  });

  const currentOfferingsTotal = courses.reduce((sum, x) => sum + x.currentOfferings, 0);
  const totalPredictedOfferings = courses.reduce((sum, x) => sum + x.predictedSections, 0);
  return { courses, perCourseSections, totalPredictedOfferings, currentOfferingsTotal };
}

function renderPredictiveAnalyticsUI() {
  const degreeSel = document.getElementById('predict-degree');
  const yearSel = document.getElementById('predict-year');
  const triSel = document.getElementById('predict-trimester');
  const studentsInput = document.getElementById('predict-students');
  const capacityInput = document.getElementById('predict-capacity');
  const computeBtn = document.getElementById('btn-compute-prediction');
  const summaryEl = document.getElementById('predictive-summary');
  const tableBody = document.querySelector('#predictive-results-table tbody');

  if (!computeBtn || !tableBody) return;

  computeBtn.addEventListener('click', () => {
    const degree = degreeSel.value;
    const yearLevel = yearSel.value;
    const trimester = triSel.value;
    const students = parseInt(studentsInput.value, 10);
    const capacity = parseInt(capacityInput.value, 10);

    const result = computePredictedOfferings({ degree, yearLevel, trimester, students, capacity });

    // Update summary
    const matchedCourses = result.courses.length;
    summaryEl.textContent = matchedCourses === 0
      ? 'No matching courses found for the selected filters.'
      : `Matched ${matchedCourses} courses. Predicted ${result.perCourseSections} sections per course. Total predicted offerings: ${result.totalPredictedOfferings}. Current offerings: ${result.currentOfferingsTotal}.`;

    // Render table
    tableBody.innerHTML = '';
    result.courses.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding:8px; border-bottom:1px solid var(--color-border);">${item.subject}</td>
        <td style="padding:8px; border-bottom:1px solid var(--color-border);">${item.unitCategory}</td>
        <td style="padding:8px; border-bottom:1px solid var(--color-border); text-align:right;">${item.predictedSections}</td>
      `;
      tableBody.appendChild(tr);
    });
  });
}

/**
 * Create a simple bar chart
 */
function createBarChart(containerId, data, title, color = null) {
  // Use color utility if no color specified
  if (!color) {
    color = window.colorUtils ? window.colorUtils.getChartColor(0) : '#4f46e5';
  }
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const maxValue = Math.max(...Object.values(data));
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  
  container.innerHTML = `
    <h4>${title}</h4>
    <div class="chart-bars">
      ${entries.map(([label, value]) => `
        <div class="chart-bar-item">
          <div class="chart-bar-label">${label}</div>
          <div class="chart-bar-container">
            <div class="chart-bar" style="width: ${(value / maxValue) * 100}%; background-color: ${color};"></div>
            <span class="chart-bar-value">${value}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Create a pie chart using CSS
 */
function createPieChart(containerId, data, title) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  if (total === 0) {
    container.innerHTML = `
      <h4>${title}</h4>
      <div class="pie-chart-container">
        <div class="no-data-message">No data available</div>
      </div>
    `;
    return;
  }
  
  // Use color utility for chart colors
  const colors = window.colorUtils ? window.colorUtils.chartColors : ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  
  let cumulativePercentage = 0;
  const segments = Object.entries(data).map(([label, value], index) => {
    const percentage = (value / total) * 100;
    const startAngle = cumulativePercentage * 3.6;
    cumulativePercentage += percentage;
    
    return {
      label,
      value,
      percentage: percentage.toFixed(1),
      color: colors[index % colors.length],
      startAngle,
      endAngle: cumulativePercentage * 3.6
    };
  });
  
  // Create a single conic-gradient with all segments
  const gradientStops = [];
  let currentAngle = 0;
  
  segments.forEach((segment, index) => {
    const segmentAngle = (segment.value / total) * 360;
    gradientStops.push(`${segment.color} ${currentAngle}deg ${currentAngle + segmentAngle}deg`);
    currentAngle += segmentAngle;
  });
  
  const conicGradient = `conic-gradient(${gradientStops.join(', ')})`;
  
  container.innerHTML = `
    <h4>${title}</h4>
    <div class="pie-chart-container">
      <div class="pie-chart" style="background: ${conicGradient};"></div>
      <div class="pie-legend">
        ${segments.map(segment => `
          <div class="pie-legend-item">
            <div class="pie-legend-color" style="background-color: ${segment.color};"></div>
            <span>${segment.label}: ${segment.value} (${segment.percentage}%)</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Render specific charts
 */
function renderDegreeDistributionChart(data) {
  const color = window.colorUtils ? window.colorUtils.getChartColor(0) : '#4f46e5';
  createBarChart('chart-degree-distribution', data, 'Courses by Degree Program', color);
}

function renderTrimesterDistributionChart(data) {
  createPieChart('chart-trimester-distribution', data, 'Course Offerings by Trimester');
}

function renderOfferingTypeChart(data) {
  const color = window.colorUtils ? window.colorUtils.getChartColor(1) : '#06b6d4';
  createBarChart('chart-offering-type', data, 'Course Offerings by Type', color);
}

function renderRoomUtilizationChart(data) {
  const color = window.colorUtils ? window.colorUtils.getChartColor(2) : '#10b981';
  createBarChart('chart-room-utilization', data, 'Room Usage Statistics', color);
}

function renderYearLevelChart(data) {
  const color = window.colorUtils ? window.colorUtils.getChartColor(3) : '#f59e0b';
  createBarChart('chart-year-level', data, 'Courses by Year Level', color);
}

/**
 * Start auto-refresh for analytics
 */
function startAnalyticsAutoRefresh() {
  // Clear existing interval
  if (analyticsRefreshInterval) {
    clearInterval(analyticsRefreshInterval);
  }
  
  // Set new interval (5 minutes)
  analyticsRefreshInterval = setInterval(async () => {
    try {
      await loadAnalyticsData();
      renderAnalyticsStats();
      renderAnalyticsCharts();
      console.log('Analytics data refreshed automatically');
    } catch (error) {
      console.error('Error during auto-refresh:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes
}

/**
 * Stop auto-refresh
 */
function stopAnalyticsAutoRefresh() {
  if (analyticsRefreshInterval) {
    clearInterval(analyticsRefreshInterval);
    analyticsRefreshInterval = null;
  }
}

/**
 * Manual refresh analytics
 */
async function refreshAnalytics() {
  try {
    showLoadingOverlay('Refreshing analytics...');
    await loadAnalyticsData();
    await renderAnalyticsStats();
    await renderAnalyticsCharts();
    hideLoadingOverlay();
    console.log('Analytics refreshed successfully');
  } catch (error) {
    console.error('Error refreshing analytics:', error);
    hideLoadingOverlay();
    alert('Error refreshing analytics: ' + error.message);
  }
}



/**
 * Show analytics section
 */
async function showAnalytics() {
  hideAllSections();
  const analyticsSection = document.getElementById('section-analytics');
  analyticsSection.classList.remove('hidden');
  applyFadeAnimation(analyticsSection);
  
  // Update active button
  document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
  document.getElementById('btn-analytics').classList.add('active');
  
  // Load and render analytics data
  showLoadingOverlay('Loading analytics...');
  await loadAnalyticsData();
  await renderAnalyticsStats();
  await renderAnalyticsCharts();
  renderPredictiveAnalyticsUI();
  hideLoadingOverlay();
  
  // Start auto-refresh
  startAnalyticsAutoRefresh();
}

/**
 * Toggle Predictive Analytics section visibility
 */
function togglePredictiveAnalytics() {
  const content = document.getElementById('predictive-content');
  const icon = document.getElementById('predictive-toggle-icon');
  
  if (!content || !icon) return;
  
  const isCollapsed = content.classList.contains('collapsed');
  
  if (isCollapsed) {
    // Expand
    content.classList.remove('collapsed');
    content.classList.add('expanding');
    icon.classList.remove('collapsed');
    icon.textContent = '▼';
    
    // Remove expanding class after animation
    setTimeout(() => {
      content.classList.remove('expanding');
    }, 400);
  } else {
    // Collapse
    content.classList.add('collapsing');
    icon.classList.add('collapsed');
    icon.textContent = '▶';
    
    // Add collapsed class after animation starts
    setTimeout(() => {
      content.classList.add('collapsed');
      content.classList.remove('collapsing');
    }, 50);
  }
}

// Event listeners for analytics
document.addEventListener('DOMContentLoaded', () => {
  // Add event listeners when analytics elements are available
  setTimeout(() => {
    const refreshBtn = document.getElementById('btn-refresh-analytics');
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', refreshAnalytics);
    }
  }, 1000);
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  stopAnalyticsAutoRefresh();
});