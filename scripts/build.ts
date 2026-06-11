import { copyFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(projectRoot, "dist");
const entries = ["index.html", "css", "js", "assets"];

async function copyRecursive(from: string, to: string) {
  const info = await stat(from);

  if (info.isDirectory()) {
    await mkdir(to, { recursive: true });
    const children = await readdir(from);
    await Promise.all(
      children.map((child) => copyRecursive(join(from, child), join(to, child))),
    );
    return;
  }

  await mkdir(dirname(to), { recursive: true });
  await copyFile(from, to);
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const entry of entries) {
  await copyRecursive(join(projectRoot, entry), join(outDir, entry));
}

console.log(`Built static site in ${outDir}`);
