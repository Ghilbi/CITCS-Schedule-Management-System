// Tutorial Dialog System
// Shows a guided walkthrough on the user's first login

const TUTORIAL_STORAGE_KEY = 'schedule-app-tutorial-complete';

const tutorialSteps = [
  {
    title: 'Welcome to the Schedule Management System!',
    description: 'This guided tour will walk you through the main features of the application. It will only take a minute.',
    icon: 'dripicons-home',
    highlightNav: null,
    tip: 'You can revisit this tutorial anytime from the help menu.'
  },
  {
    title: 'Analytics Dashboard',
    description: 'Get a bird\'s-eye view of your scheduling progress. See key metrics like completion rate, unscheduled offerings, conflict counts, and room utilization at a glance.',
    icon: 'dripicons-graph-bar',
    highlightNav: 'btn-analytics',
    tip: 'Use the trimester filter to drill down into specific periods.'
  },
  {
    title: 'Course Catalog',
    description: 'Manage all courses available in the system. Add, edit, or remove courses with details like subject code, description, units, year level, and trimester.',
    icon: 'dripicons-document',
    highlightNav: 'btn-courses',
    tip: 'Admin-only: Program Chairs won\'t see this section.'
  },
  {
    title: 'Manage Course Offering',
    description: 'Create course offerings for each trimester by assigning sections, faculty, and unit types (Lecture/Lab) to courses from the catalog.',
    icon: 'dripicons-checklist',
    highlightNav: 'btn-course-offering',
    tip: 'You can bulk-import offerings from an Excel file for faster setup.'
  },
  {
    title: 'Section Management',
    description: 'Assign time slots to your course offerings. View and manage schedules per section, with support for shared/merged classes and automatic conflict detection.',
    icon: 'dripicons-calendar',
    highlightNav: 'btn-section-view',
    tip: 'Use the Auto-Scheduler to automatically fill in time slots.'
  },
  {
    title: 'Room Management',
    description: 'Assign rooms to scheduled course offerings. The grid view shows room availability across time slots, making it easy to spot openings and avoid double-bookings.',
    icon: 'dripicons-location',
    highlightNav: 'btn-room-view',
    tip: 'Conflicts are highlighted automatically in red.'
  },
  {
    title: 'Schedule Summary',
    description: 'Review the complete schedule organized by section. Export everything to a formatted Excel file for printing or sharing with faculty and students.',
    icon: 'dripicons-export',
    highlightNav: 'btn-schedule-summary',
    tip: 'The export includes all trimesters in separate sheets.'
  },
  {
    title: 'You\'re All Set!',
    description: 'That covers the essentials. Start by heading to the Analytics Dashboard to see an overview, or jump straight into Course Offerings to begin scheduling.',
    icon: 'dripicons-thumbs-up',
    highlightNav: null,
    tip: 'Tip: Work through sections in order — Catalog → Offerings → Section → Room — for the smoothest workflow.'
  }
];

function isTutorialComplete() {
  return localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
}

function markTutorialComplete() {
  localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
}

function buildTutorialHTML() {
  const overlay = document.createElement('div');
  overlay.id = 'tutorial-overlay';
  overlay.className = 'tutorial-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'tutorial-dialog';

  dialog.innerHTML = `
    <button class="tutorial-skip-btn" id="tutorial-skip-btn">Skip Tour</button>
    <div class="tutorial-icon-wrapper" id="tutorial-icon-wrapper">
      <i class="" id="tutorial-icon"></i>
    </div>
    <h2 class="tutorial-title" id="tutorial-title"></h2>
    <p class="tutorial-description" id="tutorial-description"></p>
    <div class="tutorial-tip" id="tutorial-tip">
      <i class="dripicons-lightbulb"></i>
      <span id="tutorial-tip-text"></span>
    </div>
    <div class="tutorial-progress" id="tutorial-progress"></div>
    <div class="tutorial-actions">
      <button class="tutorial-btn tutorial-btn-back" id="tutorial-btn-back">
        <i class="dripicons-chevron-left"></i> Back
      </button>
      <button class="tutorial-btn tutorial-btn-next" id="tutorial-btn-next">
        Next <i class="dripicons-chevron-right"></i>
      </button>
    </div>
  `;

  overlay.appendChild(dialog);
  return overlay;
}

