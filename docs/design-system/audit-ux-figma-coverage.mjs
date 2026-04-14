#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const mapPath = path.join(__dirname, 'figma-node-map.generated.json');

const projects = [
  { name: 'restaurante-web', srcDir: 'restaurante-web/src' },
  { name: 'restaurante-app', srcDir: 'restaurante-app/src' },
];

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, out);
      continue;
    }
    out.push(fullPath);
  }
  return out;
}

function toRelative(p) {
  return path.relative(repoRoot, p).replace(/\\/g, '/');
}

function normalizeComponentName(fileName) {
  return fileName
    .replace(/\.stories\.tsx$/, '')
    .replace(/\.figma\.tsx$/, '');
}

function auditProject(project, mapEntries) {
  const srcAbs = path.join(repoRoot, project.srcDir);
  const allFiles = walkFiles(srcAbs);

  const storyFiles = allFiles.filter((f) => f.endsWith('.stories.tsx'));
  const figmaFiles = allFiles.filter((f) => f.endsWith('.figma.tsx'));

  const mapForProject = new Map(
    mapEntries
      .filter((e) => e.project === project.name)
      .map((e) => [String(e.component).toLowerCase(), e]),
  );

  const figmaByComponent = new Map(
    figmaFiles.map((f) => [normalizeComponentName(path.basename(f)).toLowerCase(), f]),
  );

  const missingFigmaFile = [];
  const missingNodeMap = [];

  for (const storyFile of storyFiles) {
    const component = normalizeComponentName(path.basename(storyFile));
    const key = component.toLowerCase();

    if (!figmaByComponent.has(key)) {
      missingFigmaFile.push(toRelative(storyFile));
    }

    if (!mapForProject.has(key)) {
      missingNodeMap.push({ component, storyPath: toRelative(storyFile) });
    }
  }

  const figmaWithoutStory = [];
  for (const figmaFile of figmaFiles) {
    const component = normalizeComponentName(path.basename(figmaFile));
    const storyCandidate = figmaFile.replace(/\.figma\.tsx$/, '.stories.tsx');
    if (!fs.existsSync(storyCandidate)) {
      figmaWithoutStory.push(toRelative(figmaFile));
    }
  }

  return {
    project: project.name,
    totalStories: storyFiles.length,
    totalFigmaFiles: figmaFiles.length,
    totalNodeMapEntries: mapEntries.filter((e) => e.project === project.name).length,
    missingFigmaFile,
    missingNodeMap,
    figmaWithoutStory,
  };
}

function printReport(report) {
  for (const item of report) {
    console.log(`\n[${item.project}]`);
    console.log(`stories=${item.totalStories} figmaFiles=${item.totalFigmaFiles} nodeMapEntries=${item.totalNodeMapEntries}`);

    console.log(`missingFigmaFile=${item.missingFigmaFile.length}`);
    for (const row of item.missingFigmaFile) console.log(`  - ${row}`);

    console.log(`missingNodeMap=${item.missingNodeMap.length}`);
    for (const row of item.missingNodeMap) {
      console.log(`  - ${row.component} (${row.storyPath})`);
    }

    console.log(`figmaWithoutStory=${item.figmaWithoutStory.length}`);
    for (const row of item.figmaWithoutStory) console.log(`  - ${row}`);
  }
}

function main() {
  if (!fs.existsSync(mapPath)) {
    console.error(`[audit-ux-figma-coverage] arquivo ausente: ${mapPath}`);
    process.exit(1);
  }

  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const entries = Array.isArray(map.entries) ? map.entries : [];

  const report = projects.map((project) => auditProject(project, entries));
  printReport(report);

  const hasBlockingGap = report.some(
    (item) => item.missingFigmaFile.length > 0 || item.missingNodeMap.length > 0,
  );

  if (hasBlockingGap) {
    console.error('\n[audit-ux-figma-coverage] GAP detectado: cobertura ainda nao esta 100%.');
    process.exit(2);
  }

  console.log('\n[audit-ux-figma-coverage] OK: cobertura 100% para stories + figma + node-map.');
}

main();
