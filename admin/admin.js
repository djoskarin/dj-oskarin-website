"use strict";

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

function saveLocalCollections(collections) {
  localStorage.setItem(
    COLLECTIONS_STORAGE_KEY,
    JSON.stringify(collections)
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

    <div class="editor-empty collection-events-empty">
      <h3>Todavía no hay eventos</h3>

      <p>
        Cuando agregues tu primer evento, aparecerá aquí dentro de
        ${escapeHtml(collection.name)}.
      </p>
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
}
function showEventForm(collection) {
  editorContent.innerHTML = `
    <button class="editor-back-link" id="backToCollectionEvents" type="button">
      ← Volver a ${escapeHtml(collection.name)}
    </button>

    <form class="collection-form" id="eventForm">
      <div class="collection-form-heading">
        <p class="eyebrow">Nuevo evento</p>
        <h3>Agregar evento</h3>
      </div>

      <label class="admin-field">
        <span>Nombre del evento</span>
        <input
          id="eventTitle"
          type="text"
          maxlength="90"
          placeholder="Cailey & Oscar XV"
          required
        />
      </label>

      <label class="admin-field">
        <span>Fecha</span>
        <input id="eventDate" type="date" />
      </label>

      <label class="admin-field">
        <span>Lugar</span>
        <input
          id="eventVenue"
          type="text"
          maxlength="100"
          placeholder="Imperial Grand Venue"
        />
      </label>

      <label class="admin-field">
        <span>Ciudad</span>
        <input
          id="eventCity"
          type="text"
          maxlength="100"
          placeholder="McAllen, Texas"
        />
      </label>

      <label class="admin-field">
        <span>Historia del evento</span>
        <textarea
          id="eventStory"
          maxlength="600"
          placeholder="Describe la energía, el concepto y los mejores momentos de este evento."
        ></textarea>
      </label>

      <div class="event-media-placeholder">
        <p class="eyebrow">Contenido</p>

        <button type="button" class="event-upload-placeholder">
          Subir foto principal
        </button>

        <button type="button" class="event-upload-placeholder">
          Agregar fotos
        </button>

        <button type="button" class="event-upload-placeholder">
          Agregar video opcional
        </button>

        <p>
          Los botones de fotos y videos se conectarán en el siguiente paso.
        </p>
      </div>

      <p class="collection-form-error" id="eventFormError"></p>

      <button class="editor-action" type="submit">
        Guardar evento
      </button>
    </form>
  `;

  document
    .getElementById("backToCollectionEvents")
    ?.addEventListener("click", () => {
      showCollectionEvents(collection);
    });

  document
    .getElementById("eventForm")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();

      showToast("✓ Formulario listo");

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