/**
 * Monthly Tabs Manager
 * Handles switching between different monthly databases with dynamic attendance columns
 */

class MonthlyTabsManager {
  constructor() {
    this.currentMonth = 'June_2025'; // Default month
    this.availableTables = {}; // Will store only existing tables
    this.monthsConfig = {
      'June_2025': {
        name: 'June 2025',
        table: 'June_2025',
        attendanceDates: ['1st', '8th', '15th', '22nd', '29th'],
        attendanceColumns: ['Attendance 1st', 'Attendance 8th', 'Attendance 15th', 'Attendance 22nd', 'Attendance 29th']
      },
      'May_2025': {
        name: 'May 2025',
        table: 'May_2025',
        attendanceDates: ['5th', '12th', '19th', '26th'],
        attendanceColumns: ['Attendance 5th', 'Attendance 12th', 'Attendance 19th', 'Attendance 26th']
      },
      'April_2025': {
        name: 'April 2025',
        table: 'April_2025',
        attendanceDates: ['7th', '14th', '21st', '28th'],
        attendanceColumns: ['Attendance 7th', 'Attendance 14th', 'Attendance 21st', 'Attendance 28th']
      },
      'February_2025': {
        name: 'February 2025',
        table: 'February_2025',
        attendanceDates: ['2nd', '9th', '16th', '23rd'],
        attendanceColumns: ['Attendance 2nd', 'Attendance 9th', 'Attendance 16th', 'Attendance 23rd']
      },
      'January_2025': {
        name: 'January 2025',
        table: 'January_2025',
        attendanceDates: ['5th', '12th', '19th', '26th'],
        attendanceColumns: ['Attendance 5th', 'Attendance 12th', 'Attendance 19th', 'Attendance 26th']
      }
    };
    
    // Delay initialization to ensure DOM is ready
    setTimeout(async () => {
      await this.checkExistingTables();
      this.initializeTabs();
      this.bindEvents();
      
      // Load initial data for the default month
      try {
        await this.loadMonthData();
        await this.updateAllComponents();
        console.log('Initial month data loaded successfully');
      } catch (error) {
        console.error('Error loading initial month data:', error);
      }
    }, 500);
  }

  /**
   * Check which tables actually exist in the database
   */
  async checkExistingTables() {
    console.log('Checking which monthly tables exist...');
    
    for (const [key, config] of Object.entries(this.monthsConfig)) {
      try {
        // Try to query the table with a simple select
        const { data, error } = await window.supabase
          .from(config.table)
          .select('id')
          .limit(1);
        
        if (!error) {
          this.availableTables[key] = config;
          console.log(`✅ Table ${config.table} exists`);
        } else {
          console.log(`❌ Table ${config.table} does not exist:`, error.message);
        }
      } catch (err) {
        console.log(`❌ Table ${config.table} check failed:`, err.message);
      }
    }

    // If current month doesn't exist, switch to first available
    if (!this.availableTables[this.currentMonth]) {
      const firstAvailable = Object.keys(this.availableTables)[0];
      if (firstAvailable) {
        this.currentMonth = firstAvailable;
        console.log(`Switched to first available table: ${firstAvailable}`);
      }
    }

    console.log('Available tables:', Object.keys(this.availableTables));
  }

  /**
   * Initialize the tab interface
   */
  initializeTabs() {
    const tabsContainer = document.querySelector('.month-tabs-container');
    if (!tabsContainer) {
      console.log('Tab container not found, retrying...');
      setTimeout(() => this.initializeTabs(), 1000);
      return;
    }

    // Create tabs HTML only for existing tables
    const tabsHTML = Object.entries(this.availableTables).map(([key, config]) => `
      <button
        class="month-tab ${key === this.currentMonth ? 'active' : ''}"
        data-month="${key}"
        aria-label="Switch to ${config.name}"
        role="tab"
        aria-selected="${key === this.currentMonth}"
      >
        <span class="tab-text">${config.name}</span>
      </button>
    `).join('');

    tabsContainer.innerHTML = tabsHTML;
    console.log(`Monthly tabs initialized successfully for ${Object.keys(this.availableTables).length} available tables`);
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Tab click events
    document.addEventListener('click', (e) => {
      if (e.target.closest('.month-tab')) {
        const monthKey = e.target.closest('.month-tab').dataset.month;
        this.switchToMonth(monthKey);
      }
    });

    // Keyboard navigation for tabs
    document.addEventListener('keydown', (e) => {
      if (e.target.classList.contains('month-tab')) {
        this.handleTabKeyboard(e);
      }
    });
  }

