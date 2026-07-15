import { db } from "../firebase.js";
import { openCloudinaryUpload } from "../cloudinary.js";

import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

"use strict";

const PACKAGES_STORAGE_KEY = "djOskarinPackages";

const adminLoading = document.getElementById("adminLoading");
const logoutButton = document.getElementById("logoutButton");

const editorModal = document.getElementById("editorModal");
const editorBackdrop = document.getElementById("editorBackdrop");
const closeEditorButton = document.getElementById("closeEditorButton");
const editorTitle = document.getElementById("editorTitle");
const editorContent = document.getElementById("editorContent");

const dashboardCards = document.querySelectorAll(".dashboard-card");

const hasAdminSession =
  sessionStorage.getItem("djOskarinAdmin") === "true";

if (!hasAdminSession) {
  window.location.replace("../index.html");
}

window.addEventListener("load", () => {
  window.setTimeout(() => {
    adminLoading?.classList.add("is-hidden");
  }, 500);
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  let toast = document.querySelector(".admin-toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.className = "admin-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("is-visible");

  window.clearTimeout(showToast.timeout);

  showToast.timeout = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1700);
}

function openEditor() {
  editorModal?.classList.add("is-open");
  editorModal?.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeEditor() {
  editorModal?.classList.remove("is-open");
  editorModal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

const COLLECTIONS_STORAGE_KEY = "djOskarinCollections";
const EVENTS_STORAGE_KEY = "djOskarinEvents";

function createLocalSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readLocalCollections() {
  try {
    const savedCollections = JSON.parse(
      localStorage.getItem(COLLECTIONS_STORAGE_KEY) || "[]"
    );

    return Array.isArray(savedCollections)
      ? savedCollections.sort(
          (a, b) =>
            Number(a.display_order || 0) -
            Number(b.display_order || 0)
        )
      : [];
  } catch {
    return [];
  }
}

function saveLocalEvents(events) {
  try {
    localStorage.setItem(
      EVENTS_STORAGE_KEY,
      JSON.stringify(events)
    );
  } catch (error) {
    console.error("Event storage failed:", error);

    throw new Error(
      "Las fotos superan el almacenamiento temporal. Prueba con menos fotos."
    );
  }
}

function readLocalEvents() {
  try {
    const savedEvents = JSON.parse(
      localStorage.getItem(EVENTS_STORAGE_KEY) || "[]"
    );

    return Array.isArray(savedEvents)
      ? savedEvents.sort(
          (a, b) =>
            Number(a.display_order || 0) -
            Number(b.display_order || 0)
        )
      : [];
  } catch {
    return [];
  }
}
function compressImageFile(file, maxSize = 1400, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("error", reject);

    reader.addEventListener("load", () => {
      const image = new Image();

      image.addEventListener("error", reject);

      image.addEventListener("load", () => {
        let width = image.width;
        let height = image.height;

        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      });

      image.src = reader.result;
    });

    reader.readAsDataURL(file);
  });
}

function saveLocalEvents(events) {
  localStorage.setItem(
    EVENTS_STORAGE_KEY,
    JSON.stringify(events)
  );
}

function createLocalId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `collection-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

async function requestCollections(options = {}) {
  const method = String(options.method || "GET").toUpperCase();

  let body = {};

  if (options.body) {
    try {
      body = JSON.parse(options.body);
    } catch {
      body = {};
    }
  }

  let collections = readLocalCollections();

  if (method === "GET") {
    return {
      success: true,
      collections,
    };
  }

  if (method === "POST") {
    const name = String(body.name || "").trim();
    const subtitle = String(body.subtitle || "").trim();

    if (!name) {
      throw new Error("Write the collection name.");
    }

    const collection = {
      id: createLocalId(),
      created_at: new Date().toISOString(),
      name,
      slug: createLocalSlug(name),
      subtitle: subtitle || null,
      cover_image: null,
      is_visible: true,
      display_order: collections.length,
    };

    collections.push(collection);
    saveLocalCollections(collections);

    return {
      success: true,
      collection,
    };
  }

  if (method === "PATCH") {
    const collectionIndex = collections.findIndex(
      (collection) => collection.id === body.id
    );

    if (collectionIndex === -1) {
      throw new Error("Collection not found.");
    }

    const currentCollection = collections[collectionIndex];

    const updatedCollection = {
      ...currentCollection,
      ...(typeof body.name === "string"
        ? {
            name: body.name.trim(),
            slug: createLocalSlug(body.name),
          }
        : {}),
      ...(typeof body.subtitle === "string"
        ? { subtitle: body.subtitle.trim() || null }
        : {}),
      ...(typeof body.is_visible === "boolean"
        ? { is_visible: body.is_visible }
        : {}),
      ...(Number.isInteger(body.display_order)
        ? { display_order: body.display_order }
        : {}),
    };

    collections[collectionIndex] = updatedCollection;
    saveLocalCollections(collections);

    return {
      success: true,
      collection: updatedCollection,
    };
  }

  if (method === "DELETE") {
    collections = collections.filter(
      (collection) => collection.id !== body.id
    );

    collections = collections.map((collection, index) => ({
      ...collection,
      display_order: index,
    }));

    saveLocalCollections(collections);

    return {
      success: true,
    };
  }

  throw new Error("Unsupported action.");
}

async function loadCollections() {
  editorContent.innerHTML = `
    <div class="collections-loading">
      Cargando colecciones...
    </div>
  `;

  try {
    const result = await requestCollections();

    renderCollections(result.collections || []);
  } catch (error) {
    editorContent.innerHTML = `
      <div class="editor-empty">
        <h3>No se pudieron cargar</h3>
        <p>${escapeHtml(error.message)}</p>
        <button class="editor-action" id="retryCollections" type="button">
          Intentar de nuevo
        </button>
      </div>
    `;

    document
      .getElementById("retryCollections")
      ?.addEventListener("click", loadCollections);
  }
}

function renderCollections(collections) {
  const collectionCards = collections.length
    ? collections
        .map(
          (collection) => `
            <article
              class="collection-admin-card"
              data-collection-id="${escapeHtml(collection.id)}"
            >
              <div class="collection-admin-order">
                ${Number(collection.display_order ?? 0) + 1}
              </div>

              <div class="collection-admin-info">
                <p class="collection-admin-status">
                  ${collection.is_visible ? "Visible" : "Oculta"}
                </p>

                <h3>${escapeHtml(collection.name)}</h3>

                ${
                  collection.subtitle
                    ? `<p>${escapeHtml(collection.subtitle)}</p>`
                    : `<p class="collection-no-subtitle">Sin subtítulo</p>`
                }
              </div>

              <div class="collection-admin-actions">
              <button
  type="button"
  data-action="open"
  data-id="${escapeHtml(collection.id)}"
>
  Abrir
</button>
                <button
                  type="button"
                  data-action="edit"
                  data-id="${escapeHtml(collection.id)}"
                >
                  Editar
                </button>

                <button
                  type="button"
                  data-action="visibility"
                  data-id="${escapeHtml(collection.id)}"
                  data-visible="${collection.is_visible}"
                >
                  ${collection.is_visible ? "Ocultar" : "Mostrar"}
                </button>

                <button
                  class="danger-action"
                  type="button"
                  data-action="delete"
                  data-id="${escapeHtml(collection.id)}"
                  data-name="${escapeHtml(collection.name)}"
                >
                  Eliminar
                </button>
              </div>
            </article>
          `
        )
        .join("")
    : `
        <div class="editor-empty">
          <h3>Todavía no hay colecciones</h3>
          <p>
            Crea XV Años ahora y podrás seguir agregando eventos
            dentro de ella en el futuro.
          </p>
        </div>
      `;

  editorContent.innerHTML = `
    <div class="collections-toolbar">
      <div>
        <p class="eyebrow">Tu portafolio</p>
        <h3>Colecciones</h3>
      </div>

      <button
        class="editor-action collections-add-button"
        id="newCollectionButton"
        type="button"
      >
        Nueva colección
      </button>
    </div>

    <div class="collections-list">
      ${collectionCards}
    </div>
  `;

  document
    .getElementById("newCollectionButton")
    ?.addEventListener("click", () => showCollectionForm());

  editorContent
    .querySelectorAll("[data-action]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const collection = collections.find(
          (item) => item.id === button.dataset.id
        );

        if (!collection) return;

if (button.dataset.action === "open") {
  showCollectionEvents(collection);
}
        if (button.dataset.action === "edit") {
          showCollectionForm(collection);
        }

        if (button.dataset.action === "visibility") {
          toggleCollectionVisibility(collection);
        }

        if (button.dataset.action === "delete") {
          deleteCollection(collection);
        }
      });
    });
}
function showCollectionEvents(collection) {
  const events = readLocalEvents()
    .filter((item) => item.collection_id === collection.id)
    .sort(
      (a, b) =>
        Number(a.display_order || 0) -
        Number(b.display_order || 0)
    );

  const eventCards = events.length
    ? events
        .map(
  (event, index) => `
            <article class="event-admin-card">
              <div class="event-admin-number">
               ${index + 1}
              </div>

              <div class="event-admin-info">
                <p class="event-admin-date">
                  ${
                    event.event_date
                      ? escapeHtml(event.event_date)
                      : "Sin fecha"
                  }
                </p>

                <h3>${escapeHtml(event.title)}</h3>

                <p>
                  ${escapeHtml(
                    [event.venue, event.city]
                      .filter(Boolean)
                      .join(" · ") || "Sin lugar"
                  )}
                </p>
              </div>

              <div class="event-admin-actions">
                <button
  type="button"
  data-edit-event="${escapeHtml(event.id)}"
>
 Abrir
  </button>

   <button
    type="button"
    data-edit-event="${escapeHtml(event.id)}"
  >  
  Editar
</button>

                <button
                  class="danger-action"
                  type="button"
                  data-delete-event="${escapeHtml(event.id)}"
                >
                  Eliminar
                </button>
              </div>
            </article>
          `
        )
        .join("")
    : `
        <div class="editor-empty collection-events-empty">
          <h3>Todavía no hay eventos</h3>
          <p>
            Cuando agregues tu primer evento, aparecerá aquí dentro de
            ${escapeHtml(collection.name)}.
          </p>
        </div>
      `;

  editorContent.innerHTML = `
    <button class="editor-back-link" id="backToCollections" type="button">
      ← Volver a colecciones
    </button>

    <div class="collection-events-heading">
      <div>
        <p class="eyebrow">Colección</p>
        <h3>${escapeHtml(collection.name)}</h3>

        ${
          collection.subtitle
            ? `<p>${escapeHtml(collection.subtitle)}</p>`
            : ""
        }
      </div>

      <button
        class="editor-action collections-add-button"
        id="newEventButton"
        type="button"
      >
        Nuevo evento
      </button>
    </div>

    <div class="events-admin-list">
      ${eventCards}
    </div>
  `;

  document
    .getElementById("backToCollections")
    ?.addEventListener("click", loadCollections);

  document
    .getElementById("newEventButton")
    ?.addEventListener("click", () => {
      showEventForm(collection);
    });
  editorContent
  .querySelectorAll("[data-open-event]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      const eventToOpen = events.find(
        (event) => event.id === button.dataset.openEvent
      );

      if (!eventToOpen) return;

      showEventPreview(collection, eventToOpen);
    });
  });

editorContent
  .querySelectorAll("[data-edit-event]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      const eventToEdit = events.find(
        (event) => event.id === button.dataset.editEvent
      );

      if (!eventToEdit) return;

      showEventForm(collection, eventToEdit);
    });
  });

  editorContent
    .querySelectorAll("[data-delete-event]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const confirmed = window.confirm("¿Eliminar este evento?");

        if (!confirmed) return;

        const updatedEvents = readLocalEvents().filter(
          (event) => event.id !== button.dataset.deleteEvent
        );

        saveLocalEvents(updatedEvents);
        showToast("✓ Evento eliminado");
        showCollectionEvents(collection);
      });
    });
}
function showEventPreview(collection, event) {
  const formattedDate = event.event_date
    ? new Date(`${event.event_date}T12:00:00`).toLocaleDateString("es-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Fecha por confirmar";

  editorContent.innerHTML = `
    <button class="editor-back-link" id="backToCollectionEvents" type="button">
      ← Volver a ${escapeHtml(collection.name)}
    </button>

    <article class="event-preview">
      <div class="event-preview-top">
        <p class="eyebrow">Vista previa</p>

        <h3>${escapeHtml(event.title)}</h3>

        <div class="event-preview-details">
          <p>${escapeHtml(formattedDate)}</p>

          ${
            event.venue
              ? `<p>${escapeHtml(event.venue)}</p>`
              : ""
          }

          ${
            event.city
              ? `<p>${escapeHtml(event.city)}</p>`
              : ""
          }
        </div>
      </div>

      <div class="event-preview-cover">
        ${
          event.cover_image
            ? `
              <img
                src="${escapeHtml(event.cover_image)}"
                alt="${escapeHtml(event.title)}"
              />
            `
            : `
              <div class="event-preview-cover-empty">
                <span>Foto principal</span>
              </div>
            `
        }
      </div>

      ${
        event.story
          ? `
            <div class="event-preview-story">
              <p class="eyebrow">La historia</p>
              <p>${escapeHtml(event.story)}</p>
            </div>
          `
          : ""
      }

      <div class="event-preview-sections">
        <div>
          <p class="eyebrow">Galería</p>
          <h4>
            ${
              Array.isArray(event.gallery)
                ? event.gallery.length
                : 0
            }
            fotos
          </h4>
        </div>

        <div>
          <p class="eyebrow">Videos</p>
          <h4>
            ${
              Array.isArray(event.videos)
                ? event.videos.length
                : 0
            }
            videos
          </h4>
        </div>
      </div>

      <button
        class="editor-action"
        id="editEventFromPreview"
        type="button"
      >
        Editar evento
      </button>
    </article>
  `;

  document
    .getElementById("backToCollectionEvents")
    ?.addEventListener("click", () => {
      showCollectionEvents(collection);
    });

  document
    .getElementById("editEventFromPreview")
    ?.addEventListener("click", () => {
      showEventForm(collection, event);
    });
}

function showEventForm(collection, eventToEdit = null) {
   const editing = Boolean(eventToEdit);

  editorContent.innerHTML = `
    <button class="editor-back-link" id="backToCollectionEvents" type="button">
      ← Volver a ${escapeHtml(collection.name)}
    </button>

    <form class="collection-form" id="eventForm">
      <div class="collection-form-heading">
       <p class="eyebrow">
  ${editing ? "Editar evento" : "Nuevo evento"}
</p>

<h3>
  ${editing ? escapeHtml(eventToEdit.title) : "Agregar evento"}
</h3>
      </div>

      <label class="admin-field">
        <span>Nombre del evento</span>
        <input
  id="eventTitle"
  type="text"
  maxlength="90"
  value="${editing ? escapeHtml(eventToEdit.title || "") : ""}"
  placeholder="Cailey & Oscar XV"
  required
/>
      </label>

      <label class="admin-field">
        <span>Fecha</span>
       <input
  id="eventDate"
  type="date"
  value="${editing ? escapeHtml(eventToEdit.event_date || "") : ""}"
/>
      </label>

      <label class="admin-field">
        <span>Lugar</span>
        <input
          id="eventVenue"
          type="text"
          maxlength="100"
          value="${editing ? escapeHtml(eventToEdit.venue || "") : ""}"
          placeholder="Imperial Grand Venue"
        />
      </label>

      <label class="admin-field">
        <span>Ciudad</span>
        <input
          id="eventCity"
          type="text"
          maxlength="100"
          value="${editing ? escapeHtml(eventToEdit.venue || "") : ""}"
          placeholder="McAllen, Texas"
        />
      </label>

      <label class="admin-field">
        <span>Historia del evento</span>
        <textarea
  id="eventStory"
  maxlength="600"
  placeholder="Describe la energía, el concepto y los mejores momentos de este evento."
>${editing ? escapeHtml(eventToEdit.story || "") : ""}</textarea>
      </label>

      <div class="event-media-placeholder">
        <p class="eyebrow">Contenido</p>

        <label class="event-upload-placeholder">
  Subir foto principal

  <input
    id="eventCoverInput"
    type="file"
    accept="image/*"
    hidden
  />
</label>

<div
  class="event-cover-preview"
  id="eventCoverPreview"
>
  ${
    editing && eventToEdit.cover_image
      ? `
        <img
          src="${escapeHtml(eventToEdit.cover_image)}"
          alt="${escapeHtml(eventToEdit.title)}"
        />
      `
      : `<span>Sin foto principal</span>`
  }
</div>

        <label class="event-upload-placeholder">
  Agregar fotos

  <input
    id="eventGalleryInput"
    type="file"
    accept="image/*"
    multiple
    hidden
  />
</label>

<div
  class="event-gallery-preview"
  id="eventGalleryPreview"
>
  ${
    editing &&
    Array.isArray(eventToEdit.gallery) &&
    eventToEdit.gallery.length
      ? eventToEdit.gallery
          .map(
            (image, index) => `
              <div class="event-gallery-preview-item">
                <img
                  src="${escapeHtml(image)}"
                  alt="Foto ${index + 1} de ${escapeHtml(eventToEdit.title)}"
                />
              </div>
            `
          )
          .join("")
      : `<p>Todavía no has agregado fotos.</p>`
  }
</div>

        <div class="event-videos-editor">
  <div class="event-videos-heading">
    <div>
      <p class="eyebrow">Videos opcionales</p>
      <p class="event-videos-help">
        Agrega un recap o momentos cortos del evento.
      </p>
    </div>

    <button
      class="event-upload-placeholder"
      id="addEventVideoButton"
      type="button"
    >
      Agregar video
    </button>
  </div>

  <div id="eventVideosList"></div>
</div>

        <p>
          Los botones de fotos y videos se conectarán en el siguiente paso.
        </p>
      </div>

      <p class="collection-form-error" id="eventFormError"></p>

      <button class="editor-action" type="submit">
  ${editing ? "Guardar cambios" : "Guardar evento"}
</button>
    </form>
  `;

  document
    .getElementById("backToCollectionEvents")
    ?.addEventListener("click", () => {
      showCollectionEvents(collection);
    });
let selectedCoverImage =
  editing && eventToEdit.cover_image
    ? eventToEdit.cover_image
    : null;

    let selectedGalleryImages =
  editing && Array.isArray(eventToEdit.gallery)
    ? [...eventToEdit.gallery]
    : [];

function renderGalleryPreview() {
  const preview = document.getElementById("eventGalleryPreview");

  if (!preview) return;

  if (!selectedGalleryImages.length) {
    preview.innerHTML = `<p>Todavía no has agregado fotos.</p>`;
    return;
  }

  preview.innerHTML = selectedGalleryImages
    .map(
      (image, index) => `
        <div class="event-gallery-preview-item">
          <img
            src="${image}"
            alt="Vista previa de la foto ${index + 1}"
          />

          <button
            type="button"
            data-remove-gallery-image="${index}"
            aria-label="Eliminar foto ${index + 1}"
          >
            ×
          </button>
        </div>
      `
    )
    .join("");

  preview
    .querySelectorAll("[data-remove-gallery-image]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        selectedGalleryImages.splice(
          Number(button.dataset.removeGalleryImage),
          1
        );

        renderGalleryPreview();
      });
    });
}

document
  .getElementById("eventGalleryInput")
  ?.addEventListener("change", (event) => {
    const files = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith("image/")
    );

    if (!files.length) return;

    files.forEach(async (file) => {
  try {
    const compressedImage = await compressImageFile(file);

    selectedGalleryImages.push(compressedImage);
    renderGalleryPreview();
  } catch (error) {
    console.error("Photo compression failed:", error);
    showToast("No se pudo procesar una foto.");
  }
});

    event.target.value = "";
  });

renderGalleryPreview();

document
  .getElementById("eventCoverInput")
  ?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Selecciona una imagen.");
      return;
    }

    const reader = new FileReader();

    reader.addEventListener("load", () => {
      selectedCoverImage = reader.result;

      const preview = document.getElementById("eventCoverPreview");

      if (preview) {
        preview.innerHTML = `
          <img
            src="${selectedCoverImage}"
            alt="Vista previa de la foto principal"
          />
        `;
      }
    });

    reader.readAsDataURL(file);
  });

  document
  .getElementById("eventForm")
  ?.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = document
      .getElementById("eventTitle")
      .value.trim();

    const eventDate = document
      .getElementById("eventDate")
      .value;

    const venue = document
      .getElementById("eventVenue")
      .value.trim();

    const city = document
      .getElementById("eventCity")
      .value.trim();

    const story = document
      .getElementById("eventStory")
      .value.trim();

    if (!title) {
      document.getElementById("eventFormError").textContent =
        "Write the event name.";
      return;
    }

    const events = readLocalEvents();

if (editing) {
  const eventIndex = events.findIndex(
    (item) => item.id === eventToEdit.id
  );

  if (eventIndex === -1) {
    document.getElementById("eventFormError").textContent =
      "No se encontró el evento.";
    return;
  }

  events[eventIndex] = {
    ...events[eventIndex],
    title,
    event_date: eventDate || null,
    venue: venue || null,
    city: city || null,
    story: story || null,
    cover_image: selectedCoverImage,
    gallery: selectedGalleryImages,
  };

  saveLocalEvents(events);
  showToast("✓ Cambios guardados");
} else {
  const collectionEvents = events.filter(
    (item) => item.collection_id === collection.id
  );

  const newEvent = {
    id: createLocalId(),
    collection_id: collection.id,
    created_at: new Date().toISOString(),
    title,
    event_date: eventDate || null,
    venue: venue || null,
    city: city || null,
    story: story || null,
    cover_image: selectedCoverImage,
    gallery: selectedGalleryImages,
    videos: [],
    display_order: collectionEvents.length,
  };

  events.push(newEvent);
  saveLocalEvents(events);
  showToast("✓ Evento guardado");
}

    showCollectionEvents(collection);
  });
  }

function showCollectionForm(collection = null) {
  const editing = Boolean(collection);

  editorContent.innerHTML = `
    <button class="editor-back-link" id="backToCollections" type="button">
      ← Volver a colecciones
    </button>

    <form class="collection-form" id="collectionForm">
      <div class="collection-form-heading">
        <p class="eyebrow">
          ${editing ? "Editar colección" : "Nueva colección"}
        </p>

        <h3>
          ${editing ? escapeHtml(collection.name) : "Nueva colección"}
        </h3>
      </div>

      <label class="admin-field">
        <span>Nombre</span>

        <input
          id="collectionName"
          name="name"
          type="text"
          maxlength="70"
          value="${editing ? escapeHtml(collection.name) : ""}"
          placeholder="XV Años"
          required
        />
      </label>

      <label class="admin-field">
        <span>Subtítulo opcional</span>

        <textarea
          id="collectionSubtitle"
          name="subtitle"
          maxlength="180"
          placeholder="Una selección de noches inolvidables."
        >${editing ? escapeHtml(collection.subtitle || "") : ""}</textarea>
      </label>

      <p class="collection-form-note">
        La foto de portada se agregará en el siguiente paso.
      </p>

      <p class="collection-form-error" id="collectionFormError"></p>

      <button class="editor-action" type="submit">
        ${editing ? "Guardar cambios" : "Crear colección"}
      </button>
    </form>
  `;

  document
    .getElementById("backToCollections")
    ?.addEventListener("click", loadCollections);

  document
    .getElementById("collectionForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const form = event.currentTarget;
      const submitButton = form.querySelector('button[type="submit"]');
      const errorMessage = document.getElementById(
        "collectionFormError"
      );

      const name = document
        .getElementById("collectionName")
        .value.trim();

      const subtitle = document
        .getElementById("collectionSubtitle")
        .value.trim();

      submitButton.disabled = true;
      submitButton.textContent = editing
        ? "Guardando..."
        : "Creando...";

      errorMessage.textContent = "";

      try {
        await requestCollections({
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify({
            ...(editing ? { id: collection.id } : {}),
            name,
            subtitle,
          }),
        });

        showToast(editing ? "✓ Cambios guardados" : "✓ Colección creada");
        await loadCollections();
      } catch (error) {
        errorMessage.textContent = error.message;
        submitButton.disabled = false;
        submitButton.textContent = editing
          ? "Guardar cambios"
          : "Crear colección";
      }
    });
}

async function toggleCollectionVisibility(collection) {
  try {
    await requestCollections({
      method: "PATCH",
      body: JSON.stringify({
        id: collection.id,
        is_visible: !collection.is_visible,
      }),
    });

    showToast(collection.is_visible ? "✓ Colección oculta" : "✓ Colección visible");
    await loadCollections();
  } catch (error) {
    window.alert(error.message);
  }
}

async function deleteCollection(collection) {
  const confirmed = window.confirm(
    `¿Eliminar la colección “${collection.name}”?`
  );

  if (!confirmed) return;

  try {
    await requestCollections({
      method: "DELETE",
      body: JSON.stringify({
        id: collection.id,
      }),
    });

    showToast("✓ Colección eliminada");
    await loadCollections();
  } catch (error) {
    window.alert(error.message);
  }
}
function getSavedPackages() {
  try {
    const savedPackages = localStorage.getItem(
      PACKAGES_STORAGE_KEY
    );

    if (savedPackages) {
      return JSON.parse(savedPackages);
    }

    return [
      {
        id: "esencial-xv",
        name: "Esencial",
        category: "XV's",
        features: [
          "4 horas de servicio",
          "Audio",
          "Iluminación",
          "DJ Oskarin + animador",
          "Bailarines para vals y remix",
          "Show de animación",
          "1 arlequín",
          "1 robot",
          "Artículos de animación para tus invitados",
        ],
        whatsappMessage:
          "Hola, me interesó su paquete Esencial para XV's.",
        image: "assets/package-esencial.jpg",
        visible: true,
      },
      {
        id: "signature-xv",
        name: "Signature",
        category: "XV's",
        features: [
          "Todo lo incluido en Esencial",
          "Pantalla LED",
          "Confetti",
          "Pirotecnia fría",
          "Hielo seco",
          "Visuales para pantalla",
        ],
        whatsappMessage:
          "Hola, me interesó su paquete Signature para XV's.",
        image: "assets/package-signature.jpg",
        visible: true,
      },
    ];
  } catch (error) {
    console.error("Could not load packages:", error);
    return [];
  }
}

function savePackages(packages) {
  localStorage.setItem(
    PACKAGES_STORAGE_KEY,
    JSON.stringify(packages)
  );
}

function showNewPackageForm() {
  editorContent.innerHTML = `
    <button
      class="editor-back-link"
      id="backToPackagesManager"
      type="button"
    >
      ← Volver a paquetes
    </button>

    <form class="collection-form" id="newPackageForm">
      <div class="collection-form-heading">
        <p class="eyebrow">Nuevo paquete</p>
        <h3>Agregar paquete</h3>
      </div>

      <label class="admin-field">
        <span>Nombre del paquete</span>

        <input
          id="packageNameInput"
          type="text"
          placeholder="Ej. Elegance"
          required
        />
      </label>

      <label class="admin-field">
        <span>Categoría</span>

        <input
          id="packageCategoryInput"
          type="text"
          placeholder="Ej. Bodas"
          required
        />
      </label>

      <label class="admin-field">
        <span>Elementos incluidos</span>

        <textarea
          id="packageFeaturesInput"
          rows="8"
          placeholder="Escribe un elemento por línea&#10;4 horas de servicio&#10;Audio&#10;Iluminación"
          required
        ></textarea>
      </label>

      <label class="admin-field">
        <span>Mensaje de WhatsApp</span>

        <textarea
          id="packageWhatsappInput"
          rows="3"
          placeholder="Hola, me interesó su paquete Elegance para bodas."
          required
        ></textarea>
      </label>

      <label class="event-upload-placeholder">
        Subir imagen del paquete

        <input
          id="packageImageInput"
          type="file"
          accept="image/*"
          hidden
        />
      </label>

      <div class="event-cover-preview" id="packageImagePreview">
        <span>Sin imagen</span>
      </div>

      <p class="collection-form-error" id="packageFormError"></p>

      <button class="editor-action" type="submit">
        Guardar paquete
      </button>
    </form>
  `;

  document
    .getElementById("backToPackagesManager")
    ?.addEventListener("click", showPackagesManager);

  let selectedPackageImage = null;

  document
    .getElementById("packageImageInput")
    ?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];

      if (!file || !file.type.startsWith("image/")) return;

      const reader = new FileReader();

      reader.addEventListener("load", () => {
        selectedPackageImage = reader.result;

        const preview = document.getElementById(
          "packageImagePreview"
        );

        if (preview) {
          preview.innerHTML = `
            <img
              src="${selectedPackageImage}"
              alt="Vista previa del paquete"
            />
          `;
        }
      });

      reader.readAsDataURL(file);
    });

  document
    .getElementById("newPackageForm")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();

      const name = document
        .getElementById("packageNameInput")
        ?.value.trim();

      const category = document
        .getElementById("packageCategoryInput")
        ?.value.trim();

      const features = document
        .getElementById("packageFeaturesInput")
        ?.value.split("\n")
        .map((item) => item.trim())
        .filter(Boolean);

      const whatsappMessage = document
        .getElementById("packageWhatsappInput")
        ?.value.trim();

      const errorElement = document.getElementById(
        "packageFormError"
      );

      if (
        !name ||
        !category ||
        !features?.length ||
        !whatsappMessage
      ) {
        if (errorElement) {
          errorElement.textContent =
            "Completa todos los campos.";
        }

        return;
      }

     const packages = getSavedPackages();

const newPackage = {
  id: `package-${Date.now()}`,
  name,
  category,
  features,
  whatsappMessage,
  image: selectedPackageImage,
  visible: true,
};

packages.push(newPackage);
savePackages(packages);

showToast("Paquete guardado.");
showPackagesManager();
    });
}
async function showGalleryManager() {
  editorContent.innerHTML = `
    <section class="packages-manager">
      <div class="packages-manager-header">
        <div>
          <p class="eyebrow">Administración</p>
          <h3>Galería</h3>

          <p class="packages-manager-description">
            Sube fotografías y decide cuáles aparecen primero.
          </p>
        </div>

        <button
          class="editor-action"
          id="addGalleryPhotosButton"
          type="button"
        >
          Agregar fotos
        </button>
      </div>

      <div class="packages-admin-grid" id="galleryAdminGrid">
        <div class="editor-empty">
          <p>Cargando fotografías...</p>
        </div>
      </div>
    </section>
  `;

  document
    .getElementById("addGalleryPhotosButton")
    ?.addEventListener("click", () => {
      openCloudinaryUpload(async (uploadedImage) => {
        try {
          await addDoc(collection(db, "gallery"), {
            url: uploadedImage.secure_url,
            publicId: uploadedImage.public_id,
            order: Date.now(),
            visible: true,
            uploadedAt: serverTimestamp(),
          });

          showToast("Foto agregada.");
          await showGalleryManager();
        } catch (error) {
          console.error("Could not save gallery photo:", error);
          showToast("No se pudo guardar la foto.");
        }
      });
    });

  const galleryGrid = document.getElementById("galleryAdminGrid");

  try {
    const galleryQuery = query(
      collection(db, "gallery"),
      orderBy("order", "asc")
    );

    const snapshot = await getDocs(galleryQuery);

    if (snapshot.empty) {
      galleryGrid.innerHTML = `
        <div class="editor-empty">
          <h3>Todavía no hay fotografías</h3>
          <p>Presiona Agregar fotos para subir las primeras.</p>
        </div>
      `;

      return;
    }

    galleryGrid.innerHTML = snapshot.docs
      .map((photoDoc, index) => {
        const photo = photoDoc.data();

        return `
          <article class="packages-admin-card">
            <p class="eyebrow">
              Fotografía ${String(index + 1).padStart(2, "0")}
            </p>

            <img
              src="${escapeHtml(photo.url)}"
              alt="Fotografía de galería"
              style="
                width: 100%;
                aspect-ratio: 4 / 3;
                object-fit: cover;
                margin-bottom: 20px;
              "
            />

            <p>
              Orden: ${Number(photo.order) || index + 1}
            </p>
          </article>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Could not load gallery:", error);

    galleryGrid.innerHTML = `
      <div class="editor-empty">
        <p>No se pudieron cargar las fotografías.</p>
      </div>
    `;
  }
}

