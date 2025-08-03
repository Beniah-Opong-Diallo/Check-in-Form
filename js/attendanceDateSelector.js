// Attendance Date Selector functionality
class AttendanceDateSelector {
  constructor() {
    this.dateOptions = [
      { value: "3rd", label: "3rd" },
      { value: "10th", label: "10th" },
      { value: "17th", label: "17th" },
      { value: "24th", label: "24th" },
    ];

    this.currentSelectedDate =
      window.globalActiveAttendanceDate ||
      localStorage.getItem("globalActiveAttendanceDate") ||
      "3rd";
    this.init();
  }

  init() {
    this.createModal();
    this.attachEventListeners();
    this.updateButtonDisplay();
  }

  createModal() {
    // Create modal HTML
    const modalHTML = `
            <div id="dateSelectModal" class="modal" style="display: none;">
                <div class="modal-content rounded-tr-2xl rounded-br-2xl shadow-2xl p-8 max-w-md mx-auto relative border border-gray-700"
                     style="background-color: #232532;">
                    <h2 class="text-2xl font-bold mb-6 text-center text-white">Select Attendance Date</h2>
                    <div class="form-actions absolute top-4 right-4">
                        <button type="button" id="closeDateModalBtn" title="Close"
                                class="cancel-button p-2 rounded-full bg-gray-600 hover:bg-gray-700 transition text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2"
                                 stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div class="space-y-4 mt-8">
                        <p class="text-white text-center mb-4">Select which date's attendance you want to mark:</p>
                        <div class="date-options-grid">
                            ${this.dateOptions
                              .map(
                                (option) => `
                                <button type="button" 
                                        class="date-option-btn ${
                                          this.currentSelectedDate ===
                                          option.value
                                            ? "selected"
                                            : ""
                                        }" 
                                        data-date="${option.value}">
                                    <span class="date-label">${
                                      option.label
                                    }</span>
                                    <span class="check-icon">✓</span>
                                </button>
                            `
                              )
                              .join("")}
                        </div>
                        <div class="current-selection mt-6 p-4 bg-gray-700 rounded-lg">
                            <p class="text-white text-center">
                                <strong>Currently Selected:</strong> 
                                <span id="currentDateDisplay">${
                                  this.currentSelectedDate
                                }</span>
                            </p>
                        </div>
                        <button id="applyDateSelection" 
                                class="w-full py-3 bg-[#357d39] hover:bg-[#285c2c] text-white font-semibold rounded-lg transition mt-4">
                            Apply Selection
                        </button>
                    </div>
                </div>
            </div>
        `;

