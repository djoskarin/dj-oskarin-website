import { db } from "../firebase.js";
import { openCloudinaryUpload } from "../cloudinary.js";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
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
function saveCollections(collections) {
  try {
    localStorage.setItem(
      COLLECTIONS_STORAGE_KEY,
      JSON.stringify(collections)
    );
  } catch (error) {
    console.error("Collection storage failed:", error);

    throw new Error(
      "No se pudo guardar la colección."
    );
  }
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

function compressImageFile(
  file,
  maxSize = 1400,
  quality = 0.72
) {
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
          height = Math.round(
            (height * maxSize) / width
          );
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round(
            (width * maxSize) / height
          );
          height = maxSize;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(
            new Error("No se pudo procesar la imagen.")
          );
          return;
        }

        context.drawImage(
          image,
          0,
          0,
          width,
          height
        );

        resolve(
          canvas.toDataURL(
            "image/jpeg",
            quality
          )
        );
      });

      image.src = reader.result;
    });

    reader.readAsDataURL(file);
  });
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

  if (method === "GET") {
    const collectionsQuery = query(
      collection(db, "portfolioCollections"),
      orderBy("display_order", "asc")
    );

    const snapshot = await getDocs(collectionsQuery);

    return {
      success: true,
      collections: snapshot.docs.map((collectionDocument) => ({
        id: collectionDocument.id,
        ...collectionDocument.data(),
      })),
    };
  }

  if (method === "POST") {
    const name = String(body.name || "").trim();
    const subtitle = String(body.subtitle || "").trim();

    if (!name) {
      throw new Error("Escribe el nombre de la colección.");
    }

    const currentSnapshot = await getDocs(
      collection(db, "portfolioCollections")
    );

    const createdDocument = await addDoc(
      collection(db, "portfolioCollections"),
      {
        name,
        slug: createLocalSlug(name),
        subtitle: subtitle || null,
        cover_image: null,
        is_visible: true,
        display_order: currentSnapshot.size,
        created_at: serverTimestamp(),
      }
    );

    return {
      success: true,
      collection: {
        id: createdDocument.id,
        name,
        slug: createLocalSlug(name),
        subtitle: subtitle || null,
        cover_image: null,
        is_visible: true,
        display_order: currentSnapshot.size,
      },
    };
  }

  if (method === "PATCH") {
    const id = String(body.id || "").trim();

    if (!id) {
      throw new Error("No se encontró la colección.");
    }

    const updates = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();

      if (!name) {
        throw new Error("El nombre no puede quedar vacío.");
      }

      updates.name = name;
      updates.slug = createLocalSlug(name);
    }

    if (typeof body.subtitle === "string") {
      updates.subtitle = body.subtitle.trim() || null;
    }

    if (typeof body.is_visible === "boolean") {
      updates.is_visible = body.is_visible;
    }

    if (Number.isInteger(body.display_order)) {
      updates.display_order = body.display_order;
    }

    await updateDoc(
      doc(db, "portfolioCollections", id),
      updates
    );

    return {
      success: true,
      collection: {
        id,
        ...updates,
      },
    };
  }

  if (method === "DELETE") {
    const id = String(body.id || "").trim();

    if (!id) {
      throw new Error("No se encontró la colección.");
    }

    await deleteDoc(
      doc(db, "portfolioCollections", id)
    );

    return {
      success: true,
    };
  }

  throw new Error("Acción no disponible.");
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
async function showCollectionEvents(collectionItem) {
  editorContent.innerHTML = `
    <button
      class="editor-back-link"
      id="backToCollections"
      type="button"
    >
      ← Volver a colecciones
    </button>

    <div class="collection-events-heading">
      <div>
        <p class="eyebrow">Colección</p>

        <h3>${escapeHtml(collectionItem.name)}</h3>

        ${
          collectionItem.subtitle
            ? `<p>${escapeHtml(collectionItem.subtitle)}</p>`
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
      <div class="editor-empty">
        <p>Cargando eventos...</p>
      </div>
    </div>
  `;

  document
    .getElementById("backToCollections")
    ?.addEventListener("click", loadCollections);

  document
    .getElementById("newEventButton")
    ?.addEventListener("click", () => {
      showEventForm(collectionItem);
    });

  try {
    const eventsQuery = query(
      collection(db, "portfolioEvents"),
      where("collection_id", "==", collectionItem.id)
    );

    const snapshot = await getDocs(eventsQuery);

    const events = snapshot.docs
      .map((eventDocument) => ({
        id: eventDocument.id,
        ...eventDocument.data(),
      }))
      .sort(
        (a, b) =>
          Number(a.display_order || 0) -
          Number(b.display_order || 0)
      );

    const eventsList = editorContent.querySelector(
      ".events-admin-list"
    );

    if (!eventsList) return;

    if (!events.length) {
      eventsList.innerHTML = `
        <div class="editor-empty collection-events-empty">
          <h3>Todavía no hay eventos</h3>

          <p>
            Cuando agregues tu primer evento, aparecerá aquí dentro de
            ${escapeHtml(collectionItem.name)}.
          </p>
        </div>
      `;

      return;
    }

    eventsList.innerHTML = events
      .map(
        (eventItem, index) => `
          <article class="event-admin-card">
            <div class="event-admin-number">
              ${index + 1}
            </div>

            <div class="event-admin-info">
              <p class="event-admin-date">
                ${
                  eventItem.event_date
                    ? escapeHtml(eventItem.event_date)
                    : "Sin fecha"
                }
              </p>

              <h3>${escapeHtml(eventItem.title)}</h3>

              <p>
                ${escapeHtml(
                  [eventItem.venue, eventItem.city]
                    .filter(Boolean)
                    .join(" · ") || "Sin lugar"
                )}
              </p>
            </div>

            <div class="event-admin-actions">
              <button
                type="button"
                data-open-event="${escapeHtml(eventItem.id)}"
              >
                Abrir
              </button>

              <button
                type="button"
                data-edit-event="${escapeHtml(eventItem.id)}"
              >
                Editar
              </button>

              <button
                class="danger-action"
                type="button"
                data-delete-event="${escapeHtml(eventItem.id)}"
              >
                Eliminar
              </button>
            </div>
          </article>
        `
      )
      .join("");

    editorContent
      .querySelectorAll("[data-open-event]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const eventToOpen = events.find(
            (eventItem) =>
              eventItem.id === button.dataset.openEvent
          );

          if (!eventToOpen) return;

          showEventPreview(
            collectionItem,
            eventToOpen
          );
        });
      });

    editorContent
      .querySelectorAll("[data-edit-event]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const eventToEdit = events.find(
            (eventItem) =>
              eventItem.id === button.dataset.editEvent
          );

          if (!eventToEdit) return;

          showEventForm(
            collectionItem,
            eventToEdit
          );
        });
      });

    editorContent
      .querySelectorAll("[data-delete-event]")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          const confirmed = window.confirm(
            "¿Eliminar este evento?"
          );

          if (!confirmed) return;

          try {
            await deleteDoc(
              doc(
                db,
                "portfolioEvents",
                button.dataset.deleteEvent
              )
            );

            showToast("✓ Evento eliminado");

            await showCollectionEvents(
              collectionItem
            );
          } catch (error) {
            console.error(
              "Event deletion failed:",
              error
            );

            showToast(
              "No se pudo eliminar el evento."
            );
          }
        });
      });
  } catch (error) {
    console.error(
      "Could not load collection events:",
      error
    );

    const eventsList = editorContent.querySelector(
      ".events-admin-list"
    );

    if (eventsList) {
      eventsList.innerHTML = `
        <div class="editor-empty">
          <p>No se pudieron cargar los eventos.</p>
        </div>
      `;
    }
  }
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

