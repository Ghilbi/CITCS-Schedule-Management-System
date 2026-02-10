/**************************************************************
 * Analytics Module - Actionable Data Analytics
 * 
 * Provides scheduling completion tracking, gap analysis,
 * room utilization heatmaps, and prioritized action items
 * so users know exactly what to do next.
 **************************************************************/

// ==================== CONSTANTS ====================

const ANALYTICS_TIME_SLOTS = [
  "7:30 - 8:50", "8:50 - 10:10", "10:10 - 11:30", "11:30 - 12:50",
  "12:50 - 2:10", "2:10 - 3:30", "3:30 - 4:50", "4:50 - 6:10", "6:10 - 7:30"
];

const ANALYTICS_DAY_TYPES = ["MWF", "TTHS"];

// Each room has 9 time slots x 2 day types = 18 possible scheduling slots
const TOTAL_SLOTS_PER_ROOM = ANALYTICS_TIME_SLOTS.length * ANALYTICS_DAY_TYPES.length;

// Time slots at or above this % occupancy trigger warnings
const OVERLOAD_THRESHOLD_PCT = 80;

// ==================== STATE ====================

let analyticsData = {
  courses: [],
  courseOfferings: [],
  schedules: [],
  rooms: [],
  curricula: []
};

let analyticsFilter = { trimester: 'all' };
let analyticsRefreshInterval = null;
let cachedAnalytics = null;
let currentHeatmapDayType = 'MWF';

// Note: predefinedRooms is defined globally in global-variables-for-room-view-columns.js

// ==================== DATA LOADING ====================

/**
 * Build the full list of room column names (predefined + DB rooms, each with A/B variants)
 */
function getAllAvailableRooms() {
  const databaseRoomNames = analyticsData.rooms.map(room => room.name);
  const allRoomVariants = [];
  databaseRoomNames.forEach(room => {
    allRoomVariants.push(`${room} A`);
    allRoomVariants.push(`${room} B`);
  });
  return allRoomVariants;
}

/**
 * Fetch all data from backend APIs
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

// ==================== FILTERING ====================

/**
 * Return filtered copies of offerings, schedules, and courses based on the active trimester filter
 */
function getFilteredData() {
  const trimester = analyticsFilter.trimester;
  let offerings = [...analyticsData.courseOfferings];
  let schedules = [...analyticsData.schedules];
  let courses = [...analyticsData.courses];

  if (trimester !== 'all') {
    offerings = offerings.filter(o => o.trimester === trimester);
    const courseIdsInTri = new Set(
      courses.filter(c => c.trimester === trimester).map(c => c.id)
    );
    schedules = schedules.filter(s => courseIdsInTri.has(s.courseId));
    courses = courses.filter(c => c.trimester === trimester);
  }

  return { offerings, schedules, courses };
}

// ==================== ANALYSIS: OFFERING STATUS ====================

/**
 * Classify each offering into one of three states:
 * - fullyScheduled: has a room assignment (schedule with col > 0)
 * - needsRoom: scheduled in Section View (col = 0) but no room assigned
 * - unscheduled: no schedule entry at all
 */
function analyzeOfferingStatus(offerings, schedules) {
  const result = {
    fullyScheduled: [],
    needsRoom: [],
    unscheduled: []
  };

  offerings.forEach(offering => {
    // Find schedules matching this offering's course, type, and section
    const matching = schedules.filter(s =>
      s.courseId === offering.courseId &&
      s.unitType === offering.type &&
      (s.section === offering.section || s.section2 === offering.section)
    );

    const hasRoom = matching.some(s => s.col > 0);
    const hasSection = matching.some(s => s.col === 0);

    // Enrich with course info for display
    const course = analyticsData.courses.find(c => c.id === offering.courseId);
    const enriched = {
      ...offering,
      subject: course?.subject || 'Unknown',
      degree: course?.degree || offering.degree || 'Unknown',
      yearLevel: course?.year_level || 'Unknown',
      courseTrimester: course?.trimester || offering.trimester
    };

    if (hasRoom) {
      result.fullyScheduled.push(enriched);
    } else if (hasSection) {
      result.needsRoom.push(enriched);
    } else {
      result.unscheduled.push(enriched);
    }
  });

  return result;
}

// ==================== ANALYSIS: ROOM UTILIZATION ====================

/**
 * Calculate per-room utilization: what percentage of the 18 possible
 * time slots (9 times x 2 day types) are occupied for each room column.
 */
