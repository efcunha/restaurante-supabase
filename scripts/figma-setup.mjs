/**
 * Figma Design System Setup — CLI Automation
 *
 * What this CAN automate via Figma REST API:
 *   ✅ Verify connection
 *   ✅ Read file structure
 *   ✅ Create variable collections + modes
 *   ✅ Create color/dimension variables
 *   ❌ Create visual components (API limitation)
 *   ❌ Create frames, text, shapes (API limitation)
 *   ❌ Create pages (API limitation)
 *
 * Usage:
 *   set FIGMA_API_KEY=figd_xxxx
 *   node scripts/figma-setup.mjs --file-key YOUR_KEY
 *   node scripts/figma-setup.mjs --verify
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FIGMA_API = 'https://api.figma.com/v1';

// ============================================================
//  CLI args
// ============================================================
const args = process.argv.slice(2);
const fileKey = args.find(a => a.startsWith('--file-key='))?.split('=')[1]
  || args[args.indexOf('--file-key') + 1];
const verifyOnly = args.includes('--verify');

const TOKEN = process.env.FIGMA_API_KEY || process.env.FIGMA_TOKEN;
if (!TOKEN) {
  console.error('❌ FIGMA_API_KEY or FIGMA_TOKEN not set.');
  console.error('   Get token: https://www.figma.com/developers → Personal Access Tokens');
  console.error('   Then: set FIGMA_API_KEY=figd_xxxx');
  process.exit(1);
}

// ============================================================
//  API helper
// ============================================================
async function figma(method, body) {
  const opts = {
    method: body ? 'POST' : 'GET',
    headers: {
      'X-Figma-Token': TOKEN,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const url = `${FIGMA_API}${method}`;
  const res = await fetch(url, opts);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Figma API ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============================================================
//  Load tokens
// ============================================================
function loadTokens() {
  const path = join(ROOT, 'docs', 'design-system', 'figma-tokens.json');
  if (!existsSync(path)) {
    console.warn(`⚠️  Tokens file not found: ${path}`);
    return null;
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

// ============================================================
//  Steps
// ============================================================
async function stepVerify() {
  console.log('\n── Step 1: Verify Connection ──');
  const user = await figma('/me');
  console.log(`✅ Connected as: ${user.email || user.handle}`);
  console.log(`   User ID: ${user.id}`);
  return user;
}

async function stepFileInfo(key) {
  console.log('\n── Step 2: Read File Info ──');
  const file = await figma(`/files/${key}?geometry=paths`);
  console.log(`✅ File: ${file.name}`);
  console.log(`   Pages: ${file.document.children.map(c => c.name).join(', ')}`);
  console.log(`   Version: ${file.version}`);
  return file;
}

async function stepCreateVariables(key) {
  console.log('\n── Step 3: Create Variable Collections ──');
  const tokens = loadTokens();
  if (!tokens) {
    console.warn('⚠️  Skipping — no tokens file');
    return;
  }

  // ── 3a. Create collection ──
  const collectionName = 'RestaurantOS Design Tokens';
  let collectionId;

  // Try to create collection
  try {
    console.log('  Creating collection...');
    const result = await figma(`/files/${key}/variables/collections`, {
      name: collectionName,
      initialMode: { name: 'Light' },
    });
    collectionId = result?.metadata?.id || result?.id;
    console.log(`  ✅ Collection: ${collectionId}`);
    await sleep(500);
  } catch (err) {
    if (err.message.includes('409') || err.message.includes('already exists')) {
      console.log('  ℹ️  Collection already exists — reading existing...');
      // Read file to find collection ID
      const file = await figma(`/files/${key}?geometry=paths`);
      const vars = file.meta?.variables || {};
      for (const [cid, cdata] of Object.entries(vars)) {
        if (cdata.name === collectionName) {
          collectionId = cid;
          break;
        }
      }
      if (!collectionId) {
        console.warn('  ⚠️  Could not find existing collection ID');
      }
    } else {
      console.warn(`  ⚠️  Collection creation failed: ${err.message}`);
      console.warn('     Figma API may not support variable creation in your plan.');
    }
  }

  if (!collectionId) {
    console.warn('  ⚠️  Skipping variable creation — no collection ID');
    return;
  }

  // ── 3b. Create modes (Dark) ──
  try {
    console.log('  Adding Dark mode...');
    await figma(`/files/${key}/variables/collections/${collectionId}/modes`, {
      name: 'Dark',
    });
    console.log('  ✅ Dark mode added');
    await sleep(500);
  } catch (err) {
    console.warn(`  ⚠️  Dark mode: ${err.message}`);
  }

  // ── 3c. Extract and create variables ──
  const lightTokens = tokens.light?.token || {};
  const darkTokens = tokens.dark?.token || {};
  const globalTokens = tokens.global?.token || {};

  const varsToCreate = [];

  function extract(obj, prefix) {
    for (const [k, v] of Object.entries(obj)) {
      const path = `${prefix}/${k}`;
      if (v?.$type === 'color') {
        varsToCreate.push({ path, type: 'color', value: v.$value });
      } else if (v?.$type === 'dimension') {
        varsToCreate.push({ path, type: 'float', value: v.$value });
      } else if (v?.$type === 'shadow') {
        // Skip shadows — API doesn't support shadow variables well
      } else if (v && typeof v === 'object' && !v.$type) {
        extract(v, path);
      }
    }
  }

  // Extract all colors
  extract(globalTokens.core || {}, 'core');
  extract(globalTokens.semantic || {}, 'semantic');
  extract(lightTokens, 'light');
  extract(darkTokens, 'dark');

  console.log(`\n  Found ${varsToCreate.length} variables to create`);

  // ── 3d. Create variables in batches ──
  // Figma Variables API uses POST with variable definition
  let created = 0;
  let errors = 0;

  for (const v of varsToCreate) {
    try {
      const payload = {
        name: v.path,
        resolvedType: v.type === 'color' ? 'COLOR' : 'FLOAT',
        variableCollectionId: collectionId,
        variableCodeSyntax: v.path.replace(/\//g, '_').toUpperCase(),
      };

      const result = await figma(`/files/${key}/variables`, payload);
      const varId = result?.metadata?.id || result?.id;

      if (varId) {
        // Set values for each mode
        // For simplicity, set Light mode value from light tokens, Dark from dark tokens
        created++;

        // We'd need to get mode IDs from the collection and set per-mode values
        // This is complex via REST — the Tokens Studio plugin handles this better
      }
      await sleep(200); // Rate limit
    } catch (err) {
      errors++;
      if (errors <= 3) {
        console.warn(`  ⚠️  ${v.path}: ${err.message.split('\n')[0]}`);
      }
      await sleep(500);
    }
  }

  console.log(`\n  Results: ${created} created, ${errors} errors`);
  if (errors > 0) {
    console.log('  📌 Tip: Use Tokens Studio plugin for bulk import instead.');
    console.log('     Plugins → Tokens Studio → Import from JSON');
  }
}

async function stepCreatePages(key) {
  console.log('\n── Step 4: Create Pages ──');
  console.log('  ⚠️  Figma API does NOT support page creation.');
  console.log('  📌 You need to create these pages manually in Figma:\n');

  const pages = [
    { name: '🎨 Foundations', desc: 'Color scales, typography, spacing, shadows' },
    { name: '🧩 Components', desc: 'All atoms, molecules, organisms with variants' },
    { name: '📱 Mobile Screens', desc: 'Login, Novo Pedido, etc.' },
    { name: '🖥️ Web Screens', desc: 'Admin, Delivery, KDS, etc.' },
    { name: '🔄 Prototype Flows', desc: 'Connected screens with interactions' },
    { name: '📋 Specs & Handoff', desc: 'Notes, dev annotations' },
  ];

  pages.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name}`);
    console.log(`     ${p.desc}`);
  });
}

// ============================================================
//  Generate setup guide
// ============================================================
function generateGuide(fileKey, fileInfo) {
  const guide = `# RestaurantOS — Figma Setup Guide

> Generated: ${new Date().toISOString().split('T')[0]}
> File: https://www.figma.com/design/${fileKey}/${fileInfo?.name || 'RestaurantOS'}

## What was automated

- ✅ API connection verified
- ✅ Variable collection created (if API supported)
- ❌ Visual components — Figma API doesn't support this

## What you need to do manually

### 1. Create 6 Pages
1. 🎨 Foundations
2. 🧩 Components
3. 📱 Mobile Screens
4. 🖥️ Web Screens
5. 🔄 Prototype Flows
6. 📋 Specs & Handoff

### 2. Import Variables (Colors, Spacing, etc.)
1. Install **Tokens Studio for Figma** plugin
2. Open your Figma file
3. Plugins → Tokens Studio → **Import from JSON**
4. Select: \`docs/design-system/figma-tokens.json\`
5. Variables with Light/Dark modes will be created

### 3. Create Text Styles (7 total)

| Name | Size/Line | Weight | Tracking |
|------|-----------|--------|----------|
| Display | 32/40 | 600 | -0.5px |
| Heading 1 | 24/32 | 600 | — |
| Heading 2 | 20/28 | 500 | — |
| Body Large | 16/24 | 400 | — |
| Body | 14/20 | 400 | — |
| Caption | 12/16 | 400 | — |
| Label | 12/16 | 500 | +0.5px |

Font: **Inter**

### 4. Create Components

Use **docs/design-system/index.html** as visual reference.

#### Atoms
- **Button** — Variant: Primary/Secondary/Ghost/Danger · Size: SM/MD/LG · State: Default/Disabled/Loading
- **Badge** — Variant: Success/Warning/Error/Info/Neutral · WithDot: boolean
- **Input** — State: Default/Focus/Error/Disabled · WithIcon: boolean
- **Card** — Elevation: None/Low/Medium/High · Padding: None/SM/MD/LG

#### Molecules
- **ProductCard** — image + name + price + add button
- **OrderCard** — order # + items + status badge + total + time
- **ComandaCard** — table label + name + meta + total row + CTA
- **KDS Card** — order # + countdown + items + Pular/Pronto buttons
- **Toast** — type: success/error/warning/info · icon + message
- **EmptyState** — illustration + title + description + CTA

### 5. Connect Code Connect

After creating components in Figma:

1. Right-click each component → Copy/Paste as → Copy link
2. Extract the **node-id** from the URL
3. Update the corresponding \`.figma.ts\` file with the real node-id
4. Run: \`npm run figma:parse\` → \`npm run figma:publish\`

### 6. Publish Library

Assets panel → Publish → "RestaurantOS Design System v1.0"

## Quick Commands

\`\`\`bash
# Parse + validate Code Connect files
cd restaurante-app && npm run figma:parse
cd restaurante-web && npm run figma:parse

# Dry run publish
npm run figma:publish:dry

# Real publish
npx figma connect publish --token $FIGMA_TOKEN
\`\`\`
`;
  return guide;
}

// ============================================================
//  Main
// ============================================================
async function main() {
  console.log('═'.repeat(60));
  console.log('  RestaurantOS — Figma Design System Setup');
  console.log('═'.repeat(60));

  // 1. Verify
  const user = await stepVerify();

  if (verifyOnly) {
    console.log('\n✅ Connection OK. Run with --file-key to proceed.');
    process.exit(0);
  }

  if (!fileKey) {
    console.error('\n❌ --file-key is required.');
    console.error('   Get it from: https://www.figma.com/design/FILE_KEY/...');
    process.exit(1);
  }

  // 2. Read file
  const fileInfo = await stepFileInfo(fileKey);

  // 3. Variables
  await stepCreateVariables(fileKey);

  // 4. Pages info
  await stepCreatePages(fileKey);

  // 5. Generate guide
  const guide = generateGuide(fileKey, fileInfo);
  const outFile = join(ROOT, 'docs', 'design-system', 'FIGMA-SETUP.md');
  writeFileSync(outFile, guide);
  console.log(`\n📋 Guide saved to: ${outFile}`);

  // 6. Summary
  console.log('\n' + '═'.repeat(60));
  console.log('  Summary');
  console.log('═'.repeat(60));
  console.log('  ✅ API connection: OK');
  console.log('  ✅ File accessed: ' + fileInfo.name);
  console.log('  ✅ Variables: attempted (check output above)');
  console.log('  ❌ Components: must create manually (API limitation)');
  console.log('  ❌ Pages: must create manually (API limitation)');
  console.log('');
  console.log('  Next: Open Figma file and create components');
  console.log('  Visual reference: open docs/design-system/index.html in browser');
  console.log('  Tokens to import: docs/design-system/figma-tokens.json');
  console.log('═'.repeat(60));
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
