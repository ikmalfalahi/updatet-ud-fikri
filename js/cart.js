// ===== Config Supabase =====
const SUPABASE_URL = "https://ucizdtqovtajqjkgoyef.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjaXpkdHFvdnRhanFqa2dveWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MTU5NjAsImV4cCI6MjA3NjM5MTk2MH0.c4CfIOGV6HqSTT_GkCZTSxjYfv5YmCHOMuMpXreRX8I";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== Element refs =====
const cartListEl = document.getElementById("cart-list");
const subtotalTxt = document.getElementById("subtotalTxt");
const discountTxt = document.getElementById("discountTxt");
const shippingTxt = document.getElementById("shippingTxt");
const totalTxt = document.getElementById("totalTxt");
const promoInput = document.getElementById("promoCode");
const applyPromoBtn = document.getElementById("applyPromoBtn");
const promoMsg = document.getElementById("promoMsg");
const checkoutBtn = document.getElementById("checkoutBtn");
const checkoutMsg = document.getElementById("checkoutMsg");

const shippingName = document.getElementById("shippingName");
const shippingPhone = document.getElementById("shippingPhone");
const shippingAddress = document.getElementById("shippingAddress");
const shippingCity = document.getElementById("shippingCity");

// ===== State =====
let cart = JSON.parse(localStorage.getItem("cart") || "[]"); // [{id,name,price_snapshot,qty,image_url}]
let appliedPromo = null; // {promo,discount}
let shippingCost = 0;

// ===== Utility =====
function formatRp(n){ return "Rp " + Number(n||0).toLocaleString("id-ID"); }
function saveCart(){ localStorage.setItem("cart", JSON.stringify(cart)); }