function analyzeRoomUtilization(schedules) {
  const allRooms = getAllAvailableRooms();
  const roomSchedules = schedules.filter(s => s.col > 0);
  const roomStats = {};

  allRooms.forEach((roomName, index) => {
    const col = index + 1;
    const slotsUsed = new Set();
    roomSchedules
      .filter(s => s.col === col)
      .forEach(s => slotsUsed.add(`${s.dayType}|${s.time}`));

    roomStats[roomName] = {
      col,
      occupied: slotsUsed.size,
      total: TOTAL_SLOTS_PER_ROOM,
      utilization: Math.round((slotsUsed.size / TOTAL_SLOTS_PER_ROOM) * 100),
      slots: slotsUsed
    };
  });

  return roomStats;
}

// ==================== ANALYSIS: TIME SLOT LOAD ====================

/**
 * For each (dayType, time) combination, calculate what percentage
 * of room columns are occupied. Identifies overloaded time slots.
 */
function analyzeTimeSlotLoad(schedules) {
  const allRooms = getAllAvailableRooms();
  const totalCols = allRooms.length;
  const roomSchedules = schedules.filter(s => s.col > 0);
  const slotLoad = {};

  ANALYTICS_DAY_TYPES.forEach(dayType => {
    ANALYTICS_TIME_SLOTS.forEach(time => {
      const key = `${dayType}|${time}`;
      const usedCols = new Set();
      roomSchedules
        .filter(s => s.dayType === dayType && s.time === time)
        .forEach(s => usedCols.add(s.col));

      slotLoad[key] = {
        dayType,
        time,
        occupied: usedCols.size,
        total: totalCols,
        load: totalCols > 0 ? Math.round((usedCols.size / totalCols) * 100) : 0
      };
    });
  });

  return slotLoad;
}

// ==================== ANALYSIS: LEC/LAB PAIRING ====================

/**
 * For courses with unit_category "Lec/Lab", verify that each section
 * has both a Lec and Lab offering. Report any missing pairs.
 */
function analyzeLecLabPairing(offerings) {
  const lecLabCourses = analyticsData.courses.filter(c => c.unit_category === 'Lec/Lab');
  const missing = [];

  lecLabCourses.forEach(course => {
    const courseOfferings = offerings.filter(o => o.courseId === course.id);

    // Group by section
    const bySec = {};
    courseOfferings.forEach(o => {
      if (!bySec[o.section]) bySec[o.section] = {};
      bySec[o.section][o.type] = o;
    });

    // Check each section for both Lec and Lab
    Object.entries(bySec).forEach(([section, types]) => {
      if (!types['Lec'] && types['Lab']) {
        missing.push({
          course: course.subject,
          degree: course.degree,
          section,
          missing: 'Lec',
          has: 'Lab'
        });
      } else if (types['Lec'] && !types['Lab']) {
        missing.push({
          course: course.subject,
          degree: course.degree,
          section,
          missing: 'Lab',
          has: 'Lec'
        });
      }
    });
  });

  return missing;
}

// ==================== ANALYSIS: ACTION ITEMS ====================

/**
 * Generate prioritized, actionable recommendations based on all analytics.
 * Each action item includes severity, what's wrong, and what to do about it.
 */
