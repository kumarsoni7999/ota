import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export function dataDir(...segments: string[]) {
  return path.join(process.cwd(), "data", ...segments);
}

export async function readAllJsonRecords<T>(relativeDir: string): Promise<T[]> {
  const dir = dataDir(relativeDir);
  await mkdir(dir, { recursive: true });
  const names = await readdir(dir);
  const files = names.filter((n) => n.endsWith(".json"));
  const rows: T[] = [];

  for (const name of files) {
    const raw = await readFile(path.join(dir, name), "utf8");
    rows.push(JSON.parse(raw) as T);
  }

  return rows;
}

export async function writeJsonRecord(
  relativeDir: string,
  id: string,
  data: unknown,
): Promise<void> {
  const dir = dataDir(relativeDir);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${id}.json`);
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function readJsonRecord<T>(
  relativeDir: string,
  id: string,
): Promise<T | null> {
  const file = path.join(dataDir(relativeDir), `${id}.json`);
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return null;
    }
    throw e;
  }
}

export async function deleteJsonRecord(
  relativeDir: string,
  id: string,
): Promise<void> {
  const file = path.join(dataDir(relativeDir), `${id}.json`);
  try {
    await unlink(file);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      throw e;
    }
  }
}

export function sortByCreatedAtDesc<T extends { createdAt: string }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
