document.addEventListener("DOMContentLoaded", () => {
  // ===== Supabase Setup =====
  const SUPABASE_URL = "https://ucizdtqovtajqjkgoyef.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjaXpkdHFvdnRhanFqa2dveWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MTU5NjAsImV4cCI6MjA3NjM5MTk2MH0.c4CfIOGV6HqSTT_GkCZTSxjYfv5YmCHOMuMpXreRX8I";
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ===== Proteksi Login =====
  (async () => {
    const { data } = await client.auth.getSession();
    if (!data.session) {
      window.location.href = "kamar-login.html";
    } else {
      document.getElementById("kamar-email").textContent = data.session.user.email;
    }
  })();

  // ===== Sidebar Navigation =====
  document.querySelectorAll(".sidebar ul li[data-section]").forEach((li) => {
    li.addEventListener("click", () => {
      document
        .querySelectorAll(".section")
        .forEach((sec) => sec.classList.remove("active-section"));
      document
        .querySelectorAll(".sidebar ul li")
        .forEach((l) => l.classList.remove("active"));
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
    await client.auth.signOut();
    window.location.href = "kamar-login.html";
  });

  // ===== DASHBOARD: Status Toko =====
 async function loadStoreStatus() {
  const { data, error } = await client
    .from("store_status")
    .select("*")
    .limit(1)
    .maybeSingle(); // ⬅️ tambahkan ini
  if (error) {
    console.error("Error load store_status:", error.message);
    return;
  }
  if (!data) return;
  document.getElementById("store-status").textContent = `Toko: ${
    data.is_open ? "Buka" : "Tutup"
  } | Maintenance: ${data.is_maintenance ? "Aktif" : "Nonaktif"}`;
  document.getElementById("open-from").value = data.open_from || "";
  document.getElementById("open-to").value = data.open_to || "";
}

  document.getElementById("btn-toggle-open").addEventListener("click", async () => {
    const { data: row } = await client.from("store_status").select("*").maybeSingle();
    if (!row) return;
    await client
      .from("store_status")
      .update({ is_open: !row.is_open, update_at: new Date() })
      .eq("id", row.id);
    await loadStoreStatus();
  });

  document.getElementById("btn-toggle-maint").addEventListener("click", async () => {
    const { data: row } = await client.from("store_status").select("*").maybeSingle();
    if (!row) return;
    await client
      .from("store_status")
      .update({ is_maintenance: !row.is_maintenance, update_at: new Date() })
      .eq("id", row.id);
    await loadStoreStatus();
  });

  document.getElementById("save-store-hours").addEventListener("click", async () => {
    const open_from = document.getElementById("open-from").value;
    const open_to = document.getElementById("open-to").value;
    const { data: row } = await client.from("store_status").select("*").maybeSingle();
    if (!row) return;
    await client
      .from("store_status")
      .update({ open_from, open_to, update_at: new Date() })
      .eq("id", row.id);
    alert("Jam operasional tersimpan!");
  });

  // ===== HERO/BANNER =====
  async function loadHero() {
    const { data: row, error } = await client
      .from("hero_banner")
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("Error load hero_banner:", error.message);
      return;
    }
    if (!row) return;
    document.getElementById("hero-title").value = row.title || "";
    document.getElementById("hero-desc").value = row.description || "";
    document.getElementById("hero-image").value = row.image || "";
  }

  document.getElementById("save-hero").addEventListener("click", async () => {
    const title = document.getElementById("hero-title").value;
    const description = document.getElementById("hero-desc").value;
    const image = document.getElementById("hero-image").value;

    const { data: row } = await client.from("hero_banner").select("*").maybeSingle();

    if (row) {
      await client
  .from("hero_banner")
  .insert([
    {
      title,
      description,
      image,
      created_at: new Date().toISOString(),
      update_at: new Date().toISOString(),
    },
  ]);
 else {
    alert("Banner tersimpan!");
  });

  // ===== PROMO / INFO =====
  async function loadPromos() {
    const { data, error } = await client
      .from("promos")
      .select("*")
      .order("id", { ascending: true });
    if (error) {
      console.error("Error load promos:", error.message);
      return;
    }

    const container = document.getElementById("promo-list");
    container.innerHTML = "";
    (data || []).forEach((p) => {
      const div = document.createElement("div");
      div.innerHTML = `
        <p><strong>${p.title}</strong>: ${p.description} 
        <button data-id="${p.id}" class="btn btn-green btn-promo-edit">Edit</button>
        <button data-id="${p.id}" class="btn btn-red btn-promo-delete">Hapus</button></p>
      `;
      container.appendChild(div);
    });

    document.querySelectorAll(".btn-promo-edit").forEach((btn) => {
      btn.addEventListener("click", () => editPromo(btn.dataset.id));
    });
    document.querySelectorAll(".btn-promo-delete").forEach((btn) => {
      btn.addEventListener("click", () => deletePromo(btn.dataset.id));
    });
  }

  document.getElementById("btn-new-promo").addEventListener("click", async () => {
    const title = prompt("Judul Promo:");
    if (!title) return;
    const description = prompt("Deskripsi Promo:") || "";
    await client
      .from("promos")
      .insert([{ title, description, is_active: true, created_at: new Date(), update_at: new Date() }]);
    await loadPromos();
  });

  async function editPromo(id) {
    const { data: p } = await client.from("promos").select("*").eq("id", id).maybeSingle();
    const title = prompt("Judul Promo:", p.title);
    if (!title) return;
    const description = prompt("Deskripsi Promo:", p.description);
    await client.from("promos").update({ title, description, update_at: new Date() }).eq("id", id);
    await loadPromos();
  }

  async function deletePromo(id) {
    if (!confirm("Hapus promo ini?")) return;
    await client.from("promos").delete().eq("id", id);
    await loadPromos();
  }

  // ===== PRODUK =====
  async function loadProducts() {
    const { data, error } = await client.from("products").select("*");
    if (error) {
      console.error("Error load products:", error.message);
      return;
    }
    const tbody = document.getElementById("products-tbody");
    tbody.innerHTML = "";
    (data || []).forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><img src="${p.image}" alt="${p.name}" style="width:50px;height:50px;"></td>
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
  }

  // ===== SITE INFO =====
  document.getElementById("save-siteinfo").addEventListener("click", async () => {
    const alamat = document.getElementById("site-alamat").value;
    const wa = document.getElementById("site-wa").value;
    const ongkir_per_km = parseFloat(document.getElementById("site-ongkir").value) || 0;

    const { data: row } = await client.from("site_info").select("*").maybeSingle();

    if (row) {
      await client
        .from("site_info")
        .update({ alamat, wa, ongkir_per_km, update_at: new Date() })
        .eq("id", row.id);
    } else {
      await client
        .from("site_info")
        .insert([{ alamat, wa, ongkir_per_km, created_at: new Date(), update_at: new Date() }]);
    }
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




