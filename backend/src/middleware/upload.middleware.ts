import multer from "multer";
import { Request, Response, NextFunction } from "express";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export const productPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error("Invalid photo format. Use JPG, PNG, or WEBP."));
      return;
    }
    cb(null, true);
  },
});

export const productPhotoMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  productPhotoUpload.single("photo")(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }

    const message =
      err instanceof Error
        ? err.message
        : "Invalid file upload. Please upload a valid image.";
    res.status(400).json({ error: message });
  });
};
