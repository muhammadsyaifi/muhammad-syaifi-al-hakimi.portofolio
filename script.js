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

    // Dulu: kandidat dicoba SATU PER SATU (nunggu satu gagal baru lanjut ke berikutnya).
    // Di koneksi lambat ini bikin foto (atau fallback-nya) telat muncul lama sekali,
    // bahkan kadang terlihat "hilang total" padahal sebenarnya masih coba-coba.
    // Sekarang: semua kandidat dicoba SEKALIGUS (paralel), siapa cepat dia dipakai,
    // tapi tetap mengutamakan kandidat dengan prioritas paling atas kalau beberapa
    // berhasil hampir bersamaan.
    let resolved = false;
    let failedCount = 0;
    let bestLoadedIndex = Infinity;

    function applyPhoto(i, src){
      if (resolved && i >= bestLoadedIndex) return; // sudah ada kandidat lebih prioritas terpasang
      resolved = true;
      bestLoadedIndex = i;
      img.src = src;
      img.style.display = 'block';
      if (fallback) fallback.classList.remove('show');
    }

    // Fallback darurat: kalau dalam 3.5 detik belum ada satu pun yang berhasil,
    // tampilkan avatar inisial dulu supaya kartu tidak terlihat kosong terlalu lama
    // (kalau foto asli berhasil dimuat setelahnya, otomatis akan menggantikan fallback).
    const emergencyTimer = setTimeout(() => {
      if (!resolved && fallback) fallback.classList.add('show');
    }, 3500);

    candidates.forEach((src, i) => {
      const testImg = new Image();
      testImg.onload = () => {
        clearTimeout(emergencyTimer);
        applyPhoto(i, src);
      };
      testImg.onerror = () => {
        failedCount++;
        if (failedCount === candidates.length && !resolved) {
          clearTimeout(emergencyTimer);
          console.warn('[Foto Profil] Semua kandidat file gagal dimuat, menampilkan fallback avatar. Path yang dicoba:', candidates);
          if (fallback) fallback.classList.add('show');
        }
      };
      testImg.src = src;
    });
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

  // ===== EFEK TILT: foto di bagian Tentang miring + sedikit membesar mengikuti posisi kursor =====
  (function initPhotoTilt(){
    const card = document.getElementById('lanyardCard');
    const wrap = document.querySelector('.id-card'); // area gerak diperluas ke seluruh kartu ID, bukan cuma foto
    if (!card || !wrap) return;

    // Di layar sentuh tidak ada kursor yang bergerak bebas, jadi efek ini
    // dilewati supaya tidak mengganggu (dan tetap ringan performanya).
    const isTouchOnly = window.matchMedia('(hover: none)').matches;
    if (isTouchOnly) return;

    const maxTilt = 20; // derajat, seberapa jauh foto boleh miring (diperbesar biar lebih terasa "hidup")

    function handleMove(e){
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const px = x / rect.width;
      const py = y / rect.height;

      const cpx = Math.min(Math.max(px, -0.3), 1.3);
      const cpy = Math.min(Math.max(py, -0.3), 1.3);

      const ry = (cpx - 0.5) * maxTilt * 2;   // kiri/kanan -> rotateY
      const rx = (0.5 - cpy) * maxTilt * 2;   // atas/bawah -> rotateX

      card.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      card.style.setProperty('--ry', ry.toFixed(2) + 'deg');
      card.style.setProperty('--mx', (Math.min(Math.max(px,0),1) * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (Math.min(Math.max(py,0),1) * 100).toFixed(1) + '%');
      card.classList.add('tilting');
    }

    function resetTilt(){
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
      card.classList.remove('tilting');
    }

    // Digantungkan ke seluruh kartu ID (foto + teks) supaya lebih mudah dipicu,
    // bukan cuma saat kursor tepat di atas foto.
    wrap.addEventListener('mousemove', handleMove);
    wrap.addEventListener('mouseleave', resetTilt);
  })();

  // ===== EFEK TILT RINGAN: kartu project & pengalaman miring dikit mengikuti kursor =====
  (function initCardTilt(){
    const isTouchOnly = window.matchMedia('(hover: none)').matches;
    if (isTouchOnly) return;

    const tiltTargets = document.querySelectorAll('.project-card, .exp-card, .tech-item');
    if (!tiltTargets.length) return;

    const maxTilt = 8;

    tiltTargets.forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const ry = (px - 0.5) * maxTilt * 2;
        const rx = (0.5 - py) * maxTilt * 2;
        el.style.setProperty('--card-rx', rx.toFixed(2) + 'deg');
        el.style.setProperty('--card-ry', ry.toFixed(2) + 'deg');
        el.classList.add('card-tilting');
      });

      el.addEventListener('mouseleave', () => {
        el.classList.remove('card-tilting');
        el.style.setProperty('--card-rx', '0deg');
        el.style.setProperty('--card-ry', '0deg');
      });
    });
  })();

  // ===== PARALLAX HALUS DI HERO: elemen bergeser tipis mengikuti kursor =====
  (function initHeroParallax(){
    const hero = document.querySelector('.hero');
    const isTouchOnly = window.matchMedia('(hover: none)').matches;
    if (!hero || isTouchOnly) return;

    const layers = [
      { el: hero.querySelector('.hero-title'), strength: 10 },
      { el: hero.querySelector('.sparkle-cluster'), strength: 26 },
      { el: hero.querySelector('.tag-row'), strength: 6 }
    ].filter(l => l.el);

    if (!layers.length) return;

    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;

      layers.forEach(({ el, strength }) => {
        el.style.transform = `translate(${(px * strength).toFixed(1)}px, ${(py * strength).toFixed(1)}px)`;
      });
    });

    hero.addEventListener('mouseleave', () => {
      layers.forEach(({ el }) => { el.style.transform = ''; });
    });
  })();

  // ===== EFEK MAGNET: tombol sedikit "tertarik" ke arah kursor saat didekati =====
  (function initMagneticButtons(){
    const isTouchOnly = window.matchMedia('(hover: none)').matches;
    if (isTouchOnly) return;

    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${(x * 0.18).toFixed(1)}px, ${(y * 0.35).toFixed(1)}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  })();

  // ===== POPUP KEAHLIAN: sentuh/klik kartu skill untuk menampilkan level kemampuan
  // (Mahir / Menengah / Dasar) dengan warna sesuai levelnya =====
  (function initSkillPopups(){
    const items = document.querySelectorAll('.tech-item[data-level]');
    if (!items.length) return;

    function closeAll(except){
      items.forEach(el => {
        if (el !== except){
          el.classList.remove('popup-open');
          el.setAttribute('aria-expanded', 'false');
        }
      });
    }

    items.forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = el.classList.contains('popup-open');
        closeAll(el);
        el.classList.toggle('popup-open', !isOpen);
        el.setAttribute('aria-expanded', String(!isOpen));
      });

      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          el.click();
        }
      });
    });

    document.addEventListener('click', () => closeAll(null));
  })();

  // Efek hologram/tilt pada foto profil sudah dihapus atas permintaan —
  // foto sekarang ditampilkan polos tanpa animasi miring/kilau saat mouse bergerak.

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