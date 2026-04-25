// ==============================
// auth.js — Giriş / Qeydiyyat sistemi
// ==============================

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';

// Firebase app-i təkrar init etməmək üçün mövcud app-i istifadə et
const firebaseConfig = {
  apiKey: 'AIzaSyDzCQsF10gofC5sdwIXK2wlX0QKRxY4vE4',
  authDomain: 'hiprhyme-2587e.firebaseapp.com',
  projectId: 'hiprhyme-2587e',
  storageBucket: 'hiprhyme-2587e.firebasestorage.app',
  messagingSenderId: '401645996625',
  appId: '1:401645996625:web:a168b32f7121b9fb95c670',
};

const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ─── Cari istifadəçi state-i ──────────────────────────────────
export let currentUser     = null;  // Firebase Auth user
export let currentUserData = null;  // Firestore user doc {displayName, role, ...}

// ─── Auth state dəyişikliyi ───────────────────────────────────
export function initAuth(onUserChange) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      currentUserData = await fetchUserData(user.uid);
    } else {
      currentUser     = null;
      currentUserData = null;
    }
    onUserChange(currentUser, currentUserData);
  });
}

// ─── Firestore-dan istifadəçi məlumatını çək ─────────────────
async function fetchUserData(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error('User data fetch error:', e);
    return null;
  }
}

// ─── QEYDİYYAT ───────────────────────────────────────────────
export async function registerUser(displayName, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // Auth profil adını yenilə
  await updateProfile(cred.user, { displayName });
  // Firestore-da user doc yarat
  await setDoc(doc(db, 'users', cred.user.uid), {
    displayName,
    email,
    role: 'user',          // Default: user. Admin manual olaraq Firestore-dan dəyişdirilir
    createdAt: serverTimestamp(),
    photoURL: null,
  });
  currentUser     = cred.user;
  currentUserData = { displayName, email, role: 'user', photoURL: null };
  return cred.user;
}

// ─── GİRİŞ ────────────────────────────────────────────────────
export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  currentUser     = cred.user;
  currentUserData = await fetchUserData(cred.user.uid);
  return cred.user;
}

// ─── ÇIXIŞ ────────────────────────────────────────────────────
export async function logoutUser() {
  await signOut(auth);
  currentUser     = null;
  currentUserData = null;
}

// ─── Admin yoxlaması ──────────────────────────────────────────
export function isAdmin() {
  return currentUserData?.role === 'admin';
}

// ─── Avatar hərfi ─────────────────────────────────────────────
export function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
