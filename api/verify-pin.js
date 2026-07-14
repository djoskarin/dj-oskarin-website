export default function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({
      success: false,
      message: "Método no permitido.",
    });
  }

  const { pin } = request.body || {};
  const correctPin = process.env.ADMIN_PIN;

  if (!correctPin) {
    return response.status(500).json({
      success: false,
      message: "El PIN administrativo todavía no está configurado.",
    });
  }

  if (String(pin) !== String(correctPin)) {
    return response.status(401).json({
      success: false,
      message: "PIN incorrecto.",
    });
  }

  return response.status(200).json({
    success: true,
  });
}