// ===== Config Supabase =====
const SUPABASE_URL = "https://ucizdtqovtajqjkgoyef.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjaXpkdHFvdnRhanFqa2dveWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MTU5NjAsImV4cCI6MjA3NjM5MTk2MH0.c4CfIOGV6HqSTT_GkCZTSxjYfv5YmCHOMuMpXreRX8I";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== Elemen DOM =====
const cartListEl = document.getElementById("cart-items");
const subtotalTxt = document.getElementById("subtotalTxt");
const discountTxt = document.getElementById("discountTxt");
const shippingTxt = document.getElementById("shippingTxt");
const totalTxt = document.getElementById("totalTxt");

const promoInput = document.getElementById("promoCode");
const applyPromoBtn = document.getElementById("applyPromoBtn");
const promoMsg = document.getElementById("promoMsg");
const checkoutBtn = document.getElementById("checkout-btn");
const checkoutMsg = document.getElementById("checkout-msg");

const shippingName = document.getElementById("shipping-name");
const shippingPhone = document.getElementById("shipping-phone");
const shippingAddress = document.getElementById("shipping-address");
const shippingCity = document.getElementById("shipping-city");

// ===== STATE =====
let cart = JSON.parse(localStorage.getItem("cart") || "[]");
let appliedPromo = null;
let shippingCost = 0;

// ===== Utility =====
const formatRp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const saveCart = () => localStorage.setItem("cart", JSON.stringify(cart));

// ===== RENDER CART =====
function renderCart() {
  if (cart.length === 0) {
    cartListEl.innerHTML = `<p class="empty">🛒 Keranjang masih kosong</p>`;
    recalcTotals();
    return;
  }

  cartListEl.innerHTML = cart
    .map((item) => {
      // Hitung harga setelah diskon
      let finalPrice = Number(item.price_snapshot);
      if (item.discount) {
        finalPrice = finalPrice - (finalPrice * item.discount) / 100;
      }

      const subtotal = finalPrice * item.qty;
      return `
        <div class="cart-item" data-id="${item.id}">
          <img src="${item.image_url || "images/default-product.png"}" alt="${item.name}">
          <div class="cart-info">
            <h4>${item.name}</h4>
            ${
              item.discount
                ? `<p class="old">Rp ${item.price_snapshot.toLocaleString()}</p>`
                : ""
            }
            <p class="price">${formatRp(finalPrice)}</p>
            <p class="desc">${item.description || ""}</p>
            <div class="qty-row">
              <label>Qty:</label>
              <input type="number" class="qty-input" min="1" value="${item.qty}" data-id="${item.id}">
              <button class="remove-btn" data-id="${item.id}">🗑 Hapus</button>
            </div>
            <p class="subtotal">Subtotal: <strong>${formatRp(subtotal)}</strong></p>
          </div>
        </div>
      `;
    })
    .join("");

  // listener qty & hapus
  document.querySelectorAll(".qty-input").forEach((el) => {
    el.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      updateQty(id, parseInt(e.target.value) || 1);
    });
  });
  document.querySelectorAll(".remove-btn").forEach((b) => {
    b.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      removeItem(id);
    });
  });

  recalcTotals();
}

// ===== Update Qty =====
function updateQty(id, qty) {
  const idx = cart.findIndex((i) => i.id == id);
  if (idx === -1) return;
  cart[idx].qty = qty;
  saveCart();
  renderCart();
}

// ===== Remove Item =====
function removeItem(id) {
  cart = cart.filter((i) => i.id != id);
  saveCart();
  renderCart();
}

// ===== Shipping Calculation =====
function estimateShipping(subtotal) {
  if (subtotal >= 200000) return 0;
  if (subtotal >= 100000) return 10000;
  return 15000;
}

// ===== Totals =====
function recalcTotals() {
  let subtotal = 0;
  cart.forEach((i) => {
    let price = i.price_snapshot;
    if (i.discount) price = price - (price * i.discount) / 100;
    subtotal += price * i.qty;
  });

  let discount = appliedPromo ? appliedPromo.discount : 0;
  shippingCost = estimateShipping(subtotal);
  const total = Math.max(0, subtotal - discount + shippingCost);

  subtotalTxt.textContent = formatRp(subtotal);
  discountTxt.textContent = `- ${formatRp(discount)}`;
  shippingTxt.textContent = formatRp(shippingCost);
  totalTxt.textContent = formatRp(total);
}

