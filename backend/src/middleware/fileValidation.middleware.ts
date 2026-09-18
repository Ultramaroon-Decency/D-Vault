import { Request, Response, NextFunction } from 'express';
import { Errors } from './error.middleware';

/**
 * Detect actual MIME type from file header bytes (magic numbers).
 * Prevents file extension and MIME type spoofing attacks.
 */
export const detectMimeTypeFromBuffer = (buffer: Buffer): string | null => {
  if (!buffer || buffer.length < 4) return null;

  // JPEG / JPG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // GIF: GIF87a or GIF89a (47 49 46 38 37 61 or 47 49 46 38 39 61)
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return 'image/gif';
  }

  // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  // PDF: %PDF- (25 50 44 46)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf';
  }

  return null;
};

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

/**
 * Middleware: inspects the actual bytes of the uploaded file (req.file.buffer)
 * against cryptographic/format magic numbers. Rejects spoofed or malicious files.
 */
export const validateUploadedFile = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.file) {
    return next();
  }

  if (!req.file.buffer || req.file.buffer.length === 0) {
    throw Errors.badRequest('Uploaded file is empty');
  }

  const detectedMime = detectMimeTypeFromBuffer(req.file.buffer);

  if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime)) {
    throw Errors.badRequest(
      'Uploaded file content does not match allowed types. Only genuine JPEG, PNG, GIF, WEBP, and PDF files are accepted.',
    );
  }

  // Synchronize req.file.mimetype with the verified content type
  req.file.mimetype = detectedMime;
  next();
};
