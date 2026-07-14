"use strict";

import crypto from "node:crypto";

const SUPABASE_URL = String(process.env.SUPABASE_URL || "")
  .trim()
  .replace(/\/+$/, "");
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const ADMIN_PIN = process.env.ADMIN_PIN;

function getCookie(request, name) {
  const cookieHeader = request.headers.cookie || "";

  const cookie = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : "";
}

function createExpectedAdminToken() {
  return crypto
    .createHmac("sha256", ADMIN_PIN || "")
    .update("dj-oskarin-admin")
    .digest("hex");
}

function isAuthorized(request) {
  if (!ADMIN_PIN) return false;

  const authorization = String(request.headers.authorization || "");
  const providedToken = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  const expectedToken = createExpectedAdminToken();

  if (!providedToken || providedToken.length !== expectedToken.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(providedToken),
    Buffer.from(expectedToken)
  );
}

function supabaseHeaders(extraHeaders = {}) {
  return {
    apikey: SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}

function createSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function handler(request, response) {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return response.status(500).json({
      success: false,
      message: "Supabase todavía no está configurado.",
    });
  }

  if (!isAuthorized(request)) {
    return response.status(401).json({
      success: false,
      message: "Sesión no autorizada.",
    });
  }

  try {
    if (request.method === "GET") {
      const result = await fetch(
        `${SUPABASE_URL}/rest/v1/collections` +
  `?select=*&order=display_order.asc,created_at.asc`,
        {
          headers: supabaseHeaders(),
        }
      );

      const collections = await result.json();

      if (!result.ok) {
        throw new Error(
          collections?.message || "No se pudieron cargar las colecciones."
        );
      }

      return response.status(200).json({
        success: true,
        collections,
      });
    }

    if (request.method === "POST") {
      const name = String(request.body?.name || "").trim();
      const subtitle = String(request.body?.subtitle || "").trim();

      if (!name) {
        return response.status(400).json({
          success: false,
          message: "Escribe el nombre de la colección.",
        });
      }

      const currentUrl = new URL("/rest/v1/collections", SUPABASE_URL);

currentUrl.searchParams.set("select", "display_order");
currentUrl.searchParams.set("order", "display_order.desc");
currentUrl.searchParams.set("limit", "1");

const currentResult = await fetch(currentUrl, {
  headers: supabaseHeaders(),
});

      const currentCollections = await currentResult.json();
      const nextOrder =
        Number(currentCollections?.[0]?.display_order ?? -1) + 1;

      const payload = {
        name,
        slug: createSlug(name),
        subtitle: subtitle || null,
        cover_image: null,
        is_visible: true,
        display_order: nextOrder,
      };

      const result = await fetch(
        `${SUPABASE_URL}/rest/v1/collections`,
        {
          method: "POST",
          headers: supabaseHeaders({
            Prefer: "return=representation",
          }),
          body: JSON.stringify(payload),
        }
      );

      const createdCollection = await result.json();

      if (!result.ok) {
        throw new Error(
          createdCollection?.message || "No se pudo crear la colección."
        );
      }

      return response.status(201).json({
        success: true,
        collection: createdCollection[0],
      });
    }

    if (request.method === "PATCH") {
      const id = String(request.body?.id || "").trim();

      if (!id) {
        return response.status(400).json({
          success: false,
          message: "Falta identificar la colección.",
        });
      }

      const updates = {};

      if (typeof request.body?.name === "string") {
        const name = request.body.name.trim();

        if (!name) {
          return response.status(400).json({
            success: false,
            message: "El nombre no puede quedar vacío.",
          });
        }

        updates.name = name;
        updates.slug = createSlug(name);
      }

      if (typeof request.body?.subtitle === "string") {
        updates.subtitle = request.body.subtitle.trim() || null;
      }

      if (typeof request.body?.is_visible === "boolean") {
        updates.is_visible = request.body.is_visible;
      }

      if (Number.isInteger(request.body?.display_order)) {
        updates.display_order = request.body.display_order;
      }

      const result = await fetch(
        `${SUPABASE_URL}/rest/v1/collections?id=eq.${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: supabaseHeaders({
            Prefer: "return=representation",
          }),
          body: JSON.stringify(updates),
        }
      );

      const updatedCollection = await result.json();

      if (!result.ok) {
        throw new Error(
          updatedCollection?.message ||
            "No se pudo actualizar la colección."
        );
      }

      return response.status(200).json({
        success: true,
        collection: updatedCollection[0],
      });
    }

    if (request.method === "DELETE") {
      const id = String(request.body?.id || "").trim();

      if (!id) {
        return response.status(400).json({
          success: false,
          message: "Falta identificar la colección.",
        });
      }

      const result = await fetch(
        `${SUPABASE_URL}/rest/v1/collections?id=eq.${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: supabaseHeaders(),
        }
      );

      if (!result.ok) {
        const error = await result.json().catch(() => null);

        throw new Error(
          error?.message || "No se pudo eliminar la colección."
        );
      }

      return response.status(200).json({
        success: true,
      });
    }

    return response.status(405).json({
      success: false,
      message: "Método no permitido.",
    });
  } catch (error) {
    console.error("Collections API error:", error);

    return response.status(500).json({
      success: false,
      message: error.message || "Ocurrió un error inesperado.",
    });
  }
}