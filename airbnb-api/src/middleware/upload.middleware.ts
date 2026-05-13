import multer, { FileFilterCallback } from "multer";
import { AppError } from "./error.middleware";
import { ErrorRequestHandler, Request, RequestHandler } from "express";

// ─── Storage ──────────────────────────────────────────────────────────────────
// Memory storage — file stored as Buffer in req.file.buffer
// Never touches disk — uploaded directly to Cloudinary
const storage = multer.memoryStorage();
const fileFilter = (req: Request, file: Express.Multer.File, callback:FileFilterCallback): void => {
    const allowedMimeTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
    ]
    if (allowedMimeTypes.includes(file.mimetype)){
        callback(null, true); // accept file
    } else {
        callback(new AppError('Invalid file type. Only JPEG, JPG, PNG, WEBP images are allowed.', 400))
    }
};

// ─── Upload Configs ───────────────────────────────────────────────────────────
// Single image upload — for one property image
export const uploadSingle: RequestHandler = multer({
    storage,
    fileFilter,
    limits: {fileSize: 5 * 1024 * 1024}, // 5MB limit
}).single('image'); // field name must be 'image'

// Multiple images upload — up to 10 images at once
export const uploadMultiple: RequestHandler = multer({
    storage,
    fileFilter,
    limits: {fileSize: 5 * 1024 * 1024,
        files: 10,   // max 10 files
    }, // 5MB limit per file

}).array('images', 10);  // field name must be 'images'

// ─── Multer Error Handler ─────────────────────────────────────────────────────
// Multer throws its own error types — we convert them to AppError
// So our global error handler catches them consistently
export const handlerMulterError: ErrorRequestHandler = (err, req, res, next): void => {
    if (err instanceof multer.MulterError){
        if (err.code === 'LIMIT_FILE_SIZE'){
            next(new AppError('File too large. Max size is 5MB', 400));
            return;
        }
        if (err.code === 'LIMIT_FILE_COUNT'){
            next(new AppError('Too many files. Maximum is 10 images', 400));
            return;

        }
        next(new AppError(err.message, 400));
        return;
    }
    next(err);
}
