// ===== Config Supabase =====
const SUPABASE_URL = "https://ucizdtqovtajqjkgoyef.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjaXpkdHFvdnRhanFqa2dveWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MTU5NjAsImV4cCI6MjA3NjM5MTk2MH0.c4CfIOGV6HqSTT_GkCZTSxjYfv5YmCHOMuMpXreRX8I"; // <-- ganti dengan anon key
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== Elemen DOM =====
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loginMsg = document.getElementById('loginMsg');

// ===== Fungsi Login =====
loginBtn.addEventListener('click', async () => {
  loginMsg.textContent = '';
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    loginMsg.textContent = 'Email dan password wajib diisi.';
    return;
  }

  loginBtn.disabled = true;
  loginMsg.textContent = 'Memproses login...';

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      loginMsg.textContent = 'Login gagal: ' + error.message;
      console.error(error);
    } else {
      loginMsg.textContent = 'Login berhasil! Mengalihkan...';
      // Redirect ke halaman produk setelah login
      setTimeout(() => {
        window.location.href = 'produk.html';
      }, 1000);
    }
  } catch (err) {
    console.error(err);
    loginMsg.textContent = 'Terjadi kesalahan saat login.';
  } finally {
    loginBtn.disabled = false;
  }
});
