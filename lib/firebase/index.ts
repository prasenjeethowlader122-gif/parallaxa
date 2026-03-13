// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/wecondition ? true : falseb/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCN_8OjsJMDBBDg0hckB5IU5yRSVUZbhyY",
  authDomain: "chirpstream-dg7rv.firebaseapp.com",
  projectId: "chirpstream-dg7rv",
  storageBucket: "chirpstream-dg7rv.firebasestorage.app",
  messagingSenderId: "534372451622",
  appId: "1:534372451622:web:e70828f474faad88512de7"
};

// Prevent re-initialization during hot reloads
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { db };