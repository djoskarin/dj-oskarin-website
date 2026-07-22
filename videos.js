import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const videosGrid = document.getElementById("publicVideos");
const emptyMessage = document.getElementById("videosEmptyMessage");

async function loadVideos() {
  const q = query(
    collection(db, "publicVideos"),
    where("visible", "==", true),
    orderBy("display_order", "asc")
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    emptyMessage.hidden = false;
    return;
  }

  videosGrid.innerHTML = "";

  snapshot.forEach((doc) => {
    const video = doc.data();

    const card = document.createElement("article");
    card.className = "public-video-card";

    card.innerHTML = `
      <video
        controls
        playsinline
        preload="metadata"
        src="${video.url}">
      </video>

      <h3>${video.title || "Sin título"}</h3>
    `;

    videosGrid.appendChild(card);

    const videoElement = card.querySelector("video");

videoElement.addEventListener("dblclick", async () => {
  try {
    if (videoElement.requestFullscreen) {
      await videoElement.requestFullscreen();
    } else if (videoElement.webkitEnterFullscreen) {
      videoElement.webkitEnterFullscreen();
    }
  } catch (error) {
    console.error("No se pudo abrir el video en pantalla completa:", error);
  }
});

  });
}

loadVideos();