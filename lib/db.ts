'server-only';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';

let dbInstance: ReturnType<typeof drizzle> | null = null;

export default async function db() {
  if (!dbInstance) {
    const ctx = await getCloudflareContext({ async: true });
    dbInstance = drizzle(ctx.env.DB);
  }
  return dbInstance;
}
