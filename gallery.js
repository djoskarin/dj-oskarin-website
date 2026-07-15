import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

"use strict";

const mainGalleryGrid = document.getElementById(
  "mainGalleryGrid"
);

const gallerySearchToggle = document.getElementById(
  "gallerySearchToggle"
);

const gallerySearchPanel = document.getElementById(
  "gallerySearchPanel"
);

const gallerySearchInput = document.getElementById(
  "gallerySearchInput"
);

const gallerySearchClose = document.getElementById(
  "gallerySearchClose"
);

const galleryLightbox = document.getElementById(
  "galleryLightbox"
);

const galleryLightboxImage = document.getElementById(
  "galleryLightboxImage"
);

const galleryLightboxClose = document.getElementById(
  "galleryLightboxClose"
);

const galleryLightboxPrev = document.getElementById(
  "galleryLightboxPrev"
);

const galleryLightboxNext = document.getElementById(
  "galleryLightboxNext"
);

const galleryLightboxCount = document.getElementById(
  "galleryLightboxCount"
);

let allGalleryPhotos = [];
let visibleGalleryPhotos = [];
let activePhotoIndex = 0;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadGalleryPhotos() {
  if (!mainGalleryGrid) return;

  mainGalleryGrid.innerHTML = `
    <div class="gallery-empty-state">
      <p>Cargando fotografías...</p>
    </div>
  `;

  try {
    const galleryQuery = query(
      collection(db, "gallery"),
      orderBy("order", "asc")
    );

    const snapshot = await getDocs(galleryQuery);

    allGalleryPhotos = snapshot.docs
      .map((photoDocument) => {
        const photo = photoDocument.data();

        return {
          id: photoDocument.id,
          image: photo.url || "",
          title: photo.title || "",
          visible: photo.visible !== false,
          order: Number(photo.order || 0),
        };
      })
      .filter(
        (photo) =>
          photo.visible &&
          Boolean(photo.image)
      );

    renderGallery();
  } catch (error) {
    console.error(
      "Could not load Firestore gallery:",
      error
    );

    mainGalleryGrid.innerHTML = `
      <div class="gallery-empty-state">
        <p>No se pudieron cargar las fotografías.</p>
      </div>
    `;
  }
}

function renderGallery(searchTerm = "") {
  const normalizedSearch = searchTerm
    .trim()
    .toLowerCase();

  visibleGalleryPhotos = allGalleryPhotos.filter(
    (photo) => {
      if (!normalizedSearch) return true;

      return photo.title
        .toLowerCase()
        .includes(normalizedSearch);
    }
  );

  if (!visibleGalleryPhotos.length) {
    mainGalleryGrid.innerHTML = `
      <div class="gallery-empty-state">
        <p>
          ${
            normalizedSearch
              ? "No se encontraron fotografías."
              : "Todavía no hay fotografías publicadas."
          }
        </p>
      </div>
    `;

    return;
  }

  mainGalleryGrid.innerHTML = visibleGalleryPhotos
    .map(
      (photo, index) => `
        <button
          class="gallery-photo-card"
          type="button"
          data-gallery-photo="${index}"
          aria-label="Abrir fotografía ${index + 1}"
        >
          <img
            src="${escapeHtml(photo.image)}"
            alt="${
              photo.title
                ? escapeHtml(photo.title)
                : `Fotografía ${index + 1} de DJ Oskarin`
            }"
            loading="lazy"
          />

          ${
            photo.title
              ? `
                <span class="gallery-photo-label">
                  ${escapeHtml(photo.title)}
                </span>
              `
              : ""
          }
        </button>
      `
    )
    .join("");

  mainGalleryGrid
    .querySelectorAll("[data-gallery-photo]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        openLightbox(
          Number(button.dataset.galleryPhoto)
        );
      });
    });
}

function updateLightbox() {
  const photo =
    visibleGalleryPhotos[activePhotoIndex];

  if (!photo) return;

  galleryLightboxImage.src = photo.image;

  galleryLightboxImage.alt =
    photo.title ||
    `Fotografía ${activePhotoIndex + 1} de DJ Oskarin`;

  galleryLightboxCount.textContent =
    `${activePhotoIndex + 1} / ${visibleGalleryPhotos.length}`;
}

function openLightbox(index) {
  activePhotoIndex = index;

  updateLightbox();

  galleryLightbox.classList.add("is-open");
  galleryLightbox.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  galleryLightbox.classList.remove("is-open");
  galleryLightbox.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.style.overflow = "";
}

function showPreviousPhoto() {
  if (!visibleGalleryPhotos.length) return;

  activePhotoIndex =
    (
      activePhotoIndex -
      1 +
      visibleGalleryPhotos.length
    ) % visibleGalleryPhotos.length;

  updateLightbox();
}

function showNextPhoto() {
  if (!visibleGalleryPhotos.length) return;

  activePhotoIndex =
    (activePhotoIndex + 1) %
    visibleGalleryPhotos.length;

  updateLightbox();
}

gallerySearchToggle?.addEventListener(
  "click",
  () => {
    gallerySearchPanel.hidden = false;
    gallerySearchInput?.focus();
  }
);

gallerySearchClose?.addEventListener(
  "click",
  () => {
    gallerySearchPanel.hidden = true;

    if (gallerySearchInput) {
      gallerySearchInput.value = "";
    }

    renderGallery();
  }
);

gallerySearchInput?.addEventListener(
  "input",
  () => {
    renderGallery(
      gallerySearchInput.value
    );
  }
);

galleryLightboxClose?.addEventListener(
  "click",
  closeLightbox
);

galleryLightboxPrev?.addEventListener(
  "click",
  showPreviousPhoto
);

galleryLightboxNext?.addEventListener(
  "click",
  showNextPhoto
);

galleryLightbox?.addEventListener(
  "click",
  (event) => {
    if (event.target === galleryLightbox) {
      closeLightbox();
    }
  }
);

document.addEventListener(
  "keydown",
  (event) => {
    if (
      !galleryLightbox?.classList.contains(
        "is-open"
      )
    ) {
      return;
    }

    if (event.key === "Escape") {
      closeLightbox();
    }

    if (event.key === "ArrowLeft") {
      showPreviousPhoto();
    }

    if (event.key === "ArrowRight") {
      showNextPhoto();
    }
  }
);

loadGalleryPhotos();