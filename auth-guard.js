// Shared authentication guard for AssetGuard pages.
// Hides the page until the Firebase session is verified and redirects
// unauthenticated visitors to the login page.
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDCkP7LTzdNcvZhp24rRsQirYDCcrsuvOA",
  authDomain: "assetguard-c8c8c.firebaseapp.com",
  projectId: "assetguard-c8c8c",
  databaseURL: "https://assetguard-c8c8c-default-rtdb.firebaseio.com"
};

document.documentElement.style.visibility = "hidden";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.documentElement.style.visibility = "";
  } else {
    window.location.replace("index.html");
  }
}, (error) => {
    AGErrors.report("authentication initialization", error);
    document.documentElement.style.visibility = "";
    window.location.replace("index.html?authError=initialization");
});
