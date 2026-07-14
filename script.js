"use strict";

/* =========================================================
   DJ OSKARIN — CONFIGURACIÓN
========================================================= */

const CONFIG = {
  phoneNumber: "19564352725",
  instagramUrl: "https://www.instagram.com/dj.oskarin/",
  whatsappMessage:
    "Hola, DJ Oskarin. Encontré tu página web y me gustaría recibir información para mi evento.",
  adminDashboardUrl: "admin/dashboard.html",
  adminVerificationUrl: "/api/verify-pin",
};

/* =========================================================
   ELEMENTOS
========================================================= */

const body = document.body;

const loadingScreen = document.getElementById("loadingScreen");

const brandTrigger = document.getElementById("brandTrigger");

const fullscreenMenu = document.getElementById("fullscreenMenu");
const openMenuButton = document.getElementById("openMenuButton");
const closeMenuButton = document.getElementById("closeMenuButton");
const menuLinks = document.querySelectorAll(".menu-link");

const contactModal = document.getElementById("contactModal");
const contactBackdrop = document.getElementById("contactBackdrop");
const closeContactButton = document.getElementById("closeContactButton");

const contactButtons = [
  document.getElementById("heroDirectLineButton"),
  document.getElementById("introDirectLineButton"),
  document.getElementById("menuDirectLineButton"),
  document.getElementById("closingDirectLineButton"),
].filter(Boolean);

const whatsappContact = document.getElementById("whatsappContact");
const phoneContact = document.getElementById("phoneContact");
const instagramContact = document.getElementById("instagramContact");

const adminModal = document.getElementById("adminModal");
const adminBackdrop = document.getElementById("adminBackdrop");
const closeAdminButton = document.getElementById("closeAdminButton");
const adminPanel = document.querySelector(".admin-panel");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminPin = document.getElementById("adminPin");
const adminError = document.getElementById("adminError");

/* =========================================================
   PANTALLA DE CARGA
========================================================= */

window.addEventListener("load", () => {
  window.setTimeout(() => {
    loadingScreen?.classList.add("is-hidden");
    document.body.classList.add("page-ready");
  }, 900);
});

/* Fallback por si algún recurso tarda demasiado */

window.setTimeout(() => {
  loadingScreen?.classList.add("is-hidden");
}, 3500);

/* =========================================================
   CONTROL DEL BODY
========================================================= */

function updateBodyLock() {
  const menuIsOpen = fullscreenMenu?.classList.contains("is-open");

  const modalIsOpen =
    contactModal?.classList.contains("is-open") ||
    adminModal?.classList.contains("is-open");

  body.classList.toggle("menu-open", Boolean(menuIsOpen));
  body.classList.toggle("modal-open", Boolean(modalIsOpen));
}

/* =========================================================
   MENÚ DE PANTALLA COMPLETA
========================================================= */

function openMenu() {
  if (!fullscreenMenu) return;

  fullscreenMenu.classList.add("is-open");
  fullscreenMenu.setAttribute("aria-hidden", "false");

  openMenuButton?.setAttribute("aria-expanded", "true");

  updateBodyLock();

  window.setTimeout(() => {
    closeMenuButton?.focus();
  }, 200);
}

function closeMenu() {
  if (!fullscreenMenu) return;

  fullscreenMenu.classList.remove("is-open");
  fullscreenMenu.setAttribute("aria-hidden", "true");

  openMenuButton?.setAttribute("aria-expanded", "false");

  updateBodyLock();
}

openMenuButton?.addEventListener("click", openMenu);
closeMenuButton?.addEventListener("click", closeMenu);

menuLinks.forEach((link) => {
  link.addEventListener("click", closeMenu);
});

/* =========================================================
   LÍNEA DIRECTA
========================================================= */

function openContactModal() {
  if (!contactModal) return;

  closeMenu();

  contactModal.classList.add("is-open");
  contactModal.setAttribute("aria-hidden", "false");

  updateBodyLock();

  window.setTimeout(() => {
    closeContactButton?.focus();
  }, 250);
}

function closeContactModal() {
  if (!contactModal) return;

  contactModal.classList.remove("is-open");
  contactModal.setAttribute("aria-hidden", "true");

  updateBodyLock();
}

contactButtons.forEach((button) => {
  button.addEventListener("click", openContactModal);
});

closeContactButton?.addEventListener("click", closeContactModal);
contactBackdrop?.addEventListener("click", closeContactModal);

/* Enlaces de contacto */

const encodedWhatsAppMessage = encodeURIComponent(CONFIG.whatsappMessage);

