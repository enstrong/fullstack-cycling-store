# Fullstack Cycling Store

A cycling store portfolio project built with React, Vite, Express and PostgreSQL. Includes email/password and Google sign-in, guest carts that merge on login, server-calculated checkout, private order history with product images, and administrator-only catalogue editing. Orders are demonstrations: no payments or fulfilment integrations are configured.

<img width="1089" height="612" alt="telegram-cloud-photo-size-2-5444951799350629972-y" src="https://github.com/user-attachments/assets/97d60b5b-1739-4e6b-9c68-87f0bf13b859" />
<img width="1089" height="614" alt="telegram-cloud-photo-size-2-5444951799350629974-y" src="https://github.com/user-attachments/assets/bda13ddc-4b3f-43a3-b25f-87a8421f0401" />

## Run locally

Use Node.js 20 or newer and PostgreSQL. Install dependencies in the repository root and in `api-server` (`npm ci` in each directory). Create a database and load `db.sql` once for the product catalog. Copy `api-server/.env.example` to `api-server/.env` and set your database values.

Start the API with `npm start` from `api-server`, then start the frontend with `npm run dev` from the repository root. Open **http://localhost:5173**. Vite proxies `/api` to the API on port 5001; that port avoids macOS AirPlay's use of 5000. The API applies the versioned database migrations automatically before listening. Existing product data is preserved.

For this local preview, PostgreSQL is running in the `1page-vite-postgres` Docker container on port 5433. It was started as a temporary container; stopping it removes its preview database. The local `.env` files are ignored by Git.

## Google sign-in: where the two keys go

In **`api-server/.env`**, set:

```dotenv
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

Create an OAuth client of type **Web application** in Google Cloud, configure the consent screen, and register this exact authorized redirect URI:

```text
http://localhost:5001/api/auth/google/callback
```

If Google reports `redirect_uri_mismatch`, add the exact callback URL above to the same OAuth client whose ID is configured in the server environment. The port and path must match exactly.

If asked for an authorized JavaScript origin, use `http://localhost:5173`. Add your account as a test user while the consent screen is in testing mode. Restart the API after setting the keys. Use `localhost` consistently when opening the preview. Both keys stay on the API server; do not put the client secret in a `VITE_` variable or in frontend source.

Without Google credentials, email registration and login work normally and the Google button is disabled with an availability message. Google uses a server-side authorization-code exchange with PKCE and a short-lived, single-use state value tied to an HttpOnly cookie. An existing password account is not automatically linked by matching its email address.

Official setup reference: [Google OAuth for web server applications](https://developers.google.com/identity/protocols/oauth2/web-server).

## Accounts, carts and orders

- Passwords are hashed with salted scrypt. Login creates an opaque seven-day session; only its SHA-256 hash is stored in PostgreSQL. Logout revokes it. Cookies are HttpOnly and SameSite=Lax, and are Secure in production.
- Guests can browse and add items using a server-issued guest cookie. On registration or login, guest items merge into the account cart. A unique database index guarantees one cart per account. Logging out leaves that account's cart intact.
- Browser-provided `session_id` and `user_id` values do not select a cart or account. Cart updates are scoped to the authenticated user or guest cookie. Checkout requires a signed-in user.
- Checkout locks the cart and product rows, validates stock, copies current prices into order items, computes the total with PostgreSQL NUMERIC arithmetic, updates stock, and empties the cart in one transaction. Browser totals and customer email values are ignored.
- Password authentication is rate limited. Mutating browser requests are checked against `FRONTEND_URL`. Use HTTPS, `NODE_ENV=production`, and a same-origin `/api` reverse proxy in production.

Product create/update/delete routes require an administrator account or the optional server-configured `ADMIN_API_KEY` as a Bearer credential. New accounts are always customers. To promote your own registered account, run this against your database with your actual email:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

An administrator sees a product management link on the account page. The API key remains an optional administrative fallback; it is never bundled into the website.

## Verification

- `npm run build` and `npm run lint` from the repository root.
- `npm test` from `api-server` runs password and access-control tests.
- `TEST_DATABASE_URL=postgres://... npm test` from `api-server` also runs PostgreSQL integration tests. These use a uniquely named temporary schema and remove it afterward. They cover cart ownership, guest merging, session revocation, price tampering, stock rollback, concurrent checkout and a simulated Google callback. A live Google callback additionally requires real credentials.

The frontend API origin can be overridden with `VITE_API_BASE_URL` in a root `.env.local`; leave it empty for the local Vite proxy or a same-origin production deployment.

Product photography sources are recorded in `public/products/SOURCES.md`. The updated Cervélo R5 image comes from its manufacturer and has a transparent background.

## Security and project status

- Helmet protects API responses. Frontend development and preview servers set a Content Security Policy, framing protection, MIME sniffing protection and restricted browser permissions. If hosted elsewhere, configure equivalent document headers on that host.
- API traffic is limited to 180 requests per minute per IP; password and Google sign-in starts share a 20-attempt / 15-minute limit. Responses include retry guidance. Limits are in-memory for this single-process demo and reset on restart. A future multi-instance deployment needs a shared rate-limit store and explicit trusted-proxy configuration.
- Product fields, prices, image URLs and IDs are validated. Database checks enforce valid quantities, prices and stock on new writes. Legacy rows are preserved by the constraint migration.
- Database connection, query and idle transaction timeouts bound stalled requests. Expired sessions are removed during login. Google state is single-use, browser-bound and expires after ten minutes; provider requests have timeouts.
- Invalid JSON and oversized payloads return generic errors. Internal API error logs omit request bodies and database parameter values.
- Environment files are ignored except examples. Never commit keys, database passwords, session tokens or OAuth callback URLs containing codes. Dependency lockfiles are committed so `npm ci` reproduces the reviewed versions.
- Google login must be completed in your own browser. A password account with the same email must use password login; automatic account linking is intentionally disabled.

Before publishing, configure HTTPS and secure cookies, replace local database credentials, and give the database persistent storage. This repository remains a portfolio demo; email verification, password recovery and real payments are not implemented.

## Shipping validation

Checkout collects first/last name separately (2–50 characters each), a country/territory from the ISO list, region and city (2–100 characters including letters), street/building details (5–200 characters), and a country-specific postal code. Unicode letters, accented names, apostrophes and hyphens are supported. Postal codes stay strings, preserving leading zeroes. Countries without a postcode system do not require one.

The browser and API share `shared/shipping.mjs`; bypassing browser checks cannot create an invalid order. Structured details are saved on the order, alongside the readable address used by existing order history. Existing orders remain readable.

Postal formats come from [postal-code-checker](https://github.com/sashiksu/postal-code-checker), with support added for Kazakhstan's seven-character format ([USPS guidance](https://pe.usps.com/text/imm/il_012.htm)). These are format checks, not confirmation that a postcode is allocated or that a street/address is deliverable. No paid address service is used. The API and frontend both require the repository-root dependencies for this shared validator.
