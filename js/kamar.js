function updateAdminStatus(open) {
const msg = document.getElementById("admin-status");

if (open) {
  msg.innerHTML = "✅ Toko Sedang <strong>Buka</strong>";
  msg.className = "store-status open";
} else {
  msg.innerHTML = "⚠️ Toko Sedang <strong>Tutup</strong>";
  msg.className = "store-status closed";
  }
}

async function setStore(open) {
  const { error } = await supabaseClient
    .from("store_status")
    .update({
      is_open: open,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1); // ✅ langsung chaining tanpa titik-nyasar

  if (error) {
    console.error("Gagal update status:", error);
  } else {
    updateAdminStatus(open);
  }
}

// load status saat pertama kali
(async () => {
  const { data, error } = await supabaseClient
    .from("store_status")
    .select("is_open")
    .eq("id", 1)
    .maybeSingle();

if (!error && data) {
  updateAdminStatus(data.is_open);
} else {
  console.warn("Belum ada data, silakan klik Buka/Tutup dulu.");
}
})();
