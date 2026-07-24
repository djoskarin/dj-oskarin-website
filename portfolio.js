import { db } from "./firebase.js";

import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

"use strict";

const COLLECTIONS_STORAGE_KEY = "djOskarinCollections";
const EVENTS_STORAGE_KEY = "djOskarinEvents";

const collectionsSection = document.getElementById("collections");
const publicCollections = document.getElementById("publicCollections");

const portfolioEventsSection = document.getElementById(
  "portfolioEventsSection"
);
const publicCollectionHeader = document.getElementById(
  "publicCollectionHeader"
);
const publicEvents = document.getElementById("publicEvents");

const portfolioEventDetail = document.getElementById(
  "portfolioEventDetail"
);
const publicEventContent = document.getElementById(
  "publicEventContent"
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

let activeGalleryImages = [];
let activeGalleryIndex = 0;

const backToPublicCollections = document.getElementById(
  "backToPublicCollections"
);
const backToPublicEvents = document.getElementById(
  "backToPublicEvents"
);

const searchToggle = document.getElementById("portfolioSearchToggle");
const searchPanel = document.getElementById("portfolioSearchPanel");
const searchInput = document.getElementById("portfolioSearchInput");
const searchClose = document.getElementById("portfolioSearchClose");

let activeCollection = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

let savedCollections = [];
let savedEvents = [];

function readCollections() {
  return savedCollections;
}

function readEvents() {
  return savedEvents;
}

async function loadPublicPortfolio() {
  publicCollections.innerHTML = `
    <div class="portfolio-empty-state">
      <p>Cargando colecciones...</p>
    </div>
  `;

  try {
    const collectionsSnapshot = await getDocs(
      collection(db, "portfolioCollections")
    );

    savedCollections = collectionsSnapshot.docs
      .map((collectionDocument) => ({
        id: collectionDocument.id,
        ...collectionDocument.data(),
      }))
      .filter(
        (collectionItem) =>
          collectionItem.is_visible !== false
      )
      .sort(
        (a, b) =>
          Number(a.display_order || 0) -
          Number(b.display_order || 0)
      );

    const eventsSnapshot = await getDocs(
      collection(db, "portfolioEvents")
    );

    savedEvents = eventsSnapshot.docs
      .map((eventDocument) => ({
        id: eventDocument.id,
        ...eventDocument.data(),
      }))
      .sort(
        (a, b) =>
          Number(a.display_order || 0) -
          Number(b.display_order || 0)
      );

    renderCollections();
  } catch (error) {
    console.error(
      "Could not load public portfolio:",
      error
    );

    publicCollections.innerHTML = `
      <div class="portfolio-empty-state">
        <p>No se pudieron cargar las colecciones.</p>
      </div>
    `;
  }
}

function formatDate(dateValue) {
  if (!dateValue) return "Fecha por confirmar";

  return new Date(`${dateValue}T12:00:00`).toLocaleDateString("es-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
function updateGalleryLightbox() {
  const image = activeGalleryImages[activeGalleryIndex];

  if (!image) return;

  galleryLightboxImage.src = image;
  galleryLightboxImage.alt =
    `Foto ${activeGalleryIndex + 1} de ${activeGalleryImages.length}`;

  galleryLightboxCount.textContent =
    `${activeGalleryIndex + 1} / ${activeGalleryImages.length}`;
}

function openGalleryLightbox(images, index) {
  activeGalleryImages = images;
  activeGalleryIndex = index;

  updateGalleryLightbox();

  galleryLightbox.classList.add("is-open");
  galleryLightbox.setAttribute("aria-hidden", "false");

  document.body.style.overflow = "hidden";
}

function closeGalleryLightbox() {
  galleryLightbox.classList.remove("is-open");
  galleryLightbox.setAttribute("aria-hidden", "true");

  document.body.style.overflow = "";
}

function showPreviousGalleryImage() {
  activeGalleryIndex =
    (activeGalleryIndex - 1 + activeGalleryImages.length) %
    activeGalleryImages.length;

  updateGalleryLightbox();
}

function showNextGalleryImage() {
  activeGalleryIndex =
    (activeGalleryIndex + 1) % activeGalleryImages.length;

  updateGalleryLightbox();
}

function renderCollections() {
  const collections = readCollections();
  const events = readEvents();

  if (!collections.length) {
    publicCollections.innerHTML = `
      <div class="portfolio-empty-state">
        <p>Todavía no hay colecciones publicadas.</p>
      </div>
    `;
    return;
  }

  publicCollections.innerHTML = collections
    .map((collection, index) => {
      const collectionEvents = events.filter(
        (event) => event.collection_id === collection.id
      );

      return `
        <article
          class="portfolio-collection-card"
          data-public-collection="${escapeHtml(collection.id)}"
          tabindex="0"
          role="button"
        >
          <div>
            <p class="portfolio-eyebrow">
              Colección ${String(index + 1).padStart(2, "0")}
            </p>

            <h3>${escapeHtml(collection.name)}</h3>

            <p class="portfolio-card-copy">
              ${escapeHtml(
                collection.subtitle || "Una colección de momentos inolvidables."
              )}
            </p>
          </div>

          <div class="portfolio-card-footer">
            <span>Ver colección</span>
            <strong>${collectionEvents.length}</strong>
          </div>
        </article>
      `;
    })
    .join("");

  publicCollections
    .querySelectorAll("[data-public-collection]")
    .forEach((card) => {
      const openCollection = () => {
        const collection = collections.find(
          (item) => item.id === card.dataset.publicCollection
        );

        if (!collection) return;

        showCollection(collection);
      };

      card.addEventListener("click", openCollection);

      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openCollection();
        }
      });
    });
}

