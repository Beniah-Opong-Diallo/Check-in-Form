// monthlyExport.js
// Handles the Monthly Table Export feature

// Initialize Supabase client
const supabase = window.supabase.createClient(
  "https://znuxahdqxencqtsvxvja.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudXhhaGRxeGVuY3F0c3Z4dmphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc4MDQzNjUsImV4cCI6MjA1MzM4MDM2NX0.8evCXHMfkn1yhsVB8lQ62BL3b6-j4KZ_oszTuYLT6G0"
);

// Function to handle table creation
async function createMonthlyTable(month, year) {
  const tableName = `TMHT_${month}_${year}`;
  const errorDiv = document.getElementById("monthlyExportError");
  errorDiv.textContent = "";

  try {
    // Check admin authentication
    if (!window.isAdminLoggedIn) {
      throw new Error("Admin login required. Please log in as admin.");
    }

    // Create table in Supabase
    const { error: createError } = await supabase.rpc("execute_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text,
          gender text,
          phone text,
          age int,
          level text,
          attendance6th text,
          attendance12th text,
          attendance16th text,
          attendance23rd text
        );
      `,
    });
    if (createError) {
      if (createError.message.includes("already exists")) {
        throw new Error("A table for this month already exists.");
      } else {
        throw createError;
      }
    }

    // Fetch all person data
    const { data: people, error: fetchError } = await supabase
      .from("people")
      .select("*");
    if (fetchError) {
      throw new Error("Error fetching data: " + fetchError.message);
    }
    if (!people || people.length === 0) {
      throw new Error("No data to copy.");
    }

    // Insert data into the new table
    const { error: insertError } = await supabase
      .from(tableName)
      .insert(people);
    if (insertError) {
      throw new Error("Error inserting data: " + insertError.message);
    }

    // Show success toast
    showToast("success", `Table '${tableName}' created and populated!`);
  } catch (err) {
    errorDiv.textContent = err.message;
  }
}

// Event listener for the Create Table button
document.getElementById("createMonthlyTableBtn").onclick = async function () {
  const month = document.getElementById("monthSelect").value;
  const year = document.getElementById("yearSelect").value;

  if (!month || !year) {
    document.getElementById("monthlyExportError").textContent =
      "Please select both month and year.";
    return;
  }

  await createMonthlyTable(month, year);
};
