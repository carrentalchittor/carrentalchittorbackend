function normalizeOrigin(value = "") {
  return String(value)
    .trim()
    .replace(/\/+$/, "");
}

const productionOrigins = [
  "https://carrentalchittor.vercel.app",
  "https://carrentalchittorgarh.in",
  "https://www.carrentalchittorgarh.in",
];

function isAllowedOrigin(origin) {
  if (!origin) return true;

  if (origin === "http://localhost:5173") {
    return true;
  }

  if (productionOrigins.includes(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);

    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".vercel.app") &&
      url.hostname.startsWith("carrentalchittor-")
    );
  } catch {
    return false;
  }
}

module.exports = function trustedOrigin(req, res, next) {
  if (
    ["GET", "HEAD", "OPTIONS"].includes(
      req.method
    )
  ) {
    return next();
  }

  const origin = normalizeOrigin(
    req.get("origin")
  );

  if (!isAllowedOrigin(origin)) {
    console.error(
      "Trusted origin blocked:",
      origin
    );

    return res.status(403).json({
      message: "Request origin is not allowed",
    });
  }

  next();
};