function showCollection(collection, searchTerm = "") {
  activeCollection = collection;

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const events = readEvents()
    .filter((event) => event.collection_id === collection.id)
    .filter((event) =>
      normalizedSearch
        ? String(event.title || "")
            .toLowerCase()
            .includes(normalizedSearch)
        : true
    );

  collectionsSection.hidden = true;
  portfolioEventDetail.hidden = true;
  portfolioEventsSection.hidden = false;

  publicCollectionHeader.innerHTML = `
    <div class="public-collection-header">
      <p class="portfolio-eyebrow">Colección</p>

      <h2>${escapeHtml(collection.name)}</h2>

      ${
        collection.subtitle
          ? `<p>${escapeHtml(collection.subtitle)}</p>`
          : ""
      }
    </div>
  `;

  if (!events.length) {
    publicEvents.innerHTML = `
      <div class="portfolio-empty-state">
        <p>
          ${
            normalizedSearch
              ? "No se encontraron eventos."
              : "Todavía no hay eventos publicados."
          }
        </p>
      </div>
    `;
  } else {
    publicEvents.innerHTML = events
      .map(
        (event, index) => `
          <article
  class="portfolio-event-card"
  data-public-event="${escapeHtml(event.id)}"
  ${
    event.cover_image
      ? `style="--event-card-image: url('${escapeHtml(event.cover_image)}')"`
      : ""
  }
  tabindex="0"
  role="button"
>
            <div class="portfolio-card-content">
  <h3>${escapeHtml(event.title)}</h3>

  <p class="portfolio-card-date">
    ${escapeHtml(formatDate(event.event_date))}
  </p>

  <p class="portfolio-card-copy">
    ${escapeHtml(
      event.city ||
      event.venue ||
      "Detalles por confirmar"
    )}
  </p>
</div>

<div class="portfolio-card-footer">
  <span class="portfolio-card-arrow">
  ➜
</span>
</div>
          </article>
        `
      )
      .join("");

    publicEvents
      .querySelectorAll("[data-public-event]")
      .forEach((card) => {
        const openEvent = () => {
          const event = events.find(
            (item) => item.id === card.dataset.publicEvent
          );

          if (!event) return;

          showEvent(event);
        };

        card.addEventListener("click", openEvent);

        card.addEventListener("keydown", (keyboardEvent) => {
          if (
            keyboardEvent.key === "Enter" ||
            keyboardEvent.key === " "
          ) {
            keyboardEvent.preventDefault();
            openEvent();
          }
        });
      });
  }

  window.scrollTo({
    top: portfolioEventsSection.offsetTop,
    behavior: "smooth",
  });
}

