/**
 * Color Utilities Module
 * Provides centralized access to CSS custom properties for JavaScript
 * This ensures all colors are managed from the CSS :root variables
 */

class ColorUtils {
  constructor() {
    this.rootElement = document.documentElement;
    this.computedStyle = getComputedStyle(this.rootElement);
  }

  /**
   * Get a CSS custom property value
   * @param {string} propertyName - The CSS custom property name (with or without --)
   * @returns {string} The computed value of the CSS custom property
   */
  getCSSVariable(propertyName) {
    // Ensure the property name starts with --
    const prop = propertyName.startsWith('--') ? propertyName : `--${propertyName}`;
    return this.computedStyle.getPropertyValue(prop).trim();
  }

  /**
   * Set a CSS custom property value
   * @param {string} propertyName - The CSS custom property name (with or without --)
   * @param {string} value - The new value for the property
   */
  setCSSVariable(propertyName, value) {
    const prop = propertyName.startsWith('--') ? propertyName : `--${propertyName}`;
    this.rootElement.style.setProperty(prop, value);
  }

  // Primary Colors
  get primary() { return this.getCSSVariable('--color-primary'); }
  get primaryDark() { return this.getCSSVariable('--color-primary-dark'); }
  get primaryLight() { return this.getCSSVariable('--color-primary-light'); }
  get primaryXLight() { return this.getCSSVariable('--color-primary-xlight'); }
  get secondary() { return this.getCSSVariable('--color-secondary'); }

  // Status Colors
  get error() { return this.getCSSVariable('--color-error'); }
  get errorDark() { return this.getCSSVariable('--color-error-dark'); }
  get errorLight() { return this.getCSSVariable('--color-error-light'); }
  get errorBg() { return this.getCSSVariable('--color-error-bg'); }
  get errorText() { return this.getCSSVariable('--color-error-text'); }

  get warning() { return this.getCSSVariable('--color-warning'); }
  get warningLight() { return this.getCSSVariable('--color-warning-light'); }
  get warningBg() { return this.getCSSVariable('--color-warning-bg'); }

  get success() { return this.getCSSVariable('--color-success'); }
  get successDark() { return this.getCSSVariable('--color-success-dark'); }
  get successLight() { return this.getCSSVariable('--color-success-light'); }
  get successBg() { return this.getCSSVariable('--color-success-bg'); }

  get info() { return this.getCSSVariable('--color-info'); }
  get infoDark() { return this.getCSSVariable('--color-info-dark'); }
  get infoLight() { return this.getCSSVariable('--color-info-light'); }

  // Chart Colors
  get chartColors() {
    return [
      this.getCSSVariable('--color-chart-1'),
      this.getCSSVariable('--color-chart-2'),
      this.getCSSVariable('--color-chart-3'),
      this.getCSSVariable('--color-chart-4'),
      this.getCSSVariable('--color-chart-5'),
      this.getCSSVariable('--color-chart-6'),
      this.getCSSVariable('--color-chart-7')
    ];
  }

  // Room/Schedule Specific Colors
  get roomError() { return this.getCSSVariable('--color-room-error'); }
  get roomWarning() { return this.getCSSVariable('--color-room-warning'); }
  get scheduleDefault() { return this.getCSSVariable('--color-schedule-default'); }

  // Semantic Colors
  get scheduleConflictBorder() { return this.getCSSVariable('--schedule-conflict-border'); }
  get scheduleConflictText() { return this.getCSSVariable('--schedule-conflict-text'); }
  get scheduleWarningBg() { return this.getCSSVariable('--schedule-warning-bg'); }
  get scheduleCellBg() { return this.getCSSVariable('--schedule-cell-bg'); }

  // Text Colors
  get text() { return this.getCSSVariable('--color-text'); }
  get textLight() { return this.getCSSVariable('--color-text-light'); }
  get textDark() { return this.getCSSVariable('--color-text-dark'); }
  get muted() { return this.getCSSVariable('--color-muted'); }
  get mutedLight() { return this.getCSSVariable('--color-muted-light'); }

  // Background Colors
  get bg() { return this.getCSSVariable('--color-bg'); }
  get cardBg() { return this.getCSSVariable('--color-card-bg'); }

  // Border Colors
  get border() { return this.getCSSVariable('--color-border'); }
  get borderLight() { return this.getCSSVariable('--color-border-light'); }

  // Accent Colors
  get blue() { return this.getCSSVariable('--color-blue'); }
  get blueLight() { return this.getCSSVariable('--color-blue-light'); }

  /**
   * Get a chart color by index
   * @param {number} index - The index of the chart color (0-6)
   * @returns {string} The chart color at the specified index
   */
  getChartColor(index) {
    const colors = this.chartColors;
    return colors[index % colors.length];
  }

  /**
   * Create a theme object with all colors
   * Useful for passing to chart libraries or other components
   */
  getTheme() {
    return {
      primary: this.primary,
      primaryDark: this.primaryDark,
      primaryLight: this.primaryLight,
      secondary: this.secondary,
      error: this.error,
      warning: this.warning,
      success: this.success,
      info: this.info,
      text: this.text,
      muted: this.muted,
      bg: this.bg,
      cardBg: this.cardBg,
      border: this.border,
      chartColors: this.chartColors,
      roomError: this.roomError,
      scheduleDefault: this.scheduleDefault
    };
  }
}

// Create a singleton instance
const colorUtils = new ColorUtils();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = colorUtils;
} else {
  window.colorUtils = colorUtils;
}