function showPackagesManager() {
  const packages = getSavedPackages();

  editorContent.innerHTML = `
    <section class="packages-manager">
      <div class="packages-manager-header">
        <div>
          <p class="eyebrow">Administración</p>
          <h3>Paquetes</h3>

          <p class="packages-manager-description">
            Administra tus categorías y paquetes desde aquí.
          </p>
        </div>

        <button
          class="editor-action"
          id="addPackageButton"
          type="button"
        >
          Agregar paquete
        </button>
      </div>

      <section class="packages-admin-category">
        <div class="packages-admin-category-header">
          <div>
            <p class="eyebrow">Paquetes guardados</p>
          </div>
        </div>

        <div class="packages-admin-grid">
          ${
            packages.length
              ? packages
                  .map(
                    (packageItem, index) => `
                      <article class="packages-admin-card">
                        <p class="eyebrow">
                          ${escapeHtml(packageItem.category)}
                          · Paquete ${String(index + 1).padStart(2, "0")}
                        </p>

                        <h5>${escapeHtml(packageItem.name)}</h5>

                        <p>
                          ${
                            Array.isArray(packageItem.features)
                              ? packageItem.features.length
                              : 0
                          }
                          elementos incluidos.
                        </p>

                        <button
                          class="collection-button"
                          type="button"
                          data-package-id="${escapeHtml(packageItem.id)}"
                        >
                          Editar
                        </button>
                      </article>
                    `
                  )
                  .join("")
              : `
                <div class="editor-empty">
                  <h3>Todavía no hay paquetes</h3>
                  <p>Presiona Agregar paquete para crear el primero.</p>
                </div>
              `
          }
        </div>
      </section>
    </section>
  `;

  document
    .getElementById("addPackageButton")
    ?.addEventListener("click", () => {
      showNewPackageForm();
    });

  editorContent
    .querySelectorAll("[data-package-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        showToast("La edición del paquete viene ahora.");
      });
    });
}

