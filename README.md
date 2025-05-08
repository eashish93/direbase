## README

### Quick Start (development)

1. __Install dependencies__
```bash
  pnpm install
```
2.  __Run database migrations (locally):__
```bash
  pnpm db:migrate
```

3. __Setup env variables (important)__
Check `.env` file and create `.env.development.local` to configure firebase project for admin panel. You need to create firebase project for that and copy the firebase config. This is how you can configure `FIREBASE_SERVICE_ACCOUNT_JSON` variable
```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{
  "type": "service_account",
  "project_id": "<project-id>",
  "private_key_id": "<key-id>",
  "private_key": "<private-key>",
  "client_email": "<client-email",
  "client_id": "<client-id>",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "<cert-url>"
}'

```


4.  __Start the development server:__
```bash
  pnpm dev
```
The application should now be running on `http://localhost:3000`.



### Deploying to production

1. __Configure wrangler.toml__
Edit `wrangler.toml` file to configure D1 and R2 before deploying to production.
```toml
  [[d1_databases]]
  binding = "DB" # available in your Worker on env.DB
  database_name = "<database-name>"
  database_id = "<database-id>"
  migrations_dir = "./drizzle/migrations"

  [[r2_buckets]]
  binding = "R2_B"
  bucket_name = "<bucket-name>"
```

2.  __Run database migrations:__
```bash
  pnpm db:migrate-prod
```

3. __Setup env variables (important)__
Check this doc on how to setup env variables for cloudflare workers: <https://developers.cloudflare.com/workers/configuration/environment-variables/#add-environment-variables-via-the-dashboard>


4. __Setup cloudflare image__
This project uses a custom loader for Next.js Image optimization via Cloudflare Images.
-  Enable [Cloudflare Images](https://developers.cloudflare.com/images/) for your zone and [restrict image origins](https://developers.cloudflare.com/images/cloudflare-images/transform/restrict-image-origins/).
- The project is pre-configured with an `image-loader.ts` file and an updated `next.config.ts` (using `loader: "custom"` and `loaderFile: "./image-loader.ts"`). You may need to adjust `remotePatterns` in `next.config.ts` based on your image hosting.

Images are served directly via Cloudflare's image transformation service. For more details, refer to the [OpenNext documentation on Image Optimization](https://opennext.js.org/cloudflare/howtos/image).

5. __Deploy to production__
```bash
  pnpm run deploy
```