function generateActionItems(offeringStatus, roomUtilization, timeSlotLoad, missingPairs) {
  const actions = [];

  // --- CRITICAL: Unscheduled offerings ---
  if (offeringStatus.unscheduled.length > 0) {
    const byDeg = {};
    offeringStatus.unscheduled.forEach(o => {
      byDeg[o.degree] = (byDeg[o.degree] || 0) + 1;
    });
    const breakdown = Object.entries(byDeg).map(([d, c]) => `${d}: ${c}`).join(', ');
    actions.push({
      severity: 'critical',
      title: `${offeringStatus.unscheduled.length} course offering(s) have no schedule assigned`,
      detail: `Breakdown by program: ${breakdown}`,
      action: 'Go to Section View and assign time slots for these offerings.'
    });
  }

  // --- CRITICAL: Missing Lec/Lab pairs ---
  if (missingPairs.length > 0) {
    const names = [...new Set(
      missingPairs.map(p => `${p.course} Sec ${p.section} (needs ${p.missing})`)
    )].slice(0, 5);
    actions.push({
      severity: 'critical',
      title: `${missingPairs.length} Lec/Lab course section(s) missing complementary offerings`,
      detail: names.join(' | ') + (missingPairs.length > 5 ? ' | ...' : ''),
      action: 'Go to Course Offerings and create the missing Lec or Lab offerings.'
    });
  }

  // --- WARNING: Needs room assignment ---
  if (offeringStatus.needsRoom.length > 0) {
    const byDeg = {};
    offeringStatus.needsRoom.forEach(o => {
      byDeg[o.degree] = (byDeg[o.degree] || 0) + 1;
    });
    const breakdown = Object.entries(byDeg).map(([d, c]) => `${d}: ${c}`).join(', ');
    actions.push({
      severity: 'warning',
      title: `${offeringStatus.needsRoom.length} offering(s) need room assignment`,
      detail: `Scheduled in Section View but no room assigned yet. ${breakdown}`,
      action: 'Go to Room View and assign rooms to these offerings.'
    });
  }

  // --- WARNING: Overloaded time slots ---
  const overloaded = Object.values(timeSlotLoad).filter(s => s.load >= OVERLOAD_THRESHOLD_PCT);
  if (overloaded.length > 0) {
    const slotList = overloaded
      .sort((a, b) => b.load - a.load)
      .slice(0, 3)
      .map(s => `${s.dayType} ${s.time} (${s.load}%)`)
      .join(', ');
    actions.push({
      severity: 'warning',
      title: `${overloaded.length} time slot(s) are ${OVERLOAD_THRESHOLD_PCT}%+ occupied`,
      detail: `Most loaded: ${slotList}${overloaded.length > 3 ? ', ...' : ''}`,
      action: 'Schedule new offerings in less busy time slots to balance the load.'
    });
  }

  // --- WARNING: Fully booked rooms ---
  const fullRooms = Object.entries(roomUtilization).filter(([_, s]) => s.utilization >= 100);
  if (fullRooms.length > 0) {
    const roomNames = fullRooms.slice(0, 5).map(([n]) => n).join(', ');
    actions.push({
      severity: 'warning',
      title: `${fullRooms.length} room(s) are 100% booked`,
      detail: `Fully booked: ${roomNames}${fullRooms.length > 5 ? ', ...' : ''}`,
      action: 'These rooms cannot accept more schedules. Use other available rooms.'
    });
  }

  // --- SUGGESTION: Underutilized rooms ---
  const underutil = Object.entries(roomUtilization)
    .filter(([_, s]) => s.occupied > 0 && s.utilization <= 20)
    .sort((a, b) => a[1].utilization - b[1].utilization);
  if (underutil.length > 0) {
    const roomList = underutil.slice(0, 5).map(([n, s]) => `${n} (${s.utilization}%)`).join(', ');
    actions.push({
      severity: 'suggestion',
      title: `${underutil.length} room(s) are underutilized (20% or less)`,
      detail: `Low usage: ${roomList}${underutil.length > 5 ? ', ...' : ''}`,
      action: 'Prioritize these rooms when making new room assignments.'
    });
  }

  // --- SUGGESTION: Empty rooms ---
  const emptyRooms = Object.entries(roomUtilization).filter(([_, s]) => s.occupied === 0);
  if (emptyRooms.length > 0) {
    actions.push({
      severity: 'suggestion',
      title: `${emptyRooms.length} room(s) have no schedules at all`,
      detail: 'These rooms are completely available for scheduling.',
      action: 'Direct new room assignments to these empty rooms first.'
    });
  }

  // --- SUGGESTION: Recommended time slots for remaining unscheduled ---
  const leastLoaded = Object.values(timeSlotLoad)
    .filter(s => s.load < 30)
    .sort((a, b) => a.load - b.load);
  if (leastLoaded.length > 0 && (offeringStatus.unscheduled.length > 0 || offeringStatus.needsRoom.length > 0)) {
    const slotList = leastLoaded.slice(0, 4).map(s => `${s.dayType} ${s.time} (${s.load}%)`).join(', ');
    actions.push({
      severity: 'suggestion',
      title: 'Recommended time slots for new schedules',
      detail: `Least busy slots: ${slotList}`,
      action: 'Use these low-traffic time slots when scheduling remaining offerings.'
    });
  }

  // --- SUCCESS: Everything is done ---
  const totalOfferings = offeringStatus.fullyScheduled.length +
    offeringStatus.needsRoom.length +
    offeringStatus.unscheduled.length;

  if (totalOfferings > 0 &&
      offeringStatus.unscheduled.length === 0 &&
      offeringStatus.needsRoom.length === 0 &&
      missingPairs.length === 0) {
    actions.push({
      severity: 'success',
      title: 'All course offerings are fully scheduled with rooms assigned!',
      detail: `${offeringStatus.fullyScheduled.length} offering(s) are complete.`,
      action: 'Review distribution charts below to verify balanced scheduling.'
    });
  }

  return actions;
}

