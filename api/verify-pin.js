"use strict";

import crypto from "node:crypto";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({
      success: false,
      message: "Método no permitido.",
    });
  }

  let body = request.body;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const enteredPin = String(body?.pin ?? "").trim();
  const savedPin = String(process.env.ADMIN_PIN ?? "").trim();

  if (!savedPin) {
    return response.status(500).json({
      success: false,
      message: "El PIN administrativo no está configurado.",
    });
  }

  if (enteredPin !== savedPin) {
    return response.status(401).json({
      success: false,
      message: "PIN incorrecto.",
    });
  }

  const adminToken = crypto
    .createHmac("sha256", savedPin)
    .update("dj-oskarin-admin")
    .digest("hex");

  return response.status(200).json({
    success: true,
    token: adminToken,
  });
}