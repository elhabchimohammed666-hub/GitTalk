export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error.name === "ZodError") {
    return res.status(400).json({
      message: "Invalid request data",
      errors: error.issues.map(({ path, message }) => ({ path, message }))
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern ?? {})[0] ?? "field";
    return res.status(409).json({ message: `${field} is already in use` });
  }

  if (error.name === "CastError") {
    return res.status(400).json({ message: "Invalid resource identifier" });
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(error);
  return res.status(status).json({
    message: status >= 500 ? "Internal server error" : error.message
  });
}
