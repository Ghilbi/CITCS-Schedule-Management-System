// JWT Expiration Monitor Module
// Handles token expiration checking, warnings, and automatic logout

class JWTExpirationMonitor {
  constructor() {
    this.checkInterval = null;
    this.warningShown = false;
    this.notificationElement = null;
    this.countdownInterval = null;
    this.isMonitoring = false;
    
    // Configuration
    this.CHECK_INTERVAL = 30000; // Check every 30 seconds
    this.WARNING_THRESHOLD = 900; // 15 minutes in seconds
    this.FINAL_WARNING_THRESHOLD = 300; // 5 minutes in seconds
    
    this.init();
  }
  
  init() {
    this.createNotificationElement();
    this.setupEventListeners();
    
    // Start monitoring if user is logged in
    if (this.isLoggedIn()) {
      this.startMonitoring();
    }
  }
  
  isLoggedIn() {
    return !!localStorage.getItem('authToken');
  }
  
  createNotificationElement() {
    // Create notification container
    const notification = document.createElement('div');
    notification.id = 'jwt-expiration-notification';
    notification.className = 'jwt-notification hidden';
    notification.innerHTML = `
      <div class="jwt-notification-content">
        <div class="jwt-notification-icon">⚠️</div>
        <div class="jwt-notification-message">
          <div class="jwt-notification-title">Session Expiring Soon</div>
          <div class="jwt-notification-text">Your session will expire in <span id="jwt-countdown">15:00</span></div>
        </div>
        <div class="jwt-notification-actions">
          <button id="jwt-extend-session" class="jwt-btn jwt-btn-primary">Extend Session</button>
          <button id="jwt-dismiss" class="jwt-btn jwt-btn-secondary">Dismiss</button>
        </div>
      </div>
    `;
    
    // Add styles
    this.addNotificationStyles();
    
    // Append to body
    document.body.appendChild(notification);
    this.notificationElement = notification;
    
    // Setup button event listeners
    document.getElementById('jwt-extend-session').addEventListener('click', () => {
      this.extendSession();
    });
    
    document.getElementById('jwt-dismiss').addEventListener('click', () => {
      this.hideNotification();
    });
  }
  
