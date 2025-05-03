// CSV Export functionality
async function downloadCSV() {
  const downloadButton = document.getElementById("downloadButton");
  const originalText = downloadButton.textContent;

  try {
    // Update button state
    downloadButton.textContent = "Downloading...";
    downloadButton.disabled = true;

    // Fetch all data from Supabase
    const { data, error } = await supabase
      .from("May_2025")
      .select("*")
      .order("full_name");

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("No data available");

    // Define CSV headers and their corresponding data keys
    const headerConfig = [
      { header: "Full Name", key: "full_name" },
      { header: "Gender", key: "gender" },
      { header: "Phone Number", key: "phone_number" },
      { header: "Age", key: "age" },
      { header: "Current Level", key: "current_level" },
      { header: "Attendance 4nd", key: "attendance_4nd" },
      { header: "Attendance 11th", key: "attendance_11th" },
      { header: "Attendance 18th", key: "attendance_18th" },
      { header: "Attendance 25rd", key: "attendance_25rd" },
    ];

    // Create CSV content
    const headers = headerConfig.map((h) => h.header);
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        headerConfig
          .map(({ key }) => {
            const value = row[key];
            // Handle different data types appropriately
            if (value === null || value === undefined) return '""';
            if (typeof value === "number") return value;
            // Escape quotes and wrap in quotes, remove any newlines
            return `"${String(value).replace(/"/g, '""').replace(/\n/g, " ")}"`;
          })
          .join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");
    const BOM = "\uFEFF"; // Add BOM for Excel UTF-8 compatibility
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    // Generate filename with current date
    const date = new Date().toISOString().split("T")[0];
    const fileName = `TMHT_Teens_Data_${date}.csv`;

    // Handle download based on browser
    if (window.navigator.msSaveOrOpenBlob) {
      // For IE
      window.navigator.msSaveBlob(blob, fileName);
    } else {
      // For modern browsers
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.style.display = "none";
      link.href = url;
      link.setAttribute("download", fileName);

      // Append, click, and cleanup
      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    }

    showToast("success", "CSV downloaded successfully!");
  } catch (error) {
    console.error("Error downloading CSV:", error);
    showToast("error", "Failed to download CSV. Please try again.");
  } finally {
    // Reset button state
    downloadButton.textContent = originalText;
    downloadButton.disabled = false;
  }
}
