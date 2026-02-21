import { mkdirSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve("mcpb/mcpb.mcpb");
const targetDir = resolve("public");
const target = resolve("public/btv-meetup.mcpb");

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, target);

process.stdout.write(`Synced MCPB bundle to ${target}\n`);
