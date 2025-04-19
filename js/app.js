// Initialize Supabase client
const supabase = window.supabase.createClient(
  "https://znuxahdqxencqtsvxvja.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudXhhaGRxeGVuY3F0c3Z4dmphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc4MDQzNjUsImV4cCI6MjA1MzM4MDM2NX0.8evCXHMfkn1yhsVB8lQ62BL3b6-j4KZ_oszTuYLT6G0"
);

// Performance optimization constants
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache
const DEBOUNCE_DELAY = 250; // Increased debounce delay
const BATCH_SIZE = 20; // Reduced batch size for smoother rendering
const VIRTUAL_SCROLL_BUFFER = 10; // Number of items to render above/below viewport
const SCROLL_THROTTLE = 16; // ~60fps

// Cache DOM elements
const elements = {
  searchInput: document.getElementById("searchInput"),
  addRectButton: document.getElementById("addRectButton"),
  cardsContainer: document.getElementById("cardsContainer"),
  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modalTitle"),
  infoForm: document.getElementById("infoForm"),
  nameInput: document.getElementById("nameInput"),
  genderInput: document.getElementById("genderInput"),
  phoneInput: document.getElementById("phoneInput"),
  ageInput: document.getElementById("ageInput"),
  levelInput: document.getElementById("levelInput"),
  attendance6th: document.getElementById("attendance6th"),
  attendance12th: document.getElementById("attendance12th"),
  attendance16th: document.getElementById("attendance16th"),
  attendance23rd: document.getElementById("attendance23rd"),
  attendance30th: document.getElementById("attendance30th"),
  cancelButton: document.getElementById("cancelButton"),
  closeButton: document.getElementById("closeButton"),
  successToast: document.getElementById("successToast"),
  errorToast: document.getElementById("errorToast"),
  searchBarContainer: document.getElementById("searchBarContainer"),
};

let editingId = null;
let searchCache = {
  data: new Map(),
  timestamps: new Map(),

  set: function (key, value) {
    this.data.set(key, value);
    this.timestamps.set(key, Date.now());
  },

  get: function (key) {
    const timestamp = this.timestamps.get(key);
    if (timestamp && Date.now() - timestamp < CACHE_DURATION) {
      return this.data.get(key);
    }
    this.data.delete(key);
    this.timestamps.delete(key);
    return null;
  },

  clear: function () {
    this.data.clear();
    this.timestamps.clear();
  },
};

let lastSearchTerm = "";
let searchTimeout;

// First, update the debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Then, update the search function
const filterItems = debounce(async function () {
  try {
    const searchTerm = elements.searchInput.value.toLowerCase().trim();

    if (!searchTerm) {
      await loadInitialData();
      return;
    }

    // Check cache
    const cachedResults = searchCache.get(searchTerm);
    if (cachedResults) {
      displayItems(cachedResults);
      return;
    }

    // If not in cache, fetch from database
    const { data, error } = await supabase
      .from("April_2025")
      .select("*")
      .ilike("full_name", `%${searchTerm}%`)
      .order("full_name");

    if (error) throw error;

    // Cache the results
    searchCache.set(searchTerm, data || []);
    displayItems(data || []);
  } catch (error) {
    console.error("Error searching:", error);
    elements.cardsContainer.innerHTML =
      '<p class="error-message">Error searching records</p>';
  }
}, 300); // Increased debounce time slightly for better performance

// Update the event listener
elements.searchInput.removeEventListener("input", filterItems); // Remove old listener if exists
elements.searchInput.addEventListener("input", () => {
  const searchTerm = elements.searchInput.value.trim();
  if (searchTerm === lastSearchTerm) return; // Prevent unnecessary searches

  lastSearchTerm = searchTerm;
  filterItems();
});

// Optimized event listeners with delegation
elements.addRectButton.addEventListener("click", function () {
  showModal(null, { addMode: true });
});
elements.cancelButton.addEventListener("click", handleCloseClick);
elements.closeButton.addEventListener("click", handleCloseClick);
elements.infoForm.addEventListener("submit", handleSubmit);
elements.modal.addEventListener("click", (e) => {
  // Close modal if clicking outside modal-content
  if (e.target === elements.modal) hideModal();
});