    // Add modal to body
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Add CSS styles
    this.addStyles();
  }

  addStyles() {
    const styles = `
            <style>
                .date-options-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                    gap: 12px;
                    margin: 20px 0;
                }

                .date-option-btn {
                    position: relative;
                    padding: 16px 12px;
                    background: #4a5568;
                    color: white;
                    border: 2px solid transparent;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 80px;
                }

                .date-option-btn:hover {
                    background: #357d39;
                    transform: translateY(-2px);
                }

                .date-option-btn.selected {
                    background: #357d39;
                    border-color: #22c55e;
                    box-shadow: 0 4px 12px rgba(53, 125, 57, 0.3);
                }

                .date-option-btn .date-label {
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 4px;
                }

                .date-option-btn .check-icon {
                    opacity: 0;
                    font-size: 18px;
                    color: #22c55e;
                    transition: opacity 0.2s ease;
                }

                .date-option-btn.selected .check-icon {
                    opacity: 1;
                }

                .current-selection {
                    text-align: center;
                    font-size: 14px;
                }

                .attendance-date-btn {
                    position: relative;
                }

                .attendance-date-btn::after {
                    content: attr(data-current-date);
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: #22c55e;
                    color: white;
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-weight: bold;
                    min-width: 20px;
                    text-align: center;
                }
            </style>
        `;
    document.head.insertAdjacentHTML("beforeend", styles);
  }

  attachEventListeners() {
    // Date selector button click
    const dateBtn = document.getElementById("dateSelectorBtn");
    if (dateBtn) {
      dateBtn.addEventListener("click", () => this.showModal());
    }

    // Close modal button
    document.addEventListener("click", (e) => {
      if (e.target.id === "closeDateModalBtn") {
        this.hideModal();
      }
    });

    // Date option selection
    document.addEventListener("click", (e) => {
      if (e.target.closest(".date-option-btn")) {
        const btn = e.target.closest(".date-option-btn");
        const selectedDate = btn.dataset.date;
        this.selectDate(selectedDate);
      }
    });

    // Apply selection button
    document.addEventListener("click", (e) => {
      if (e.target.id === "applyDateSelection") {
        this.applySelection();
      }
    });

    // Close modal when clicking outside
    document.addEventListener("click", (e) => {
      const modal = document.getElementById("dateSelectModal");
      if (e.target === modal) {
        this.hideModal();
      }
    });
  }

  showModal() {
    const modal = document.getElementById("dateSelectModal");
    if (modal) {
      modal.style.display = "block";
    }
  }

  hideModal() {
    const modal = document.getElementById("dateSelectModal");
    if (modal) {
      modal.style.display = "none";
    }
  }

  selectDate(date) {
    // Update temporary selection
    this.currentSelectedDate = date;

    // Update button states
    document.querySelectorAll(".date-option-btn").forEach((btn) => {
      btn.classList.remove("selected");
    });
    document.querySelector(`[data-date="${date}"]`).classList.add("selected");

    // Update display
    const display = document.getElementById("currentDateDisplay");
    if (display) {
      display.textContent = date;
    }
  }

  async applySelection() {
    try {
      // Update global variables
      window.globalActiveAttendanceDate = this.currentSelectedDate;
      localStorage.setItem(
        "globalActiveAttendanceDate",
        this.currentSelectedDate
      );

      // Save to database for persistence across sessions
      if (window.supabase && window.CURRENT_TABLE) {
        await window.supabase.from(window.CURRENT_TABLE).upsert(
          {
            id: "global_attendance_date",
            "Full Name": "SYSTEM_SETTING_ACTIVE_ATTENDANCE_DATE",
            Gender: this.currentSelectedDate,
            "Phone Number": new Date().toISOString(),
            Age: "SYSTEM",
            "Current Level": "ACTIVE_DATE",
          },
          {
            onConflict: "id",
          }
        );
      }

      // Update button display
      this.updateButtonDisplay();

      // Show success message
      if (window.showToast) {
        window.showToast(
          "success",
          `Attendance date set to ${this.currentSelectedDate}`
        );
      }

      // Hide modal
      this.hideModal();

      console.log("Attendance date changed to:", this.currentSelectedDate);
    } catch (error) {
      console.error("Error saving attendance date:", error);
      if (window.showToast) {
        window.showToast("error", "Failed to save attendance date");
      }
    }
  }

  updateButtonDisplay() {
    const dateBtn = document.getElementById("dateSelectorBtn");
    if (dateBtn) {
      dateBtn.setAttribute("data-current-date", this.currentSelectedDate);
      dateBtn.title = `Current: ${this.currentSelectedDate} - Click to change`;
    }
  }

  // Method to get current selected date
  getCurrentDate() {
    return this.currentSelectedDate;
  }

  // Method to programmatically set date
  setDate(date) {
    if (this.dateOptions.find((opt) => opt.value === date)) {
      this.currentSelectedDate = date;
      window.globalActiveAttendanceDate = date;
      localStorage.setItem("globalActiveAttendanceDate", date);
      this.updateButtonDisplay();
      return true;
    }
    return false;
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Initialize date selector
  window.attendanceDateSelector = new AttendanceDateSelector();

  // Set initial date to 3rd if no date is currently selected
  if (!window.globalActiveAttendanceDate) {
    window.attendanceDateSelector.setDate("3rd");
  }
});

// Global function to set attendance date (for external use)
window.setAttendanceDate = function (date) {
  if (window.attendanceDateSelector) {
    return window.attendanceDateSelector.setDate(date);
  }
  return false;
};

// Global function to get current attendance date
window.getCurrentAttendanceDate = function () {
  if (window.attendanceDateSelector) {
    return window.attendanceDateSelector.getCurrentDate();
  }
  return window.globalActiveAttendanceDate || "3rd";
};