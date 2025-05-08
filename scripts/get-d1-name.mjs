import fs from 'fs';
import toml from 'toml';

const wranglerToml = fs.readFileSync('wrangler.toml', 'utf-8');
const config = toml.parse(wranglerToml);

// Support both single and multiple D1 bindings
const db = Array.isArray(config.d1_databases)
  ? config.d1_databases[0]
  : config.d1_databases;

if (!db?.database_name) {
  console.error('❌ No D1 database_name found in wrangler.toml');
  process.exit(1);
}

console.log(db.database_name);