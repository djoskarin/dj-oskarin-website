import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyCzrh3h9Qz-GEy94rCa_4rFKsykuBpKBXE",
  authDomain: "dj-oskarin-website.firebaseapp.com",
  projectId: "dj-oskarin-website",
  storageBucket: "dj-oskarin-website.firebasestorage.app",
  messagingSenderId: "761108918516",
  appId: "1:761108918516:web:a91b53ea5e7163776e6ea1"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);