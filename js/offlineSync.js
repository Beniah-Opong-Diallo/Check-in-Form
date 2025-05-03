// offlineSync.js
// Handles offline form data storage and automatic sync when online

class OfflineSync {
  constructor(dbName = "CheckInFormDB", storeName = "pendingForms") {
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
    this.init();
    window.addEventListener("online", () => this.syncPending());
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { autoIncrement: true });
        }
      };
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async savePending(formData) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], "readwrite");
      const store = tx.objectStore(this.storeName);
      store.add({ data: formData, timestamp: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async getAllPending() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], "readonly");
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async clearPending() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], "readwrite");
      const store = tx.objectStore(this.storeName);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async syncPending() {
    if (!navigator.onLine) return;
    const pending = await this.getAllPending();
    if (!pending.length) return;
    for (const item of pending) {
      try {
        // Replace with your actual Supabase insert logic
        const { error } = await window.supabase
          .from("May_2025")
          .insert([item.data]);
        if (error) throw error;
      } catch (err) {
        // If any fail, stop and try again later
        return;
      }
    }
    await this.clearPending();
    // Optionally show a toast or notification
    if (window.showToast) window.showToast("success", "Offline data synced!");
  }
}

// Usage: create a singleton
window.offlineSync = new OfflineSync();

// Example integration in your form submission:
// if (network fails) await window.offlineSync.savePending(formData);
// window.offlineSync.syncPending(); // Optionally call on app start
