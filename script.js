// ==============================
// AZREP — script.js
// ==============================

// --- FIREBASE KONFIQURASIYA ---
// Firebase consoldan öz konfiqurasiyani buraya yapışdır:
// https://console.firebase.google.com → Layihən → Project Settings → Your apps

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "BURAYA_API_KEY",
  authDomain: "BURAYA_AUTH_DOMAIN",
  projectId: "BURAYA_PROJECT_ID",
  storageBucket: "BURAYA_STORAGE_BUCKET",
  messagingSenderId: "BURAYA_SENDER_ID",
  appId: "BURAYA_APP_ID"
};

// Firebase-i başlat
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DB-ni digər funksiyalarda istifadə etmək üçün export
export { db, collection, getDocs, addDoc, orderBy, query };

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

// --- KART KLİK ---
function initCards() {
  const cards = document.querySelectorAll('.card, .sidebar-item');

  cards.forEach(card => {
    card.addEventListener('click', function () {
      // İstəyə görə Firestore-dan xəbər yüklənəcək
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

// --- FIRESTORE: XƏBƏRLƏRİ YÜKLƏ (nümunə) ---
// async function loadNews() {
//   try {
//     const q = query(collection(db, "news"), orderBy("date", "desc"));
//     const snapshot = await getDocs(q);
//     snapshot.forEach(doc => {
//       console.log(doc.id, doc.data());
//     });
//   } catch (err) {
//     console.error("Xəbərlər yüklənmədi:", err);
//   }
// }

// --- BAŞLAT ---
document.addEventListener('DOMContentLoaded', () => {
  setCurrentDate();
  initNav();
  initCards();
  initTicker();
  // loadNews(); // Firebase hazır olduqda bu sətrin şərhini sil
});
