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

  // ===== MUAT FOTO PROFIL (dengan fallback) =====
  // Kenapa ini dibutuhkan: sebelumnya foto dimuat langsung lewat atribut
  // src="assets/foto-profil.jpg" + onload/onerror inline di HTML. Ini rapuh
  // karena banyak hosting (GitHub Pages, Netlify, Vercel, dll) berjalan di
  // server Linux yang case-sensitive terhadap nama file — kalau file aslinya
  // "Foto-Profil.JPG" atau ".jpeg", di PC/laptop (Windows/Mac = case-insensitive,
  // atau saat dites lewat file:// lokal) foto tetap muncul, tapi begitu situs
  // di-deploy dan dibuka dari HP, request gagal (404) sehingga foto hilang.
  //
  // Solusinya: coba beberapa kemungkinan nama file/ekstensi berurutan.
  // Kalau SEMUA gagal, baru tampilkan avatar inisial sebagai fallback,
  // supaya kartu profil tidak terlihat kosong di perangkat manapun.
  (function loadProfilePhoto(){
    const img = document.getElementById('profilePhoto');
    const fallback = document.getElementById('profilePhotoFallback');
    if (!img) return;

    // GANTI/tambahkan path di sini jika nama file foto Anda berbeda.
    // Urutan dicoba dari atas ke bawah.
    const candidates = [
      'assets/foto-profil.jpg',
      'assets/foto-profil.jpeg',
      'assets/foto-profil.png',
      'assets/foto-profil.JPG',
      'assets/foto-profil.PNG',
      'assets/Foto-Profil.jpg',
      'assets/Foto-Profil.JPG'
    ];

    function tryLoad(i){
      if (i >= candidates.length) {
        console.warn('[Foto Profil] Semua kandidat file gagal dimuat, menampilkan fallback avatar. Path yang dicoba:', candidates);
        if (fallback) fallback.classList.add('show');
        return;
      }
      const testImg = new Image();
      testImg.onload = () => {
        img.src = candidates[i];
        img.style.display = 'block';
        if (fallback) fallback.classList.remove('show');
      };
      testImg.onerror = () => tryLoad(i + 1);
      testImg.src = candidates[i];
    }

    tryLoad(0);
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

  // ===== SCROLL REVEAL: elemen mendapat class "in-view" saat masuk viewport =====
  (function initScrollReveal(){
    const revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;

    if (!('IntersectionObserver' in window)) {
      revealEls.forEach(el => el.classList.add('in-view'));
      return;
    }

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    revealEls.forEach(el => revealObserver.observe(el));
  })();

  // ===== HOLOGRAM TILT: efek foil/hologram pada foto profil mengikuti gerakan mouse =====
  (function initHoloTilt(){
    const card = document.getElementById('lanyardCard');
    if (!card) return;

    const canHover = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canHover || reduceMotion) return;

    const shine = document.createElement('div');
    shine.className = 'holo-shine';
    card.appendChild(shine);

    const MAX_TILT = 16; // derajat kemiringan maksimum ke tiap sisi

    function onMove(e){
      const rect = card.getBoundingClientRect();
      const relX = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      const relY = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1);

      const rotY = (relX - 0.5) * MAX_TILT * 2;
      const rotX = -(relY - 0.5) * MAX_TILT * 2;

      card.classList.add('holo-tilting', 'holo-active');
      card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.03,1.03,1.03)`;
      shine.style.backgroundPosition = `${relX * 100}% ${relY * 100}%`;
      shine.style.setProperty('--gx', `${relX * 100}%`);
      shine.style.setProperty('--gy', `${relY * 100}%`);
    }

    function onLeave(){
      card.classList.remove('holo-tilting');
      card.classList.remove('holo-active');
      card.style.transform = '';
    }

    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
  })();

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
  btn.addEventListener('click', () => {
    // Jika tombol yang diklik sudah aktif (kasus tombol bulat di mobile,
    // yang hanya menampilkan 1 tombol), toggle ke bahasa lainnya.
    const isActive = btn.classList.contains('active');
    const target = isActive
      ? (btn.getAttribute('data-lang') === 'id' ? 'en' : 'id')
      : btn.getAttribute('data-lang');
    setLanguage(target);
  });
});

let savedLang = 'id';
try { savedLang = localStorage.getItem('portofolio-lang') || 'id'; } catch (err) {}
if (savedLang === 'en') setLanguage('en');