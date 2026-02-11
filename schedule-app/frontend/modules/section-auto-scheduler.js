/**************************************************************
 * SECTION AUTO SCHEDULER
 **************************************************************/

const SECTION_AUTO_SCHEDULER_TIMES = [
  "7:30 - 8:50",
  "8:50 - 10:10",
  "10:10 - 11:30",
  "11:30 - 12:50",
  "12:50 - 2:10",
  "2:10 - 3:30",
  "3:30 - 4:50",
  "4:50 - 6:10",
  "6:10 - 7:30"
];
const SECTION_AUTO_SCHEDULER_DAYS = ["MWF", "TTHS"];
const ROOM_PENALTY_RARE = 35;
const ROOM_PENALTY_VERY_RARE = 70;

function openSectionAutoScheduleModal(section) {
  const modal = document.getElementById("modal-section-autoschedule");
  if (!modal) return;

  document.getElementById("section-autoschedule-section").value = section;
  document.getElementById("section-autoschedule-section-label").textContent = section;
  document.getElementById("section-autoschedule-group-a").checked = true;
  showModal(modal);
}

async function runSectionAutoScheduler() {
  const section = document.getElementById("section-autoschedule-section").value;
  if (!section) {
    showConflictNotification("No section selected for auto-scheduling.");
    return;
  }

  const selectedGroupRadio = document.querySelector('input[name="sectionAutoScheduleRoomGroup"]:checked');
  const selectedRoomGroup = selectedGroupRadio ? selectedGroupRadio.value : "A";
  const button = document.getElementById("btn-generate-section-autoschedule");
  button.disabled = true;
  button.textContent = "Generating...";

  try {
    clearApiCache("schedules");
    const [schedules, courses, offerings, rooms] = await Promise.all([
      apiGet("schedules", true),
      apiGet("courses"),
      apiGet("course_offerings"),
      apiGet("rooms")
    ]);

    const sectionState = getSectionViewState();
    const relevantOfferings = getRelevantSectionOfferings(section, sectionState, offerings, courses);

    if (relevantOfferings.length === 0) {
      showConflictNotification(`No offerings found for section "${section}" in ${sectionState.trimester}.`);
      return;
    }

    const scheduleContext = buildScheduleContext(schedules, courses, offerings, sectionState);
    const allColumns = await getAllRoomColumns();
    const roomTypeByName = new Map(
      rooms.map(room => [room.name, normalizeRoomType(room.type)])
    );
    const candidateRooms = allColumns
      .map((name, idx) => {
        const baseRoomName = name.replace(/ (A|B)$/, "");
        return {
          name,
          col: idx + 1,
          baseName: baseRoomName,
          type: roomTypeByName.get(baseRoomName) || "BOTH"
        };
      })
      .filter(room => room.name.endsWith(` ${selectedRoomGroup}`));

    if (candidateRooms.length === 0) {
      showConflictNotification(`No rooms found in Group ${selectedRoomGroup}.`);
      return;
    }

    const existingCourseTypeSet = new Set(
      scheduleContext.sectionEntries
        .filter(entry => entry.section === section || entry.section2 === section)
        .map(entry => `${entry.courseId}|${entry.unitType}`)
    );

    const pendingOfferings = relevantOfferings.filter(off => !existingCourseTypeSet.has(`${off.courseId}|${off.type}`));
    if (pendingOfferings.length === 0) {
      showConflictNotification(`All offerings for section "${section}" are already scheduled.`);
      return;
    }

    const pendingSorted = pendingOfferings
      .map(off => ({
        ...off,
        course: courses.find(c => c.id === off.courseId)
      }))
      .sort((a, b) => {
        const unitA = a.type === "Lab" ? 0 : 1;
        const unitB = b.type === "Lab" ? 0 : 1;
        if (unitA !== unitB) return unitA - unitB;
        return (a.course?.subject || "").localeCompare(b.course?.subject || "");
      });

    const schedulingTasks = buildSchedulingTasks(pendingSorted);
    const newEntries = [];
    const unscheduled = [];

    for (const task of schedulingTasks) {
      if (task.kind === "paired") {
        const assignment = findBestPairedAssignment({
          section,
          lecOffering: task.lecOffering,
          labOffering: task.labOffering,
          candidateRooms,
          scheduleContext
        });

        if (!assignment) {
          unscheduled.push(`${task.lecOffering.course?.subject || "Unknown"} (Lec/Lab pair)`);
          continue;
        }

        const lecRoomId = getRoomIdFromColumn(assignment.lecRoomCol, allColumns, rooms);
        const labRoomId = getRoomIdFromColumn(assignment.labRoomCol, allColumns, rooms);

        const lecSectionEntry = {
          dayType: assignment.dayType,
          time: assignment.lecTime,
          col: 0,
          roomId: null,
          courseId: task.lecOffering.courseId,
          color: "#e9f1fb",
          unitType: task.lecOffering.type,
          section,
          section2: null
        };
        const lecRoomEntry = {
          ...lecSectionEntry,
          col: assignment.lecRoomCol,
          roomId: lecRoomId
        };

        const labSectionEntry = {
          dayType: assignment.dayType,
          time: assignment.labTime,
          col: 0,
          roomId: null,
          courseId: task.labOffering.courseId,
          color: "#e9f1fb",
          unitType: task.labOffering.type,
          section,
          section2: null
        };
        const labRoomEntry = {
          ...labSectionEntry,
          col: assignment.labRoomCol,
          roomId: labRoomId
        };

        await apiPost("schedules", lecSectionEntry);
        await apiPost("schedules", lecRoomEntry);
        await apiPost("schedules", labSectionEntry);
        await apiPost("schedules", labRoomEntry);

        scheduleContext.sectionEntries.push(lecSectionEntry, labSectionEntry);
        scheduleContext.roomEntries.push(lecRoomEntry, labRoomEntry);
        newEntries.push(`${task.lecOffering.course?.subject || "Unknown"} (Lec) - ${assignment.dayType} ${assignment.lecTime}`);
        newEntries.push(`${task.labOffering.course?.subject || "Unknown"} (Lab) - ${assignment.dayType} ${assignment.labTime}`);
        continue;
      }

      const assignment = findBestAssignment({
        section,
        offering: task.offering,
        candidateRooms,
        scheduleContext
      });

      if (!assignment) {
        unscheduled.push(`${task.offering.course?.subject || "Unknown"} (${task.offering.type})`);
        continue;
      }

      const roomId = getRoomIdFromColumn(assignment.roomCol, allColumns, rooms);
      const sectionEntry = {
        dayType: assignment.dayType,
        time: assignment.time,
        col: 0,
        roomId: null,
        courseId: task.offering.courseId,
        color: "#e9f1fb",
        unitType: task.offering.type,
        section,
        section2: null
      };
      const roomEntry = {
        ...sectionEntry,
        col: assignment.roomCol,
        roomId
      };

      await apiPost("schedules", sectionEntry);
      await apiPost("schedules", roomEntry);

      scheduleContext.sectionEntries.push(sectionEntry);
      scheduleContext.roomEntries.push(roomEntry);
      newEntries.push(`${task.offering.course?.subject || "Unknown"} (${task.offering.type}) - ${assignment.dayType} ${assignment.time}`);
    }

    hideModal(document.getElementById("modal-section-autoschedule"));
    await renderSectionViewTables();
    await renderRoomViewTables();
    await forceValidateAllComplementary();

    if (newEntries.length === 0) {
      showConflictNotification(`Unable to auto-schedule section "${section}" with current constraints.`);
      return;
    }

    if (unscheduled.length > 0) {
      showConflictNotification(
        `Generated ${newEntries.length} schedule(s) for "${section}".\n` +
        `Unscheduled due to constraints: ${unscheduled.join(", ")}`
      );
    } else {
      showConflictNotification(`Generated ${newEntries.length} schedule(s) for "${section}" successfully.`);
    }
  } catch (error) {
    console.error("Error in section auto-scheduler:", error);
    showConflictNotification("Failed to generate section schedule. Please try again.");
  } finally {
    button.disabled = false;
    button.textContent = "Generate";
  }
}