// ==================== HEATMAP DATA ====================

/**
 * Build a 3D data structure: heatmap[dayType][time][roomName] = [entries...]
 * Each entry contains the course subject, section, type, and degree.
 */
function buildHeatmapData(schedules) {
  const allRooms = getAllAvailableRooms();
  const roomSchedules = schedules.filter(s => s.col > 0);
  const heatmap = {};

  ANALYTICS_DAY_TYPES.forEach(dayType => {
    heatmap[dayType] = {};
    ANALYTICS_TIME_SLOTS.forEach(time => {
      heatmap[dayType][time] = {};
      allRooms.forEach((roomName, index) => {
        const col = index + 1;
        const matching = roomSchedules.filter(
          s => s.dayType === dayType && s.time === time && s.col === col
        );
        heatmap[dayType][time][roomName] = matching.map(s => {
          const course = analyticsData.courses.find(c => c.id === s.courseId);
          return {
            subject: course?.subject || '?',
            section: s.section || '',
            type: s.unitType || '',
            degree: course?.degree || ''
          };
        });
      });
    });
  });

  return heatmap;
}

// ==================== MAIN CALCULATION ====================

/**
 * Run all analytics calculations and return a single results object.
 */
function calculateFullAnalytics() {
  const { offerings, schedules, courses } = getFilteredData();

  // Core analyses
  const offeringStatus = analyzeOfferingStatus(offerings, schedules);
  const roomUtilization = analyzeRoomUtilization(schedules);
  const timeSlotLoad = analyzeTimeSlotLoad(schedules);
  const missingPairs = analyzeLecLabPairing(offerings);
  const actionItems = generateActionItems(offeringStatus, roomUtilization, timeSlotLoad, missingPairs);

  // Key metrics
  const totalOfferings = offerings.length;
  const scheduledCount = offeringStatus.fullyScheduled.length;
  const completionPct = totalOfferings > 0
    ? Math.round((scheduledCount / totalOfferings) * 100)
    : 0;

  // Room utilization across ALL rooms (not just used ones)
  const allRoomStats = Object.values(roomUtilization);
  const avgRoomUtilization = allRoomStats.length > 0
    ? Math.round(allRoomStats.reduce((s, r) => s + r.utilization, 0) / allRoomStats.length)
    : 0;

  const overloadedCount = Object.values(timeSlotLoad)
    .filter(s => s.load >= OVERLOAD_THRESHOLD_PCT).length;

  // Progress by degree program
  const progressByDegree = {};
  offerings.forEach(o => {
    const course = analyticsData.courses.find(c => c.id === o.courseId);
    const deg = course?.degree || o.degree || 'Unknown';
    if (!progressByDegree[deg]) progressByDegree[deg] = { total: 0, scheduled: 0 };
    progressByDegree[deg].total++;
  });
  offeringStatus.fullyScheduled.forEach(o => {
    const deg = o.degree || 'Unknown';
    if (progressByDegree[deg]) progressByDegree[deg].scheduled++;
  });
  Object.keys(progressByDegree).forEach(deg => {
    const d = progressByDegree[deg];
    d.pct = d.total > 0 ? Math.round((d.scheduled / d.total) * 100) : 0;
  });

  // Distribution data for charts
  const degreeDistribution = {};
  const yearLevelDistribution = {};
  courses.forEach(c => {
    degreeDistribution[c.degree] = (degreeDistribution[c.degree] || 0) + 1;
    yearLevelDistribution[c.year_level] = (yearLevelDistribution[c.year_level] || 0) + 1;
  });

  const offeringTypeDistribution = {};
  offerings.forEach(o => {
    offeringTypeDistribution[o.type] = (offeringTypeDistribution[o.type] || 0) + 1;
  });

  const trimesterDistribution = {};
  analyticsData.courseOfferings.forEach(o => {
    trimesterDistribution[o.trimester] = (trimesterDistribution[o.trimester] || 0) + 1;
  });

  // Heatmap
  const heatmapData = buildHeatmapData(schedules);

  cachedAnalytics = {
    completionPct,
    unscheduledCount: offeringStatus.unscheduled.length,
    needsRoomCount: offeringStatus.needsRoom.length,
    avgRoomUtilization,
    missingPairsCount: missingPairs.length,
    overloadedCount,
    offeringStatus,
    roomUtilization,
    timeSlotLoad,
    missingPairs,
    actionItems,
    progressByDegree,
    degreeDistribution,
    yearLevelDistribution,
    offeringTypeDistribution,
    trimesterDistribution,
    heatmapData
  };

  return cachedAnalytics;
}

