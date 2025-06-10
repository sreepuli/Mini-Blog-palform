// Import Firebase modules from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

// Your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyB3-muIgi0iHkC1vdknAJ3QDmGuvtCanUk",
  authDomain: "my-awesome-project-18.firebaseapp.com",
  projectId: "my-awesome-project-18",
  storageBucket: "my-awesome-project-18.appspot.com", // corrected
  messagingSenderId: "434751646437",
  appId: "1:434751646437:web:46f62bd8483a97a549c20c",
  measurementId: "G-RDBYDYKGF0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Export for use in login or signup files
export { auth, provider, signInWithPopup };
