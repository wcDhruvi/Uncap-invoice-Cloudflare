import { defineConfig } from 'drizzle-kit';
import { readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';

// Locate Wrangler's local D1 SQLite state directory
const localD1Path = join(process.cwd(), '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
let dbFile = '';

try {
  if (existsSync(localD1Path)) {
    // Filter out metadata and sort by last modified time (newest first)
    const files = readdirSync(localD1Path)
      .filter(file => file.endsWith('.sqlite') && !file.startsWith('metadata'))
      .map(file => ({
        name: file,
        time: statSync(join(localD1Path, file)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 0) {
      dbFile = join(localD1Path, files[0].name);
      console.log('⚡ Drizzle Kit successfully linked to active local D1 SQLite database:', dbFile);
    }
  }
} catch (err) {
  console.warn('⚠️ Could not auto-resolve local D1 Miniflare path:', err.message);
}

if (!dbFile) {
  console.log('💡 Note: Miniflare D1 database not created/populated yet. Run "npm run dev" to bootstrap it.');
}

export default defineConfig({
  schema: './src/db/schema.js',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: dbFile || '.wrangler/local.sqlite', // Fallback path if miniflare isn't booted
  },
});