function showEvent(event) {
  portfolioEventsSection.hidden = true;
  portfolioEventDetail.hidden = false;

  const galleryCount = Array.isArray(event.gallery)
    ? event.gallery.length
    : 0;

  const videoCount = Array.isArray(event.videos)
    ? event.videos.length
    : 0;

  publicEventContent.innerHTML = `
    <article class="public-event-detail">
      <div>
        <p class="portfolio-eyebrow">Evento</p>

        <h2>${escapeHtml(event.title)}</h2>

        <div class="public-event-meta">
          <span>${escapeHtml(formatDate(event.event_date))}</span>

          ${
            event.venue
              ? `<span>${escapeHtml(event.venue)}</span>`
              : ""
          }

          ${
            event.city
              ? `<span>${escapeHtml(event.city)}</span>`
              : ""
          }
        </div>
      </div>

      <div class="public-event-cover">
        ${
          event.cover_image
            ? `
              <img
                src="${escapeHtml(event.cover_image)}"
                alt="${escapeHtml(event.title)}"
              />
            `
            : `
              <span>Foto principal próximamente</span>
            `
        }
      </div>

      ${
        event.story
          ? `
            <div>
              <p class="portfolio-eyebrow">La historia</p>

              <p class="public-event-story">
                ${escapeHtml(event.story)}
              </p>
            </div>
          `
          : ""
      }
${
  galleryCount
    ? `
      <section class="public-event-gallery">
        <div class="public-event-gallery-heading">
          <p class="portfolio-eyebrow">Galería</p>
          <h3>${galleryCount} fotos</h3>
        </div>

        <div class="public-event-gallery-grid">
          ${event.gallery
            .map(
              (image, index) => `
                <button
                  class="public-event-gallery-item"
                  type="button"
                  data-gallery-image="${index}"
                  aria-label="Abrir foto ${index + 1}"
                >
                  <img
                    src="${escapeHtml(image)}"
                    alt="Foto ${index + 1} de ${escapeHtml(event.title)}"
                  />
                </button>
              `
            )
            .join("")}
        </div>
      </section>
        `
    : ""
}
${
  videoCount
    ? `
      <section class="public-event-videos">
        <div class="public-event-gallery-heading">
          <p class="portfolio-eyebrow">Videos</p>
          <h3>${videoCount} videos</h3>
        </div>

        <div class="public-event-videos-grid">
          ${event.videos
            .map(
              (video) => `
                <article class="public-event-video-card">
                  <video
                    controls
                    playsinline
                    preload="metadata"
                  >
                    <source
                      src="${escapeHtml(video.url)}"
                    />
                    Tu navegador no puede reproducir este video.
                  </video>

                  <p>
                    ${escapeHtml(video.title || "Video")}
                  </p>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `
    : ""
}
      <div class="event-preview-sections">
        <div>
          <p class="portfolio-eyebrow">Galería</p>
          <h4>${galleryCount} fotos</h4>
        </div>

        <div>
          <p class="portfolio-eyebrow">Videos</p>
          <h4>${videoCount} videos</h4>
        </div>
      </div>
    </article>
  `;
publicEventContent
  .querySelectorAll("[data-gallery-image]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      openGalleryLightbox(
        event.gallery,
        Number(button.dataset.galleryImage)
      );
    });
  });

  window.scrollTo({
    top: portfolioEventDetail.offsetTop,
    behavior: "smooth",
  });
}

backToPublicCollections?.addEventListener("click", () => {
  portfolioEventsSection.hidden = true;
  portfolioEventDetail.hidden = true;
  collectionsSection.hidden = false;

  window.scrollTo({
    top: collectionsSection.offsetTop,
    behavior: "smooth",
  });
});

backToPublicEvents?.addEventListener("click", () => {
  portfolioEventDetail.hidden = true;
  portfolioEventsSection.hidden = false;

  window.scrollTo({
    top: portfolioEventsSection.offsetTop,
    behavior: "smooth",
  });
});

searchToggle?.addEventListener("click", () => {
  searchPanel.hidden = false;
  searchInput?.focus();
});

searchClose?.addEventListener("click", () => {
  searchPanel.hidden = true;

  if (searchInput) {
    searchInput.value = "";
  }

  if (activeCollection) {
    showCollection(activeCollection);
  }
});

searchInput?.addEventListener("input", () => {
  if (!activeCollection) return;

  showCollection(activeCollection, searchInput.value);
});
galleryLightboxClose?.addEventListener(
  "click",
  closeGalleryLightbox
);

galleryLightboxPrev?.addEventListener(
  "click",
  showPreviousGalleryImage
);

galleryLightboxNext?.addEventListener(
  "click",
  showNextGalleryImage
);

galleryLightbox?.addEventListener("click", (event) => {
  if (event.target === galleryLightbox) {
    closeGalleryLightbox();
  }
});

document.addEventListener("keydown", (event) => {
  if (!galleryLightbox?.classList.contains("is-open")) return;

  if (event.key === "Escape") {
    closeGalleryLightbox();
  }

  if (event.key === "ArrowLeft") {
    showPreviousGalleryImage();
  }

  if (event.key === "ArrowRight") {
    showNextGalleryImage();
  }
});

loadPublicPortfolio();