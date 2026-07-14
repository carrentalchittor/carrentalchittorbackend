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

module.exports = function trustedOrigin(req, res, next) {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];

  // Read-only requests ko allow karo
  if (safeMethods.includes(req.method)) {
    return next();
  }

  const requestOrigin = normalizeOrigin(
    req.get("origin")
  );

  // Postman/server-to-server request
  if (!requestOrigin) {
    return next();
  }

  if (!allowedOrigins.includes(requestOrigin)) {
    console.log(
      "Trusted origin blocked:",
      requestOrigin
    );

    return res.status(403).json({
      message: "Request origin is not allowed",
    });
  }

  next();
};