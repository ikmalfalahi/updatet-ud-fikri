// === Supabase init ===
const supabaseUrl = "https://ucizdtqovtajqjkgoyef.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjaXpkdHFvdnRhanFqa2dveWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MTU5NjAsImV4cCI6MjA3NjM5MTk2MH0.c4CfIOGV6HqSTT_GkCZTSxjYfv5YmCHOMuMpXreRX8I";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const productList = document.getElementById("product-list");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

// Helper: hitung harga final per unit dengan memperhatikan discount_type & tiered_discounts
function getUnitPrice(product, qty = 1) {
  // 1) cek tiered discounts (paling prioritas)
  if (product.tiered_discounts) {
    try {
      const tiers = Array.isArray(product.tiered_discounts)
        ? product.tiered_discounts
        : JSON.parse(product.tiered_discounts);
      // cari tier tertinggi yang min <= qty
      let best = null;
      for (const t of tiers) {
        if (qty >= Number(t.min)) {
          if (!best || Number(t.min) > Number(best.min)) best = t;
        }
      }
      if (best && best.price) return Number(best.price);
    } catch (err) {
      console.warn("Invalid tiered_discounts for product", product.id, err);
    }
  }

  // 2) harga dasar
  let price = Number(product.price);

  // 3) diskon sederhana (percent/fixed)
  if (product.discount_type && product.discount_value) {
    const t = product.discount_type;
    const v = Number(product.discount_value);
    if (t === "percent") {
      price = price * (1 - v / 100);
    } else if (t === "fixed") {
      price = Math.max(0, price - v);
    }
  }

  return price;
}

// render product card
function renderProducts(data) {
  if (!data || data.length === 0) {
    productList.innerHTML = `<p>Tidak ada produk ditemukan.</p>`;
    return;
  }

  productList.innerHTML = data
    .map((p) => {
      const discountBadge =
        p.discount_type && p.discount_value
          ? `<div class="badge-discount">${p.discount_type==='percent'?p.discount_value+'%':'Rp '+Number(p.discount_value).toLocaleString()}</div>`
          : "";
      const oldPriceHtml = p.old_price
        ? `<span class="old-price">Rp ${Number(p.old_price).toLocaleString("id-ID")}</span>`
        : "";
      return `
      <div class="product-card" data-id="${p.id}">
        <div class="card-media">
          ${discountBadge}
          <img src="${p.image_url || 'images/default-product.png'}" alt="${p.name}">
        </div>
        <div class="product-info">
          <h3>${p.name}</h3>
          <p class="category">${p.category || ''}</p>
          <p>
            <span class="price">Rp ${Number(getUnitPrice(p,1)).toLocaleString("id-ID")}</span>
            ${oldPriceHtml}
          </p>
          <p class="stock">Stok: ${typeof p.stock !== 'undefined' ? p.stock : '—'}</p>
          <div class="card-actions">
            <input type="number" min="1" max="${p.stock||9999}" value="1" class="qty-input" id="qty-${p.id}">
            <button class="add-cart-btn" onclick="addToCart('${p.id}', '${escapeHtml(p.name)}')">+ Keranjang</button>
            <button class="detail-btn" onclick="showDetail('${p.id}')">Detail</button>
          </div>
        </div>
      </div>
      `;
    })
    .join("");
}

// helper escape HTML in onclick argument
function escapeHtml(str){
  return String(str).replace(/'/g, "\\'").replace(/"/g,'\\"');
}

// load and attach events
async function loadProducts() {
  productList.innerHTML = `<p class="loading">🌀 Memuat produk...</p>`;
  const { data, error } = await supabase.from("products").select("*").order('created_at', { ascending: false });
  if (error) {
    productList.innerHTML = `<p style="color:red;">Gagal memuat produk</p>`;
    console.error(error);
    return;
  }
  renderProducts(data);

  // attach listeners for search + filter
  const raw = data; // simpan reference
  if (searchInput) searchInput.addEventListener("input", () => filterProducts(raw));
  if (categoryFilter) categoryFilter.addEventListener("change", () => filterProducts(raw));
}

// filter local
function filterProducts(products) {
  const keyword = searchInput ? searchInput.value.toLowerCase() : "";
  const category = categoryFilter ? categoryFilter.value : "";
  const filtered = products.filter(p =>
    (p.name || '').toLowerCase().includes(keyword) &&
    (category ? (p.category||'') === category : true)
  );
  renderProducts(filtered);
}

// show detail modal (sederhana)
window.showDetail = async function (id) {
  // ambil produk by id
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
  if (error || !data) {
    alert("Produk tidak ditemukan.");
    return;
  }
  const p = data;
  const html = `
    <div class="detail-modal">
      <div class="detail-inner">
        <button class="close" onclick="closeDetail()">×</button>
        <h2>${p.name}</h2>
        <img src="${p.image_url || 'images/default-product.png'}" alt="${p.name}" style="max-width:100%;height:auto;">
        <p class="price">Rp ${Number(getUnitPrice(p,1)).toLocaleString('id-ID')}</p>
        <div class="desc">${p.description || '-'}</div>
        <p>Stok: ${p.stock||0}</p>
        <div style="margin-top:12px;">
          <input type="number" id="modal-qty" min="1" max="${p.stock||9999}" value="1" style="width:90px;padding:8px;">
          <button onclick="addToCart('${p.id}','${escapeHtml(p.name)}', document.getElementById('modal-qty').value)">Tambah ke Keranjang</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

window.closeDetail = function(){
  const m = document.querySelector('.detail-modal');
  if (m) m.remove();
}

// addToCart with qty and price calculation
window.addToCart = function (id, name, qtyArg) {
  const qtyInput = qtyArg ? Number(qtyArg) : Number(document.getElementById(`qty-${id}`)?.value || 1);
  if (qtyInput <= 0) return alert("Qty minimal 1");

  // ambil produk lokal di DOM (lebih aman: fetch product dari supabase)
  (async () => {
    const { data: product } = await supabase.from("products").select("*").eq("id", id).single();
    if (!product) return alert("Produk tidak ditemukan");
    if (product.stock && qtyInput > product.stock) return alert("Stok tidak cukup");

    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const idx = cart.findIndex(i => i.id === id);
    if (idx !== -1) {
      cart[idx].qty += qtyInput;
    } else {
      // simpan price snapshot = harga per unit saat ditambahkan (menghitung tier/diskon)
      const unitPrice = getUnitPrice(product, qtyInput);
      cart.push({ id, name, price_snapshot: Number(unitPrice), qty: qtyInput });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    alert(`${name} (${qtyInput}) ditambahkan ke keranjang`);
    closeDetail(); // kalau modal terbuka
  })();
}

// Inisialisasi
loadProducts();
