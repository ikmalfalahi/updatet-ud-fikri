function renderProducts(list = products) {
  const container = document.getElementById("products-container");
  container.innerHTML = "";

  list.forEach((p, idx) => {
    const diskon = p.discount ? `<span class="diskon">-${p.discount}%</span>` : "";
    const hargaDiskon = p.discount
      ? `<p class="price">Rp ${(p.price - (p.price * p.discount / 100)).toLocaleString()} <span class="old">Rp ${p.price.toLocaleString()}</span></p>`
      : `<p class="price">Rp ${p.price.toLocaleString()}</p>`;

    const promoNote = p.promo
      ? `<p class="promo">Promo: Beli ${p.promo.qty} Rp ${p.promo.price.toLocaleString()}</p>`
      : "";

    const desc = p.description ? `<p class="desc">${p.description}</p>` : "";

    const html = `
      <div class="product-card">
        <div class="img-box">
          <img src="${p.img}" alt="${p.name}">
          ${diskon}
        </div>
        <h3>${p.name}</h3>
        ${hargaDiskon}
        ${desc}
        ${promoNote}
        <button class="add-btn" onclick="addToCart(${idx})">
          <i class="fas fa-cart-plus"></i> Tambah
        </button>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", html);
  });
}
