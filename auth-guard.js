// Shared authentication guard for AssetGuard pages.
// Hides the page until the Firebase session is verified and redirects
// unauthenticated visitors to the login page.
import { getFirebaseApp } from "./ag-firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

document.documentElement.style.visibility = "hidden";

const app = getFirebaseApp();
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
