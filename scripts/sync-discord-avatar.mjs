import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const applicationId = "1339273098234695800";
const token = process.env.DISCORD_BOT_TOKEN?.trim();
const scriptDir = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDir, "../assets/volibot-avatar.png");
const htmlPaths = [
  resolve(scriptDir, "../index.html"),
  resolve(scriptDir, "../terms/index.html"),
  resolve(scriptDir, "../privacy/index.html"),
];

async function requestJson(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Discord API request failed: ${response.status}`);
  return response.json();
}

let imageUrl;

if (token) {
  const bot = await requestJson("https://discord.com/api/v10/users/@me", {
    Authorization: `Bot ${token}`,
  });
  if (!bot.avatar) throw new Error("The Discord bot does not have a custom avatar.");
  imageUrl = `https://cdn.discordapp.com/avatars/${bot.id}/${bot.avatar}.png?size=256`;
} else {
  const application = await requestJson(
    `https://discord.com/api/v10/oauth2/applications/${applicationId}/rpc`,
  );
  if (!application.icon) throw new Error("The Discord application does not have an icon.");
  imageUrl = `https://cdn.discordapp.com/app-icons/${application.id}/${application.icon}.png?size=256`;
}

const imageResponse = await fetch(imageUrl);
if (!imageResponse.ok) throw new Error(`Avatar download failed: ${imageResponse.status}`);
const nextImage = Buffer.from(await imageResponse.arrayBuffer());
const version = createHash("sha256").update(nextImage).digest("hex").slice(0, 12);

let currentImage;
try {
  currentImage = await readFile(outputPath);
} catch {
  currentImage = null;
}

let changed = false;

if (!currentImage?.equals(nextImage)) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, nextImage);
  changed = true;
}

for (const htmlPath of htmlPaths) {
  const html = await readFile(htmlPath, "utf8");
  const updated = html.replace(
    /volibot-avatar\.png(?:\?v=[a-f0-9]+)?/g,
    `volibot-avatar.png?v=${version}`,
  );
  if (updated !== html) {
    await writeFile(htmlPath, updated);
    changed = true;
  }
}

console.log(changed ? `Updated Volibot avatar (${version}).` : "Volibot avatar is already current.");
