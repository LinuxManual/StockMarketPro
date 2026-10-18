import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

/*
 * StockMarket Pro uses the same Firebase project already used by the user's
 * other site. The Firebase web config is not a server secret; secure data with
 * Authentication and Firestore Security Rules, never with a hidden API key.
 */
const firebaseConfig = {
  apiKey: "AIzaSyBm5k1wF7-RaC8hEtTy2Phznxey0FnAcsU",
  authDomain: "basket-clash-7901c.firebaseapp.com",
  projectId: "basket-clash-7901c",
  storageBucket: "basket-clash-7901c.firebasestorage.app",
  messagingSenderId: "307971899685",
  appId: "1:307971899685:web:8143142e3fbe3526ef5acc"
};

const status = document.getElementById("cloudStatus");
const statusText = document.getElementById("cloudStatusText");
let userId = null;
let saveTimer = null;
let ready = false;
let lastState = null;
let lastSyncedKey = "";
const app = initializeApp(firebaseConfig, "stockmarket-pro");
const auth = getAuth(app);
const db = getFirestore(app);

function showStatus(kind, text) {
  if (!status || !statusText) return;
  status.classList.remove("connected", "error");
  if (kind) status.classList.add(kind);
  statusText.textContent = text;
}
function cleanState(s) {
  return {
    cash: s.cash,
    holdings: s.holdings || {},
    orders: (s.orders || []).slice(-250),
    watchlist: s.watchlist || [],
    prices: s.prices || {},
    history: s.history || {},
    events: (s.events || []).slice(0, 8)
  };
}
function meaningfulKey(state) {
  return JSON.stringify({
    cash: state.cash,
    holdings: state.holdings,
    watchlist: state.watchlist,
    orderCount: (state.orders || []).length,
    lastOrder: (state.orders || []).slice(-1)[0] || null
  });
}
async function syncState(state) {
  if (!userId || !ready || !state) return;
  const key = meaningfulKey(state);
  if (key === lastSyncedKey) return;
  try {
    await setDoc(doc(db, "stockmarket_users", userId), {
      state: cleanState(state),
      updatedAt: serverTimestamp()
    }, { merge: true });
    lastSyncedKey = key;
    showStatus("connected", "Cloud sync active · portfolio saved");
  } catch (err) {
    console.error("Firebase save failed:", err);
    showStatus("error", "Cloud sync blocked · check Firestore rules");
  }
}
window.addEventListener("stockmarket:statechange", event => {
  lastState = event.detail?.state || null;
  if (!ready || !lastState) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => syncState(lastState), 800);
});
try {
  showStatus("", "Connecting to Firebase…");
  await signInAnonymously(auth);
  onAuthStateChanged(auth, async user => {
    if (!user) {
      ready = false;
      showStatus("error", "Firebase sign-in required");
      return;
    }
    userId = user.uid;
    try {
      const snapshot = await getDoc(doc(db, "stockmarket_users", user.uid));
      if (snapshot.exists() && snapshot.data()?.state) {
        ready = true;
        window.dispatchEvent(new CustomEvent("stockmarket:cloudload", { detail: { state: snapshot.data().state } }));
        showStatus("connected", "Cloud portfolio restored");
      } else {
        ready = true;
        showStatus("connected", "Firebase connected · saving this portfolio");
        if (lastState) await syncState(lastState);
      }
    } catch (err) {
      ready = true;
      console.error("Firebase read failed:", err);
      showStatus("error", "Firebase connected · Firestore rules need updating");
    }
  });
} catch (err) {
  console.error("Firebase initialization failed:", err);
  showStatus("error", "Firebase unavailable · local play still works");
}
