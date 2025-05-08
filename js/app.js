// Initialize Supabase client
const supabase = window.supabase.createClient(
  "https://znuxahdqxencqtsvxvja.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudXhhaGRxeGVuY3F0c3Z4dmphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc4MDQzNjUsImV4cCI6MjA1MzM4MDM2NX0.8evCXHMfkn1yhsVB8lQ62BL3b6-j4KZ_oszTuYLT6G0"
);

// Change current table to May_2025
const CURRENT_TABLE = "May_2025";

// Define column mappings to match May_2025 table's structure
const COLUMN_MAPPINGS = {
  full_name: "Full Name",
  gender: "Gender",
  phone_number: "Phone Number",
  age: "Age",
  current_level: "Current Level",
  attendance_4nd: "Attendance 4nd",
  attendance_11th: "Attendance 11th",
  attendance_18th: "Attendance 18th",
  attendance_25rd: "Attendance 25rd",
};

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
  attendance13th: document.getElementById("attendance13th"), // Changed ID
  attendance20th: document.getElementById("attendance20th"), // Changed ID
  attendance27th: document.getElementById("attendance27th"), // Changed ID
  cancelButton: document.getElementById("cancelButton"),
  successToast: document.getElementById("successToast"),
  errorToast: document.getElementById("errorToast"),
  categoryFilter: document.getElementById("categoryFilter"),
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

    // Use prefix match for more accurate and faster search
    const { data, error } = await supabase
      .from(CURRENT_TABLE)
      .select("*")
      .ilike("Full Name", `${searchTerm}%`)
      .order("Full Name", { ascending: true });

    if (error) throw error;

    // Cache the results
    searchCache.set(searchTerm, data || []);
    displayItems(data || []);
  } catch (error) {
    console.error("Error searching:", error);
    elements.cardsContainer.innerHTML =
      '<p class="error-message">Error searching records</p>';
  }
}, 100); // Faster debounce for more responsive search

// Add manual search trigger
const searchActionButton = document.getElementById("searchActionButton");
if (searchActionButton && elements.searchInput) {
  searchActionButton.addEventListener("click", () => {
    filterItems();
  });
  elements.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      filterItems();
    }
  });
}

// Optimized event listeners with delegation
elements.addRectButton.addEventListener("click", () =>
  showModal(null, { addMode: true })
);
elements.cancelButton.addEventListener("click", handleCloseClick);
document.addEventListener("DOMContentLoaded", () => {
  if (elements.infoForm) {
    elements.infoForm.addEventListener("submit", handleSubmit);
  }
});
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
  elements.modal.classList.remove("closing");
  elements.infoForm.reset();
  editingId = null;
  // Restore all UI elements
  elements.cancelButton.style.display = "";
  elements.searchInput.style.display = "";
  elements.addRectButton.style.display = "";
  if (elements.searchBarContainer)
    elements.searchBarContainer.style.display = "";
  elements._addModeActive = false;
  // Re-enable the button after modal is hidden
  if (buttonToEnable) buttonToEnable.disabled = false;
}

// Remove button press animation (no requestAnimationFrame)
function addButtonPressAnimation(button) {
  button.classList.add("button-press");
  setTimeout(() => button.classList.remove("button-press"), 100); // keep short for feedback
}

// Optimized display function using requestAnimationFrame and batching
function displayItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    elements.cardsContainer.innerHTML =
      '<p class="error-message">No records found.</p>';
    window.currentItems = [];
    return;
  }
  let htmlString = "";
  for (const item of items) {
    try {
      htmlString += `<div class="result-item" data-id="${item.id}">${getItemHTML(item)}</div>`;
    } catch (err) {
      console.error("Error rendering item:", item, err);
    }
  }
  // Batch DOM update with requestAnimationFrame
  window.requestAnimationFrame(() => {
    elements.cardsContainer.innerHTML = htmlString;
    window.currentItems = items;
  });
}

