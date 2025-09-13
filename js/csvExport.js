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
      .from("June_2025")
      .select("*")
      .order("Full Name");

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("No data available");

    // Define CSV headers and their corresponding data keys
    const headerConfig = [
      { header: "Full Name", key: "Full Name" },
      { header: "Gender", key: "Gender" },
      { header: "Phone Number", key: "Phone Number" },
      { header: "Age", key: "Age" },
      { header: "Current Level", key: "Current Level" },
      { header: "Attendance 1st", key: "Attendance 1st" },
      { header: "Attendance 8th", key: "Attendance 8th" },
      { header: "Attendance 15th", key: "Attendance 15th" },
      { header: "Attendance 22nd", key: "Attendance 22nd" },
      { header: "Attendance 29th", key: "Attendance 29th" },
      { header: "Attendance 29th", key: "Attendance 29th" },
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
