import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import multer from 'multer';

const here = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_ROOT = path.resolve(here, '../uploads');
export const AVATARS_DIR = path.join(UPLOADS_ROOT, 'avatars');

fs.mkdirSync(AVATARS_DIR, { recursive: true });

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
  filename: (req, file, cb) => {
    const ext = file.mimetype === 'image/png' ? 'png'
      : file.mimetype === 'image/webp' ? 'webp'
      : 'jpg';
    const token = crypto.randomBytes(6).toString('hex');
    cb(null, `u${req.session.user.id}-${Date.now()}-${token}.${ext}`);
  }
});

export const avatarUpload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(Object.assign(new Error('Only PNG, JPEG or WebP images are allowed.'), { status: 422 }));
    }
    cb(null, true);
  }
}).single('avatar');

/** Delete a stored avatar file; ignore if missing. */
export function deleteAvatarFile(relPath) {
  if (!relPath) return;
  const abs = path.join(UPLOADS_ROOT, relPath);
  fs.rm(abs, { force: true }, () => {});
}
