const SUPABASE_URL = "https://YOUR_SUPABASE_URL.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// PRODUCT CRUD
const productsTbody = document.getElementById("products-tbody");
async function loadProducts() {
  const { data } = await supabase.from("products").select("*");
  productsTbody.innerHTML = "";
  document.getElementById("product-count").textContent = data.length;
  data.forEach(p=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img src="${p.image}" width="50"/></td>
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>${p.price}</td>
      <td>${p.stock}</td>
      <td>${p.is_active ? "Aktif":"Nonaktif"}</td>
      <td>
        <button class="btn-edit" data-id="${p.id}">Edit</button>
        <button class="btn-delete" data-id="${p.id}">Hapus</button>
      </td>
    `;
    productsTbody.appendChild(tr);
  });
}

loadStoreStatus();
loadProducts();