if (whatsappContact) {
  whatsappContact.href =
    `https://wa.me/${CONFIG.phoneNumber}` +
    `?text=${encodedWhatsAppMessage}`;
}

if (phoneContact) {
  phoneContact.href = `tel:+${CONFIG.phoneNumber}`;
}

if (instagramContact) {
  instagramContact.href = CONFIG.instagramUrl;
}

/* =========================================================
   ENTRADA SECRETA AL ADMIN
   Cinco toques rápidos sobre DJ OSKARIN
========================================================= */

let logoTapCount = 0;
let logoTapTimer = null;

function resetLogoTaps() {
  logoTapCount = 0;

  if (logoTapTimer) {
    window.clearTimeout(logoTapTimer);
    logoTapTimer = null;
  }
}

function registerLogoTap() {
  logoTapCount += 1;

  if (logoTapTimer) {
    window.clearTimeout(logoTapTimer);
  }

  logoTapTimer = window.setTimeout(resetLogoTaps, 1800);

  if (logoTapCount >= 5) {
    resetLogoTaps();
    openAdminModal();
  }
}

brandTrigger?.addEventListener("click", registerLogoTap);

/* =========================================================
   MODAL DEL ADMIN
========================================================= */

function openAdminModal() {
  if (!adminModal) return;

  closeMenu();
  closeContactModal();

  adminModal.classList.add("is-open");
  adminModal.setAttribute("aria-hidden", "false");

  adminError.textContent = "";
  adminPin.value = "";

  updateBodyLock();

  window.setTimeout(() => {
    adminPin?.focus();
  }, 250);
}

function closeAdminModal() {
  if (!adminModal) return;

  adminModal.classList.remove("is-open");
  adminModal.setAttribute("aria-hidden", "true");

  adminError.textContent = "";
  adminPin.value = "";

  updateBodyLock();
}

closeAdminButton?.addEventListener("click", closeAdminModal);
adminBackdrop?.addEventListener("click", closeAdminModal);

/* =========================================================
   ANIMACIÓN DE PIN INCORRECTO
========================================================= */

function shakeAdminPanel() {
  if (!adminPanel) return;

  adminPanel.classList.remove("is-shaking");

  void adminPanel.offsetWidth;

  adminPanel.classList.add("is-shaking");

  window.setTimeout(() => {
    adminPanel.classList.remove("is-shaking");
  }, 450);
}

/* =========================================================
   LOGIN ADMINISTRATIVO

   El PIN NO está guardado aquí.
   Se comprobará de forma privada mediante Vercel.
========================================================= */

adminLoginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const pin = adminPin.value.trim();
  const submitButton = adminLoginForm.querySelector('button[type="submit"]');

  adminError.textContent = "";

  if (!pin) {
    adminError.textContent = "Ingresa tu PIN.";
    shakeAdminPanel();
    adminPin.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Verificando...";

  try {
    const response = await fetch(CONFIG.adminVerificationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pin }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || "PIN incorrecto.");
    }

    /*
      Guardaremos una sesión temporal en este navegador.
      Después construiremos protección adicional para el dashboard.
    */

    sessionStorage.setItem("djOskarinAdmin", "true");

    submitButton.textContent = "Acceso autorizado";

    window.setTimeout(() => {
      window.location.href = CONFIG.adminDashboardUrl;
    }, 500);
  } catch (error) {
    console.error("No se pudo verificar el acceso:", error);

    adminError.textContent =
      error.message === "Failed to fetch"
        ? "El acceso privado todavía no está configurado."
        : error.message || "No se pudo verificar el PIN.";

    shakeAdminPanel();

    adminPin.value = "";
    adminPin.focus();

    submitButton.disabled = false;
    submitButton.textContent = "Entrar";
  }
});

/* Solo permitir números en el PIN */



/* =========================================================
   TECLA ESCAPE
========================================================= */

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (adminModal?.classList.contains("is-open")) {
    closeAdminModal();
    return;
  }

  if (contactModal?.classList.contains("is-open")) {
    closeContactModal();
    return;
  }

  if (fullscreenMenu?.classList.contains("is-open")) {
    closeMenu();
  }
});

/* =========================================================
   ENLACES PRELIMINARES

   Evita que los botones con href="#" suban al inicio mientras
   todavía construimos sus páginas.
========================================================= */

document.querySelectorAll('a[href="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
  });
});

function updateHeaderOnScroll() {
  siteHeader?.classList.toggle("is-scrolled", window.scrollY > 40);
}

window.addEventListener("scroll", updateHeaderOnScroll, {
  passive: true,
});

updateHeaderOnScroll();