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

function readCollections() {
  try {
    const collections = JSON.parse(
      localStorage.getItem(COLLECTIONS_STORAGE_KEY) || "[]"
    );

    return Array.isArray(collections)
      ? collections
          .filter((collection) => collection.is_visible !== false)
          .sort(
            (a, b) =>
              Number(a.display_order || 0) -
              Number(b.display_order || 0)
          )
      : [];
  } catch {
    return [];
  }
}

function readEvents() {
  try {
    const events = JSON.parse(
      localStorage.getItem(EVENTS_STORAGE_KEY) || "[]"
    );

    return Array.isArray(events)
      ? events.sort(
          (a, b) =>
            Number(a.display_order || 0) -
            Number(b.display_order || 0)
        )
      : [];
  } catch {
    return [];
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
            tabindex="0"
            role="button"
          >
            <div>
              <p class="portfolio-eyebrow">
                Evento ${String(index + 1).padStart(2, "0")}
              </p>

              <h3>${escapeHtml(event.title)}</h3>

              <p class="portfolio-card-copy">
                ${escapeHtml(
                  [event.venue, event.city]
                    .filter(Boolean)
                    .join(" · ") || "Detalles por confirmar"
                )}
              </p>
            </div>

            <div class="portfolio-card-footer">
              <span>${escapeHtml(formatDate(event.event_date))}</span>
              <strong>↗</strong>
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

renderCollections();