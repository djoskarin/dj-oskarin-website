"use strict";

const EVENTS_STORAGE_KEY = "djOskarinEvents";

const mainGalleryGrid = document.getElementById("mainGalleryGrid");

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

const galleryLightbox = document.getElementById("galleryLightbox");
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readEvents() {
  try {
    const savedEvents = JSON.parse(
      localStorage.getItem(EVENTS_STORAGE_KEY) || "[]"
    );

    return Array.isArray(savedEvents) ? savedEvents : [];
  } catch (error) {
    console.error("Could not load gallery events:", error);
    return [];
  }
}

function collectGalleryPhotos() {
  const events = readEvents();

  const photos = [];

  events.forEach((event) => {
    const gallery = Array.isArray(event.gallery)
      ? event.gallery
      : [];

    gallery.forEach((image, index) => {
      photos.push({
        id: `${event.id}-${index}`,
        image,
        eventId: event.id,
        eventTitle: event.title || "Evento",
        displayOrder:
          Number(event.gallery_order?.[index]) ||
          Number(event.display_order || 0) * 100 + index,
      });
    });
  });

  return photos.sort(
    (a, b) => a.displayOrder - b.displayOrder
  );
}

function renderGallery(searchTerm = "") {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  visibleGalleryPhotos = allGalleryPhotos.filter((photo) => {
    if (!normalizedSearch) return true;

    return photo.eventTitle
      .toLowerCase()
      .includes(normalizedSearch);
  });

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
            alt="${escapeHtml(photo.eventTitle)}"
            loading="lazy"
          />

          <span class="gallery-photo-label">
            ${escapeHtml(photo.eventTitle)}
          </span>
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
  const photo = visibleGalleryPhotos[activePhotoIndex];

  if (!photo) return;

  galleryLightboxImage.src = photo.image;
  galleryLightboxImage.alt = photo.eventTitle;

  galleryLightboxCount.textContent =
    `${activePhotoIndex + 1} / ${visibleGalleryPhotos.length}`;
}

function openLightbox(index) {
  activePhotoIndex = index;
  updateLightbox();

  galleryLightbox.classList.add("is-open");
  galleryLightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  galleryLightbox.classList.remove("is-open");
  galleryLightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function showPreviousPhoto() {
  if (!visibleGalleryPhotos.length) return;

  activePhotoIndex =
    (activePhotoIndex - 1 + visibleGalleryPhotos.length) %
    visibleGalleryPhotos.length;

  updateLightbox();
}

function showNextPhoto() {
  if (!visibleGalleryPhotos.length) return;

  activePhotoIndex =
    (activePhotoIndex + 1) %
    visibleGalleryPhotos.length;

  updateLightbox();
}

gallerySearchToggle?.addEventListener("click", () => {
  gallerySearchPanel.hidden = false;
  gallerySearchInput?.focus();
});

gallerySearchClose?.addEventListener("click", () => {
  gallerySearchPanel.hidden = true;

  if (gallerySearchInput) {
    gallerySearchInput.value = "";
  }

  renderGallery();
});

gallerySearchInput?.addEventListener("input", () => {
  renderGallery(gallerySearchInput.value);
});

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

galleryLightbox?.addEventListener("click", (event) => {
  if (event.target === galleryLightbox) {
    closeLightbox();
  }
});

document.addEventListener("keydown", (event) => {
  if (!galleryLightbox?.classList.contains("is-open")) {
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
});

allGalleryPhotos = collectGalleryPhotos();
renderGallery();