// Also close modal if clicking outside the search bar when modal is open
document.addEventListener("mousedown", (e) => {
  if (
    elements.modal.style.display === "block" &&
    !elements.modal.contains(e.target) &&
    !elements.searchInput.contains(e.target)
  ) {
    hideModal();
  }
});

// Optimized close button handler
function handleCloseClick(e) {
  // Disable the button immediately to prevent multiple triggers
  e.target.disabled = true;
  addButtonPressAnimation(e.target);
  hideModal(e.target);
}

// Optimized modal hide
function hideModal(buttonToEnable) {
  // Hide modal instantly and reset state
  elements.modal.style.display = "none";
  elements.infoForm.reset();
  editingId = null;

  // Restore all UI elements
  elements.addRectButton.style.display = "";
  if (elements.searchBarContainer) {
    elements.searchBarContainer.style.display = "";
  }
  elements._addModeActive = false;

  // Re-enable the button after modal is hidden
  if (buttonToEnable) buttonToEnable.disabled = false;
}

// Remove button press animation (no requestAnimationFrame)
function addButtonPressAnimation(button) {
  button.classList.add("button-press");
  setTimeout(() => button.classList.remove("button-press"), 100); // keep short for feedback
}

// Optimized display function (no batching, no requestAnimationFrame)
function displayItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    elements.cardsContainer.innerHTML =
      '<p class="error-message">No records found.</p>';
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    const div = document.createElement("div");
    div.className = "result-item";
    div.setAttribute("data-id", item.id);
    div.innerHTML = getItemHTML(item);
    fragment.appendChild(div);
  }
  elements.cardsContainer.innerHTML = "";
  elements.cardsContainer.appendChild(fragment);
}

// Function to handle inline editing
async function makeFieldEditable(element, itemId, fieldName) {
  // Don't allow editing if already in edit mode
  if (element.classList.contains("editing")) return;

  // Add editing class for visual feedback
  element.classList.add("editable-field", "editing");

  // Get the current value differently for attendance fields
  let currentValue;
  if (fieldName.startsWith("attendance_")) {
    currentValue =
      element.querySelector(".attendance-value")?.textContent.trim() || "N/A";
  } else {
    currentValue =
      element.textContent.split(": ")[1]?.trim() || element.textContent.trim();
  }

  let input;

  // Create appropriate input based on field type
  switch (fieldName) {
    case "gender":
      input = createSelect(["Male", "Female"], currentValue);
      break;
    case "age":
      input = createInput("number", currentValue, { min: "0", max: "100" });
      break;
    case "phone_number":
      input = createInput("tel", currentValue);
      break;
    case "current_level":
      input = createSelect(
        [
          "SHS1",
          "SHS2",
          "SHS3",
          "JHS1",
          "JHS2",
          "JHS3",
          "COMPLETED",
          "UNIVERSITY",
        ],
        currentValue
      );
      break;
    case fieldName.match(/^attendance_/)?.input:
      input = createSelect(["Present", "Absent"], currentValue);
      break;
    default:
      input = createInput("text", currentValue);
  }

  // Store original content for restoration if needed
  const originalContent = element.innerHTML;
  const label = element.querySelector("strong")?.textContent || "";

  // Clear and populate with input
  element.innerHTML = "";
  if (label) {
    const labelText = label.endsWith(":") ? label : label + ":";
    element.appendChild(document.createElement("strong")).textContent =
      labelText + " ";
  }
  element.appendChild(input);

  // Focus the input with a slight delay for animation
  input.focus();

  // Handle save operation
  async function saveChanges() {
    const newValue = input.value.trim();
    if (newValue === currentValue) {
      element.innerHTML = originalContent;
      element.classList.remove("editing");
      return;
    }

    // Add loading state
    element.classList.add("loading");

    try {
      const updateData = { [fieldName]: newValue || null };
      if (fieldName === "age") {
        updateData[fieldName] = newValue ? parseInt(newValue) : null;
      }

      const { error } = await supabase
        .from("April_2025")
        .update(updateData)
        .eq("id", itemId);

      if (error) throw error;

      // Remove editing and loading states
      element.classList.remove("editing", "loading");

      // Update display with success animation
      if (fieldName.startsWith("attendance_")) {
        // Special handling for attendance fields
        element.innerHTML = `
          <span>${fieldName.split("_")[1]}:</span>
          <span class="attendance-value ${
            newValue.toLowerCase() === "present" ? "present" : "absent"
          }">
            ${newValue || "N/A"}
          </span>
        `;
      } else {
        // Regular fields
        if (label) {
          const labelText = label.endsWith(":") ? label : label + ":";
          element.innerHTML = `<strong>${labelText}</strong> ${
            newValue || "N/A"
          }`;
        } else {
          element.textContent = newValue || "N/A";
        }
      }

      // Add success animation
      element.classList.add("save-success");
      setTimeout(() => element.classList.remove("save-success"), 400);

      // Show only toast notification
      showToast("success", "Updated successfully");

      // Update cache
      searchCache.clear();
    } catch (error) {
      console.error("Error updating field:", error);
      element.innerHTML = originalContent;
      element.classList.remove("editing", "loading");
      // Show only toast notification
      showToast("error", "Failed to update");
    }
  }

  // Event listeners for input
  input.addEventListener("blur", saveChanges);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      input.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      element.innerHTML = originalContent;
      element.classList.remove("editing");
    }
  });
}