  /**
   * Handle keyboard navigation for accessibility
   */
  handleTabKeyboard(e) {
    const tabs = Array.from(document.querySelectorAll('.month-tab'));
    const currentIndex = tabs.indexOf(e.target);

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        tabs[prevIndex].focus();
        break;
      case 'ArrowRight':
        e.preventDefault();
        const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        tabs[nextIndex].focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.switchToMonth(e.target.dataset.month);
        break;
    }
  }

  /**
   * Switch to a specific month
   */
  async switchToMonth(monthKey) {
    if (!this.availableTables[monthKey] || monthKey === this.currentMonth) return;

    try {
      console.log(`Switching to ${monthKey}...`);
      
      // Show loading state
      this.showLoadingState();

      // Update active tab
      this.updateActiveTab(monthKey);

      // Update current month
      this.currentMonth = monthKey;

      // Update attendance date selectors
      this.updateAttendanceDateSelectors();

      // Update table headers
      this.updateTableHeaders();

      // Load data for the new month
      await this.loadMonthData();

      // Update all UI components
      await this.updateAllComponents();

      console.log(`Successfully switched to ${monthKey}`);

    } catch (error) {
      console.error('Error switching months:', error);
      this.showError('Failed to load month data');
    } finally {
      this.hideLoadingState();
    }
  }

  /**
   * Update active tab styling
   */
  updateActiveTab(monthKey) {
    // Remove active class from all tabs
    document.querySelectorAll('.month-tab').forEach(tab => {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    });

    // Add active class to selected tab
    const activeTab = document.querySelector(`[data-month="${monthKey}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
      activeTab.setAttribute('aria-selected', 'true');
    }
  }

  /**
   * Update table headers based on current month
   */
  updateTableHeaders() {
    const config = this.availableTables[this.currentMonth] || this.monthsConfig[this.currentMonth];
    const tableHeaders = document.querySelectorAll('#sensitiveTable thead th');
    
    // Update attendance column headers (skip first 6 columns: checkbox, name, gender, phone, age, level)
    const attendanceHeaderStart = 6;
    config.attendanceDates.forEach((date, index) => {
      const headerIndex = attendanceHeaderStart + index;
      if (tableHeaders[headerIndex]) {
        tableHeaders[headerIndex].textContent = date;
        tableHeaders[headerIndex].style.display = '';
      }
    });

    // Hide extra columns if current month has fewer dates
    for (let i = config.attendanceDates.length; i < 5; i++) {
      const headerIndex = attendanceHeaderStart + i;
      if (tableHeaders[headerIndex]) {
        tableHeaders[headerIndex].style.display = 'none';
      }
    }
  }

  /**
   * Update attendance date selectors based on current month
   */
  updateAttendanceDateSelectors() {
    const config = this.availableTables[this.currentMonth] || this.monthsConfig[this.currentMonth];
    const dateSelectionGrid = document.querySelector('.date-selection-grid');
    
    if (!dateSelectionGrid || !config) return;

    const dateSelectorsHTML = config.attendanceDates.map((date, index) => `
      <label class="date-selection-option">
        <input 
          type="checkbox" 
          id="select-date-${date}" 
          class="date-selection-checkbox" 
          data-date="${date}" 
          data-column="${config.attendanceColumns[index]}"
        >
        <span class="date-selection-label">${date}</span>
      </label>
    `).join('');

    dateSelectionGrid.innerHTML = dateSelectorsHTML;

    // Re-bind checkbox events
    this.bindDateSelectionEvents();
  }

  /**
   * Bind date selection events
   */
  bindDateSelectionEvents() {
    document.querySelectorAll('.date-selection-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        const option = this.closest('.date-selection-option');
        if (this.checked) {
          option.classList.add('selected');
        } else {
          option.classList.remove('selected');
        }
      });
    });
  }

  /**
   * Load data for current month
   */
  async loadMonthData() {
    const config = this.availableTables[this.currentMonth] || this.monthsConfig[this.currentMonth];
    
    try {
      const { data, error } = await window.supabase
        .from(config.table)
        .select('*');

      if (error) throw error;

      // Store current data globally
      window.currentTableData = data || [];
      
      return data;
    } catch (error) {
      console.error(`Error loading ${config.name} data:`, error);
      throw error;
    }
  }

  /**
   * Update all UI components with new data
   */
  async updateAllComponents() {
    // First ensure we have the latest data
    await this.loadMonthData();
    const data = window.currentTableData || [];
    
    // Update table with current filter
    if (typeof updateSensitiveTable === 'function') {
      const currentFilter = document.getElementById('categoryFilter')?.value || 'all';
      updateSensitiveTable(currentFilter);
    }

    // Update stats
    if (typeof updateStats === 'function') {
      updateStats(data);
    }

    // Update attendance summary for current month
    this.updateAttendanceSummaryForMonth(data);

    // Update month indicator
    this.updateMonthIndicator();

    // Update search results if there's an active search
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim()) {
      // Trigger search update
      if (typeof window.searchData === 'function') {
        window.searchData();
      }
    }

    const config = this.availableTables[this.currentMonth] || this.monthsConfig[this.currentMonth];
    console.log(`Updated all components for ${config.name} with ${data.length} records`);
  }

  /**
   * Update attendance summary for current month
   */
  updateAttendanceSummaryForMonth(data) {
    const config = this.availableTables[this.currentMonth] || this.monthsConfig[this.currentMonth];
    const attendanceGrid = document.querySelector('.attendance-grid.modern');
    
    if (!attendanceGrid || !config) return;

    let summaryHTML = '';

    config.attendanceDates.forEach((date, index) => {
      const columnName = config.attendanceColumns[index];
      let presentCount = 0;
      let absentCount = 0;
      let totalCount = 0;

      data.forEach(person => {
        const attendance = (person[columnName] || '').trim().toLowerCase();
        totalCount++;
        
        if (attendance === 'present' || attendance === 'p') {
          presentCount++;
        } else if (attendance === 'absent' || attendance === 'a') {
          absentCount++;
        }
      });

      const presentPercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
      const absentPercentage = totalCount > 0 ? Math.round((absentCount / totalCount) * 100) : 0;

      summaryHTML += `
        <div class="attendance-card-modern">
          <div class="attendance-card-header">
            <h4>${date}</h4>
            <span class="total-count">${totalCount} people</span>
          </div>
          
          <div class="attendance-metrics">
            <div class="metric present">
              <div class="metric-icon present"></div>
              <div class="metric-info">
                <span class="metric-label">Present</span>
                <div class="metric-values">
                  <span class="metric-count">${presentCount}</span>
                  <span class="metric-percentage">${presentPercentage}%</span>
                </div>
              </div>
            </div>
            
            <div class="metric absent">
              <div class="metric-icon absent"></div>
              <div class="metric-info">
                <span class="metric-label">Absent</span>
                <div class="metric-values">
                  <span class="metric-count">${absentCount}</span>
                  <span class="metric-percentage">${absentPercentage}%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="attendance-progress">
            <div class="progress-label">
              <span>Attendance Rate</span>
              <span>${presentPercentage}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${presentPercentage}%;"></div>
            </div>
          </div>
        </div>
      `;
    });

    attendanceGrid.innerHTML = summaryHTML;
  }

  /**
   * Update month indicator in the UI
   */
  updateMonthIndicator() {
    const config = this.availableTables[this.currentMonth] || this.monthsConfig[this.currentMonth];
    const monthIndicators = document.querySelectorAll('.current-month-indicator');
    
    monthIndicators.forEach(indicator => {
      indicator.textContent = config.name;
    });
  }

  /**
   * Show loading state
   */
  showLoadingState() {
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
    }
  }

  /**
   * Hide loading state
   */
  hideLoadingState() {
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    if (typeof showToast === 'function') {
      showToast('error', message);
    } else {
      console.error(message);
      alert(message); // Fallback
    }
  }

  /**
   * Get current month configuration
   */
  getCurrentConfig() {
    return this.availableTables[this.currentMonth] || this.monthsConfig[this.currentMonth];
  }

  /**
   * Get current table name
   */
  getCurrentTable() {
    const config = this.availableTables[this.currentMonth] || this.monthsConfig[this.currentMonth];
    return config?.table || 'June_2025';
  }

  /**
   * Get attendance columns for current month
   */
  getCurrentAttendanceColumns() {
    const config = this.availableTables[this.currentMonth] || this.monthsConfig[this.currentMonth];
    return config?.attendanceColumns || [];
  }

  /**
   * Get attendance dates for current month
   */
  getCurrentAttendanceDates() {
    const config = this.availableTables[this.currentMonth] || this.monthsConfig[this.currentMonth];
    return config?.attendanceDates || [];
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing Monthly Tabs Manager...');
  window.monthlyTabsManager = new MonthlyTabsManager();
});

// Export for use in other files
window.MonthlyTabsManager = MonthlyTabsManager;