  addNotificationStyles() {
    if (document.getElementById('jwt-notification-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'jwt-notification-styles';
    styles.textContent = `
      .jwt-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
        border: 2px solid #ffc107;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(255, 193, 7, 0.3);
        z-index: 10000;
        max-width: 400px;
        min-width: 320px;
        transform: translateX(100%);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
      }
      
      .jwt-notification.show {
        transform: translateX(0);
      }
      
      .jwt-notification.hidden {
        display: none;
      }
      
      .jwt-notification.critical {
        background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
        border-color: #dc3545;
        box-shadow: 0 8px 32px rgba(220, 53, 69, 0.3);
        animation: pulse-critical 2s infinite;
      }
      
      @keyframes pulse-critical {
        0%, 100% { transform: translateX(0) scale(1); }
        50% { transform: translateX(0) scale(1.02); }
      }
      
      .jwt-notification-content {
        padding: 20px;
        display: flex;
        align-items: flex-start;
        gap: 15px;
      }
      
      .jwt-notification-icon {
        font-size: 24px;
        flex-shrink: 0;
        margin-top: 2px;
      }
      
      .jwt-notification-message {
        flex: 1;
      }
      
      .jwt-notification-title {
        font-weight: 600;
        font-size: 16px;
        color: #856404;
        margin-bottom: 5px;
      }
      
      .jwt-notification.critical .jwt-notification-title {
        color: #721c24;
      }
      
      .jwt-notification-text {
        font-size: 14px;
        color: #856404;
        line-height: 1.4;
      }
      
      .jwt-notification.critical .jwt-notification-text {
        color: #721c24;
      }
      
      .jwt-notification-actions {
        display: flex;
        gap: 8px;
        margin-top: 15px;
        flex-wrap: wrap;
      }
      
      .jwt-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      }
      
      .jwt-btn-primary {
        background: #ffc107;
        color: #212529;
      }
      
      .jwt-btn-primary:hover {
        background: #e0a800;
        transform: translateY(-1px);
      }
      
      .jwt-btn-secondary {
        background: transparent;
        color: #856404;
        border: 1px solid #856404;
      }
      
      .jwt-btn-secondary:hover {
        background: #856404;
        color: white;
      }
      
      .jwt-notification.critical .jwt-btn-primary {
        background: #dc3545;
        color: white;
      }
      
      .jwt-notification.critical .jwt-btn-primary:hover {
        background: #c82333;
      }
      
      .jwt-notification.critical .jwt-btn-secondary {
        color: #721c24;
        border-color: #721c24;
      }
      
      .jwt-notification.critical .jwt-btn-secondary:hover {
        background: #721c24;
        color: white;
      }
      
      #jwt-countdown {
        font-weight: 600;
        font-family: 'Courier New', monospace;
      }
      
      @media (max-width: 480px) {
        .jwt-notification {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
          min-width: auto;
        }
        
        .jwt-notification-content {
          padding: 15px;
        }
        
        .jwt-notification-actions {
          flex-direction: column;
        }
        
        .jwt-btn {
          width: 100%;
          justify-content: center;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }
  
  setupEventListeners() {
    // Listen for login/logout events
    window.addEventListener('storage', (e) => {
      if (e.key === 'authToken') {
        if (e.newValue) {
          this.startMonitoring();
        } else {
          this.stopMonitoring();
        }
      }
    });
    
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isLoggedIn()) {
        this.checkTokenStatus();
      }
    });
    
    // Listen for focus events
    window.addEventListener('focus', () => {
      if (this.isLoggedIn()) {
        this.checkTokenStatus();
      }
    });
  }
  
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.warningShown = false;
    
    // Initial check
    this.checkTokenStatus();
    
    // Set up periodic checking
    this.checkInterval = setInterval(() => {
      this.checkTokenStatus();
    }, this.CHECK_INTERVAL);
  }
  
  stopMonitoring() {
    this.isMonitoring = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    
    this.hideNotification();
    this.warningShown = false;
  }
  
  async checkTokenStatus() {
    if (!this.isLoggedIn()) {
      this.stopMonitoring();
      return;
    }
    
    try {
      const response = await fetch('/api/token-status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.status === 401) {
        // Token expired
        this.handleTokenExpired();
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        this.handleTokenStatus(data);
      }
    } catch (error) {
      console.warn('Failed to check token status:', error);
    }
  }
  
  handleTokenStatus(status) {
    const { expiresIn, warningThreshold } = status;
    
    if (expiresIn <= 0) {
      this.handleTokenExpired();
      return;
    }
    
    if (warningThreshold || expiresIn <= this.WARNING_THRESHOLD) {
      this.showExpirationWarning(expiresIn);
    } else {
      this.hideNotification();
      this.warningShown = false;
    }
  }
  
  showExpirationWarning(expiresIn) {
    if (!this.notificationElement) return;
    
    const isCritical = expiresIn <= this.FINAL_WARNING_THRESHOLD;
    
    // Update notification content
    const title = this.notificationElement.querySelector('.jwt-notification-title');
    const text = this.notificationElement.querySelector('.jwt-notification-text');
    const icon = this.notificationElement.querySelector('.jwt-notification-icon');
    
    if (isCritical) {
      title.textContent = 'Session Expiring Very Soon!';
      text.innerHTML = `Your session will expire in <span id="jwt-countdown">${this.formatTime(expiresIn)}</span>. Please extend your session now.`;
      icon.textContent = '🚨';
      this.notificationElement.classList.add('critical');
    } else {
      title.textContent = 'Session Expiring Soon';
      text.innerHTML = `Your session will expire in <span id="jwt-countdown">${this.formatTime(expiresIn)}</span>`;
      icon.textContent = '⚠️';
      this.notificationElement.classList.remove('critical');
    }
    
    // Show notification
    this.notificationElement.classList.remove('hidden');
    setTimeout(() => {
      this.notificationElement.classList.add('show');
    }, 10);
    
    // Start countdown
    this.startCountdown(expiresIn);
    
    this.warningShown = true;
  }
  
  startCountdown(initialSeconds) {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    let seconds = initialSeconds;
    
    this.countdownInterval = setInterval(() => {
      seconds--;
      
      const countdownElement = document.getElementById('jwt-countdown');
      if (countdownElement) {
        countdownElement.textContent = this.formatTime(seconds);
      }
      
      if (seconds <= 0) {
        clearInterval(this.countdownInterval);
        this.handleTokenExpired();
      }
    }, 1000);
  }
  
  formatTime(seconds) {
    if (seconds <= 0) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  hideNotification() {
    if (!this.notificationElement) return;
    
    this.notificationElement.classList.remove('show');
    setTimeout(() => {
      this.notificationElement.classList.add('hidden');
    }, 300);
    
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
  
  async extendSession() {
    // Redirect to login page to get a new token
    window.location.href = 'login.html';
  }
  
  handleTokenExpired() {
    this.stopMonitoring();
    
    // Clear token
    localStorage.removeItem('authToken');
    
    // Show expiration message
    alert('Your session has expired. You will be redirected to the login page.');
    
    // Redirect to login
    window.location.href = 'login.html';
  }
}

// Create global instance
const jwtMonitor = new JWTExpirationMonitor();

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.jwtMonitor = jwtMonitor;
}