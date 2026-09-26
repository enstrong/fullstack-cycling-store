# Cycling portfolio demo operations

Public URL: https://cycling.158-180-40-180.sslip.io/
Server checkout: /home/ubuntu/cycling-demo
Compose project: cycling-demo

The app serves the production React build and API on one origin. PostgreSQL is private and stored in the cycling-demo_database volume. Existing Caddy handles HTTPS and joins the external portfolio-edge network; its main compose file records that network so it survives recreation. The Caddyfile.fragment is appended to its existing site configuration, never used to replace the eBookReader site.

## Behavior and limits

DEMO_MODE=true enables automatic temporary accounts through POST /api/demo/start. Each account has private product copies; its user ID is the workspace ID. Customer and demo administrator modes share that workspace. Existing password/Google authentication is disabled only in demo mode. Base catalog records have no demo owner and cannot be changed by demo visitors.

Sessions expire after 24 hours. Cleanup runs at startup and every 15 minutes. Reset deletes the current workspace and the browser starts a new session. Limits: 300 stored demo workspaces, 100 products per workspace, 50 orders including two example orders, 15 starts per IP per 15 minutes, and 180 API requests per IP per minute. The API memory ceiling is 512 MB; PostgreSQL is 1 GB. Logs rotate at 10 MB, with three retained files per container.

Checkout writes real orders and stock changes to PostgreSQL. There are no payments, deliveries, or emails. The example shipping button uses fictional details. Referenced products retain the existing application's delete restrictions; edit them or create a disposable product to explore deletion.

## Build and deploy

From the repository root, with Node.js/npm available:

```sh
npm ci
npm run lint
npm run build
rsync -az --exclude='.git' --exclude='node_modules' --exclude='.env*' --exclude='README.md' --exclude='public' --exclude='src' --exclude='.DS_Store' -e 'ssh -i /Users/aliakbar/.ssh/ebookreader-demo.key' ./ ubuntu@158.180.40.180:cycling-demo/
```

The server-only deploy/demo/.env holds the database password, hostname and release tag; permissions are 0600. Do not overwrite or expose it. Change RELEASE_TAG to a new unique release identifier before building. Never use a new PostgreSQL password against an existing volume without explicitly rotating the database credential.

On the server:

```sh
cd /home/ubuntu/cycling-demo
docker compose -f deploy/demo/compose.yml up -d --build
docker compose -f deploy/demo/compose.yml ps
curl --fail https://cycling.158-180-40-180.sslip.io/api/health
curl --fail --output /dev/null https://ebookreader.158-180-40-180.sslip.io/
```

For first installation only, create the portfolio-edge Docker network, configure Caddy to join it, and append the hostname fragment. The database entrypoint applies db.sql only to an empty volume; the API then applies tracked migrations. Do not re-import db.sql into an initialized database.

## Database backup and restore

Before a schema change, take a private database backup on the server. Retain a small number of backups and keep a copy on the Mac if long-term recovery is needed. Temporary demo data does not need indefinite retention.

```sh
umask 077
mkdir -p /home/ubuntu/cycling-backups
docker compose -f deploy/demo/compose.yml exec -T db pg_dump -U cycling -d cycling_demo -Fc > /home/ubuntu/cycling-backups/before-migration.dump
```

Restore only into a separate empty database first and verify it. Do not overwrite the live database as a routine deploy step. The catalog and migrations can recreate a completely lost demo; all visitor sessions will be new.

## Rollback

Keep the previous versioned Docker image. Set RELEASE_TAG to its tag and run `docker compose -f deploy/demo/compose.yml up -d --no-build app`. This leaves the database intact. A database-incompatible migration requires a separately reviewed restore; image rollback alone does not reverse schema changes.

Caddy's pre-cycling files are saved beside its configuration as Caddyfile.before-cycling and compose.before-cycling.yml. Validate Caddy configuration before reloading. Removing only the cycling site does not require restarting eBookReader services.

No deployment runs on GitHub pushes. No Oracle paid resources or account upgrade are needed. The IP is part of the hostname; if Oracle changes it, update the hostname and frontend URL. Oracle Always Free availability and idle-reclamation policies still apply.
