import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

async function loadReviews() {
  console.log("Reviews file connected.");
}

loadReviews();