// ==================== RENDERING: ORCHESTRATOR ====================

/**
 * Render the entire analytics dashboard
 */
function renderFullAnalytics() {
  const analytics = calculateFullAnalytics();

  renderStatCards(analytics);
  renderActionItems(analytics.actionItems);
  renderRoomRankingChart(analytics.roomUtilization);
  renderRoomHeatmap(analytics.heatmapData, currentHeatmapDayType);
}

// ==================== RENDERING: STAT CARDS ====================

function renderStatCards(a) {
  document.getElementById('stat-completion-pct').textContent = a.completionPct + '%';
  document.getElementById('stat-unscheduled').textContent = a.unscheduledCount;
  document.getElementById('stat-needs-room').textContent = a.needsRoomCount;
  document.getElementById('stat-room-utilization').textContent = a.avgRoomUtilization + '%';
  document.getElementById('stat-missing-pairs').textContent = a.missingPairsCount;
  document.getElementById('stat-peak-slots').textContent = a.overloadedCount;

  // Color-code cards dynamically based on values
  applyStatCardColor('card-completion',
    a.completionPct >= 90 ? 'success' : a.completionPct >= 50 ? 'warning' : 'danger');
  applyStatCardColor('card-unscheduled',
    a.unscheduledCount === 0 ? 'success' : a.unscheduledCount <= 5 ? 'warning' : 'danger');
  applyStatCardColor('card-needs-room',
    a.needsRoomCount === 0 ? 'success' : a.needsRoomCount <= 5 ? 'warning' : 'danger');
  applyStatCardColor('card-room-util',
    a.avgRoomUtilization >= 30 ? 'success' : a.avgRoomUtilization >= 10 ? 'warning' : 'neutral');
  applyStatCardColor('card-missing-pairs',
    a.missingPairsCount === 0 ? 'success' : 'danger');
  applyStatCardColor('card-peak',
    a.overloadedCount === 0 ? 'success' : a.overloadedCount <= 2 ? 'warning' : 'danger');
}

function applyStatCardColor(cardId, status) {
  const card = document.getElementById(cardId);
  if (!card) return;
  card.classList.remove('stat-card--success', 'stat-card--warning', 'stat-card--danger', 'stat-card--neutral');
  if (status !== 'neutral') card.classList.add(`stat-card--${status}`);
}

// ==================== RENDERING: ACTION ITEMS ====================

