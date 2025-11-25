(function loadPageSections() {
  const container = document.getElementById('page-sections');
  if (!container) {
    console.error('Section container #page-sections not found.');
    return;
  }

  const fragments = [
    'pages/course-catalog.html',
    'pages/course-offering.html',
    'pages/section-management.html',
    'pages/room-management.html',
    'pages/schedule-summary.html',
    'pages/analytics.html'
  ];

  fragments.forEach(fragmentPath => {
    try {
      const request = new XMLHttpRequest();
      request.open('GET', fragmentPath, false); // synchronous to ensure DOM availability for legacy scripts
      request.send(null);

      if (request.status >= 200 && request.status < 300 || request.status === 0) {
        container.insertAdjacentHTML('beforeend', request.responseText);
      } else {
        console.error(`Failed to load fragment ${fragmentPath}: ${request.status}`);
      }
    } catch (error) {
      console.error(`Error loading fragment ${fragmentPath}:`, error);
    }
  });
})();
