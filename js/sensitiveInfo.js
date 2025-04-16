// sensitiveInfo.js
// Handles the sensitive info password modal and redirect

const SENSITIVE_PASSWORD = "TMHT"; // Change as needed
const SENSITIVE_REDIRECT_URL = "html/sensitive-info.html"; // Updated path to HTML folder

function showSensitiveModal() {
  // Remove any existing modal
  const old = document.getElementById("sensitiveInfoModal");
  if (old) old.remove();

  const modal = document.createElement("div");
  modal.id = "sensitiveInfoModal";
  modal.className = "sensitive-modal-bg";
  modal.innerHTML = `
    <div class="sensitive-modal">
      <div class="sensitive-modal-header">
        <span class="sensitive-shield-icon">🛡️</span>
        <span class="sensitive-modal-title">Sensitive Information</span>
      </div>
      <form id="sensitiveInfoForm" class="sensitive-modal-form">
        <input type="password" id="sensitivePassword" class="sensitive-modal-input" placeholder="Enter password" autocomplete="off" required style="background:#fff;color:#222;" />
        <div class="sensitive-modal-actions">
          <button type="submit" class="sensitive-modal-btn">Unlock</button>
          <button type="button" class="sensitive-modal-btn cancel" id="sensitiveCancelBtn">Cancel</button>
        </div>
        <div id="sensitiveError" class="sensitive-modal-error" style="display:none;">Incorrect password. Try again.</div>
      </form>
      <div id="sensitiveInfoContent" style="display:none;margin-top:1.5em;text-align:left;color:#222;background:#fff;padding:1.2em 1em 1em 1em;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);font-size:1.08rem;"></div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("sensitiveCancelBtn").onclick = () => modal.remove();
  document.getElementById("sensitiveInfoForm").onsubmit = function (e) {
    e.preventDefault();
    const pw = document.getElementById("sensitivePassword").value;
    if (pw === SENSITIVE_PASSWORD) {
      modal.remove();
      window.location.href = SENSITIVE_REDIRECT_URL;
    } else {
      document.getElementById("sensitiveError").style.display = "";
      document.getElementById("sensitivePassword").value = "";
      document.getElementById("sensitivePassword").focus();
    }
  };
}

document
  .getElementById("sensitiveInfoBtn")
  .addEventListener("click", showSensitiveModal);
