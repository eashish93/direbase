import { defineConfig } from 'drizzle-kit';

// Since we do migrations via wrangler, we don't need to specify here d1 config
export default defineConfig({
  out: './drizzle/migrations',
  schema: './drizzle/schema',
  dialect: 'sqlite',
  
});
