# Local Durable Services Setup

This project runs from the canonical local checkout with Docker Compose. The Compose stack now defines `app`, `redis`, `postgres`, `minio`, and a one-shot `minio-init` bucket initializer on the `ace-network` bridge network. PostgreSQL and MinIO are separate containers in the same Content Factory stack, not processes inside the app container.

## 1. Create the local environment file

The Compose file supports `APP_ENV_FILE` so a local secret file can be selected without changing the committed Compose definition. The default is `.env`.

Run these commands from the project root:

```bash
cp .env.example .env
chmod 600 .env
```

Never commit `.env`, paste its secret values into chat, or upload it to GitHub. Confirm that `.gitignore` contains `.env` before proceeding.

## 2. Generate local security secrets

The application does not use a normal password login for tenant authentication. It uses a tenant API key which is exchanged for a bearer token. Set local random secrets with:

```bash
TENANT_KEYS_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_API_KEY=$(openssl rand -hex 32)
```

Put the generated values into `.env` as `TENANT_KEYS_SECRET`, `JWT_SECRET`, and `ADMIN_API_KEY`. Keep the `ADMIN_API_KEY` only on the local machine; it is a platform-admin credential.

## 3. Understand Docker networking

Inside the `app` container, `localhost` means the `app` container itself. The existing Compose configuration forces Redis to use the service hostname `redis` and port `6379`.

If PostgreSQL and MinIO are added as Compose services on the same network, use these values:

```dotenv
DATABASE_URL=postgresql://content_factory:REPLACE_WITH_LOCAL_PASSWORD@postgres:5432/content_factory
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=REPLACE_WITH_LOCAL_ACCESS_KEY
MINIO_SECRET_KEY=REPLACE_WITH_LOCAL_SECRET_KEY
MINIO_BUCKET=content-factory
MINIO_REGION=us-east-1
```

This is the preferred same-Compose setup. They are separate containers on the same Docker network, not processes inside the `app` container.

If PostgreSQL and MinIO are running directly on the host machine instead, use `host.docker.internal`, which is already configured in the Compose file:

```dotenv
DATABASE_URL=postgresql://content_factory:REPLACE_WITH_LOCAL_PASSWORD@host.docker.internal:5432/content_factory
MINIO_ENDPOINT=http://host.docker.internal:9000
```

Do not use `localhost` in these URLs from the Dockerized app unless the service is actually running inside the app container.

## 4. Keep migration execution disabled until checks pass

Initially leave these values exactly as follows:

```dotenv
MIGRATION_EXECUTE=false
MIGRATION_BACKUP_APPROVED=false
MIGRATION_RECONCILIATION_APPROVED=false
MIGRATION_ROLLBACK_APPROVED=false
MIGRATION_LOCK_OWNER=
RELEASE_CONTROL_PRIMARY_READS=false
```

The project must not be switched to PostgreSQL or MinIO primary authority merely because variables exist. Credentials, connectivity, backup evidence, reconciliation decisions, rollback evidence, and two-tenant acceptance must pass first.

## 5. Restart the local stack

After saving `.env`, restart the stack from the project root. If you intentionally keep credentials in a protected alternate file, replace `.env` below with `--env-file /absolute/path/to/local.env` and set `APP_ENV_FILE` to the same file so the app receives the values too:

```bash
docker compose --env-file .env down
docker compose --env-file .env up -d --build
```

The stack publishes the app on `localhost:3123`, PostgreSQL on `127.0.0.1:5432`, MinIO S3 on `127.0.0.1:9000`, and the MinIO console on `127.0.0.1:9001`. Those ports are bound to loopback for local-only access.

Check service state and application health:

```bash
docker compose ps
docker compose logs --tail=100 app
curl -fsS http://localhost:3123/api/health
```

The health request should return HTTP `200`. A protected endpoint without a bearer token should continue to return HTTP `401`.

## 6. Validate configuration without applying migration

Run the readiness gate:

```bash
npm run db:migration:readiness
```

A non-zero result is expected until all owner-approved infrastructure and reconciliation prerequisites exist. Do not run `db:migration:apply` or `storage:migration:apply` until the readiness report explicitly shows all required gates passing.

## 7. Tenant test credential

Tenant authentication uses an API key, not a password. Use the existing tenant bootstrap/rotation flow to create or rotate a local test API key. Exchange it for a bearer token through:

```bash
curl -X POST http://localhost:3123/api/system-engines/auth/authenticate \
  -H 'Content-Type: application/json' \
  -d '{"apiKey":"YOUR_LOCAL_TENANT_API_KEY"}'
```

Do not place the API key in `.env.example`, source code, Git, or documentation. After testing, rotate it using the admin rotation flow and remove any temporary shell history or local secret files.

## 8. Required values before real migration

Before changing `MIGRATION_EXECUTE=true`, provide real local service values for `DATABASE_URL`, `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, and `MINIO_BUCKET`; create the PostgreSQL schema; create the MinIO bucket; verify connectivity from inside the `app` container; create and verify a metadata backup; provide signed reconciliation decisions for malformed and unowned records; and run the two-tenant acceptance harness.

The current safe state is file-backed authority with `RELEASE_CONTROL_PRIMARY_READS=false`. This guide does not authorize cutover.
