// ==============================
// AZREP — script.js
// ==============================

// --- TARİX GÖSTƏRİCİSİ ---
function setCurrentDate() {
  const el = document.getElementById('current-date');
  if (!el) return;

  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formatted = now.toLocaleDateString('az-AZ', options).toUpperCase();
  el.textContent = formatted;
}

// --- NAV AKTİV LİNK ---
function initNav() {
  const links = document.querySelectorAll('.nav-link');

  links.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      links.forEach(l => l.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

// --- KART HOVER EFFEKTİ ---
function initCards() {
  const cards = document.querySelectorAll('.card, .sidebar-item');

  cards.forEach(card => {
    card.addEventListener('click', function () {
      // Firebase ilə xəbər səhifəsinə yönləndirmə buraya əlavə olunacaq
      console.log('Xəbər açılır...');
    });
  });
}

// --- TICKER PAUSU (hover) ---
function initTicker() {
  const ticker = document.querySelector('.ticker-track');
  if (!ticker) return;

  ticker.addEventListener('mouseenter', () => {
    ticker.style.animationPlayState = 'paused';
  });

  ticker.addEventListener('mouseleave', () => {
    ticker.style.animationPlayState = 'running';
  });
}

// --- FIREBASE HAZIRLIĞI (sonra doldurulacaq) ---
// Firebase konfiqurasiyası əlavə olunanda buraya yapışdırın:
//
// import { initializeApp } from "firebase/app";
// import { getFirestore } from "firebase/firestore";
//
// const firebaseConfig = {
//   apiKey: "...",
//   authDomain: "...",
//   projectId: "...",
//   ...
// };
//
// const app = initializeApp(firebaseConfig);
// const db = getFirestore(app);

// --- BAŞLAT ---
document.addEventListener('DOMContentLoaded', () => {
  setCurrentDate();
  initNav();
  initCards();
  initTicker();
});