// ===== Cart rendering =====
function renderCart(){
  if (!cart || cart.length === 0){
    cartListEl.innerHTML = `<p class="empty">Keranjang kosong. Tambah produk dulu ya 😊</p>`;
    recalcTotals();
    return;
  }

  cartListEl.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="card-media"><img src="${item.image_url||'images/default-product.png'}" alt="${item.name}"></div>
      <div>
        <div class="item-title">${item.name}</div>
        <div class="item-meta">Rp ${Number(item.price_snapshot).toLocaleString()} • subtotal: <strong>${formatRp(item.price_snapshot * item.qty)}</strong></div>
        <div class="qty-control">
          <label>Qty</label>
          <input type="number" min="1" value="${item.qty}" class="qty-input" data-id="${item.id}">
          <button class="remove-btn" data-id="${item.id}">Hapus</button>
        </div>
      </div>
      <div class="price-col">
        <div class="price">${formatRp(item.price_snapshot)}</div>
        <div class="card-actions"></div>
      </div>
    </div>
  `).join('');

  // attach listeners
  document.querySelectorAll(".qty-input").forEach(el=>{
    el.addEventListener("change", (e)=>{
      const id = e.target.dataset.id;
      let newQty = parseInt(e.target.value) || 1;
      updateQty(id, newQty);
    });
  });
  document.querySelectorAll(".remove-btn").forEach(b=>{
    b.addEventListener("click", (e)=>{
      const id = e.target.dataset.id;
      removeItem(id);
    });
  });

  recalcTotals();
}

// ===== Update qty & remove =====
function updateQty(id, qty){
  const idx = cart.findIndex(i=>i.id===id);
  if (idx === -1) return;
  // optionally check stock by fetching product (better)
  cart[idx].qty = qty;
  saveCart();
  renderCart();
}

function removeItem(id){
  cart = cart.filter(i=>i.id!==id);
  saveCart();
  renderCart();
}

// ===== Calculate totals =====
function recalcTotals(){
  const subtotal = cart.reduce((s,i)=> s + Number(i.price_snapshot)*Number(i.qty), 0);
  let discount = 0;
  if (appliedPromo && appliedPromo.discount) discount = appliedPromo.discount;
  // shippingCost can be dynamic; we estimate below
  shippingCost = estimateShipping(subtotal);
  const total = Math.max(0, subtotal - discount + shippingCost);

  subtotalTxt.textContent = formatRp(subtotal);
  discountTxt.textContent = `- ${formatRp(discount)}`;
  shippingTxt.textContent = formatRp(shippingCost);
  totalTxt.textContent = formatRp(total);
}

// ===== Estimate shipping simple =====
function estimateShipping(subtotal){
  // simple rules:
  // subtotal >= 200k -> free shipping
  // subtotal 100k-200k -> 10k
  // subtotal <100k -> 15k
  if (subtotal >= 200000) return 0;
  if (subtotal >= 100000) return 10000;
  return 15000;
}

// ===== Promo apply (fetch from promotions table) =====
async function applyPromo(){
  const code = (promoInput.value || "").trim();
  promoMsg.textContent = "";
  appliedPromo = null;
  if (!code) { promoMsg.textContent = "Masukkan kode promo."; return; }

  applyPromoBtn.disabled = true;
  promoMsg.textContent = "Memeriksa promo...";
  try {
    const { data: promo, error } = await supabase
      .from("promotions")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error || !promo || !promo.active) {
      promoMsg.textContent = "Kode promo tidak valid atau sudah tidak aktif.";
      return;
    }

    const now = new Date();
    if ((promo.starts_at && new Date(promo.starts_at) > now) || (promo.ends_at && new Date(promo.ends_at) < now)){
      promoMsg.textContent = "Voucher belum aktif atau sudah kadaluwarsa.";
      return;
    }

    const subtotal = cart.reduce((s,i)=> s + Number(i.price_snapshot)*Number(i.qty), 0);
    if (promo.min_total && subtotal < Number(promo.min_total)){
      promoMsg.textContent = `Minimal pembelian ${formatRp(promo.min_total)} untuk menggunakan kode ini.`;
      return;
    }

    // calculate discount
    let discount = 0;
    if (promo.type === "percent") discount = subtotal * (Number(promo.value)/100);
    else if (promo.type === "fixed") discount = Number(promo.value);

    discount = Math.min(discount, subtotal);
    appliedPromo = { promo, discount };
    promoMsg.textContent = `Berhasil. Diskon ${formatRp(discount)} diterapkan.`;
    recalcTotals();
  } catch (err){
    console.error(err);
    promoMsg.textContent = "Terjadi kesalahan saat cek promo.";
  } finally {
    applyPromoBtn.disabled = false;
  }
}

// ===== Checkout: create order in Supabase =====
async function checkout(){
  checkoutMsg.textContent = "";
  if (!cart || cart.length === 0) { checkoutMsg.textContent = "Keranjang kosong."; return; }

  const name = shippingName.value.trim();
  const phone = shippingPhone.value.trim();
  const address = shippingAddress.value.trim();
  const city = shippingCity.value;

  if (!name || !phone || !address || !city) {
    checkoutMsg.textContent = "Lengkapi data pengiriman terlebih dahulu.";
    return;
  }

  checkoutBtn.disabled = true;
  checkoutMsg.textContent = "Membuat pesanan...";

  try {
    const subtotal = cart.reduce((s,i)=> s + Number(i.price_snapshot)*Number(i.qty), 0);
    const discount = appliedPromo ? appliedPromo.discount : 0;
    const shipping = estimateShipping(subtotal);
    const total = Math.max(0, subtotal - discount + shipping);

    // Insert order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert([{
        customer_name: name,
        customer_phone: phone,
        shipping_address: address,
        shipping_city: city,
        shipping_cost: shipping,
        subtotal: subtotal,
        discount_amount: discount,
        total: total,
        promo_code: appliedPromo ? appliedPromo.promo.code : null,
      }])
      .select()
      .maybeSingle();

    if (orderErr || !order) {
      throw orderErr || new Error("Gagal buat order.");
    }

    // Insert order items
    const itemsToInsert = cart.map(ci => ({
      order_id: order.id,
      product_id: ci.id,
      product_name: ci.name,
      qty: ci.qty,
      unit_price: ci.price_snapshot,
      subtotal: Number(ci.price_snapshot) * Number(ci.qty)
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(itemsToInsert);
    if (itemsErr) {
      // NOTE: jika mau rollback, buat logic di server. Di client ini kita informasikan.
      console.error(itemsErr);
      checkoutMsg.textContent = "Pesanan dibuat, tetapi gagal menyimpan item (cek log).";
    } else {
      // clear cart
      localStorage.removeItem("cart");
      cart = [];
      renderCart();
      appliedPromo = null;
      promoInput.value = "";
      checkoutMsg.textContent = "Pesanan berhasil dibuat! ID: " + order.id;
      // redirect atau tampilkan instruksi pembayaran
      setTimeout(()=> {
        window.location.href = `checkout-success.html?order=${order.id}`;
      }, 1200);
    }

  } catch (err){
    console.error(err);
    checkoutMsg.textContent = "Gagal proses checkout: " + (err.message || err);
  } finally {
    checkoutBtn.disabled = false;
  }
}

// ===== Init events =====
applyPromoBtn.addEventListener("click", applyPromo);
checkoutBtn.addEventListener("click", checkout);

// Load cart on start
renderCart();
