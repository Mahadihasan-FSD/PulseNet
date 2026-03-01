// Firebase configuration
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBChqQwBHL1Hz9zOFr2PzaOf6Tskmkxcys",
  authDomain: "pulsenet-e3a06.firebaseapp.com",
  projectId: "pulsenet-e3a06",
  storageBucket: "pulsenet-e3a06.firebasestorage.app",
  messagingSenderId: "441532936913",
  appId: "1:441532936913:web:f3746f8016250705524bf0",
  measurementId: "G-56EJ05YXYW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// Note: Replace the above with your actual Firebase config values
// You can get these from your Firebase project settings