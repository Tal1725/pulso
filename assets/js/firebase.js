import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDV-f3pF4S637AGLJ1PcxkfFRDxRDzScHg",
  authDomain: "pulso-a47db.firebaseapp.com",
  projectId: "pulso-a47db",
  storageBucket: "pulso-a47db.firebasestorage.app",
  messagingSenderId: "271970839574",
  appId: "1:271970839574:web:a508f7dcde00a358e2d937",
  measurementId: "G-ZK1J3Q49LL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, firebaseConfig };

window.PULSO_FIREBASE = { app, auth, db };
