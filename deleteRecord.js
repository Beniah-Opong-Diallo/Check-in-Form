// deleteRecord.js
// Show a custom modal for delete confirmation
function showDeleteConfirm(onConfirm) {
  // Remove any existing modal
  const old = document.getElementById('deleteConfirmModal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'deleteConfirmModal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(0,0,0,0.35)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';

  modal.innerHTML = `
    <div style="background:#fff;padding:2rem 2.5rem;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.18);text-align:center;max-width:90vw;">
      <div style="font-size:2.2rem;margin-bottom:0.5rem;">🗑️</div>
      <div style="font-size:1.1rem;margin-bottom:1.2rem;">Are you sure you want to delete this record?</div>
      <div style="display:flex;gap:1.5rem;justify-content:center;">
        <button id="deleteYesBtn" style="background:#ef4444;color:#fff;padding:0.6em 1.5em;border:none;border-radius:8px;font-size:1rem;cursor:pointer;">Yes, Delete</button>
        <button id="deleteNoBtn" style="background:#e5e7eb;color:#222;padding:0.6em 1.5em;border:none;border-radius:8px;font-size:1rem;cursor:pointer;">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('deleteNoBtn').onclick = () => modal.remove();
  document.getElementById('deleteYesBtn').onclick = () => {
    modal.remove();
    onConfirm();
  };
}

// Delete a record from Supabase and remove it from the UI
async function deleteRecord(id, btn) {
  showDeleteConfirm(async () => {
    btn.disabled = true;
    btn.textContent = '...';
    try {
      const { error } = await supabase.from('TMHCT_Feb').delete().eq('id', id);
      if (error) throw error;
      // Remove the card from the UI
      const card = btn.closest('.result-item');
      if (card) card.remove();
      showToast('success', 'Deleted successfully');
      fetchAndDisplayStats && fetchAndDisplayStats();
    } catch (err) {
      showToast('error', 'Delete failed');
      btn.disabled = false;
      btn.textContent = '🗑️';
    }
  });
}
// Make available globally for inline HTML usage
window.deleteRecord = deleteRecord;