function renderActionItems(items) {
  const container = document.getElementById('action-items-container');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="action-item action-item--suggestion">
        <div class="action-item-badge">INFO</div>
        <div class="action-item-content">
          <strong>No data available yet.</strong>
          <p class="action-item-detail">Add courses and course offerings to see actionable insights here.</p>
        </div>
      </div>`;
    return;
  }

  const severityOrder = { critical: 0, warning: 1, suggestion: 2, success: 3 };
  const sorted = [...items].sort((a, b) =>
    (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
  );

  container.innerHTML = sorted.map(item => `
    <div class="action-item action-item--${item.severity}">
      <div class="action-item-badge">${getSeverityLabel(item.severity)}</div>
      <div class="action-item-content">
        <strong>${item.title}</strong>
        <p class="action-item-detail">${item.detail}</p>
        <p class="action-item-action"><i class="dripicons-direction"></i> ${item.action}</p>
      </div>
    </div>
  `).join('');
}

function getSeverityLabel(severity) {
  const labels = {
    critical: 'CRITICAL',
    warning: 'WARNING',
    suggestion: 'TIP',
    success: 'COMPLETE'
  };
  return labels[severity] || 'INFO';
}

// ==================== RENDERING: SCHEDULING PROGRESS ====================

function renderSchedulingProgress(progressByDegree) {
  const container = document.getElementById('progress-container');
  if (!container) return;

  const entries = Object.entries(progressByDegree).sort((a, b) => b[1].total - a[1].total);

  if (entries.length === 0) {
    container.innerHTML = '<p class="analytics-empty">No course offerings data available.</p>';
    return;
  }

  container.innerHTML = entries.map(([deg, data]) => {
    const color = data.pct >= 90 ? '#10b981' : data.pct >= 50 ? '#f59e0b' : '#ef4444';
    return `
      <div class="progress-item">
        <div class="progress-label">
          <span class="progress-name">${deg}</span>
          <span class="progress-count">${data.scheduled}/${data.total} offerings (${data.pct}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${Math.max(data.pct, 2)}%; background-color: ${color};"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ==================== RENDERING: TIME SLOT LOAD CHART ====================

function renderTimeSlotLoadChart(timeSlotLoad) {
  const container = document.getElementById('chart-timeslot-load');
  if (!container) return;

  let html = '<h4>Time Slot Load Analysis</h4>';

  ANALYTICS_DAY_TYPES.forEach(dayType => {
    html += `<div class="timeslot-section"><h5 class="timeslot-day-label">${dayType}</h5><div class="chart-bars">`;

    ANALYTICS_TIME_SLOTS.forEach(time => {
      const key = `${dayType}|${time}`;
      const slot = timeSlotLoad[key];
      if (!slot) return;

      const barColor = slot.load >= 80 ? '#ef4444'
        : slot.load >= 50 ? '#f59e0b'
        : '#10b981';

      html += `
        <div class="chart-bar-item">
          <div class="chart-bar-label">${time}</div>
          <div class="chart-bar-container">
            <div class="chart-bar" style="width: ${Math.max(slot.load, 2)}%; background-color: ${barColor};"></div>
            <span class="chart-bar-value">${slot.occupied}/${slot.total} (${slot.load}%)</span>
          </div>
        </div>
      `;
    });

    html += '</div></div>';
  });

  container.innerHTML = html;
}

// ==================== RENDERING: ROOM RANKING CHART ====================

function renderRoomRankingChart(roomUtilization) {
  const container = document.getElementById('chart-room-ranking');
  if (!container) return;

  // Show ALL rooms sorted by utilization (highest first)
  const entries = Object.entries(roomUtilization)
    .sort((a, b) => b[1].utilization - a[1].utilization);

  if (entries.length === 0) {
    container.innerHTML = '<h4>Room Utilization</h4><p class="analytics-empty">No rooms available.</p>';
    return;
  }

  let html = '<h4>Room Utilization (All Rooms)</h4><div class="room-util-grid">';
  entries.forEach(([roomName, stats]) => {
    const statusClass = stats.utilization >= 80 ? 'room-util-card--high'
      : stats.utilization >= 50 ? 'room-util-card--mid'
      : stats.utilization > 0 ? 'room-util-card--low'
      : 'room-util-card--empty';

    html += `
      <div class="room-util-card ${statusClass}" title="${roomName}: ${stats.occupied}/${stats.total} slots used">
        <span class="room-util-name">${roomName}</span>
        <span class="room-util-pct">${stats.utilization}%</span>
      </div>
    `;
  });
  html += '</div>';

  container.innerHTML = html;
}

// ==================== RENDERING: ROOM HEATMAP ====================

function renderRoomHeatmap(heatmapData, dayType) {
  const container = document.getElementById('heatmap-container');
  if (!container || !heatmapData) return;

  const allRooms = getAllAvailableRooms();
  const dayData = heatmapData[dayType];
  if (!dayData) return;

  let html = '<div class="heatmap-scroll"><table class="heatmap-table"><thead><tr>';
  html += '<th class="heatmap-time-header">Time Slot</th>';
  allRooms.forEach(room => {
    html += `<th class="heatmap-room-header"><span>${room}</span></th>`;
  });
  html += '</tr></thead><tbody>';

  ANALYTICS_TIME_SLOTS.forEach(time => {
    html += `<tr><td class="heatmap-time-cell">${time}</td>`;
    allRooms.forEach(room => {
      const entries = dayData[time]?.[room] || [];
      const count = entries.length;
      let cellClass = 'heatmap-cell heatmap-cell--empty';
      let tooltip = 'Available';
      let cellText = '';

      if (count > 0) {
        cellClass = count >= 2
          ? 'heatmap-cell heatmap-cell--multi'
          : 'heatmap-cell heatmap-cell--occupied';
        tooltip = entries.map(e => `${e.subject} (${e.section}) ${e.type}`).join('\n');
        cellText = entries[0].subject.length > 7
          ? entries[0].subject.substring(0, 6) + '..'
          : entries[0].subject;
      }

      html += `<td class="${cellClass}" title="${tooltip}">${cellText}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';

  // Legend
  html += `
    <div class="heatmap-legend">
      <span class="heatmap-legend-item"><span class="heatmap-swatch heatmap-swatch--empty"></span> Available</span>
      <span class="heatmap-legend-item"><span class="heatmap-swatch heatmap-swatch--occupied"></span> Occupied (1 trimester)</span>
      <span class="heatmap-legend-item"><span class="heatmap-swatch heatmap-swatch--multi"></span> Multi-trimester</span>
    </div>
  `;

  container.innerHTML = html;
}

// ==================== RENDERING: UNSCHEDULED LIST ====================

function renderUnscheduledList(offeringStatus, missingPairs) {
  const container = document.getElementById('unscheduled-container');
  if (!container) return;

  const unscheduled = offeringStatus.unscheduled;
  const needsRoom = offeringStatus.needsRoom;
  const allItems = [
    ...unscheduled.map(o => ({ ...o, status: 'Unscheduled', statusClass: 'status--critical' })),
    ...needsRoom.map(o => ({ ...o, status: 'Needs Room', statusClass: 'status--warning' }))
  ];

  let html = '';

  if (allItems.length === 0 && missingPairs.length === 0) {
    html = '<p class="analytics-empty analytics-empty--success">All offerings are fully scheduled and assigned to rooms!</p>';
  } else {
    // Offerings needing action
    if (allItems.length > 0) {
      html += `<h4 class="unscheduled-heading">Offerings Needing Action (${allItems.length})</h4>`;
      html += '<div class="unscheduled-table-wrapper"><table class="unscheduled-table"><thead><tr>';
      html += '<th>Status</th><th>Subject</th><th>Section</th><th>Type</th><th>Degree</th><th>Year</th><th>Trimester</th>';
      html += '</tr></thead><tbody>';
      allItems.forEach(item => {
        html += `<tr>
          <td><span class="status-badge ${item.statusClass}">${item.status}</span></td>
          <td>${item.subject}</td>
          <td>${item.section}</td>
          <td>${item.type}</td>
          <td>${item.degree}</td>
          <td>${item.yearLevel}</td>
          <td>${item.courseTrimester}</td>
        </tr>`;
      });
      html += '</tbody></table></div>';
    }

    // Missing Lec/Lab pairs
    if (missingPairs.length > 0) {
      html += `<h4 class="unscheduled-heading" style="margin-top: 16px;">Missing Lec/Lab Pairs (${missingPairs.length})</h4>`;
      html += '<div class="unscheduled-table-wrapper"><table class="unscheduled-table"><thead><tr>';
      html += '<th>Course</th><th>Section</th><th>Degree</th><th>Has</th><th>Missing</th>';
      html += '</tr></thead><tbody>';
      missingPairs.forEach(pair => {
        html += `<tr>
          <td>${pair.course}</td>
          <td>${pair.section}</td>
          <td>${pair.degree}</td>
          <td><span class="status-badge status--success">${pair.has}</span></td>
          <td><span class="status-badge status--critical">${pair.missing}</span></td>
        </tr>`;
      });
      html += '</tbody></table></div>';
    }
  }

  container.innerHTML = html;
}

// ==================== RENDERING: DISTRIBUTION CHARTS ====================

/**
 * Reusable bar chart renderer (CSS-based, no external library)
 */
function createBarChart(containerId, data, title, color) {
  if (!color) color = window.colorUtils ? window.colorUtils.getChartColor(0) : '#4f46e5';
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!data || Object.keys(data).length === 0) {
    container.innerHTML = `<h4>${title}</h4><p class="analytics-empty">No data available.</p>`;
    return;
  }

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
 * Reusable pie chart renderer (CSS conic-gradient, no external library)
 */
function createPieChart(containerId, data, title) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  if (total === 0) {
    container.innerHTML = `<h4>${title}</h4><div class="pie-chart-container"><div class="analytics-empty">No data available</div></div>`;
    return;
  }

  const colors = window.colorUtils
    ? window.colorUtils.chartColors
    : ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const segments = [];
  let cumPct = 0;
  Object.entries(data).forEach(([label, value], index) => {
    const pct = (value / total) * 100;
    cumPct += pct;
    segments.push({
      label,
      value,
      percentage: pct.toFixed(1),
      color: colors[index % colors.length]
    });
  });

  let currentAngle = 0;
  const gradientStops = segments.map(seg => {
    const angle = (seg.value / total) * 360;
    const stop = `${seg.color} ${currentAngle}deg ${currentAngle + angle}deg`;
    currentAngle += angle;
    return stop;
  });

  container.innerHTML = `
    <h4>${title}</h4>
    <div class="pie-chart-container">
      <div class="pie-chart" style="background: conic-gradient(${gradientStops.join(', ')});"></div>
      <div class="pie-legend">
        ${segments.map(seg => `
          <div class="pie-legend-item">
            <div class="pie-legend-color" style="background-color: ${seg.color};"></div>
            <span>${seg.label}: ${seg.value} (${seg.percentage}%)</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderDegreeDistributionChart(data) {
  const color = window.colorUtils ? window.colorUtils.getChartColor(0) : '#4f46e5';
  createBarChart('chart-degree-distribution', data, 'Courses by Degree Program', color);
}

function renderYearLevelChart(data) {
  const color = window.colorUtils ? window.colorUtils.getChartColor(3) : '#f59e0b';
  createBarChart('chart-year-level', data, 'Courses by Year Level', color);
}

function renderOfferingTypeChart(data) {
  const color = window.colorUtils ? window.colorUtils.getChartColor(1) : '#06b6d4';
  createBarChart('chart-offering-type', data, 'Offerings by Type', color);
}

function renderTrimesterDistributionChart(data) {
  createPieChart('chart-trimester-distribution', data, 'Offerings by Trimester');
}

// ==================== UI INTERACTION ====================

/**
 * Toggle collapsible analytics panels
 */
function toggleAnalyticsPanel(panelName) {
  const body = document.getElementById(`body-${panelName}`);
  const icon = document.getElementById(`toggle-icon-${panelName}`);
  if (!body) return;

  body.classList.toggle('collapsed');
  if (icon) {
    icon.style.transform = body.classList.contains('collapsed') ? 'rotate(-90deg)' : 'rotate(0deg)';
  }
}

/**
 * Switch heatmap between MWF and TTHS views
 */
function switchHeatmapDay(dayType) {
  currentHeatmapDayType = dayType;
  document.querySelectorAll('.heatmap-tab').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-daytype') === dayType);
  });
  if (cachedAnalytics) {
    renderRoomHeatmap(cachedAnalytics.heatmapData, dayType);
  }
}

/**
 * Set the trimester filter and re-render all analytics
 */
function setAnalyticsTrimesterFilter(trimester) {
  analyticsFilter.trimester = trimester;
  document.querySelectorAll('.analytics-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-trimester') === trimester);
  });
  renderFullAnalytics();
}

// ==================== LIFECYCLE ====================

/**
 * Initialize analytics on first load
 */
async function initializeAnalytics() {
  try {
    showLoadingOverlay('Loading analytics data...');
    await loadAnalyticsData();
    renderFullAnalytics();
    startAnalyticsAutoRefresh();
    hideLoadingOverlay();
  } catch (error) {
    console.error('Error initializing analytics:', error);
    hideLoadingOverlay();
    alert('Error loading analytics data: ' + error.message);
  }
}

/**
 * Show the analytics section (called from navigation)
 */
async function showAnalytics() {
  hideAllSections();
  const section = document.getElementById('section-analytics');
  section.classList.remove('hidden');
  applyFadeAnimation(section);

  document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
  document.getElementById('btn-analytics').classList.add('active');

  showLoadingOverlay('Loading analytics...');
  await loadAnalyticsData();
  renderFullAnalytics();
  hideLoadingOverlay();

  startAnalyticsAutoRefresh();
}

/**
 * Manual refresh triggered by the Refresh button
 */
async function refreshAnalytics() {
  try {
    showLoadingOverlay('Refreshing analytics...');
    await loadAnalyticsData();
    renderFullAnalytics();
    hideLoadingOverlay();
    console.log('Analytics refreshed successfully');
  } catch (error) {
    console.error('Error refreshing analytics:', error);
    hideLoadingOverlay();
    alert('Error refreshing analytics: ' + error.message);
  }
}

/**
 * Auto-refresh analytics every 5 minutes
 */
function startAnalyticsAutoRefresh() {
  if (analyticsRefreshInterval) clearInterval(analyticsRefreshInterval);
  analyticsRefreshInterval = setInterval(async () => {
    try {
      await loadAnalyticsData();
      renderFullAnalytics();
      console.log('Analytics data refreshed automatically');
    } catch (err) {
      console.error('Analytics auto-refresh error:', err);
    }
  }, 5 * 60 * 1000);
}

function stopAnalyticsAutoRefresh() {
  if (analyticsRefreshInterval) {
    clearInterval(analyticsRefreshInterval);
    analyticsRefreshInterval = null;
  }
}

// ==================== EVENT LISTENERS ====================

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const refreshBtn = document.getElementById('btn-refresh-analytics');
    if (refreshBtn) refreshBtn.addEventListener('click', refreshAnalytics);

    // Trimester filter buttons
    document.querySelectorAll('.analytics-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setAnalyticsTrimesterFilter(btn.getAttribute('data-trimester'));
      });
    });
  }, 1000);
});

window.addEventListener('beforeunload', () => stopAnalyticsAutoRefresh());