function getRelevantSectionOfferings(section, sectionState, offerings, courses) {
  const isInternationalView = sectionState.yearLevel === "International";
  return offerings.filter(off => {
    if (off.section !== section) return false;
    if (off.trimester !== sectionState.trimester) return false;
    if (isInternationalView) return true;
    const course = courses.find(c => c.id === off.courseId);
    return course && course.year_level === sectionState.yearLevel;
  });
}

function buildScheduleContext(schedules, courses, offerings, sectionState) {
  const isInternational = (value) => value && value.startsWith("INTERNATIONAL ");

  const isInSelectedTrimester = (entry) => {
    const course = courses.find(c => c.id === entry.courseId);
    if (course && course.trimester === sectionState.trimester) {
      return true;
    }
    if (isInternational(entry.section) || isInternational(entry.section2)) {
      return offerings.some(off =>
        off.courseId === entry.courseId &&
        off.type === entry.unitType &&
        off.trimester === sectionState.trimester &&
        ((entry.section && off.section === entry.section) || (entry.section2 && off.section === entry.section2))
      );
    }
    return false;
  };

  const relevant = schedules.filter(isInSelectedTrimester);
  return {
    sectionEntries: relevant.filter(s => s.col === 0),
    roomEntries: relevant.filter(s => s.col > 0)
  };
}

