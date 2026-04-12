import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StoredUpload } from "@/server/models/upload.model";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");
const FILES_DIR = path.join(UPLOAD_ROOT, "files");
const META_DIR = path.join(UPLOAD_ROOT, "meta");

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

function maxBytes() {
  const raw = process.env.MAX_UPLOAD_BYTES;
  if (!raw) return DEFAULT_MAX_BYTES;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES;
}

function extensionFromFilename(filename: string) {
  const i = filename.lastIndexOf(".");
  if (i < 0) return ".bin";
  const ext = filename.slice(i, i + 32);
  return /^[a-zA-Z0-9.]+$/.test(ext) ? ext : ".bin";
}

async function ensureStorage() {
  await mkdir(FILES_DIR, { recursive: true });
  await mkdir(META_DIR, { recursive: true });
}

export const uploadService = {
  async saveFromFormFile(file: File): Promise<StoredUpload> {
    await ensureStorage();
    const limit = maxBytes();
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > limit) {
      throw new Error("FILE_TOO_LARGE");
    }

    const id = randomUUID();
    const ext = extensionFromFilename(file.name);
    const relativePath = `files/${id}${ext}`;
    const diskFile = path.join(FILES_DIR, `${id}${ext}`);

    await writeFile(diskFile, buffer);

    const record: StoredUpload = {
      id,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: buffer.length,
      relativePath,
      createdAt: new Date().toISOString(),
    };

    await writeFile(
      path.join(META_DIR, `${id}.json`),
      `${JSON.stringify(record, null, 2)}\n`,
      "utf8",
    );

    return record;
  },

  async list(): Promise<StoredUpload[]> {
    await ensureStorage();
    const names = await readdir(META_DIR);
    const jsonFiles = names.filter((n) => n.endsWith(".json"));
    const rows = await Promise.all(
      jsonFiles.map(async (name) => {
        const raw = await readFile(path.join(META_DIR, name), "utf8");
        return JSON.parse(raw) as StoredUpload;
      }),
    );
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
};