// Helper function to create select element
function createSelect(options, currentValue) {
  const select = document.createElement("select");
  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option;
    if (option === currentValue) opt.selected = true;
    select.appendChild(opt);
  });
  return select;
}

// Helper function to create input element
function createInput(type, value, attributes = {}) {
  const input = document.createElement("input");
  input.type = type;
  input.value = value === "N/A" ? "" : value;
  Object.entries(attributes).forEach(([key, value]) => {
    input.setAttribute(key, value);
  });
  if (type === "text") {
    input.style.color = "#111";
    input.style.background = "#fff";
  }
  if (type === "number") {
    input.style.width = "80px";
    input.style.maxWidth = "100%";
    input.style.boxSizing = "border-box";
  }
  return input;
}

// Remove requestAnimationFrame from showToast
function showToast(type, message) {
  const toast =
    type === "success" ? elements.successToast : elements.errorToast;

  // Update toast content with icon
  toast.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      ${
        type === "success"
          ? '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>'
          : '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>'
      }
    </svg>
    <span>${message}</span>
  `;

  // Show toast with animation
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000); // Longer duration so user can see it
}

// Update the getItemHTML function to make fields directly editable
function getItemHTML(item) {
  return `
    <div class="name-row" style="display: flex; align-items: center; gap: 0.5rem;">
      <h3 class="name-text editable-field" style="flex:1; margin:0; cursor:pointer;" onclick="makeFieldEditable(this, '${
        item.id
      }', 'full_name')">${escapeHtml(item.full_name)}</h3>
    </div>
    <div class="info-item">
        <span>Gender:</span>
        <select class="info-select ${
          item.gender?.toLowerCase() === "male"
            ? "male"
            : item.gender?.toLowerCase() === "female"
            ? "female"
            : ""
        }" 
                onchange="updateField(this, 'gender', this.value, '${
                  item.id
                }')">
            <option value="" disabled ${
              !item.gender ? "selected" : ""
            }>Select Gender</option>
            <option value="Male" ${
              item.gender === "Male" ? "selected" : ""
            }>Male</option>
            <option value="Female" ${
              item.gender === "Female" ? "selected" : ""
            }>Female</option>
        </select>
    </div>
    <div class="info-item">
        <span>Current Level:</span>
        <select class="info-select ${item.current_level ? "has-value" : ""}" 
                onchange="updateField(this, 'current_level', this.value, '${
                  item.id
                }')">
            <option value="" disabled ${
              !item.current_level ? "selected" : ""
            }>Select Current Level</option>
            <option value="SHS1" ${
              item.current_level === "SHS1" ? "selected" : ""
            }>SHS1</option>
            <option value="SHS2" ${
              item.current_level === "SHS2" ? "selected" : ""
            }>SHS2</option>
            <option value="SHS3" ${
              item.current_level === "SHS3" ? "selected" : ""
            }>SHS3</option>
            <option value="JHS1" ${
              item.current_level === "JHS1" ? "selected" : ""
            }>JHS1</option>
            <option value="JHS2" ${
              item.current_level === "JHS2" ? "selected" : ""
            }>JHS2</option>
            <option value="JHS3" ${
              item.current_level === "JHS3" ? "selected" : ""
            }>JHS3</option>
            <option value="COMPLETED" ${
              item.current_level === "COMPLETED" ? "selected" : ""
            }>COMPLETED</option>
            <option value="UNIVERSITY" ${
              item.current_level === "UNIVERSITY" ? "selected" : ""
            }>UNIVERSITY</option>
        </select>
    </div>
    <div class="info-item">
        <span>Age:</span>
        <input type="number" class="editable-field" value="${item.age || ""}" 
               min="0" max="100" style="width: 60px;" 
               onchange="updateField(this, 'age', this.value, '${item.id}')" />
    </div>
    <div class="info-item">
        <span>Phone Number:</span>
        <input type="tel" class="editable-field" value="${escapeHtml(
          item.phone_number || ""
        )}" 
               style="width: 120px;" 
               onchange="updateField(this, 'phone_number', this.value, '${
                 item.id
               }')" />
    </div>
    <div class="attendance-section">
        <strong>Attendance:</strong><br>
        <div class="attendance-grid">
            ${getAttendanceDisplay(item)}
        </div>
    </div>`;
}

// Function to show modal for adding/editing
function showModal(item = null, options = {}) {
  editingId = item ? item.id : null;
  elements.modalTitle.textContent = item
    ? "Edit Information"
    : "Add New Information";

  // Reset form before setting new values
  elements.infoForm.reset();

  // Always show the cancel button
  elements.cancelButton.style.display = "";

  // Hide the add button when modal is open
  elements.addRectButton.style.display = "none";

  // Track modal state
  elements._addModeActive = options.addMode || false;

  // Hide search bar container when modal is open
  if (elements.searchBarContainer) {
    elements.searchBarContainer.style.display = "none";
  }

  if (item) {
    elements.nameInput.value = item.full_name || "";
    elements.genderInput.value = item.gender || "";
    elements.phoneInput.value = item.phone_number || "";
    elements.ageInput.value = item.age || "";
    elements.levelInput.value = item.current_level || "";
    elements.attendance6th.value = item.attendance_6th || "";
    elements.attendance12th.value = item.attendance_12th || "";
    elements.attendance16th.value = item.attendance_16th || "";
    elements.attendance23rd.value = item.attendance_23rd || "";
    elements.attendance30th.value = item.attendance_30th || "";
  }

  // Display the modal
  elements.modal.style.display = "block";

  // Focus on the name input for better UX
  setTimeout(() => {
    elements.nameInput.focus();
  }, 100);
}

// Optimized form submission
async function handleSubmit(e) {
  e.preventDefault();
  const submitButton = e.target.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    // Only collect fields that exist in your HTML
    const formData = {
      full_name: elements.nameInput.value.trim(),
      gender: elements.genderInput.value,
      phone_number: elements.phoneInput.value.trim(),
      age: elements.ageInput.value ? parseInt(elements.ageInput.value) : null,
      current_level: elements.levelInput.value,
      attendance_16th: elements.attendance16th.value || null,
      attendance_23rd: elements.attendance23rd.value || null,
      // Only include attendance2nd and attendance9th if they exist in the DOM
      ...(elements.attendance2nd
        ? { attendance_2nd: elements.attendance2nd.value || null }
        : {}),
      ...(elements.attendance9th
        ? { attendance_9th: elements.attendance9th.value || null }
        : {}),
    };

    if (!formData.full_name) {
      showToast("error");
      elements.nameInput.focus();
      submitButton.disabled = false;
      return;
    }

    elements.infoForm.reset();

    // Then perform the database operation
    const { error } = editingId
      ? await supabase.from("April_2025").update(formData).eq("id", editingId)
      : await supabase.from("April_2025").insert([formData]);

    if (error) throw error;

    // Show success message
    const toast = document.getElementById("successToast");
    if (toast) {
      toast.querySelector("span").textContent =
        "Information saved successfully";
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 3000);
    }

    // Clear cache and update display
    searchCache.clear();
    editingId = null;

    // Immediately refresh the display so new info shows up right away
    const currentSearch = elements.searchInput.value.trim();
    if (currentSearch) {
      await filterItems();
    } else {
      await loadInitialData();
    }
  } catch (error) {
    console.error("Error:", error);
    showToast("error", error.message || error.description || String(error));
  } finally {
    submitButton.disabled = false;
  }
}

// Helper function to escape HTML content
function escapeHtml(unsafe) {
  if (unsafe == null) return "";
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Update the getAttendanceDisplay function to include both Present and Absent options in the dropdown
function getAttendanceDisplay(item) {
  const attendanceFields = [
    { field: "attendance_6th", display: "6th" },
    { field: "attendance_12th", display: "12th" },
    { field: "attendance_16th", display: "16th" },
    { field: "attendance_23rd", display: "23rd" },
    { field: "attendance_30th", display: "30th" },
  ];
  return attendanceFields
    .map((field) => {
      let value = item[field.field];
      // Convert any value format to Present/Absent
      if (typeof value === "string") {
        if (value.trim().toLowerCase() === "p") value = "Present";
        if (value.trim().toLowerCase() === "a") value = "Absent";
      } else if (typeof value === "number") {
        // Convert 1 to Present, 0 to Absent
        if (value === 1) value = "Present";
        if (value === 0) value = "Absent";
      }

      const selectClass =
        value?.toString().toLowerCase() === "present"
          ? "attendance-select present"
          : value?.toString().toLowerCase() === "absent"
          ? "attendance-select absent"
          : "attendance-select";

      return `<div class="attendance-item">
        <span>${field.display}:</span>
        <select class="${selectClass}" onchange="updateAttendance(this, '${
        field.field
      }', this.value, '${item.id}')">
          <option value="">Select</option>
          <option value="Present" ${
            value === "Present" ? "selected" : ""
          }>Present</option>
          <option value="Absent" ${
            value === "Absent" ? "selected" : ""
          }>Absent</option>
        </select>
      </div>`;
    })
    .join("");
}

// Update the attendance update function
async function updateAttendance(select, field, value, itemId) {
  try {
    // Now all attendance fields are TEXT type, store "Present" or "Absent" as strings
    const updateData = { [field]: value };

    const { error } = await supabase
      .from("April_2025")
      .update(updateData)
      .eq("id", itemId);

    if (error) throw error;

    // Update select element class based on the selected value
    select.className = `attendance-select ${
      value?.toLowerCase() === "present"
        ? "present"
        : value?.toLowerCase() === "absent"
        ? "absent"
        : ""
    }`;

    // Use toast notification only
    showToast("success", "Updated successfully");
    searchCache.clear();
  } catch (error) {
    console.error("Error updating attendance:", error);
    showToast("error", "Failed to update");
  }
}

// Add this function to handle field updates
async function updateField(select, field, value, itemId) {
  try {
    let updateData = {};

    if (field === "age") {
      // Parse age as integer before sending to database
      updateData[field] = value ? parseInt(value) : null;
    } else {
      updateData[field] = value;
    }

    const { error } = await supabase
      .from("April_2025")
      .update(updateData)
      .eq("id", itemId);

    if (error) throw error;

    if (field === "gender") {
      select.className = `info-select ${
        value.toLowerCase() === "male"
          ? "male"
          : value.toLowerCase() === "female"
          ? "female"
          : ""
      }`;
    } else if (field === "current_level") {
      select.className = `info-select ${value ? "has-value" : ""}`;
    }

    // Use toast notification only - no alert
    showToast("success", "Updated successfully");
    searchCache.clear();
  } catch (error) {
    console.error("Error updating field:", error);
    // Use toast notification only - no alert
    showToast("error", "Failed to update");
  }
}

// Function to load initial data (main page version: just load all, no category or stats)
async function loadInitialData() {
  try {
    const { data, error } = await supabase
      .from("April_2025")
      .select("*")
      .order("full_name");
    if (error) throw error;
    displayItems(data || []);
  } catch (error) {
    console.error("Error loading data:", error);
    elements.cardsContainer.innerHTML =
      '<p class="error-message">Error loading records</p>';
  }
}

// Load initial data when page loads
document.addEventListener("DOMContentLoaded", () => {
  initializeThemeSwitcher();
  loadInitialData();
});

// Function to toggle stat content
function toggleStatContent(header) {
  const content = header.nextElementSibling;
  const arrow = header.querySelector(".toggle-arrow");

  if (content.style.maxHeight) {
    content.style.maxHeight = null;
    arrow.textContent = "▼";
  } else {
    content.style.maxHeight = content.scrollHeight + "px";
    arrow.textContent = "▲";
  }
}

// Update the theme switcher initialization
function initializeThemeSwitcher() {
  const themeSwitcher = document.querySelector(".theme-switcher");
  const greenTheme = document.querySelector(".green-theme");
  const purpleTheme = document.querySelector(".purple-theme");
  const blueTheme = document.querySelector(".blue-theme");
  const adminTheme = document.querySelector(".admin-theme");

  // Initialize admin features
  adminFeatures.init();

  // Load saved theme preferences
  const savedColorTheme =
    localStorage.getItem("selectedTheme") || "theme-green";

  // Apply color theme
  document.body.className = savedColorTheme;

  // Activate the correct theme button
  const activeButton = document.querySelector(
    `.${savedColorTheme.replace("theme-", "")}-theme`
  );
  if (activeButton) activeButton.classList.add("active");

  function setTheme(themeName, button) {
    // Set new theme
    document.body.className = themeName;

    localStorage.setItem("selectedTheme", themeName);

    // Update button states
    [greenTheme, purpleTheme, blueTheme, adminTheme].forEach((btn) =>
      btn.classList.remove("active")
    );
    button.classList.add("active");

    // Handle admin sections visibility
    if (themeName === "theme-admin") {
      adminFeatures.showAdminSections();
    } else {
      adminFeatures.hideAdminSections();
    }
  }

  greenTheme.addEventListener("click", () =>
    setTheme("theme-green", greenTheme)
  );
  purpleTheme.addEventListener("click", () =>
    setTheme("theme-purple", purpleTheme)
  );
  blueTheme.addEventListener("click", () => setTheme("theme-blue", blueTheme));
  adminTheme.addEventListener("click", () => {
    if (!adminAuth || !adminAuth.isAuthenticated) {
      if (adminAuth && adminAuth.showModal) {
        adminAuth.showModal();
      } else {
        console.error("Admin authentication not initialized");
      }
    } else {
      setTheme("theme-admin", adminTheme);
    }
  });
}

// Add this function to handle CSV download
async function downloadCSV() {
  try {
    // Show loading state
    const downloadButton = document.getElementById("downloadButton");
    const originalText = downloadButton.textContent;
    downloadButton.textContent = "Downloading...";
    downloadButton.disabled = true;

    // Fetch all data from Supabase
    const { data, error } = await supabase
      .from("April_2025")
      .select("*")
      .order("full_name");

    if (error) throw error;

    if (!data || data.length === 0) {
      showToast("error");
      return;
    }

    // Format data for CSV
    const csvData = data.map((item) => ({
      "Full Name": item.full_name || "",
      Gender: item.gender || "",
      "Phone Number": item.phone_number || "",
      Age: item.age || "",
      "Current Level": item.current_level || "",
      "Attendance 6th": item.attendance_6th || "",
      "Attendance 12th": item.attendance_12th || "",
      "Attendance 16th": item.attendance_16th || "",
      "Attendance 23rd": item.attendance_23rd || "",
      "Attendance 30th": item.attendance_30th || "",
    }));

    // Create CSV content
    const headers = Object.keys(csvData[0]);
    let csvContent = headers.join(",") + "\n";

    csvContent += csvData
      .map((row) => {
        return headers
          .map((header) => {
            let cellData = row[header] || "";
            // Handle commas and quotes in the data
            if (
              cellData.toString().includes(",") ||
              cellData.toString().includes('"')
            ) {
              cellData = `"${cellData.toString().replace(/"/g, '""')}"`;
            }
            return cellData;
          })
          .join(",");
      })
      .join("\n");

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `TMHT_Data_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success message
    showToast("success");
  } catch (error) {
    console.error("Error downloading CSV:", error);
    showToast("error");
  } finally {
    // Reset button state
    const downloadButton = document.getElementById("downloadButton");
    downloadButton.textContent = "Download CSV";
    downloadButton.disabled = false;
  }
}

// Update the showDropdownEdit function with the new button-based design
function showDropdownEdit(element, field) {
  // Get the item ID from the closest result-item parent
  const resultItem = element.closest(".result-item");
  if (!resultItem) {
    console.error("Could not find parent result item");
    return;
  }

  const itemId = resultItem.getAttribute("data-id");
  if (!itemId) {
    console.error("No item ID found");
    return;
  }

  const currentValue =
    element.textContent.split(": ")[1]?.trim() || element.textContent.trim();
  const container = document.createElement("div");
  container.className = "selection-container";

  let options;
  if (field === "gender") {
    options = ["Male", "Female"];
  } else if (field === "level") {
    options = [
      "SHS1",
      "SHS2",
      "SHS3",
      "JHS1",
      "JHS2",
      "JHS3",
      "COMPLETED",
      "UNIVERSITY",
    ];
  }

  // Create buttons for each option
  options.forEach((opt) => {
    const button = document.createElement("button");
    button.className = "selection-button";
    if (opt === currentValue) {
      button.classList.add("selected");
    }
    button.textContent = opt;

    button.addEventListener("click", async () => {
      try {
        // Show loading state
        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = "Updating...";

        // Prepare update data
        const updateData = {};
        if (field === "gender") {
          updateData.gender = opt;
        } else if (field === "level") {
          updateData.current_level = opt;
        }

        console.log("Updating item:", itemId, "with data:", updateData);

        // Perform the update
        const { data, error } = await supabase
          .from("April_2025")
          .update(updateData)
          .eq("id", itemId)
          .select();

        if (error) {
          throw error;
        }

        // Update the display
        const label = field.charAt(0).toUpperCase() + field.slice(1);
        element.innerHTML = `<strong>${label}:</strong> ${opt}`;

        // Show success message
        alert("Update successful");
        showToast("success", "Updated successfully");

        // Clear cache
        searchCache.clear();
      } catch (error) {
        console.error("Error updating:", error);
        alert("Failed to update");
        showToast("error", "Failed to update");

        // Restore original content
        const label = field.charAt(0).toUpperCase() + field.slice(1);
        element.innerHTML = `<strong>${label}:</strong> ${currentValue}`;
      } finally {
        // Reset button state
        button.disabled = false;
        button.textContent = originalText;
      }
    });

    container.appendChild(button);
  });

  // Add a cancel button
  const cancelButton = document.createElement("button");
  cancelButton.className = "selection-button cancel";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", () => {
    container.classList.add("closing");
    setTimeout(() => {
      const label = field.charAt(0).toUpperCase() + field.slice(1);
      element.innerHTML = `<strong>${label}:</strong> ${currentValue}`;
    }, 200);
  });
  container.appendChild(cancelButton);

  // Replace content with selection interface
  element.innerHTML = "";
  element.appendChild(container);
}
