"use strict";

const adminLoading = document.getElementById("adminLoading");
const logoutButton = document.getElementById("logoutButton");

const editorModal = document.getElementById("editorModal");
const editorBackdrop = document.getElementById("editorBackdrop");
const closeEditorButton = document.getElementById("closeEditorButton");
const editorTitle = document.getElementById("editorTitle");
const editorContent = document.getElementById("editorContent");

const dashboardCards = document.querySelectorAll(".dashboard-card");

/*
  Temporary browser session check.

  This prevents someone from casually opening dashboard.html.
  Later we will strengthen the session protection.
*/

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

const sectionInformation = {
  eventos: {
    title: "Eventos destacados",
    description:
      "Aquí podrás crear Zoé XV, Le Blanc Bal y futuros eventos.",
    button: "Nuevo evento",
  },

  videos: {
    title: "Videos",
    description:
      "Aquí podrás agregar enlaces privados o no listados y sus miniaturas.",
    button: "Agregar video",
  },

  galeria: {
    title: "Galería",
    description:
      "Aquí podrás agregar imágenes mediante enlaces directos.",
    button: "Agregar fotografía",
  },

  paquetes: {
    title: "Paquetes",
    description:
      "Aquí podrás editar los paquetes Classic y Signature.",
    button: "Editar paquetes",
  },

  resenas: {
    title: "Reseñas",
    description:
      "Aquí podrás publicar reseñas como “Mamá de Zoé”.",
    button: "Agregar reseña",
  },

  configuracion: {
    title: "Configuración",
    description:
      "Aquí podrás cambiar tus enlaces de contacto y redes sociales.",
    button: "Editar configuración",
  },
};

function openEditor(sectionName) {
  const section = sectionInformation[sectionName];

  if (!section || !editorModal) return;

  editorTitle.textContent = section.title;

  editorContent.innerHTML = `
    <div class="editor-empty">
      <h3>${section.title}</h3>

      <p>${section.description}</p>

      <button class="editor-action" type="button">
        ${section.button}
      </button>
    </div>
  `;

  editorModal.classList.add("is-open");
  editorModal.setAttribute("aria-hidden", "false");

  document.body.classList.add("modal-open");
}

function closeEditor() {
  editorModal?.classList.remove("is-open");
  editorModal?.setAttribute("aria-hidden", "true");

  document.body.classList.remove("modal-open");
}

dashboardCards.forEach((card) => {
  card.addEventListener("click", () => {
    openEditor(card.dataset.section);
  });
});

closeEditorButton?.addEventListener("click", closeEditor);
editorBackdrop?.addEventListener("click", closeEditor);

logoutButton?.addEventListener("click", () => {
  sessionStorage.removeItem("djOskarinAdmin");
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