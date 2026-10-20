(() => {
  "use strict";

  const STORAGE_KEY = "madanGameStoreCatalogV1";
  const games = {
    "Genshin Impact": { className: "game-genshin", symbol: "✦", label: "OPEN-WORLD RPG" },
    "Honkai: Star Rail": { className: "game-starrail", symbol: "✧", label: "SPACE FANTASY RPG" },
    "Zenless Zone Zero": { className: "game-zenless", symbol: "◈", label: "URBAN ACTION RPG" },
    "Honkai Impact 3rd": { className: "game-hi3", symbol: "✷", label: "ACTION RPG" }
  };

  const sampleItems = [
    { id: "sample-1", name: "Koleksi Petualangan Teyvat", game: "Genshin Impact", price: 0, status: "Informasi", description: "Contoh kartu katalog. Ganti detail ini dengan informasi koleksi yang akurat." , createdAt: 4},
    { id: "sample-2", name: "Koleksi Perjalanan Antarbintang", game: "Honkai: Star Rail", price: 0, status: "Informasi", description: "Contoh item untuk Honkai: Star Rail. Tambahkan detail yang tidak sensitif.", createdAt: 3},
    { id: "sample-3", name: "Koleksi New Eridu", game: "Zenless Zone Zero", price: 0, status: "Informasi", description: "Contoh item Zenless Zone Zero. Harga nol ditampilkan sebagai hubungi pengelola.", createdAt: 2},
    { id: "sample-4", name: "Koleksi Valkyrie", game: "Honkai Impact 3rd", price: 0, status: "Informasi", description: "Contoh item Honkai Impact 3rd. Edit atau hapus melalui panel admin.", createdAt: 1}
  ];

  const $ = (selector) => document.querySelector(selector);
  const grid = $("#catalog-grid");
  const searchInput = $("#search-input");
  const gameFilter = $("#game-filter");
  const sortFilter = $("#sort-filter");
  const emptyState = $("#empty-state");
  const resultCount = $("#result-count");
  const modal = $("#admin-modal");
  const form = $("#catalog-form");
  const toast = $("#toast");

  let items = loadItems();
  let activeCategory = "all";
  let toastTimeout;

  function loadItems() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (error) {
      console.warn("Katalog lokal tidak dapat dibaca:", error);
    }
    return sampleItems.map(item => ({ ...item }));
  }

  function saveItems() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch (error) {
      showToast("Tidak dapat menyimpan data di browser ini.");
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function formatPrice(price) {
    const amount = Number(price) || 0;
    return amount <= 0 ? "Hubungi pengelola" : "Rp" + amount.toLocaleString("id-ID");
  }

  function statusClass(status) {
    if (status === "Tidak tersedia") return "status-unavailable";
    if (status === "Dalam proses") return "status-pending";
    return "";
  }

  function renderCatalog() {
    const query = searchInput.value.trim().toLocaleLowerCase("id-ID");
    const selectedGame = gameFilter.value;
    let filtered = items.filter(item => {
      const matchesCategory = activeCategory === "all" || item.game === activeCategory;
      const matchesSelect = selectedGame === "all" || item.game === selectedGame;
      const haystack = `${item.name} ${item.game} ${item.description} ${item.status}`.toLocaleLowerCase("id-ID");
      return matchesCategory && matchesSelect && haystack.includes(query);
    });

    switch (sortFilter.value) {
      case "price-low": filtered.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)); break;
      case "price-high": filtered.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0)); break;
      case "name": filtered.sort((a, b) => a.name.localeCompare(b.name, "id")); break;
      default: filtered.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    }

    resultCount.textContent = `${filtered.length} item`;
    grid.innerHTML = filtered.map(item => {
      const game = games[item.game] || { className: "", symbol: "✦", label: "GAME COLLECTION" };
      const status = escapeHTML(item.status || "Informasi");
      return `
        <article class="game-card">
          <div class="card-art ${game.className}">
            <span class="game-symbol" aria-hidden="true">${game.symbol}</span>
            <span class="game-label">${game.label}</span>
          </div>
          <div class="card-body">
            <div class="card-topline">
              <span class="game-name">${escapeHTML(item.game)}</span>
              <span class="status-badge ${statusClass(item.status)}">${status}</span>
            </div>
            <h3>${escapeHTML(item.name)}</h3>
            <p class="card-description">${escapeHTML(item.description)}</p>
            <div class="card-bottom">
              <div><span class="price-label">INFORMASI HARGA</span><strong class="price">${formatPrice(item.price)}</strong></div>
              <span class="info-tag">Katalog info</span>
            </div>
          </div>
        </article>`;
    }).join("");

    emptyState.classList.toggle("hidden", filtered.length !== 0);
    grid.classList.toggle("hidden", filtered.length === 0);
    renderAdminList();
  }

  function renderAdminList() {
    $("#admin-item-count").textContent = `${items.length} item`;
    $("#admin-list").innerHTML = items.length ? items.map(item => `
      <div class="admin-row">
        <div class="admin-row-copy">
          <strong>${escapeHTML(item.name)}</strong>
          <small>${escapeHTML(item.game)} · ${formatPrice(item.price)}</small>
        </div>
        <div class="admin-row-actions">
          <button class="small-button" type="button" data-edit="${escapeHTML(item.id)}">Edit</button>
          <button class="small-button delete" type="button" data-delete="${escapeHTML(item.id)}">Hapus</button>
        </div>
      </div>`).join("") : '<p class="card-description">Belum ada item katalog.</p>';
  }

  function resetForm() {
    form.reset();
    $("#item-id").value = "";
    $("#item-price").value = "0";
    $("#save-item").textContent = "Simpan item";
    $("#cancel-edit").classList.add("hidden");
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function openAdmin() {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    renderAdminList();
  }

  function closeAdmin() {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
    resetForm();
  }

  function editItem(id) {
    const item = items.find(entry => entry.id === id);
    if (!item) return;
    $("#item-id").value = item.id;
    $("#item-name").value = item.name;
    $("#item-game").value = item.game;
    $("#item-price").value = Number(item.price) || 0;
    $("#item-status").value = item.status || "Informasi";
    $("#item-description").value = item.description;
    $("#save-item").textContent = "Simpan perubahan";
    $("#cancel-edit").classList.remove("hidden");
    $("#item-name").focus();
    $(".modal-panel").scrollTo({ top: 0, behavior: "smooth" });
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    const id = $("#item-id").value;
    const previous = items.find(item => item.id === id);
    const newItem = {
      id: id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: $("#item-name").value.trim(),
      game: $("#item-game").value,
      price: Math.max(0, Number($("#item-price").value) || 0),
      status: $("#item-status").value,
      description: $("#item-description").value.trim(),
      createdAt: previous ? previous.createdAt : Date.now()
    };

    if (!newItem.name || !newItem.description) {
      showToast("Isi nama dan detail item terlebih dahulu.");
      return;
    }

    if (id) items = items.map(item => item.id === id ? newItem : item);
    else items.unshift(newItem);

    if (saveItems()) {
      renderCatalog();
      resetForm();
      showToast(id ? "Perubahan disimpan di browser ini." : "Item ditambahkan ke browser ini.");
    }
  });

  $("#admin-open").addEventListener("click", openAdmin);
  $("#admin-close").addEventListener("click", closeAdmin);
  modal.addEventListener("click", event => {
    if (event.target.matches("[data-close-modal]")) closeAdmin();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) closeAdmin();
  });
  $("#cancel-edit").addEventListener("click", resetForm);

  $("#admin-list").addEventListener("click", event => {
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");
    if (editButton) editItem(editButton.dataset.edit);
    if (deleteButton) {
      const id = deleteButton.dataset.delete;
      const item = items.find(entry => entry.id === id);
      if (!item || !confirm(`Hapus item "${item.name}" dari katalog lokal?`)) return;
      items = items.filter(entry => entry.id !== id);
      saveItems();
      renderCatalog();
      showToast("Item dihapus dari browser ini.");
    }
  });

  $("#reset-demo").addEventListener("click", () => {
    if (!confirm("Pulihkan empat contoh katalog? Perubahan lokal saat ini akan diganti.")) return;
    items = sampleItems.map(item => ({ ...item }));
    saveItems();
    resetForm();
    renderCatalog();
    showToast("Contoh katalog dipulihkan.");
  });

  searchInput.addEventListener("input", renderCatalog);
  gameFilter.addEventListener("change", () => {
    if (gameFilter.value !== "all") {
      activeCategory = "all";
      document.querySelectorAll(".category-pill").forEach(button => button.classList.toggle("active", button.dataset.category === "all"));
    }
    renderCatalog();
  });
  sortFilter.addEventListener("change", renderCatalog);

  $("#category-row").addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    gameFilter.value = "all";
    document.querySelectorAll(".category-pill").forEach(pill => pill.classList.toggle("active", pill === button));
    renderCatalog();
  });

  $("#reset-filters").addEventListener("click", () => {
    searchInput.value = "";
    gameFilter.value = "all";
    sortFilter.value = "newest";
    activeCategory = "all";
    document.querySelectorAll(".category-pill").forEach(pill => pill.classList.toggle("active", pill.dataset.category === "all"));
    renderCatalog();
  });

  $("#year").textContent = new Date().getFullYear();
  renderCatalog();
})();
