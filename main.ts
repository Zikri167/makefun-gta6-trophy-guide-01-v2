// Leonida Legend — the entry program for gta6-trophy-guide-01 (Node 22, standard library only).
//
// The guide itself is the static web app in app/: it opens at app/index.html in a desktop browser,
// works with the network off, and keeps its trophy list and guides in app/data/trophies.json.
// This program hands the entry in. It copies app/ and screenshots/ from beside this file into the
// output directory (/output in the grader, $MAKEFUN_OUTPUT_DIR outside it) and writes the dossier
// the judge reads — screenshots, first-load totals and source — with the vendored library in
// vendor/makefun-frontend.ts, which must stay byte for byte the kit's copy: the scorer rebuilds
// the dossier with its own copy and compares.
//
// Run it locally the same way the grader does:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Sanity-check the data file before handing anything in: the gate wants every one of the 55
// official trophies named with a non-empty guide, so fail loudly here rather than at the scorer.
const dataPath = join(repoDir, 'app', 'data', 'trophies.json');
const data = JSON.parse(readFileSync(dataPath, 'utf8'));
const trophyRows = Array.isArray(data) ? data : data.trophies;
if (!Array.isArray(trophyRows) || trophyRows.length !== 55) {
  throw new Error(`app/data/trophies.json must hold exactly 55 trophies, found ${trophyRows?.length}`);
}
for (const row of trophyRows) {
  if (!row.name || typeof row.guide !== 'string' || row.guide.trim() === '') {
    throw new Error(`trophy ${row.id ?? '?'} is missing a name or a guide`);
  }
}

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  cpSync(join(repoDir, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps are the scorer's own (reference/gate.json): the dossier text is capped at 160 KiB,
// screenshots at 4 files of 256 KiB, app/ at 993 entries and 48 MiB.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`Leonida Legend handed in: 55 trophies, dossier ${dossier.length} bytes -> ${outputDir}`);
