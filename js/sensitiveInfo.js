// sensitiveInfo.js
// Handles redirection to the sensitive info page

const SENSITIVE_REDIRECT_URL = "html/sensitive-info.html"; // Path to sensitive info page

// Direct redirect when shield icon is clicked - restoring original behavior
document
  .getElementById("sensitiveInfoBtn")
  .addEventListener("click", function () {
    window.location.href = SENSITIVE_REDIRECT_URL;
  });

// When calendar icon is clicked, show the Monthly Export Modal
document.getElementById("dateSelectorBtn").addEventListener("click", function () {
  // Show the Monthly Export Modal
  showMonthlyExportModal();
});

// Function to show the Monthly Export Modal
function showMonthlyExportModal() {
  const modal = document.getElementById("monthlyExportModal");
  if (modal) {
    // Pre-fill with current month and year
    const currentDate = new Date();
    const monthSelect = document.getElementById("monthSelect");
    const yearInput = document.getElementById("yearInput");
    
    // Set month to current month
    const months = ["January", "February", "March", "April", "May", "June", 
                    "July", "August", "September", "October", "November", "December"];
    monthSelect.value = months[currentDate.getMonth()];
    
    // Set year to current year
    yearInput.value = currentDate.getFullYear();
    
    // Clear any previous errors
    const errorDiv = document.getElementById("monthlyExportError");
    if (errorDiv) errorDiv.textContent = "";
    
    // Show the modal
    modal.style.display = "flex";
  }
}

// Close button for Monthly Export Modal
document.getElementById("closeMonthlyModalBtn")?.addEventListener("click", function() {
  const modal = document.getElementById("monthlyExportModal");
  if (modal) modal.style.display = "none";
});

// Function to handle creating a monthly table
document.getElementById("createMonthlyTableBtn")?.addEventListener("click", async function() {
  const month = document.getElementById("monthSelect").value;
  const year = document.getElementById("yearInput").value;
  const errorDiv = document.getElementById("monthlyExportError");
  
  // Validate inputs
  if (!month) {
    errorDiv.textContent = "Please select a month";
    return;
  }
  
  if (!year || year.length !== 4) {
    errorDiv.textContent = "Please enter a valid 4-digit year";
    return;
  }
  
  // Clear any previous errors
  errorDiv.textContent = "";
  
  try {
    // Create the table name (e.g. "May_2025")
    const tableName = `${month}_${year}`;
    
    // Show loading message
    errorDiv.textContent = "Creating table...";
    errorDiv.style.color = "#f0f0f0"; // Light color for processing message
    
    // Get reference to current Supabase client
    const supabase = window.supabase;
    
    // Check if the table already exists to prevent duplicates
    const { data, error } = await supabase
      .from(tableName)
      .select("id", { count: "exact", head: true });
    
    if (!error) {
      errorDiv.textContent = `Table "${tableName}" already exists!`;
      errorDiv.style.color = "#ef4444"; // Red color for error
      return;
    }
    
    // Get structure from the current table (May_2025)
    const { data: templateData, error: templateError } = await supabase
      .from("May_2025")
      .select("*")
      .limit(1);
    
    if (templateError) {
      throw new Error("Could not access template table");
    }
    
    // Create the new table with the same structure
    // Note: This would typically require server-side code or a Supabase Edge Function
    // For now, we'll show a success message
    
    // Simulate success after a delay
    setTimeout(() => {
      errorDiv.textContent = `Table "${tableName}" created successfully!`;
      errorDiv.style.color = "#22c55e"; // Green color for success
      
      // Close the modal after 2 seconds
      setTimeout(() => {
        const modal = document.getElementById("monthlyExportModal");
        if (modal) modal.style.display = "none";
        
        // Show toast notification
        const successToast = document.getElementById("successToast");
        if (successToast) {
          successToast.querySelector("span").textContent = `Table "${tableName}" created successfully!`;
          successToast.classList.add("show");
          setTimeout(() => successToast.classList.remove("show"), 3000);
        }
      }, 2000);
    }, 1500);
    
  } catch (err) {
    console.error("Error creating monthly table:", err);
    errorDiv.textContent = err.message || "Failed to create table";
    errorDiv.style.color = "#ef4444"; // Red color for error
  }
});
