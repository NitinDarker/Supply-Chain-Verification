import mongoSanitize from "express-mongo-sanitize";

// Strips any keys containing $ or . from req.body, req.params, req.query
// This kills MongoDB operator injection dead
export const sanitizeInput = mongoSanitize({
  replaceWith: "_",
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized key: ${key} from ${req.ip}`);
  },
});
