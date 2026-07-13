module.exports = function trustedOrigin(req, res, next) {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];

  if (safeMethods.includes(req.method)) {
    return next();
  }

  const allowedOrigin =
    process.env.FRONTEND_URL || "http://localhost:5173";

  const origin = req.get("origin");

  if (!origin || origin !== allowedOrigin) {
    return res.status(403).json({
      message: "Request origin is not allowed",
    });
  }

  next();
};