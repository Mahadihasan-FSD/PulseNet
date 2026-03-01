// Firebase JS SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// তোমার Firebase config
export const firebaseConfig = {
    apiKey: "AIzaSyBChqQwBHL1Hz9zOFr2PzaOf6Tskmkxcys",
    authDomain: "pulsenet-e3a06.firebaseapp.com",
    projectId: "pulsenet-e3a06",
    storageBucket: "pulsenet-e3a06.appspot.com",
    messagingSenderId: "441532936913",
    appId: "1:441532936913:web:f3746f8016250705524bf0",
    measurementId: "G-56EJ05YXYW"
};

// Firebase initialize
export const app = initializeApp(firebaseConfig);

// Firebase services export
export const auth = getAuth(app);
export const db = getFirestore(app);