document.addEventListener("DOMContentLoaded", () => {
  // ===== Supabase Setup =====
  const SUPABASE_URL = "https://ucizdtqovtajqjkgoyef.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjaXpkdHFvdnRhanFqa2tveWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MTU5NjAsImV4cCI6MjA3NjM5MTk2MH0.c4CfIOGV6HqSTT_GkCZTSxjYfv5YmCHOMuMpXreRX8I";
  const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ===== Proteksi Login =====
  (async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      window.location.href = "kamar-login.html";
    } else {
      document.getElementById("kamar-email").textContent = data.session.user.email;
    }
  })();

  // ===== Sidebar Navigation =====
  document.querySelectorAll(".sidebar ul li[data-section]").forEach(li => {
    li.addEventListener("click", () => {
      document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active-section"));
      document.querySelectorAll(".sidebar ul li").forEach(l => l.classList.remove("active"));
      const secId = li.dataset.section;
      if (secId) {
        document.getElementById(secId).classList.add("active-section");
        li.classList.add("active");
        document.getElementById("page-title").textContent = li.textContent;
      }
    });
  });

  // ===== Logout =====
  document.getElementById("logout-btn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "kamar-login.html";
  });

  // ===== DASHBOARD: Status Toko =====
  async function loadStoreStatus() {
    const { data } = await supabase.from("store_status").select("*").eq("id", 1).single();
    if (!data) return;
    document.getElementById("store-status").textContent =
      `Toko: ${data.is_open ? "Buka" : "Tutup"} | Maintenance: ${data.is_maintenance ? "Aktif" : "Nonaktif"}`;
    document.getElementById("open-from").value = data.open_from || "";
    document.getElementById("open-to").value = data.open_to || "";
  }

  document.getElementById("btn-toggle-open").addEventListener("click", async () => {
    const { data } = await supabase.from("store_status").select("*").eq("id", 1).single();
    await supabase.from("store_status").update({ is_open: !data.is_open, updated_at: new Date() }).eq("id", 1);
    await loadStoreStatus();
  });

  document.getElementById("btn-toggle-maint").addEventListener("click", async () => {
    const { data } = await supabase.from("store_status").select("*").eq("id", 1).single();
    await supabase.from("store_status").update({ is_maintenance: !data.is_maintenance, updated_at: new Date() }).eq("id", 1);
    await loadStoreStatus();
  });

  document.getElementById("save-store-hours").addEventListener("click", async () => {
    const open_from = document.getElementById("open-from").value;
    const open_to = document.getElementById("open-to").value;
    await supabase.from("store_status").update({ open_from, open_to, updated_at: new Date() }).eq("id", 1);
    alert("Jam operasional tersimpan!");
  });

  // ===== HERO/BANNER =====
  async function loadHero() {
    const { data } = await supabase.from("hero_banner").select("*").eq("id", 1).single();
    if (!data) return;
    document.getElementById("hero-title").value = data.title || "";
    document.getElementById("hero-desc").value = data.description || "";
    document.getElementById("hero-image").value = data.image || "";
  }

  document.getElementById("save-hero").addEventListener("click", async () => {
    const title = document.getElementById("hero-title").value;
    const description = document.getElementById("hero-desc").value;
    const image = document.getElementById("hero-image").value;
    await supabase.from("hero_banner").upsert({ id: 1, title, description, image, updated_at: new Date() });
    alert("Banner tersimpan!");
  });

  // ===== PROMO / INFO =====
  async function loadPromos() {
    const { data } = await supabase.from("promos").select("*").order("id", { ascending: true });
    const container = document.getElementById("promo-list");
    container.innerHTML = "";
    data.forEach(p => {
      const div = document.createElement("div");
      div.innerHTML = `
        <p><strong>${p.title}</strong>: ${p.description} 
        <button data-id="${p.id}" class="btn btn-green btn-promo-edit">Edit</button>
        <button data-id="${p.id}" class="btn btn-red btn-promo-delete">Hapus</button></p>
      `;
      container.appendChild(div);
    });

    document.querySelectorAll(".btn-promo-edit").forEach(btn => {
      btn.addEventListener("click", () => editPromo(btn.dataset.id));
    });
    document.querySelectorAll(".btn-promo-delete").forEach(btn => {
      btn.addEventListener("click", () => deletePromo(btn.dataset.id));
    });
  }

  document.getElementById("btn-new-promo").addEventListener("click", async () => {
    const title = prompt("Judul Promo:");
    if (!title) return;
    const description = prompt("Deskripsi Promo:") || "";
    await supabase.from("promos").insert([{ title, description, is_active: true, created_at: new Date(), updated_at: new Date() }]);
    await loadPromos();
  });

  async function editPromo(id) {
    const { data: p } = await supabase.from("promos").select("*").eq("id", id).single();
    const title = prompt("Judul Promo:", p.title);
    if (!title) return;
    const description = prompt("Deskripsi Promo:", p.description);
    await supabase.from("promos").update({ title, description, updated_at: new Date() }).eq("id", id);
    await loadPromos();
  }

  async function deletePromo(id) {
    if (!confirm("Hapus promo ini?")) return;
    await supabase.from("promos").delete().eq("id", id);
    await loadPromos();
  }

  // ===== PRODUK =====
  async function loadProducts() {
    const { data } = await supabase.from("products").select("*").order("id", { ascending: true });
    const tbody = document.getElementById("products-tbody");
    tbody.innerHTML = "";
    data.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><img src="${p.image}" alt="${p.name}"></td>
        <td>${p.name}</td>
        <td>${p.category || "-"}</td>
        <td>Rp ${p.price}</td>
        <td>${p.promo_price ? "Rp " + p.promo_price + " (min " + p.promo_min_qty + ")" : "-"}</td>
        <td>${p.stock}</td>
        <td>${p.is_active ? "Aktif" : "Nonaktif"}</td>
        <td>
          <button class="btn btn-green btn-edit" data-id="${p.id}">Edit</button>
          <button class="btn btn-red btn-delete" data-id="${p.id}">Hapus</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll(".btn-edit").forEach(btn => {
      btn.addEventListener("click", () => editProduct(btn.dataset.id));
    });
    document.querySelectorAll(".btn-delete").forEach(btn => {
      btn.addEventListener("click", () => deleteProduct(btn.dataset.id));
    });
  }

  document.getElementById("btn-new-product").addEventListener("click", async () => {
    const name = prompt("Nama Produk:");
    if (!name) return;
    const description = prompt("Deskripsi:") || "";
    const category = prompt("Kategori:") || "";
    const price = parseFloat(prompt("Harga:") || 0);
    const promo_price = parseFloat(prompt("Harga Promo (Opsional):") || 0);
    const promo_min_qty = parseInt(prompt("Minimal Qty Promo (Opsional):") || 0);
    const stock = parseInt(prompt("Stok:") || 0);
    const image = prompt("URL Gambar:") || "";
    await supabase.from("products").insert([{ name, description, category, price, promo_price, promo_min_qty, stock, image, is_active: true, created_at: new Date(), updated_at: new Date() }]);
    await loadProducts();
  });

  async function editProduct(id) {
    const { data: p } = await supabase.from("products").select("*").eq("id", id).single();
    const name = prompt("Nama Produk:", p.name);
    if (!name) return;
    const description = prompt("Deskripsi:", p.description);
    const category = prompt("Kategori:", p.category);
    const price = parseFloat(prompt("Harga:", p.price));
    const promo_price = parseFloat(prompt("Harga Promo:", p.promo_price || 0));
    const promo_min_qty = parseInt(prompt("Minimal Qty Promo:", p.promo_min_qty || 0));
    const stock = parseInt(prompt("Stok:", p.stock));
    const is_active = confirm("Aktifkan produk?");
    const image = prompt("URL Gambar:", p.image);
    await supabase.from("products").update({ name, description, category, price, promo_price, promo_min_qty, stock, is_active, image, updated_at: new Date() }).eq("id", id);
    await loadProducts();
  }

  async function deleteProduct(id) {
    if (!confirm("Hapus produk ini?")) return;
    await supabase.from("products").delete().eq("id", id);
    await loadProducts();
  }

  // ===== SITE INFO =====
  document.getElementById("save-siteinfo").addEventListener("click", async () => {
    const alamat = document.getElementById("site-alamat").value;
    const wa = document.getElementById("site-wa").value;
    const ongkir_per_km = parseFloat(document.getElementById("site-ongkir").value) || 0;
    await supabase.from("site_info").upsert({ id: 1, alamat, wa, ongkir_per_km, updated_at: new Date() });
    alert("Informasi Toko tersimpan!");
  });

  // ===== INIT LOAD =====
  (async () => {
    await loadStoreStatus();
    await loadHero();
    await loadPromos();
    await loadProducts();
  })();

});