function buildSchedulingTasks(pendingSorted) {
  const tasks = [];
  const consumed = new Set();

  for (const offering of pendingSorted) {
    if (consumed.has(offering.id)) continue;

    const unitCategory = normalizeUnitCategory(offering.course?.unit_category);
    if (unitCategory === "LECLAB") {
      const counterpartType = offering.type === "Lec" ? "Lab" : (offering.type === "Lab" ? "Lec" : null);
      const counterpart = counterpartType
        ? pendingSorted.find(o =>
            !consumed.has(o.id) &&
            o.id !== offering.id &&
            o.courseId === offering.courseId &&
            o.type === counterpartType
          )
        : null;

      if (counterpart) {
        const lecOffering = offering.type === "Lec" ? offering : counterpart;
        const labOffering = offering.type === "Lab" ? offering : counterpart;
        tasks.push({
          kind: "paired",
          lecOffering,
          labOffering
        });
        consumed.add(lecOffering.id);
        consumed.add(labOffering.id);
        continue;
      }
    }

    tasks.push({
      kind: "single",
      offering
    });
    consumed.add(offering.id);
  }

  return tasks;
}

function findBestAssignment({ section, offering, candidateRooms, scheduleContext }) {
  let best = null;
  const shuffledDays = shuffleArray(SECTION_AUTO_SCHEDULER_DAYS);
  const shuffledTimeIndexes = shuffleArray(
    SECTION_AUTO_SCHEDULER_TIMES.map((_, idx) => idx)
  );

  for (const dayType of shuffledDays) {
    for (const timeIdx of shuffledTimeIndexes) {
      const time = SECTION_AUTO_SCHEDULER_TIMES[timeIdx];

      if (isSectionTimeOccupied(scheduleContext.sectionEntries, section, dayType, time)) {
        continue;
      }

      if (createsThreeConsecutive(scheduleContext.sectionEntries, section, dayType, timeIdx)) {
        continue;
      }

      for (const room of candidateRooms) {
        if (isRoomTimeOccupied(scheduleContext.roomEntries, dayType, time, room.col)) {
          continue;
        }

        const roomPenalty = getRoomCompatibilityPenalty(offering, room.type);
        if (roomPenalty === null) {
          continue;
        }

        const roomUsagePenalty = getRoomUsagePenalty(scheduleContext.roomEntries, room.col);
        const randomnessPenalty = Math.random() * 4;
        const score =
          computeAssignmentScore(scheduleContext.sectionEntries, section, dayType, timeIdx) +
          roomPenalty +
          roomUsagePenalty +
          randomnessPenalty;
        if (!best || score < best.score) {
          best = {
            dayType,
            time,
            roomCol: room.col,
            score
          };
        }
      }
    }
  }

  return best;
}

