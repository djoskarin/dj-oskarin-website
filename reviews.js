import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

async function loadReviews() {
  const reviewsContainer = document.getElementById("reviewsContainer");

  if (!reviewsContainer) return;

  reviewsContainer.innerHTML = "<p>Cargando reseñas...</p>";

  try {
    const reviewsQuery = query(
      collection(db, "reviews"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(reviewsQuery);

    if (snapshot.empty) {
      reviewsContainer.innerHTML = "<p>Aún no hay reseñas disponibles.</p>";
      return;
    }

    reviewsContainer.innerHTML = "";

    snapshot.forEach((reviewDoc) => {
      const review = reviewDoc.data();

      const reviewCard = document.createElement("article");
      reviewCard.className = "review-card";

      reviewCard.innerHTML = `
        <p class="review-text">“${review.text || ""}”</p>
        <p class="review-author">— ${review.author || "Cliente"}</p>
      `;

      reviewsContainer.appendChild(reviewCard);
    });
  } catch (error) {
    console.error("Error loading reviews:", error);
    reviewsContainer.innerHTML =
      "<p>No fue posible cargar las reseñas.</p>";
  }
}

loadReviews();