function openPlaceholderSection(sectionName) {
  const information = {
    videos: [
      "Videos",
      "Aquí podrás agregar enlaces privados o no listados.",
    ],
    galeria: [
      "Galería",
      "Aquí podrás administrar las fotografías generales.",
    ],
    paquetes: [
      "Paquetes",
      "Aquí podrás editar Classic y Signature.",
    ],
    resenas: [
      "Reseñas",
      "Aquí podrás publicar reseñas como “Mamá de Zoé”.",
    ],
    configuracion: [
      "Configuración",
      "Aquí podrás cambiar tu foto, biografía y contacto.",
    ],
  };

  const [title, description] =
    information[sectionName] || ["Contenido", "Próximamente."];

  editorTitle.textContent = title;

  editorContent.innerHTML = `
    <div class="editor-empty">
      <h3>${title}</h3>
      <p>${description}</p>
    </div>
  `;

  openEditor();
}

dashboardCards.forEach((card) => {
  card.addEventListener("click", async () => {
    const sectionName = card.dataset.section;

   if (sectionName === "eventos") {
  editorTitle.textContent = "Eventos destacados";
  openEditor();
  await loadCollections();
  return;
}

if (sectionName === "paquetes") {
  editorTitle.textContent = "Paquetes";
  openEditor();
  showPackagesManager();
  return;
}

if (sectionName === "galeria") {
  editorTitle.textContent = "Galería";
  openEditor();
  showGalleryManager();
  return;
}

openPlaceholderSection(sectionName);
  });
});

closeEditorButton?.addEventListener("click", closeEditor);
editorBackdrop?.addEventListener("click", closeEditor);

logoutButton?.addEventListener("click", () => {
  sessionStorage.removeItem("djOskarinAdmin");
  sessionStorage.removeItem("djOskarinAdminToken");
  window.location.replace("../index.html");
});

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    editorModal?.classList.contains("is-open")
  ) {
    closeEditor();
  }
});