function showEventForm(collectionItem, eventToEdit = null) {
   const editing = Boolean(eventToEdit);

  editorContent.innerHTML = `
    <button class="editor-back-link" id="backToCollectionEvents" type="button">
      ← Volver a ${escapeHtml(collectionItem.name)}
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

    <label class="event-upload-placeholder">
  Agregar videos

  <input
    id="eventVideoInput"
    type="file"
    accept="video/*"
    multiple
    hidden
  />
</label>
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
      showCollectionEvents(collectionItem);
    });
let selectedCoverImage =
  editing && eventToEdit.cover_image
    ? eventToEdit.cover_image
    : null;

    let selectedGalleryImages =
  editing && Array.isArray(eventToEdit.gallery)
    ? [...eventToEdit.gallery]
    : [];
    let selectedEventVideos =
  editing && Array.isArray(eventToEdit.videos)
    ? [...eventToEdit.videos]
    : [];

function renderEventVideos() {
  const videosList = document.getElementById(
    "eventVideosList"
  );

  if (!videosList) return;

  if (!selectedEventVideos.length) {
    videosList.innerHTML = `
      <p>Todavía no has agregado videos.</p>
    `;
    return;
  }

  videosList.innerHTML = selectedEventVideos
    .map(
      (video, index) => `
        <div class="event-video-admin-item">
          <div>
            <strong>
              ${escapeHtml(video.title || `Video ${index + 1}`)}
            </strong>

            <p>
              ${escapeHtml(video.url || "")}
            </p>
          </div>

          <button
            type="button"
            data-remove-event-video="${index}"
          >
            Eliminar
          </button>
        </div>
      `
    )
    .join("");

  videosList
    .querySelectorAll("[data-remove-event-video]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        selectedEventVideos.splice(
          Number(button.dataset.removeEventVideo),
          1
        );

        renderEventVideos();
      });
    });
}

document
  .getElementById("eventVideoInput")
  ?.addEventListener("change", async (event) => {
    const files = Array.from(
      event.target.files || []
    ).filter((file) =>
      file.type.startsWith("video/")
    );

    if (!files.length) return;

    showToast("Subiendo videos...");

    for (const file of files) {
      try {
        const formData = new FormData();

        formData.append("file", file);
        formData.append(
          "upload_preset",
          "dj_oskarin_gallery"
        );
        formData.append(
          "folder",
          "dj-oskarin/events/videos"
        );

        const response = await fetch(
          "https://api.cloudinary.com/v1_1/xl0azxka/video/upload",
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error(
            "Cloudinary video upload failed."
          );
        }

        const uploadedVideo =
          await response.json();

        selectedEventVideos.push({
          title:
            file.name.replace(/\.[^/.]+$/, "") ||
            "Video",
          url: uploadedVideo.secure_url,
        });

        renderEventVideos();
      } catch (error) {
        console.error(
          "Video upload failed:",
          error
        );

        showToast(
          "No se pudo subir un video."
        );
      }
    }

    event.target.value = "";
    showToast("✓ Videos subidos");
  });

renderEventVideos();

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
  ?.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []).filter(
      (file) => file.type.startsWith("image/")
    );

    if (!files.length) return;

    showToast("Subiendo fotos...");

    for (const file of files) {
      try {
        const formData = new FormData();

        formData.append("file", file);
        formData.append(
          "upload_preset",
          "dj_oskarin_gallery"
        );
        formData.append(
          "folder",
          "dj-oskarin/events"
        );

        const response = await fetch(
          "https://api.cloudinary.com/v1_1/xl0azxka/image/upload",
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error("Cloudinary upload failed.");
        }

        const uploadedImage = await response.json();

        selectedGalleryImages.push(
          uploadedImage.secure_url
        );

        renderGalleryPreview();
      } catch (error) {
        console.error("Photo upload failed:", error);
        showToast("No se pudo subir una foto.");
      }
    }

    event.target.value = "";
    showToast("✓ Fotos subidas");
  });


renderGalleryPreview();

document
  .getElementById("eventCoverInput")
  ?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Selecciona una imagen.");
      return;
    }

    try {
      showToast("Subiendo foto principal...");

      const formData = new FormData();

      formData.append("file", file);
      formData.append(
        "upload_preset",
        "dj_oskarin_gallery"
      );
      formData.append(
        "folder",
        "dj-oskarin/events"
      );

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/xl0azxka/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Cloudinary upload failed.");
      }

      const uploadedImage = await response.json();

      selectedCoverImage = uploadedImage.secure_url;

      const preview = document.getElementById(
        "eventCoverPreview"
      );

      if (preview) {
        preview.innerHTML = `
          <img
            src="${selectedCoverImage}"
            alt="Vista previa de la foto principal"
          />
        `;
      }

      showToast("✓ Foto principal subida");
    } catch (error) {
      console.error(
        "Cover photo upload failed:",
        error
      );

      showToast(
        "No se pudo subir la foto principal."
      );
    }

    event.target.value = "";
  });

 document
  .getElementById("eventForm")
  ?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const submitButton = form.querySelector(
      'button[type="submit"]'
    );
    const errorElement = document.getElementById(
      "eventFormError"
    );

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
      errorElement.textContent =
        "Escribe el nombre del evento.";
      return;
    }

    errorElement.textContent = "";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "GUARDANDO...";
    }

    try {
  const eventData = {
    collection_id: collectionItem.id,
    title,
    event_date: eventDate || null,
    venue: venue || null,
    city: city || null,
    story: story || null,
    cover_image: selectedCoverImage,
    gallery: selectedGalleryImages,
    videos: selectedEventVideos,
  };

  if (editing) {
    await updateDoc(
      doc(db, "portfolioEvents", eventToEdit.id),
      eventData
    );

    showToast("✓ Cambios guardados");
  } else {
    const existingEventsQuery = query(
      collection(db, "portfolioEvents"),
      where("collection_id", "==", collectionItem.id)
    );

    const existingEventsSnapshot = await getDocs(
      existingEventsQuery
    );

    await addDoc(
      collection(db, "portfolioEvents"),
      {
        ...eventData,
        display_order: existingEventsSnapshot.size,
        created_at: serverTimestamp(),
      }
    );

    showToast("✓ Evento guardado");
  }

  await showCollectionEvents(collectionItem);
    } catch (error) {
      console.error("Event save failed:", error);

      errorElement.textContent =
        error?.message ||
        "No se pudo guardar el evento.";

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = editing
          ? "GUARDAR CAMBIOS"
          : "GUARDAR EVENTO";
      }
    }
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

<button
  class="gallery-delete-button"
  type="button"
  data-photo-id="${photoDoc.id}"
>
  Eliminar fotografía
</button>
          </article>
        `;
      })
      .join("");

      galleryGrid
  .querySelectorAll(".gallery-delete-button")
  .forEach((button) => {
    button.addEventListener("click", async () => {
      const photoId = button.dataset.photoId;

      const confirmed = window.confirm(
        "¿Seguro que quieres eliminar esta fotografía?"
      );

      if (!confirmed) return;

      try {
        button.disabled = true;
        button.textContent = "Eliminando...";

        await deleteDoc(doc(db, "gallery", photoId));

        window.location.reload();
      } catch (error) {
        console.error("Could not delete gallery photo:", error);

        button.disabled = false;
        button.textContent = "Eliminar fotografía";

        alert(`No se pudo eliminar la fotografía: ${error.message}`);
      }
    });
  });

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
  "Administra todos los videos públicos de tu portafolio.",
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
async function showVideosManager() {
  editorContent.innerHTML = `
    <section class="packages-manager">
      <div class="packages-manager-header">
        <div>
          <p class="eyebrow">Administración</p>
          <h3>Videos</h3>

          <p class="packages-manager-description">
            Sube videos para tu página principal.
          </p>
        </div>

        <label class="editor-action">
          Agregar video

          <input
            id="addPublicVideoInput"
            type="file"
            accept="video/*"
            hidden
          />
        </label>
      </div>

      <div class="packages-admin-grid" id="videosAdminGrid">
        <div class="editor-empty">
          <p>Cargando videos...</p>
        </div>
      </div>
    </section>
  `;

  document
    .getElementById("addPublicVideoInput")
    ?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];

      if (!file || !file.type.startsWith("video/")) {
        return;
      }

      try {
        showToast("Subiendo video...");

        const formData = new FormData();

        formData.append("file", file);
        formData.append(
          "upload_preset",
          "dj_oskarin_gallery"
        );
        formData.append(
          "folder",
          "dj-oskarin/public-videos"
        );

        const response = await fetch(
          "https://api.cloudinary.com/v1_1/xl0azxka/video/upload",
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error("Cloudinary video upload failed.");
        }

        const uploadedVideo = await response.json();

        await addDoc(collection(db, "publicVideos"), {
          title:
            file.name.replace(/\.[^/.]+$/, "") ||
            "Video",
          url: uploadedVideo.secure_url,
          public_id: uploadedVideo.public_id,
          display_order: Date.now(),
          visible: true,
          created_at: serverTimestamp(),
        });

        showToast("✓ Video agregado");
        await showVideosManager();
      } catch (error) {
        console.error("Public video upload failed:", error);
        showToast("No se pudo subir el video.");
      }

      event.target.value = "";
    });

  const videosGrid =
    document.getElementById("videosAdminGrid");

  try {
    const videosQuery = query(
      collection(db, "publicVideos"),
      orderBy("display_order", "asc")
    );

    const snapshot = await getDocs(videosQuery);

    if (snapshot.empty) {
      videosGrid.innerHTML = `
        <div class="editor-empty">
          <h3>Todavía no hay videos</h3>
          <p>Presiona Agregar video para subir el primero.</p>
        </div>
      `;

      return;
    }

    videosGrid.innerHTML = snapshot.docs
      .map((videoDoc, index) => {
        const video = videoDoc.data();

        return `
          <article class="packages-admin-card">
            <p class="eyebrow">
              Video ${String(index + 1).padStart(2, "0")}
            </p>

            <video
              controls
              playsinline
              preload="metadata"
              style="
                width: 100%;
                aspect-ratio: 16 / 9;
                object-fit: cover;
                background: #000;
                margin-bottom: 20px;
              "
            >
              <source src="${escapeHtml(video.url)}" />
            </video>

            <input
  class="public-video-title-input"
  type="text"
  value="${escapeHtml(video.title || "")}"
  placeholder="Título del video"
  data-video-title="${escapeHtml(videoDoc.id)}"
/>

<button
  class="editor-action save-public-video-title"
  type="button"
  data-save-video-title="${escapeHtml(videoDoc.id)}"
>
  Guardar título
</button>

            <button
  class="public-video-delete-button"
  type="button"
  data-delete-public-video="${escapeHtml(videoDoc.id)}"
>
  Eliminar video
</button>
          </article>
        `;
      })
      .join("");

    videosGrid
  .querySelectorAll("[data-save-video-title]")
  .forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.saveVideoTitle;

      const input = videosGrid.querySelector(
        `[data-video-title="${id}"]`
      );

      if (!input) return;

      try {
        await updateDoc(
          doc(db, "publicVideos", id),
          {
            title: input.value.trim() || "Video",
          }
        );

        showToast("✓ Título guardado");
      } catch (error) {
        console.error(
          "Could not save video title:",
          error
        );

        showToast(
          "No se pudo guardar el título."
        );
      }
    });
  });
  videosGrid
      .querySelectorAll("[data-delete-public-video]")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          const confirmed = window.confirm(
            "¿Eliminar este video?"
          );

          if (!confirmed) return;

          try {
            await deleteDoc(
              doc(
                db,
                "publicVideos",
                button.dataset.deletePublicVideo
              )
            );

            showToast("✓ Video eliminado");
            await showVideosManager();
          } catch (error) {
            console.error(
              "Public video deletion failed:",
              error
            );

            showToast(
              "No se pudo eliminar el video."
            );
          }
        });
      });
  } catch (error) {
    console.error(
      "Could not load public videos:",
      error
    );

    videosGrid.innerHTML = `
      <div class="editor-empty">
        <p>No se pudieron cargar los videos.</p>
      </div>
    `;
  }
}
async function showReviewsManager() {
  editorContent.innerHTML = `
    <section class="packages-manager">
      <div class="packages-manager-header">
        <div>
          <p class="eyebrow">Administración</p>
          <h3>Reseñas</h3>

          <p class="packages-manager-description">
            Publica opiniones de clientes para mostrarlas en tu página.
          </p>
        </div>
      </div>

      <div class="packages-admin-card">
        <textarea
          id="reviewTextInput"
          placeholder="Escribe la reseña..."
          rows="5"
        ></textarea>

        <input
          id="reviewAuthorInput"
          type="text"
          placeholder="Autor, por ejemplo: Mamá de Zoé"
        />

        <div class="review-photo-upload">
  <button
    id="uploadReviewPhotoButton"
    type="button"
    class="review-upload-button"
  >
    Subir foto del cliente
  </button>

  <span id="reviewPhotoStatus">
    Sin foto
  </span>
</div>

<label class="review-featured-label">
  <input
    id="reviewFeaturedInput"
    type="checkbox"
  />
  ⭐ Destacar esta reseña
</label>

        <button
          class="editor-action"
          id="saveReviewButton"
          type="button"
        >
          Agregar reseña
        </button>
      </div>

      <div class="packages-admin-grid" id="reviewsAdminGrid">
        <div class="editor-empty">
          <p>Cargando reseñas...</p>
        </div>
      </div>
    </section>
  `;
    const saveReviewButton =
    document.getElementById("saveReviewButton");

    let uploadedReviewPhoto = "";

  document
  .getElementById("uploadReviewPhotoButton")
  ?.addEventListener("click", () => {
    openCloudinaryUpload((uploadedImage) => {
      uploadedReviewPhoto = uploadedImage.secure_url;

      const status =
        document.getElementById("reviewPhotoStatus");

      if (status) {
        status.textContent = "✓ Foto subida";
      }

      showToast("Foto del cliente agregada.");
    });
  });
  
  
  saveReviewButton?.addEventListener("click", async () => {
    const textInput =
      document.getElementById("reviewTextInput");

    const authorInput =
      document.getElementById("reviewAuthorInput");

    const text = textInput?.value.trim();
    const author = authorInput?.value.trim();

    const photo = uploadedReviewPhoto;

const featured =
  document.getElementById("reviewFeaturedInput")?.checked || false;

    if (!text || !author) {
      showToast("Escribe la reseña y el autor.");
      return;
    }

    try {
      saveReviewButton.disabled = true;
      saveReviewButton.textContent = "Guardando...";

      await addDoc(collection(db, "reviews"), {
  text,
  author,
  photo,
  featured,
  visible: true,
  display_order: Date.now(),
  created_at: serverTimestamp(),
});

      showToast("✓ Reseña agregada");
      await showReviewsManager();
    } catch (error) {
      console.error("Could not save review:", error);

      saveReviewButton.disabled = false;
      saveReviewButton.textContent = "Agregar reseña";

      showToast("No se pudo guardar la reseña.");
    }
      });

    const reviewsGrid =
  document.getElementById("reviewsAdminGrid");

try {
  const reviewsQuery = query(
    collection(db, "reviews"),
    orderBy("display_order", "asc")
  );

  const snapshot = await getDocs(reviewsQuery);

  if (snapshot.empty) {
    reviewsGrid.innerHTML = `
      <div class="editor-empty">
        <h3>Todavía no hay reseñas</h3>
        <p>Agrega la primera reseña arriba.</p>
      </div>
    `;

    return;
  }

  reviewsGrid.innerHTML = snapshot.docs
    .map((reviewDoc, index) => {
      const review = reviewDoc.data();

      return `
        <article class="packages-admin-card">
          <p class="eyebrow">
            Reseña ${String(index + 1).padStart(2, "0")}
          </p>

          <p>${escapeHtml(review.text || "")}</p>

          <p>
            — ${escapeHtml(review.author || "Sin autor")}
          </p>
          <button
  class="review-delete-button"
  type="button"
  data-review-id="${escapeHtml(reviewDoc.id)}"
>
  Eliminar reseña
</button>
        </article>
      `;
    })
    .join("");
    reviewsGrid
  .querySelectorAll(".review-delete-button")
  .forEach((button) => {
    button.addEventListener("click", async () => {
      const reviewId = button.dataset.reviewId;

      const confirmed = window.confirm(
        "¿Seguro que quieres eliminar esta reseña?"
      );

      if (!confirmed) return;

      try {
        button.disabled = true;
        button.textContent = "Eliminando...";

        await deleteDoc(doc(db, "reviews", reviewId));

        showToast("✓ Reseña eliminada");
        await showReviewsManager();
      } catch (error) {
        console.error("Could not delete review:", error);

        button.disabled = false;
        button.textContent = "Eliminar reseña";

        showToast("No se pudo eliminar la reseña.");
      }
    });
  });
} catch (error) {
  console.error("Could not load reviews:", error);

  reviewsGrid.innerHTML = `
    <div class="editor-empty">
      <p>No se pudieron cargar las reseñas.</p>
    </div>
  `;
}
}
async function showSettingsManager() {
  editorContent.innerHTML = `
    <section class="packages-manager">
      <div class="packages-manager-header">
        <div>
          <p class="eyebrow">Administración</p>
          <h3>Sobre mí</h3>

          <p class="packages-manager-description">
            Edita la información que aparece públicamente en tu página.
          </p>
        </div>
      </div>

      <form class="collection-form" id="profileSettingsForm">
        <div
  id="profilePhotoPreview"
  style="
    width: 220px;
    height: 220px;
    margin: 10px auto 28px;
    border: 1px solid rgba(255,255,255,.22);
    border-radius: 50%;
    overflow: hidden;
    display: grid;
    place-items: center;
    background: #0b0b0b;
  "
>
  <span
    style="
      padding: 24px;
      color: rgba(255,255,255,.45);
      font-size: 12px;
      letter-spacing: .18em;
      text-align: center;
      text-transform: uppercase;
    "
  >
    Sin foto de perfil
  </span>
</div>

        <button
          class="review-upload-button"
          id="uploadProfilePhotoButton"
          type="button"
        >
          Subir foto de perfil
        </button>

        <label class="admin-field">
          <span>Nombre</span>

          <input
            id="profileNameInput"
            type="text"
            maxlength="80"
            placeholder="DJ Oskarin"
          />
        </label>

        <label class="admin-field">
          <span>Subtítulo</span>

          <input
            id="profileSubtitleInput"
            type="text"
            maxlength="120"
            placeholder="Creando momentos inolvidables."
          />
        </label>

        <label class="admin-field">
          <span>Sobre mí</span>

          <textarea
            id="profileBioInput"
            rows="8"
            maxlength="1200"
            placeholder="Escribe aquí tu biografía..."
          ></textarea>
        </label>

        <p
          class="collection-form-error"
          id="profileSettingsError"
        ></p>

        <button class="editor-action" type="submit">
          Guardar cambios
        </button>
      </form>
    </section>
  `;
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

if (sectionName === "videos") {
  editorTitle.textContent = "Videos";
  openEditor();
  showVideosManager();
  return;
}

if (sectionName === "resenas") {
  editorTitle.textContent = "Reseñas";
  openEditor();
  showReviewsManager();
  return;
}

if (sectionName === "configuracion") {
  editorTitle.textContent = "Configuración";
  openEditor();
  showSettingsManager();
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