function findBestPairedAssignment({ section, lecOffering, labOffering, candidateRooms, scheduleContext }) {
  const strategyPasses = [
    { allowThreeConsecutive: false, allowLabInBoth: false, strategyPenalty: 0 },
    { allowThreeConsecutive: true, allowLabInBoth: false, strategyPenalty: 12 },
    { allowThreeConsecutive: true, allowLabInBoth: true, strategyPenalty: 36 }
  ];

  for (const strategy of strategyPasses) {
    let best = null;
    const shuffledDays = shuffleArray(SECTION_AUTO_SCHEDULER_DAYS);
    const shuffledStartIndexes = shuffleArray(
      SECTION_AUTO_SCHEDULER_TIMES.slice(0, -1).map((_, idx) => idx)
    );

    for (const dayType of shuffledDays) {
      for (const startIdx of shuffledStartIndexes) {
        const secondIdx = startIdx + 1;
        const firstTime = SECTION_AUTO_SCHEDULER_TIMES[startIdx];
        const secondTime = SECTION_AUTO_SCHEDULER_TIMES[secondIdx];

        if (
          isSectionTimeOccupied(scheduleContext.sectionEntries, section, dayType, firstTime) ||
          isSectionTimeOccupied(scheduleContext.sectionEntries, section, dayType, secondTime)
        ) {
          continue;
        }

        if (
          !strategy.allowThreeConsecutive &&
          createsThreeConsecutiveWithCandidates(scheduleContext.sectionEntries, section, dayType, [startIdx, secondIdx])
        ) {
          continue;
        }

        const placementOrders = [
          {
            firstOffering: lecOffering,
            secondOffering: labOffering,
            firstType: "lec",
            secondType: "lab"
          },
          {
            firstOffering: labOffering,
            secondOffering: lecOffering,
            firstType: "lab",
            secondType: "lec"
          }
        ];

        for (const order of placementOrders) {
          for (const firstRoom of candidateRooms) {
            if (isRoomTimeOccupied(scheduleContext.roomEntries, dayType, firstTime, firstRoom.col)) {
              continue;
            }
            const firstPenalty = getRoomCompatibilityPenalty(order.firstOffering, firstRoom.type, {
              allowLabInBoth: strategy.allowLabInBoth
            });
            if (firstPenalty === null) continue;

            for (const secondRoom of candidateRooms) {
              if (isRoomTimeOccupied(scheduleContext.roomEntries, dayType, secondTime, secondRoom.col)) {
                continue;
              }
              const secondPenalty = getRoomCompatibilityPenalty(order.secondOffering, secondRoom.type, {
                allowLabInBoth: strategy.allowLabInBoth
              });
              if (secondPenalty === null) continue;

              const baseScore =
                computeAssignmentScore(scheduleContext.sectionEntries, section, dayType, startIdx) +
                computeAssignmentScore(scheduleContext.sectionEntries, section, dayType, secondIdx);
              const roomUsagePenalty =
                getRoomUsagePenalty(scheduleContext.roomEntries, firstRoom.col) +
                getRoomUsagePenalty(scheduleContext.roomEntries, secondRoom.col);
              const randomnessPenalty = Math.random() * 5;
              const score = baseScore + firstPenalty + secondPenalty + roomUsagePenalty + strategy.strategyPenalty + randomnessPenalty;

              const candidate = {
                dayType,
                lecTime: order.firstType === "lec" ? firstTime : secondTime,
                labTime: order.firstType === "lab" ? firstTime : secondTime,
                lecRoomCol: order.firstType === "lec" ? firstRoom.col : secondRoom.col,
                labRoomCol: order.firstType === "lab" ? firstRoom.col : secondRoom.col,
                score
              };

              if (!best || score < best.score) {
                best = candidate;
              }
            }
          }
        }
      }
    }

    // Use the first strategy pass that finds a viable pair.
    if (best) {
      return best;
    }
  }

  return null;
}

function isSectionTimeOccupied(sectionEntries, section, dayType, time) {
  return sectionEntries.some(entry =>
    entry.dayType === dayType &&
    entry.time === time &&
    (entry.section === section || entry.section2 === section)
  );
}

function isRoomTimeOccupied(roomEntries, dayType, time, roomCol) {
  return roomEntries.some(entry =>
    entry.dayType === dayType &&
    entry.time === time &&
    entry.col === roomCol
  );
}

function createsThreeConsecutive(sectionEntries, section, dayType, candidateIdx) {
  const occupied = new Set(
    sectionEntries
      .filter(entry => entry.dayType === dayType && (entry.section === section || entry.section2 === section))
      .map(entry => SECTION_AUTO_SCHEDULER_TIMES.indexOf(entry.time))
      .filter(idx => idx >= 0)
  );
  occupied.add(candidateIdx);

  for (let i = 0; i <= SECTION_AUTO_SCHEDULER_TIMES.length - 3; i++) {
    if (occupied.has(i) && occupied.has(i + 1) && occupied.has(i + 2)) {
      return true;
    }
  }
  return false;
}

function createsThreeConsecutiveWithCandidates(sectionEntries, section, dayType, candidateIndexes) {
  const occupied = new Set(
    sectionEntries
      .filter(entry => entry.dayType === dayType && (entry.section === section || entry.section2 === section))
      .map(entry => SECTION_AUTO_SCHEDULER_TIMES.indexOf(entry.time))
      .filter(idx => idx >= 0)
  );

  candidateIndexes.forEach(idx => occupied.add(idx));

  for (let i = 0; i <= SECTION_AUTO_SCHEDULER_TIMES.length - 3; i++) {
    if (occupied.has(i) && occupied.has(i + 1) && occupied.has(i + 2)) {
      return true;
    }
  }
  return false;
}