// Throttle scroll events for virtual scroll (if used)
let lastScroll = 0;
elements.cardsContainer.addEventListener("scroll", function (e) {
  const now = Date.now();
  if (now - lastScroll > SCROLL_THROTTLE) {
    lastScroll = now;
    // Add scroll/virtualization logic here if needed
  }
});

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
        .from(CURRENT_TABLE)
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

      // Update cache and stats
      searchCache.clear();
      fetchAndDisplayStats();
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
  let itemData = "";
  try {
    itemData = encodeURIComponent(JSON.stringify(item));
  } catch (e) {
    itemData = "";
  }
  return `
    <div class="name-row" style="display: flex; align-items: center; gap: 0.5rem;">
      <h3 class="name-text editable-field" style="flex:1; margin:0; cursor:pointer;">
        ${escapeHtml(item["Full Name"] || "")}
      </h3>
      <button class="edit-pen-btn" title="Edit" onclick="window.openEditModal(this.dataset.item ? decodeURIComponent(this.dataset.item) : '{}')" data-item="${itemData}" style="background: none; border: none; cursor: pointer; padding: 0.3rem; display: flex; align-items: center;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#357d39" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/>
        </svg>
      </button>
    </div>
    <div class="quick-attendance-mobile" data-id="${
      item.id
    }" style="display:none;">
      <button class="quick-present-btn" onclick="quickMarkAttendance('${
        item.id
      }', 'Present')">Present</button>
      <button class="quick-absent-btn" onclick="quickMarkAttendance('${
        item.id
      }', 'Absent')">Absent</button>
    </div>
    <div class="info-item">
        <span>Gender:</span>
        <select class="info-select ${
          item["Gender"]?.toLowerCase() === "male"
            ? "male"
            : item["Gender"]?.toLowerCase() === "female"
            ? "female"
            : ""
        }" 
                onchange="updateField(this, 'Gender', this.value, '${
                  item.id
                }')">
            <option value="" disabled ${
              !item["Gender"] ? "selected" : ""
            }>Select Gender</option>
            <option value="Male" ${
              item["Gender"] === "Male" ? "selected" : ""
            }>Male</option>
            <option value="Female" ${
              item["Gender"] === "Female" ? "selected" : ""
            }>Female</option>
        </select>
    </div>
    <div class="info-item">
        <span>Current Level:</span>
        <select class="info-select ${item["Current Level"] ? "has-value" : ""}" 
                onchange="updateField(this, 'Current Level', this.value, '${
                  item.id
                }')">
            <option value="" disabled ${
              !item["Current Level"] ? "selected" : ""
            }>Select Current Level</option>
            <option value="SHS1" ${
              item["Current Level"] === "SHS1" ? "selected" : ""
            }>SHS1</option>
            <option value="SHS2" ${
              item["Current Level"] === "SHS2" ? "selected" : ""
            }>SHS2</option>
            <option value="SHS3" ${
              item["Current Level"] === "SHS3" ? "selected" : ""
            }>SHS3</option>
            <option value="JHS1" ${
              item["Current Level"] === "JHS1" ? "selected" : ""
            }>JHS1</option>
            <option value="JHS2" ${
              item["Current Level"] === "JHS2" ? "selected" : ""
            }>JHS2</option>
            <option value="JHS3" ${
              item["Current Level"] === "JHS3" ? "selected" : ""
            }>JHS3</option>
            <option value="COMPLETED" ${
              item["Current Level"] === "COMPLETED" ? "selected" : ""
            }>COMPLETED</option>
            <option value="UNIVERSITY" ${
              item["Current Level"] === "UNIVERSITY" ? "selected" : ""
            }>UNIVERSITY</option>
        </select>
    </div>
    <div class="info-item">
        <span>Age:</span>
        <input type="number" class="editable-field" value="${
          item["Age"] || ""
        }" 
               min="0" max="100" style="width: 60px;" 
               onchange="updateField(this, 'Age', this.value, '${item.id}')" />
    </div>
    <div class="info-item">
        <span>Phone Number:</span>
        <input type="tel" class="editable-field" value="${escapeHtml(
          item["Phone Number"] || ""
        )}"
               style="width: 120px; background-color: transparent; color: white; border: 1px solid rgba(255, 255, 255, 0.3); padding: 2px 4px; border-radius: 4px;"
               onchange="updateField(this, 'Phone Number', this.value, '${
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

// Make edit modal globally callable for pen icon
window.openEditModal = function (itemJson) {
  let item;
  try {
    item = JSON.parse(itemJson);
  } catch (e) {
    console.error("Failed to parse item for editing", e);
    return;
  }
  showModal(item, { addMode: false });
};

// Function to show modal for adding/editing
function showModal(item = null, options = {}) {
  editingId = item ? item.id : null;
  elements.modalTitle.textContent = item
    ? "Edit Information"
    : "Add New Information";

  elements.infoForm.reset();

  if (options.addMode) {
    elements.cancelButton.style.display = "";
    elements.addRectButton.style.display = "none";
    elements._addModeActive = true;
    if (elements.searchBarContainer)
      elements.searchBarContainer.style.display = "none";
  } else {
    elements.cancelButton.style.display = "";
    elements.addRectButton.style.display = "";
    elements._addModeActive = false;
    if (elements.searchBarContainer)
      elements.searchBarContainer.style.display = "";
  }

  if (item) {
    // Updated to use proper column names from May_2025 table
    elements.nameInput.value = item["Full Name"] || "";
    elements.genderInput.value = item["Gender"] || "";
    elements.phoneInput.value = item["Phone Number"] || "";
    elements.ageInput.value = item["Age"] || "";
    elements.levelInput.value = item["Current Level"] || "";
    if (elements.attendance6th)
      elements.attendance6th.value = item["Attendance 4nd"] || "";
    if (elements.attendance13th)
      elements.attendance13th.value = item["Attendance 11th"] || "";
    if (elements.attendance20th)
      elements.attendance20th.value = item["Attendance 18th"] || "";
    if (elements.attendance27th)
      elements.attendance27th.value = item["Attendance 25rd"] || "";
  }

  elements.modal.style.display = "block";
  elements.nameInput.focus();
  elements.addRectButton.style.display = "none";
  if (elements.searchBarContainer)
    elements.searchBarContainer.style.display = "none";
  // Ensure submit handler is attached every time modal is shown
  if (elements.infoForm) {
    elements.infoForm.removeEventListener("submit", handleSubmit);
    elements.infoForm.addEventListener("submit", handleSubmit);
  }
}

// Optimized form submission
async function handleSubmit(e) {
  console.log("handleSubmit called");
  e.preventDefault();
  const submitButton = e.target.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  let formData = {};
  try {
    // Prepare form data efficiently using the correct column names in May_2025 table
    formData = {
      "Full Name": elements.nameInput.value.trim() || null,
      Gender: elements.genderInput.value || null,
      "Phone Number": elements.phoneInput.value.trim() || null,
      Age: elements.ageInput.value ? parseInt(elements.ageInput.value) : null,
      "Current Level": elements.levelInput.value || null,
      "Attendance 4nd": elements.attendance6th
        ? elements.attendance6th.value
        : null,
      "Attendance 11th": elements.attendance13th
        ? elements.attendance13th.value
        : null,
      "Attendance 18th": elements.attendance20th
        ? elements.attendance20th.value
        : null,
      "Attendance 25rd": elements.attendance27th
        ? elements.attendance27th.value
        : null,
    };

    // Remove null values
    Object.keys(formData).forEach((key) => {
      if (
        formData[key] === null &&
        !["Full Name", "Gender", "Current Level"].includes(key)
      ) {
        delete formData[key];
      }
    });

    if (!formData["Full Name"]) {
      showToast("error", "Full name is required.");
      elements.nameInput.focus();
      submitButton.disabled = false;
      return;
    }

    elements.infoForm.reset();

    // Then perform the database operation with the correct column names
    const { error } = editingId
      ? await supabase.from(CURRENT_TABLE).update(formData).eq("id", editingId)
      : await supabase.from(CURRENT_TABLE).insert([formData]);

    if (error) throw error;

    // Show success message
    showToast("success", "Information saved successfully");

    setTimeout(() => {
      hideModal(); // Close the modal after toast
    }, 1500); // Close modal after 1.5s

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
    // Update stats
    fetchAndDisplayStats().catch(console.error);
  } catch (error) {
    console.error("Error:", error);
    let errorMsg =
      "Failed to save information. Please check your input and try again.";
    if (error && error.message) {
      errorMsg += " (" + error.message + ")";
    }
    showToast("error", errorMsg);
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
    { field: "Attendance 4nd", display: "4th" },
    { field: "Attendance 11th", display: "11th" },
    { field: "Attendance 18th", display: "18th" },
    { field: "Attendance 25rd", display: "25th" },
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

window.quickMarkAttendance = async function (id, value) {
  const item = (window.currentItems || []).find((i) => i.id == id);
  if (!item) return;
  await updateAttendance(
    document.createElement("select"),
    "Attendance 4nd", // Changed to use the 4th date (May 4th) attendance column
    value,
    id
  );
  // Show feedback (toast) only on small screens
  if (window.innerWidth <= 600) {
    showToast("success", "Successfully updated");
  }
  // Optionally, visually highlight the button
  const row = document.querySelector(
    `.quick-attendance-mobile[data-id='${id}']`
  );
  if (row) {
    row
      .querySelectorAll("button")
      .forEach((btn) => btn.classList.remove("selected"));
    const btn = row.querySelector(`.quick-${value.toLowerCase()}-btn`);
    if (btn) btn.classList.add("selected");
  }
};

// Update the attendance update function
async function updateAttendance(select, field, value, itemId) {
  try {
    // Now all attendance fields are TEXT type, store "Present" or "Absent" as strings
    const updateData = { [field]: value };

    const { error } = await supabase
      .from(CURRENT_TABLE)
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
    await fetchAndDisplayStats();
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
      .from(CURRENT_TABLE)
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
    await fetchAndDisplayStats();
  } catch (error) {
    console.error("Error updating field:", error);
    // Use toast notification only - no alert
    showToast("error", "Failed to update");
  }
}

// Function to load initial data
async function loadInitialData() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get("category") || "all";

    // Set the select element to match the URL parameter
    elements.categoryFilter.value = category;

    // Filter by the category from URL
    await filterByCategory(category);
    await fetchAndDisplayStats();
  } catch (error) {
    console.error("Error loading data:", error);
    elements.cardsContainer.innerHTML =
      '<p class="error-message">Error loading records</p>';
  }
}

// Function to fetch and display statistics
async function fetchAndDisplayStats() {
  try {
    const { data, error } = await supabase.from(CURRENT_TABLE).select("*");

    if (error) throw error;

    // Update total count
    document.getElementById("totalPeople").textContent = data.length;

    // Update gender counts
    const genderCounts = data.reduce(
      (acc, item) => {
        const gender = item.gender?.toLowerCase() || "";
        if (gender === "male") acc.boys++;
        if (gender === "female") acc.girls++;
        return acc;
      },
      { boys: 0, girls: 0 }
    );

    document.getElementById("totalBoys").textContent = genderCounts.boys;
    document.getElementById("totalGirls").textContent = genderCounts.girls;

    // Define the order of levels with shortened names
    const levelOrder = [
      "SHS1",
      "SHS2",
      "SHS3",
      "JHS1",
      "JHS2",
      "JHS3",
      "COMPLETED",
      "UNIVERSITY",
    ];

    // Initialize counts for all levels
    const levelCounts = levelOrder.reduce((acc, level) => {
      acc[level] = 0;
      return acc;
    }, {});

    // Count students in each level
    data.forEach((item) => {
      // Convert COMPLETED to COMP and UNIVERSITY to UNI in the data
      let level = item.current_level?.toUpperCase() || "UNKNOWN";
      if (level === "COMPLETED") level = "COMPLETED";
      if (level === "UNIVERSITY") level = "UNIVERSITY";
      if (levelCounts.hasOwnProperty(level)) {
        levelCounts[level]++;
      }
    });

    // Generate HTML for level stats in the specified order
    const levelStatsHtml = levelOrder
      .map((level) => {
        const count = levelCounts[level];
        return `
                    <div class="level-stat">
                        <span class="level-name">${level}</span>
                        <span class="level-count">${count}</span>
                    </div>`;
      })
      .join("");

    document.getElementById("levelStats").innerHTML = levelStatsHtml;
  } catch (error) {
    console.error("Error fetching stats:", error);
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

// Add this function to handle category filtering
async function filterByCategory(category) {
  try {
    let query = supabase.from(CURRENT_TABLE).select("*").order("Full Name");

    if (category !== "all") {
      if (category === "SHS") {
        query = query.or(
          "Current Level.eq.SHS1,Current Level.eq.SHS2,Current Level.eq.SHS3"
        );
      } else if (category === "JHS") {
        query = query.or(
          "Current Level.eq.JHS1,Current Level.eq.JHS2,Current Level.eq.JHS3"
        );
      } else {
        query = query.eq("Current Level", category);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    // Animate out old items
    const oldItems = elements.cardsContainer.children;
    Array.from(oldItems).forEach((item, index) => {
      item.style.transition = "all 0.2s ease";
      item.style.opacity = "0";
      item.style.transform = "scale(0.95)";
    });

    // Wait for animation
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Display new items with animation
    displayItems(data || []);

    // Update the URL to reflect the current filter
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set("category", category);
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${urlParams}`
    );
  } catch (error) {
    console.error("Error filtering by category:", error);
    showToast("error");
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
      .from(CURRENT_TABLE)
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
      "Attendance 2nd": item.attendance_2nd || "",
      "Attendance 9th": item.attendance_9th || "",
      "Attendance 16th": item.attendance_16th || "",
      "Attendance 23rd": item.attendance_23rd || "",
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
          .from(CURRENT_TABLE)
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

        // Clear cache and update stats
        searchCache.clear();
        await fetchAndDisplayStats();
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
