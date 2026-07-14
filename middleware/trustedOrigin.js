function normalizeOrigin(value = "") {
  return String(value)
    .trim()
    .replace(/\/+$/, "");
}

const allowedOrigins = [
  "http://localhost:5173",
  "https://carrentalchittor.vercel.app",
  "https://carrentalchittorgarh.in",
  "https://www.carrentalchittorgarh.in",
].map(normalizeOrigin);

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (
    origin.startsWith("https://carrentalchittor-") &&
    origin.endsWith(".vercel.app")
  ) {
    return true;
  }

  return false;
}

module.exports = function trustedOrigin(
  req,
  res,
  next
) {
  const safeMethods = [
    "GET",
    "HEAD",
    "OPTIONS",
  ];

  if (safeMethods.includes(req.method)) {
    return next();
  }

  const requestOrigin = normalizeOrigin(
    req.get("origin")
  );

  if (!isAllowedOrigin(requestOrigin)) {
    console.error(
      "Trusted origin blocked:",
      requestOrigin
    );

    return res.status(403).json({
      message: "Request origin is not allowed",
    });
  }

  next();
};