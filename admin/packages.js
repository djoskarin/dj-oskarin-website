"use strict";

const PACKAGES_STORAGE_KEY = "djOskarinPackages";
const WHATSAPP_NUMBER = "19564352725";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSavedPackages() {
  try {
    const savedPackages = localStorage.getItem(
      PACKAGES_STORAGE_KEY
    );

    return savedPackages ? JSON.parse(savedPackages) : [];
  } catch (error) {
    console.error("Could not load packages:", error);
    return [];
  }
}

function createWhatsAppLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    message
  )}`;
}

function renderPackages() {
  const packagesContainer = document.getElementById(
    "dynamicPackages"
  );

  if (!packagesContainer) return;

  const packages = getSavedPackages().filter(
    (packageItem) => packageItem.visible !== false
  );

  if (!packages.length) {
    packagesContainer.innerHTML = `
      <section class="packages-category">
        <p class="packages-eyebrow">Paquetes</p>
        <h2>Próximamente</h2>
      </section>
    `;

    return;
  }

  const categories = [...new Set(
    packages.map((packageItem) => packageItem.category)
  )];

  packagesContainer.innerHTML = categories
    .map((category) => {
      const categoryPackages = packages.filter(
        (packageItem) => packageItem.category === category
      );

      return `
        <section class="packages-category">
          <p class="packages-eyebrow">Categoría</p>
          <h2>${escapeHtml(category)}</h2>
        </section>

        <section class="packages-list">
          ${categoryPackages
            .map(
              (packageItem, index) => `
                <article
                  class="package-card"
                  ${
                    packageItem.image
                      ? `style="--package-image: url('${escapeHtml(
                          packageItem.image
                        )}')"`
                      : ""
                  }
                >
                  <div class="package-card-overlay"></div>

                  <div class="package-card-content">
                    <div>
                      <p class="packages-eyebrow">
                        Paquete ${String(index + 1).padStart(2, "0")}
                        · ${escapeHtml(category)}
                      </p>

                      <h2>${escapeHtml(packageItem.name)}</h2>
                    </div>

                    <ul class="package-features">
                      ${(packageItem.features || [])
                        .map(
                          (feature) => `
                            <li>${escapeHtml(feature)}</li>
                          `
                        )
                        .join("")}
                    </ul>

                    <a
                      class="package-whatsapp"
                      href="${createWhatsAppLink(
                        packageItem.whatsappMessage ||
                          `Hola, me interesó su paquete ${packageItem.name}.`
                      )}"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Me interesa ${escapeHtml(packageItem.name)}
                    </a>
                  </div>
                </article>
              `
            )
            .join("")}
        </section>
      `;
    })
    .join("");
}

renderPackages();