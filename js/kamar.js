// --------------------------------------
// CONFIG SUPABASE
const SUPABASE_URL = "https://YOUR_SUPABASE_URL.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --------------------------------------
// SECTION SWITCH
const sections = document.querySelectorAll(".section");
document.querySelectorAll(".sidebar ul li[data-section]").forEach(li => {
  li.addEventListener("click", () => {
    sections.forEach(s => s.classList.remove("active-section"));
    document.getElementById(li.dataset.section).classList.add("active-section");
    document.querySelector(".sidebar ul li.active")?.classList.remove("active");
    li.classList.add("active");
    document.getElementById("page-title").textContent = li.textContent.trim();
  });
});

// --------------------------------------
// STORE STATUS
const storeStatusEl = document.getElementById("store-status");
const btnToggleOpen = document.getElementById("btn-toggle-open");
const btnToggleMaint = document.getElementById("btn-toggle-maint");

async function loadStoreStatus() {
  const { data } = await supabase.from("store_status").select("*").eq("id",1).single();
  storeStatusEl.textContent = data.is_maintenance ? "Maintenance" : (data.is_open ? "Toko Sedang Buka" : "Toko Tutup");
  if(data.open_from) document.getElementById("open-from").value = data.open_from.slice(0,5);
  if(data.open_to) document.getElementById("open-to").value = data.open_to.slice(0,5);
}

btnToggleOpen.addEventListener("click", async ()=>{
  const { data } = await supabase.from("store_status").select("*").eq("id",1).single();
  await supabase.from("store_status").update({is_open: !data.is_open, updated_at:new Date()}).eq("id",1);
  loadStoreStatus();
});

btnToggleMaint.addEventListener("click", async ()=>{
  const { data } = await supabase.from("store_status").select("*").eq("id",1).single();
  await supabase.from("store_status").update({is_maintenance: !data.is_maintenance, updated_at:new Date()}).eq("id",1);
  loadStoreStatus();
});

document.getElementById("save-store-hours").addEventListener("click", async ()=>{
  const from = document.getElementById("open-from").value || null;
  const to = document.getElementById("open-to").value || null;
  await supabase.from("store_status").update({open_from:from, open_to:to, updated_at:new Date()}).eq("id",1);
  alert("Jam toko tersimpan!");
});

// --------------------------------------
// PRODUCT CRUD
const productsTbody = document.getElementById("products-tbody");

async function loadProducts() {
  const { data } = await supabase.from("products").select("*");
  productsTbody.innerHTML = "";
  document.getElementById("product-count").textContent = data.length;
  data.forEach(p=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img src="${p.image || ''}" width="50"/></td>
      <td>${p.name}</td>
      <td>${p.category || ''}</td>
      <td>${p.price || 0}</td>
      <td>${p.stock || 0}</td>
      <td>${p.is_active ? "Aktif":"Nonaktif"}</td>
      <td>
        <button class="btn-edit" data-id="${p.id}">Edit</button>
        <button class="btn-delete" data-id="${p.id}">Hapus</button>
      </td>
    `;
    productsTbody.appendChild(tr);
  });

  // Edit
  document.querySelectorAll(".btn-edit").forEach(btn=>{
    btn.addEventListener("click", ()=> editProduct(btn.dataset.id));
  });

  // Delete
  document.querySelectorAll(".btn-delete").forEach(btn=>{
    btn.addEventListener("click", ()=> deleteProduct(btn.dataset.id));
  });
}

// Tambah produk baru
document.getElementById("btn-new-product").addEventListener("click", ()=> {
  const name = prompt("Nama Produk:");
  if(!name) return;
  const category = prompt("Kategori:");
  const price = parseFloat(prompt("Harga:")) || 0;
  const stock = parseInt(prompt("Stok:")) || 0;
  const image = prompt("URL Gambar (opsional):") || "";

  supabase.from("products").insert([{name, category, price, stock, image, is_active:true, created_at:new Date(), updated_at:new Date()}])
    .then(res=>{ loadProducts(); alert("Produk ditambahkan!"); })
    .catch(err=>alert(err.message));
});

// Edit produk
async function editProduct(id) {
  const { data: p } = await supabase.from("products").select("*").eq("id",id).single();
  const name = prompt("Nama Produk:", p.name);
  if(!name) return;
  const category = prompt("Kategori:", p.category);
  const price = parseFloat(prompt("Harga:", p.price)) || 0;
  const stock = parseInt(prompt("Stok:", p.stock)) || 0;
  const is_active = confirm("Aktifkan produk? (OK=Aktif, Cancel=Nonaktif)");
  const image = prompt("URL Gambar:", p.image) || "";

  await supabase.from("products").update({name, category, price, stock, is_active, image, updated_at:new Date()}).eq("id",id);
  loadProducts();
}

// Hapus produk
async function deleteProduct(id) {
  if(!confirm("Hapus produk ini?")) return;
  await supabase.from("products").delete().eq("id",id);
  loadProducts();
}

// Load awal
loadStoreStatus();
loadProducts();
