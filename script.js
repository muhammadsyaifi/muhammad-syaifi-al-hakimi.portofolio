// ===== PRELOADER: hitung 0% - 100% (dekoratif saja).
  // Layar loading disembunyikan otomatis lewat animasi CSS di style.css,
  // jadi walau baris di bawah ini gagal jalan, halaman tetap muncul normal.
  (function runLoader(){
    const percentEl = document.getElementById('loaderPercent');
    if (!percentEl || !percentEl.firstChild) return;

    const duration = 2200; // ms, samakan kira-kira dengan animation-delay .loader di CSS
    const start = performance.now();
    function easeOutQuart(t){ return 1 - Math.pow(1 - t, 4); }

    function tick(now){
      const t = Math.min((now - start) / duration, 1);
      percentEl.firstChild.textContent = Math.floor(easeOutQuart(t) * 100);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

  // ===== Sinkronkan tinggi header asli ke variabel CSS --header-h =====
  // Ini mencegah navbar (fixed) menutupi tulisan di Beranda, karena tinggi
  // header bisa berubah-ubah (menu wrap, font beda, ukuran layar, dll).
  const headerEl = document.querySelector('header');
  function syncHeaderHeight(){
    if (!headerEl) return;
    const h = Math.ceil(headerEl.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--header-h', h + 'px');
  }
  syncHeaderHeight();
  window.addEventListener('resize', syncHeaderHeight);
  window.addEventListener('load', syncHeaderHeight);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncHeaderHeight);
  }

  const menuBtn = document.getElementById('menuBtn');
  const mainNav = document.getElementById('mainNav');
  if (menuBtn && mainNav) {
    menuBtn.addEventListener('click', () => { mainNav.classList.toggle('open'); syncHeaderHeight(); });
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => mainNav.classList.remove('open'));
    });
  }

  // ===== TOMBOL MUSIK MELAYANG =====
  const musicBtn = document.getElementById('musicBtn');
  const bgMusic = document.getElementById('bgMusic');
  let musicLabels = { id: { play: 'Putar musik', pause: 'Jeda musik' }, en: { play: 'Play music', pause: 'Pause music' } };

  function getCurrentLang(){
    return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'id';
  }
  function updateMusicLabel(){
    const lang = getCurrentLang();
    const state = bgMusic.paused ? 'play' : 'pause';
    musicBtn.setAttribute('aria-label', musicLabels[lang][state]);
  }
  if (musicBtn && bgMusic) {
    musicBtn.addEventListener('click', () => {
      if (bgMusic.paused) {
        bgMusic.play().catch(() => {}); // diamkan jika file lagu belum diganti / browser memblokir
      } else {
        bgMusic.pause();
      }
    });
    bgMusic.addEventListener('play', () => { musicBtn.classList.add('playing'); updateMusicLabel(); });
    bgMusic.addEventListener('pause', () => { musicBtn.classList.remove('playing'); updateMusicLabel(); });
    updateMusicLabel();
  }

  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - 140) current = sec.getAttribute('id');
    });
    navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === '#' + current));
  });

  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e){
      e.preventDefault();
      const nama = document.getElementById('nama').value;
      const email = document.getElementById('emailPengirim').value;
      const pesan = document.getElementById('pesan').value;
      const tujuan = "muhammadsyaifialhakimi@gmail.com"; // GANTI dengan email tujuan Anda jika berbeda
      const subjek = encodeURIComponent("Pesan dari Portofolio - " + nama);
      const body = encodeURIComponent(pesan + "\n\nDari: " + nama + " (" + email + ")");
      window.location.href = `mailto:${tujuan}?subject=${subjek}&body=${body}`;
    });
  }
// ===== Ganti bahasa (Indonesia / English) =====
const langButtons = document.querySelectorAll('.lang-switch button');
const menuBtnLabel = { id: 'Buka menu', en: 'Open menu' };

function setLanguage(lang){
  document.querySelectorAll('[data-' + lang + ']').forEach(el => {
    const text = el.getAttribute('data-' + lang);
    if (el.getAttribute('data-html') === 'true'){
      el.innerHTML = text;
    } else {
      el.textContent = text;
    }
  });
  document.querySelectorAll('[data-' + lang + '-ph]').forEach(el => {
    el.setAttribute('placeholder', el.getAttribute('data-' + lang + '-ph'));
  });
  langButtons.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-lang') === lang));
  document.documentElement.setAttribute('lang', lang);
  if (typeof menuBtn !== 'undefined') {
    menuBtn.setAttribute('aria-label', menuBtnLabel[lang] || menuBtnLabel.id);
  }
  if (typeof updateMusicLabel === 'function') { updateMusicLabel(); }
  try { localStorage.setItem('portofolio-lang', lang); } catch (err) {}
}

langButtons.forEach(btn => {
  btn.addEventListener('click', () => setLanguage(btn.getAttribute('data-lang')));
});

let savedLang = 'id';
try { savedLang = localStorage.getItem('portofolio-lang') || 'id'; } catch (err) {}
if (savedLang === 'en') setLanguage('en');