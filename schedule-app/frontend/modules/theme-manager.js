/**
 * Theme Manager Module
 * Provides easy switching between different color themes
 * Stores theme preferences in localStorage
 */

class ThemeManager {
  constructor() {
    this.rootElement = document.documentElement;
    this.currentTheme = 'default';
    this.themes = this.defineThemes();
    this.storageKey = 'schedule-app-theme';
    
    // Load saved theme on initialization
    this.loadSavedTheme();
  }

  /**
   * Define available themes
   */
  defineThemes() {
    return {
      default: {
        name: 'Default Green',
        description: 'The original green theme',
        colors: {
          '--color-primary': '#2e7d32',
          '--color-primary-dark': '#1b5e20',
          '--color-primary-light': '#e8f5e9',
          '--color-primary-xlight': '#f1f9f2'
        }
      },
      
      blue: {
        name: 'Professional Blue',
        description: 'A professional blue theme',
        colors: {
          '--color-primary': '#1976d2',
          '--color-primary-dark': '#1565c0',
          '--color-primary-light': '#e3f2fd',
          '--color-primary-xlight': '#f1f8ff'
        }
      },
      
      purple: {
        name: 'Creative Purple',
        description: 'A creative purple theme',
        colors: {
          '--color-primary': '#7b1fa2',
          '--color-primary-dark': '#6a1b9a',
          '--color-primary-light': '#f3e5f5',
          '--color-primary-xlight': '#faf5ff'
        }
      },
      
      teal: {
        name: 'Modern Teal',
        description: 'A modern teal theme',
        colors: {
          '--color-primary': '#00796b',
          '--color-primary-dark': '#00695c',
          '--color-primary-light': '#e0f2f1',
          '--color-primary-xlight': '#f0f9f8'
        }
      },
      
      orange: {
        name: 'Energetic Orange',
        description: 'An energetic orange theme',
        colors: {
          '--color-primary': '#f57c00',
          '--color-primary-dark': '#ef6c00',
          '--color-primary-light': '#fff3e0',
          '--color-primary-xlight': '#fffaf5'
        }
      },
      
      dark: {
        name: 'Dark Mode',
        description: 'A dark theme for low-light environments',
        colors: {
          '--color-primary': '#4caf50',
          '--color-primary-dark': '#388e3c',
          '--color-primary-light': '#2d2d2d',
          '--color-primary-xlight': '#1e1e1e',
          '--color-bg': '#121212',
          '--color-card-bg': '#1e1e1e',
          '--color-text': '#ffffff',
          '--color-text-light': '#e0e0e0',
          '--color-muted': '#b0b0b0',
          '--color-border': '#333333',
          '--color-border-light': '#404040',
          '--table-row-even': '#2a2a2a'
        }
      }
    };
  }

  /**
   * Apply a theme by name
   * @param {string} themeName - The name of the theme to apply
   */
  applyTheme(themeName) {
    if (!this.themes[themeName]) {
      console.warn(`Theme "${themeName}" not found. Using default theme.`);
      themeName = 'default';
    }

    const theme = this.themes[themeName];
    
    // Apply theme colors
    Object.entries(theme.colors).forEach(([property, value]) => {
      this.rootElement.style.setProperty(property, value);
    });

    // Update current theme
    this.currentTheme = themeName;
    
    // Save to localStorage
    this.saveTheme(themeName);
    
    // Dispatch theme change event
    this.dispatchThemeChangeEvent(themeName, theme);
    
    console.log(`Applied theme: ${theme.name}`);
  }

  /**
   * Get the current theme name
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Get all available themes
   */
  getAvailableThemes() {
    return Object.keys(this.themes).map(key => ({
      key,
      name: this.themes[key].name,
      description: this.themes[key].description
    }));
  }

  /**
   * Save theme preference to localStorage
   */
  saveTheme(themeName) {
    try {
      localStorage.setItem(this.storageKey, themeName);
    } catch (error) {
      console.warn('Could not save theme preference:', error);
    }
  }

  /**
   * Load saved theme from localStorage
   */
  loadSavedTheme() {
    try {
      const savedTheme = localStorage.getItem(this.storageKey);
      if (savedTheme && this.themes[savedTheme]) {
        this.applyTheme(savedTheme);
      }
    } catch (error) {
      console.warn('Could not load saved theme:', error);
    }
  }

  /**
   * Reset to default theme
   */
  resetToDefault() {
    this.applyTheme('default');
  }

  /**
   * Toggle between light and dark themes
   */
  toggleDarkMode() {
    if (this.currentTheme === 'dark') {
      this.applyTheme('default');
    } else {
      this.applyTheme('dark');
    }
  }

  /**
   * Dispatch a custom event when theme changes
   */
  dispatchThemeChangeEvent(themeName, theme) {
    const event = new CustomEvent('themeChanged', {
      detail: {
        themeName,
        theme,
        manager: this
      }
    });
    document.dispatchEvent(event);
  }

  /**
   * Create a theme selector UI element
   * @param {string} containerId - The ID of the container element
   */
  createThemeSelector(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Container with ID "${containerId}" not found`);
      return;
    }

    const themes = this.getAvailableThemes();
    
    container.innerHTML = `
      <div class="theme-selector">
        <label for="theme-select">Choose Theme:</label>
        <select id="theme-select" class="theme-select">
          ${themes.map(theme => `
            <option value="${theme.key}" ${theme.key === this.currentTheme ? 'selected' : ''}>
              ${theme.name}
            </option>
          `).join('')}
        </select>
        <button id="dark-mode-toggle" class="btn btn--secondary">
          ${this.currentTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>
    `;

    // Add event listeners
    const select = container.querySelector('#theme-select');
    const darkModeToggle = container.querySelector('#dark-mode-toggle');

    select.addEventListener('change', (e) => {
      this.applyTheme(e.target.value);
      this.updateDarkModeButton(darkModeToggle);
    });

    darkModeToggle.addEventListener('click', () => {
      this.toggleDarkMode();
      select.value = this.currentTheme;
      this.updateDarkModeButton(darkModeToggle);
    });
  }

  /**
   * Update dark mode button text
   */
  updateDarkModeButton(button) {
    if (button) {
      button.textContent = this.currentTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    }
  }

  /**
   * Add theme selector styles to the page
   */
  addThemeSelectorStyles() {
    if (document.getElementById('theme-selector-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'theme-selector-styles';
    styles.textContent = `
      .theme-selector {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--color-card-bg);
        border: 1px solid var(--color-border);
        border-radius: var(--border-radius);
        margin: 16px 0;
      }
      
      .theme-selector label {
        font-weight: 500;
        color: var(--color-text);
        white-space: nowrap;
      }
      
      .theme-select {
        padding: 6px 12px;
        border: 1px solid var(--color-border);
        border-radius: 4px;
        background: var(--color-secondary);
        color: var(--color-text);
        font-family: inherit;
        min-width: 150px;
      }
      
      .theme-select:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.15);
      }
      
      @media (max-width: 768px) {
        .theme-selector {
          flex-direction: column;
          align-items: stretch;
          gap: 8px;
        }
      }
    `;
    document.head.appendChild(styles);
  }
}

// Create a singleton instance
const themeManager = new ThemeManager();

// Add styles when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    themeManager.addThemeSelectorStyles();
  });
} else {
  themeManager.addThemeSelectorStyles();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = themeManager;
} else {
  window.themeManager = themeManager;
}