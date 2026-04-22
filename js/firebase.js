// ==============================
// firebase.js — Firebase init
// ==============================

import { initializeApp }          from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics }           from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  orderBy,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDzCQsF10gofC5sdwIXK2wlX0QKRxY4vE4",
  authDomain: "hiprhyme-2587e.firebaseapp.com",
  projectId: "hiprhyme-2587e",
  storageBucket: "hiprhyme-2587e.firebasestorage.app",
  messagingSenderId: "401645996625",
  appId: "1:401645996625:web:a168b32f7121b9fb95c670",
  measurementId: "G-09GGXC0499"
};

const app       = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db        = getFirestore(app);

export { db, collection, getDocs, addDoc, orderBy, query, where, serverTimestamp };