// ===== Promo Apply =====
async function applyPromo() {
  const code = promoInput.value.trim();
  promoMsg.textContent = "";
  if (!code) return (promoMsg.textContent = "Masukkan kode promo.");

  applyPromoBtn.disabled = true;
  promoMsg.textContent = "Memeriksa...";

  try {
    const { data: promo, error } = await supabase
      .from("promotions")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error || !promo || !promo.active)
      return (promoMsg.textContent = "Kode promo tidak valid.");

    const now = new Date();
    if (
      (promo.starts_at && new Date(promo.starts_at) > now) ||
      (promo.ends_at && new Date(promo.ends_at) < now)
    )
      return (promoMsg.textContent = "Voucher belum aktif / kadaluwarsa.");

    const subtotal = cart.reduce(
      (s, i) => s + Number(i.price_snapshot) * Number(i.qty),
      0
    );
    if (promo.min_total && subtotal < promo.min_total)
      return (promoMsg.textContent = `Minimal pembelian ${formatRp(
        promo.min_total
      )}`);

    let discount = 0;
    if (promo.type === "percent") discount = subtotal * (promo.value / 100);
    if (promo.type === "fixed") discount = promo.value;

    appliedPromo = { promo, discount };
    promoMsg.textContent = `Diskon ${formatRp(discount)} diterapkan ✅`;
    recalcTotals();
  } catch (err) {
    console.error(err);
    promoMsg.textContent = "Terjadi kesalahan.";
  } finally {
    applyPromoBtn.disabled = false;
  }
}

// ===== Checkout =====
async function checkout() {
  checkoutMsg.textContent = "";
  if (cart.length === 0)
    return (checkoutMsg.textContent = "Keranjang kosong.");

  const name = shippingName.value.trim();
  const phone = shippingPhone.value.trim();
  const address = shippingAddress.value.trim();
  const city = shippingCity.value.trim();

  if (!name || !phone || !address || !city)
    return (checkoutMsg.textContent = "Lengkapi data pengiriman.");

  checkoutBtn.disabled = true;
  checkoutMsg.textContent = "Membuat pesanan...";

  try {
    const subtotal = cart.reduce(
      (s, i) => s + Number(i.price_snapshot) * Number(i.qty),
      0
    );
    const discount = appliedPromo ? appliedPromo.discount : 0;
    const shipping = estimateShipping(subtotal);
    const total = Math.max(0, subtotal - discount + shipping);

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert([
        {
          customer_name: name,
          customer_phone: phone,
          shipping_address: address,
          shipping_city: city,
          subtotal,
          discount_amount: discount,
          shipping_cost: shipping,
          total,
          promo_code: appliedPromo ? appliedPromo.promo.code : null,
        },
      ])
      .select()
      .maybeSingle();

    if (orderErr || !order) throw orderErr;

    const itemsToInsert = cart.map((ci) => ({
      order_id: order.id,
      product_id: ci.id,
      product_name: ci.name,
      qty: ci.qty,
      unit_price: ci.price_snapshot,
      subtotal: Number(ci.price_snapshot) * Number(ci.qty),
    }));

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(itemsToInsert);

    if (itemsErr) throw itemsErr;

    localStorage.removeItem("cart");
    cart = [];
    renderCart();
    promoInput.value = "";
    checkoutMsg.textContent = "Pesanan berhasil dibuat! ✅";
    setTimeout(() => {
      window.location.href = `checkout-success.html?order=${order.id}`;
    }, 1000);
  } catch (err) {
    console.error(err);
    checkoutMsg.textContent = "Gagal checkout: " + err.message;
  } finally {
    checkoutBtn.disabled = false;
  }
}

// ===== Event Bindings =====
applyPromoBtn?.addEventListener("click", applyPromo);
checkoutBtn?.addEventListener("click", checkout);

// Init
renderCart();
