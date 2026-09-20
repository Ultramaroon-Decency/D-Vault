import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// =============================================
// Local Disk Storage Service
// Saves uploaded documents to backend/uploads/
// and returns a path that Express serves as a
// static file at  GET /uploads/<filename>
// =============================================

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

// Ensure the uploads directory exists on startup
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  logger.info(`[Storage] Created uploads directory at ${UPLOADS_DIR}`);
}

/**
 * Derive a safe, unique filename.
 * e.g. "My Contract.pdf"  →  "<uuid>-my-contract.pdf"
 */
export function buildSafeFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const base = path
    .basename(originalName, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
  return `${uuidv4()}-${base}${ext}`;
}

export interface StoredFile {
  /** URL path served by Express static middleware, e.g. /uploads/uuid-name.pdf */
  documentUrl: string;
  /** The unique filename on disk, e.g. uuid-name.pdf */
  documentFilename: string;
  /** Original filename the user selected */
  originalFilename: string;
  /** Absolute path on disk */
  absolutePath: string;
}

/**
 * Save a Buffer (from multer memoryStorage) to the local uploads/ folder.
 */
export async function saveDocument(
  buffer: Buffer,
  originalFilename: string,
): Promise<StoredFile> {
  const safeFilename = buildSafeFilename(originalFilename);
  const absolutePath = path.join(UPLOADS_DIR, safeFilename);

  await fs.promises.writeFile(absolutePath, buffer);

  logger.info(`[Storage] File saved`, { safeFilename, size: buffer.length });

  return {
    documentUrl: `/uploads/${safeFilename}`,
    documentFilename: safeFilename,
    originalFilename,
    absolutePath,
  };
}

/**
 * Delete a previously stored file (e.g. on rollback).
 * Silently ignores if file not found.
 */
export async function deleteDocument(safeFilename: string): Promise<void> {
  const absolutePath = path.join(UPLOADS_DIR, safeFilename);
  try {
    await fs.promises.unlink(absolutePath);
    logger.info(`[Storage] File deleted`, { safeFilename });
  } catch {
    // ignore ENOENT
  }
}
