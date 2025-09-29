/**************************************************************
 * Dashboard Module - Statistics and Analytics
 **************************************************************/

// Dashboard data cache
let dashboardData = {
  courses: [],
  courseOfferings: [],
  schedules: [],
  rooms: [],
  curricula: []
};

// Dashboard refresh interval (5 minutes)
let dashboardRefreshInterval = null;

/**
 * Initialize Dashboard
 */
async function initializeDashboard() {
  try {
    showLoadingOverlay('Loading dashboard data...');
    await loadDashboardData();
    renderDashboardStats();
    renderDashboardCharts();
    startDashboardAutoRefresh();
    hideLoadingOverlay();
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    hideLoadingOverlay();
    alert('Error loading dashboard data: ' + error.message);
  }
}

/**
 * Load all dashboard data
 */
async function loadDashboardData() {
  try {
    const [courses, courseOfferings, schedules, rooms, curricula] = await Promise.all([
      apiGet('courses', true),
      apiGet('course_offerings', true),
      apiGet('schedules', true),
      apiGet('rooms', true),
      apiGet('curricula', true)
    ]);
    
    dashboardData = {
      courses: courses || [],
      courseOfferings: courseOfferings || [],
      schedules: schedules || [],
      rooms: rooms || [],
      curricula: curricula || []
    };
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    throw error;
  }
}

/**
 * Calculate dashboard statistics
 */
async function calculateDashboardStats() {
  const stats = {
    totalCourses: dashboardData.courses.length,
    totalCourseOfferings: dashboardData.courseOfferings.length,
    totalScheduledSessions: dashboardData.schedules.length,
    totalRooms: dashboardData.rooms.length,
    totalCurricula: dashboardData.curricula.length
  };

  // Course statistics by degree
  stats.coursesByDegree = {};
  dashboardData.courses.forEach(course => {
    stats.coursesByDegree[course.degree] = (stats.coursesByDegree[course.degree] || 0) + 1;
  });

  // Course offerings by trimester
  stats.offeringsByTrimester = {};
  dashboardData.courseOfferings.forEach(offering => {
    stats.offeringsByTrimester[offering.trimester] = (stats.offeringsByTrimester[offering.trimester] || 0) + 1;
  });

  // Course offerings by type
  stats.offeringsByType = {};
  dashboardData.courseOfferings.forEach(offering => {
    stats.offeringsByType[offering.type] = (stats.offeringsByType[offering.type] || 0) + 1;
  });

  // Room utilization - count schedules that have room assignments (col > 0)
  stats.roomUtilization = {};
  const allColumns = await getAllRoomColumns();
  dashboardData.schedules.forEach(schedule => {
    if (schedule.col > 0) { // Room View entries have col > 0
      // Get room name from allColumns array (col is 1-indexed)
      const roomName = allColumns[schedule.col - 1];
      if (roomName) {
        stats.roomUtilization[roomName] = (stats.roomUtilization[roomName] || 0) + 1;
      }
    }
  });

  // Units distribution
  stats.unitDistribution = {};
  dashboardData.courses.forEach(course => {
    const units = course.units || '0';
    stats.unitDistribution[units] = (stats.unitDistribution[units] || 0) + 1;
  });

  // Year level distribution
  stats.yearLevelDistribution = {};
  dashboardData.courses.forEach(course => {
    stats.yearLevelDistribution[course.year_level] = (stats.yearLevelDistribution[course.year_level] || 0) + 1;
  });

  return stats;
}

/**
 * Render dashboard statistics cards
 */
async function renderDashboardStats() {
  const stats = await calculateDashboardStats();
  
  // Update stat cards
  document.getElementById('stat-total-courses').textContent = stats.totalCourses;
  document.getElementById('stat-total-offerings').textContent = stats.totalCourseOfferings;
  document.getElementById('stat-total-schedules').textContent = stats.totalScheduledSessions;
  document.getElementById('stat-total-rooms').textContent = stats.totalRooms;
  document.getElementById('stat-total-curricula').textContent = stats.totalCurricula;
  
  // Calculate utilization percentage
  const utilizationPercentage = stats.totalRooms > 0 ? 
    Math.round((Object.keys(stats.roomUtilization).length / stats.totalRooms) * 100) : 0;
  document.getElementById('stat-room-utilization').textContent = `${utilizationPercentage}%`;
}

/**
 * Render dashboard charts
 */
async function renderDashboardCharts() {
  const stats = await calculateDashboardStats();
  
  renderDegreeDistributionChart(stats.coursesByDegree);
  renderTrimesterDistributionChart(stats.offeringsByTrimester);
  renderOfferingTypeChart(stats.offeringsByType);
  renderRoomUtilizationChart(stats.roomUtilization);
  renderYearLevelChart(stats.yearLevelDistribution);
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
 * Start auto-refresh for dashboard
 */
function startDashboardAutoRefresh() {
  // Clear existing interval
  if (dashboardRefreshInterval) {
    clearInterval(dashboardRefreshInterval);
  }
  
  // Set new interval (5 minutes)
  dashboardRefreshInterval = setInterval(async () => {
    try {
      await loadDashboardData();
      renderDashboardStats();
      renderDashboardCharts();
      console.log('Dashboard data refreshed automatically');
    } catch (error) {
      console.error('Error during auto-refresh:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes
}

/**
 * Stop auto-refresh
 */
function stopDashboardAutoRefresh() {
  if (dashboardRefreshInterval) {
    clearInterval(dashboardRefreshInterval);
    dashboardRefreshInterval = null;
  }
}

/**
 * Manual refresh dashboard
 */
async function refreshDashboard() {
  try {
    showLoadingOverlay('Refreshing dashboard...');
    await loadDashboardData();
    await renderDashboardStats();
    await renderDashboardCharts();
    hideLoadingOverlay();
    console.log('Dashboard refreshed successfully');
  } catch (error) {
    console.error('Error refreshing dashboard:', error);
    hideLoadingOverlay();
    alert('Error refreshing dashboard: ' + error.message);
  }
}



/**
 * Show dashboard section
 */
async function showDashboard() {
  hideAllSections();
  const dashboardSection = document.getElementById('section-dashboard');
  dashboardSection.classList.remove('hidden');
  applyFadeAnimation(dashboardSection);
  
  // Update active button
  document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
  document.getElementById('btn-dashboard').classList.add('active');
  
  // Load and render dashboard data
  showLoadingOverlay('Loading dashboard...');
  await loadDashboardData();
  await renderDashboardStats();
  await renderDashboardCharts();
  hideLoadingOverlay();
  
  // Start auto-refresh
  startDashboardAutoRefresh();
}

// Event listeners for dashboard
document.addEventListener('DOMContentLoaded', () => {
  // Add event listeners when dashboard elements are available
  setTimeout(() => {
    const refreshBtn = document.getElementById('btn-refresh-dashboard');
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', refreshDashboard);
    }
  }, 1000);
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  stopDashboardAutoRefresh();
});