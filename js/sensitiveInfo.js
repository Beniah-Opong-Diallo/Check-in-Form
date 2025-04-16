// sensitiveInfo.js
// Handles redirection to the sensitive info page

const SENSITIVE_REDIRECT_URL = "html/sensitive-info.html"; // Path to sensitive info page

// Direct redirect when shield icon is clicked
document
  .getElementById("sensitiveInfoBtn")
  .addEventListener("click", function () {
    window.location.href = SENSITIVE_REDIRECT_URL;
  });
