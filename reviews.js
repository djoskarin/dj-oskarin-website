import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

async function loadReviews() {
  const reviewsContainer = document.getElementById("reviewsContainer");

  if (!reviewsContainer) {
  return;
}

  reviewsContainer.innerHTML = "<p>Cargando reseñas...</p>";

  try {
    const reviewsQuery = query(
      collection(db, "reviews"),
      orderBy("created_at", "desc")
    );

    const snapshot = await getDocs(reviewsQuery);

    if (snapshot.empty) {
      reviewsContainer.innerHTML = "<p>Aún no hay reseñas disponibles.</p>";
      return;
    }

    reviewsContainer.innerHTML = "";

    const reviews = snapshot.docs.map((reviewDoc) => ({
  id: reviewDoc.id,
  ...reviewDoc.data(),
}));

reviews.sort((a, b) => {
  if (a.featured && !b.featured) return -1;
  if (!a.featured && b.featured) return 1;

  return (b.display_order || 0) - (a.display_order || 0);
});

reviews.forEach((review) => {
  const reviewCard = document.createElement("article");

  reviewCard.className = review.featured
    ? "review-card featured-review"
    : "review-card";

  const photoHtml = review.photo
    ? `
      <img
        class="review-photo"
        src="${review.photo}"
        alt="${review.author || "Cliente"}"
      />
    `
    : "";

  reviewCard.innerHTML = `
    <span class="review-quote">❝</span>

    <p class="review-text">${review.text || ""}</p>

    <div class="review-person">
      ${photoHtml}

      <div>
        <p class="review-author">— ${review.author || "Cliente"}</p>

        ${
          review.featured
            ? '<p class="review-featured-badge">Reseña destacada</p>'
            : ""
        }
      </div>
    </div>
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