function renderTutorialStep(stepIndex) {
  const step = tutorialSteps[stepIndex];
  const total = tutorialSteps.length;

  const icon = document.getElementById('tutorial-icon');
  const iconWrapper = document.getElementById('tutorial-icon-wrapper');
  const title = document.getElementById('tutorial-title');
  const description = document.getElementById('tutorial-description');
  const tipText = document.getElementById('tutorial-tip-text');
  const backBtn = document.getElementById('tutorial-btn-back');
  const nextBtn = document.getElementById('tutorial-btn-next');
  const progress = document.getElementById('tutorial-progress');
  const dialog = document.querySelector('.tutorial-dialog');

  dialog.classList.remove('tutorial-step-enter');
  void dialog.offsetWidth;
  dialog.classList.add('tutorial-step-enter');

  icon.className = step.icon;
  title.textContent = step.title;
  description.textContent = step.description;
  tipText.textContent = step.tip;

  backBtn.style.visibility = stepIndex === 0 ? 'hidden' : 'visible';

  const isLast = stepIndex === total - 1;
  nextBtn.innerHTML = isLast
    ? 'Get Started <i class="dripicons-checkmark"></i>'
    : 'Next <i class="dripicons-chevron-right"></i>';

  if (isLast) {
    nextBtn.classList.add('tutorial-btn-finish');
  } else {
    nextBtn.classList.remove('tutorial-btn-finish');
  }

  progress.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('span');
    dot.className = 'tutorial-dot' + (i === stepIndex ? ' active' : '') + (i < stepIndex ? ' completed' : '');
    dot.addEventListener('click', () => {
      currentTutorialStep = i;
      renderTutorialStep(i);
    });
    progress.appendChild(dot);
  }

  clearNavHighlights();
  if (step.highlightNav) {
    const navBtn = document.getElementById(step.highlightNav);
    if (navBtn) {
      navBtn.classList.add('tutorial-highlight');
    }
  }
}

function clearNavHighlights() {
  document.querySelectorAll('nav button').forEach(btn => {
    btn.classList.remove('tutorial-highlight');
  });
}

let currentTutorialStep = 0;

function closeTutorial() {
  const overlay = document.getElementById('tutorial-overlay');
  if (overlay) {
    overlay.classList.add('tutorial-fade-out');
    setTimeout(() => {
      overlay.remove();
      clearNavHighlights();
    }, 400);
  }
  markTutorialComplete();
}

function startTutorial() {
  if (document.getElementById('tutorial-overlay')) return;

  currentTutorialStep = 0;
  const overlay = buildTutorialHTML();
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.classList.add('tutorial-visible');
  });

  renderTutorialStep(0);

  document.getElementById('tutorial-btn-next').addEventListener('click', () => {
    if (currentTutorialStep < tutorialSteps.length - 1) {
      currentTutorialStep++;
      renderTutorialStep(currentTutorialStep);
    } else {
      closeTutorial();
    }
  });

  document.getElementById('tutorial-btn-back').addEventListener('click', () => {
    if (currentTutorialStep > 0) {
      currentTutorialStep--;
      renderTutorialStep(currentTutorialStep);
    }
  });

  document.getElementById('tutorial-skip-btn').addEventListener('click', closeTutorial);
}

function launchTutorialIfFirstTime() {
  if (!isTutorialComplete()) {
    const startupLoader = document.getElementById('startup-loader');
    if (startupLoader && startupLoader.style.display !== 'none') {
      const observer = new MutationObserver(() => {
        if (startupLoader.style.display === 'none') {
          observer.disconnect();
          setTimeout(startTutorial, 500);
        }
      });
      observer.observe(startupLoader, { attributes: true, attributeFilter: ['style'] });
    } else {
      setTimeout(startTutorial, 800);
    }
  }
}