function computeAssignmentScore(sectionEntries, section, dayType, candidateIdx) {
  const dayTypeCounts = SECTION_AUTO_SCHEDULER_DAYS.reduce((acc, day) => {
    acc[day] = sectionEntries.filter(entry =>
      entry.dayType === day &&
      (entry.section === section || entry.section2 === section)
    ).length;
    return acc;
  }, {});

  const sameDayIndexes = sectionEntries
    .filter(entry => entry.dayType === dayType && (entry.section === section || entry.section2 === section))
    .map(entry => SECTION_AUTO_SCHEDULER_TIMES.indexOf(entry.time))
    .filter(idx => idx >= 0);

  const withCandidate = [...sameDayIndexes, candidateIdx].sort((a, b) => a - b);
  let gapPenalty = 0;
  for (let i = 1; i < withCandidate.length; i++) {
    const gap = withCandidate[i] - withCandidate[i - 1];
    if (gap > 1) {
      gapPenalty += (gap - 1) * 3;
    }
  }

  const balancePenalty = Math.abs((dayTypeCounts.MWF + (dayType === "MWF" ? 1 : 0)) - (dayTypeCounts.TTHS + (dayType === "TTHS" ? 1 : 0))) * 2;
  // Keep slot-time preference neutral so starts can spread across the day.
  const latePenalty = 0;
  const adjacencyBonus = sameDayIndexes.some(idx => Math.abs(idx - candidateIdx) === 1) ? -2 : 0;

  return gapPenalty + balancePenalty + latePenalty + adjacencyBonus;
}

function getRoomUsagePenalty(roomEntries, roomCol) {
  const usageCount = roomEntries.filter(entry => entry.col === roomCol).length;
  return usageCount * 0.2;
}

function shuffleArray(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getRoomCompatibilityPenalty(offering, normalizedRoomType, options = {}) {
  const offeringType = normalizeOfferingType(offering.type);
  const unitCategory = normalizeUnitCategory(offering.course?.unit_category);
  const allowLabInBoth = !!options.allowLabInBoth;

  // Lab portions are restricted to Lec/Lab rooms only.
  if (offeringType === "LAB") {
    if (normalizedRoomType === "LECLAB") return 0;
    if (normalizedRoomType === "BOTH" && allowLabInBoth) return ROOM_PENALTY_VERY_RARE + 15;
    return null;
  }

  // Lec/Lab subject lecture portions prefer Pure Lec.
  if (unitCategory === "LECLAB" && offeringType === "LEC") {
    if (normalizedRoomType === "PURELEC") return 0;
    if (normalizedRoomType === "LECLAB" || normalizedRoomType === "BOTH") return ROOM_PENALTY_RARE;
    return null;
  }

  // Generic Lec/Lab subject fallback: allow Lec/Lab and Both rooms.
  if (unitCategory === "LECLAB") {
    if (normalizedRoomType === "LECLAB") return 0;
    if (normalizedRoomType === "BOTH") return ROOM_PENALTY_RARE;
    return null;
  }

  // Pure lecture subjects prefer Pure Lec rooms.
  if (normalizedRoomType === "PURELEC") return 0;
  if (normalizedRoomType === "BOTH") return ROOM_PENALTY_VERY_RARE;
  return null;
}

function normalizeOfferingType(typeValue) {
  const value = String(typeValue || "").toLowerCase().replace(/\s+/g, "");
  if (value === "lab") return "LAB";
  if (value === "lec") return "LEC";
  if (value === "purelec" || value === "purelecture") return "PURELEC";
  if (value === "lec/lab" || value === "leclab") return "LECLAB";
  return "UNKNOWN";
}

function normalizeUnitCategory(categoryValue) {
  const value = String(categoryValue || "").toLowerCase().replace(/\s+/g, "");
  if (value === "lec/lab" || value === "leclab") return "LECLAB";
  if (value === "purelec" || value === "purelecture") return "PURELEC";
  return "UNKNOWN";
}

function normalizeRoomType(roomTypeValue) {
  const value = String(roomTypeValue || "").toLowerCase().replace(/\s+/g, "");
  if (value === "lec/lab" || value === "leclab") return "LECLAB";
  if (value === "purelec" || value === "purelecture") return "PURELEC";
  if (value === "both") return "BOTH";
  return "BOTH";
}

function getRoomIdFromColumn(roomCol, allColumns, rooms) {
  const roomName = allColumns[roomCol - 1];
  if (!roomName) return null;
  const baseRoomName = roomName.replace(/ (A|B)$/, "");
  const room = rooms.find(r => r.name === baseRoomName);
  return room ? room.id : null;
}

document.getElementById("btn-generate-section-autoschedule")?.addEventListener("click", runSectionAutoScheduler);
document.getElementById("btn-cancel-section-autoschedule")?.addEventListener("click", () => {
  hideModal(document.getElementById("modal-section-autoschedule"));
});
