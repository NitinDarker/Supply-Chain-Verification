import mongoSanitize from "express-mongo-sanitize";
import logger from "../config/logger";

// Strips any keys containing $ or . from req.body, req.params, req.query
// This kills MongoDB operator injection dead
export const sanitizeInput = mongoSanitize({
  replaceWith: "_",
  onSanitize: ({ req, key }) => {
    logger.warn("Input sanitized", { key, ip: req.ip, path: req.originalUrl });
  },
});
