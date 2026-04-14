import { readdir, stat } from "node:fs/promises";
import { fromStorageRelative } from "@/server/storage/project-storage";

async function dirSize(absDir: string): Promise<number> {
  let entries;
  try {
    entries = await readdir(absDir, { withFileTypes: true });
  } catch {
    return 0;
  }
  let total = 0;
  for (const e of entries) {
    const abs = `${absDir}/${e.name}`;
    if (e.isDirectory()) {
      total += await dirSize(abs);
      continue;
    }
    if (e.isFile()) {
      try {
        const s = await stat(abs);
        total += s.size;
      } catch {
        // ignore missing/unreadable files for dashboard estimates
      }
    }
  }
  return total;
}

export const storageSizeService = {
  async fileSizeFromStorageRef(storageRef: string): Promise<number> {
    try {
      const s = await stat(fromStorageRelative(storageRef));
      return s.isFile() ? s.size : 0;
    } catch {
      return 0;
    }
  },

  async treeSizeFromStorageRef(storageRef: string): Promise<number> {
    return dirSize(fromStorageRelative(storageRef));
  },
};

