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

  // ===== LANYARD: kartu bisa diseret, berayun, dipantulkan (bounce), & diputar/dibalik (flip depan-belakang) =====
  (function initLanyard(){
    const zone = document.getElementById('lanyardZone');
    const cardInner = document.getElementById('cardInner');
    const stringEl = document.getElementById('lanyardString');
    if (!zone || !cardInner || !stringEl) return;

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- Ayunan (pendulum) kiri-kanan, seperti kartu tergantung di tali ---
    let angle = reduceMotion ? 0 : -16; // mulai miring lalu berayun pelan ke tengah saat muncul
    let angularVelocity = 0;
    const STIFFNESS = 10;   // seberapa kuat kartu ditarik balik ke tengah
    const DAMPING = 2.4;    // seberapa cepat ayunan meredam
    const MAX_ANGLE = 55;   // batas kemiringan maksimum (derajat)
    const DRAG_SENSITIVITY = 0.35;

    // --- Panjang tali (tali memanjang saat ditarik ke bawah, lalu memantul balik ke panjang semula) ---
    const STRING_BASE_H = 38;  // tinggi tali dalam keadaan diam (px), harus sama dgn CSS .lanyard-string height
    const STRING_MIN_H = 14;   // tali tidak boleh lebih pendek dari ini
    let stretch = reduceMotion ? 0 : -20; // mulai agak pendek lalu "tumbuh" turun & memantul saat muncul
    let stretchVelocity = 0;
    const STRETCH_STIFFNESS = 90;
    const STRETCH_DAMPING = 3.2;   // damping rendah = memantul beberapa kali dulu sebelum diam (realistis)
    const MAX_STRETCH = 70;
    const DRAG_SENSITIVITY_Y = 0.6;

    // --- Putaran kartu (rotateY) utk efek "diputar-putar" & membalik ke sisi belakang ---
    let spinY = 0;
    let spinVelocity = 0;
    const SPIN_DAMPING = 1.6;      // gesekan yg memperlambat putaran bebas
    const SPIN_SETTLE_STIFF = 7;   // tarikan lembut menuju sisi terdekat (depan/belakang) saat putaran sudah pelan
    const SPIN_SLOW_THRESHOLD = 50; // deg/s, di bawah ini baru mulai "dikunci" ke sisi terdekat
    const SPIN_FROM_SWING = 0.6;   // seberapa besar ayunan/tarikan ikut memberi momentum putar

    let dragging = false;
    let dragAnchorX = 0, dragAnchorY = 0;
    let dragAnchorAngle = 0, dragAnchorStretch = 0;
    let dragStartTime = 0;
    let dragTotalMove = 0;

    function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

    function pointerXY(e){
      const t = (e.touches && e.touches.length) ? e.touches[0]
        : (e.changedTouches && e.changedTouches.length) ? e.changedTouches[0] : e;
      return { x: t.clientX, y: t.clientY };
    }

    function startDrag(e){
      dragging = true;
      angularVelocity = 0;
      const p = pointerXY(e);
      dragAnchorX = p.x; dragAnchorY = p.y;
      dragAnchorAngle = angle;
      dragAnchorStretch = stretch;
      dragStartTime = performance.now();
      dragTotalMove = 0;
      zone.classList.add('grabbing');
    }
    function moveDrag(e){
      if (!dragging) return;
      const p = pointerXY(e);
      const dx = p.x - dragAnchorX;
      const dy = p.y - dragAnchorY;
      dragTotalMove = Math.max(dragTotalMove, Math.abs(dx), Math.abs(dy));

      const nextAngle = clamp(dragAnchorAngle + dx * DRAG_SENSITIVITY, -MAX_ANGLE, MAX_ANGLE);
      angularVelocity = (nextAngle - angle) * 12; // perkiraan kecepatan biar ada efek lempar saat dilepas
      spinVelocity += (nextAngle - angle) * SPIN_FROM_SWING * 12; // ikut memutar kartu saat diseret cepat
      angle = nextAngle;

      const nextStretch = clamp(dragAnchorStretch + dy * DRAG_SENSITIVITY_Y, -20, MAX_STRETCH);
      stretchVelocity = (nextStretch - stretch) * 12;
      stretch = nextStretch;
    }
    function endDrag(){
      if (!dragging) return;
      dragging = false;
      zone.classList.remove('grabbing');

      // Ketuk singkat tanpa banyak gerakan = membalik kartu (spin ke sisi sebaliknya)
      const heldMs = performance.now() - dragStartTime;
      if (dragTotalMove < 8 && heldMs < 400) {
        spinVelocity += 640; // dorongan putaran, akan meredam & "terkunci" ke sisi terdekat secara alami
      }
    }

    zone.addEventListener('mousedown', startDrag);
    zone.addEventListener('touchstart', startDrag, { passive:true });
    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('touchmove', moveDrag, { passive:true });
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);
    zone.addEventListener('dragstart', (e) => e.preventDefault());

    let lastFrameTime = null;
    function frame(now){
      if (lastFrameTime === null) lastFrameTime = now;
      const dt = Math.min((now - lastFrameTime) / 1000, 0.032);
      lastFrameTime = now;

      if (reduceMotion) {
        angle = 0; stretch = 0; spinY = 0;
      } else {
        if (!dragging) {
          const accel = -STIFFNESS * angle - DAMPING * angularVelocity;
          angularVelocity += accel * dt;
          angle += angularVelocity * dt;

          const sAccel = -STRETCH_STIFFNESS * stretch - STRETCH_DAMPING * stretchVelocity;
          stretchVelocity += sAccel * dt;
          stretch += stretchVelocity * dt;
        }

        // Putaran: berputar bebas (dengan gesekan) selama masih kencang,
        // baru "dikunci" ke sisi depan/belakang terdekat begitu sudah pelan —
        // supaya kartu bisa muter-muter dulu sebelum akhirnya diam menghadap salah satu sisi.
        const nearestFace = Math.round(spinY / 180) * 180;
        const offFromFace = spinY - nearestFace;
        const settleStrength = Math.abs(spinVelocity) < SPIN_SLOW_THRESHOLD ? SPIN_SETTLE_STIFF : 0;
        const spinAccel = -settleStrength * offFromFace - SPIN_DAMPING * spinVelocity;
        spinVelocity += spinAccel * dt;
        spinY += spinVelocity * dt;
      }

      zone.style.transform = `rotate(${angle}deg)`;
      stringEl.style.height = `${clamp(STRING_BASE_H + stretch, STRING_MIN_H, STRING_BASE_H + MAX_STRETCH)}px`;
      cardInner.style.transform = `rotateY(${spinY}deg)`;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
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