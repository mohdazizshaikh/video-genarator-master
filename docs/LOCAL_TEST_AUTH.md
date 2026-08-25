# Local Testing Authentication

## Current model

The local Content Factory authentication flow does not implement a user password. It uses a tenant-scoped generated **API key** to issue a short-lived bearer token. The API key is hashed in the tenant store; the plaintext credential is returned only during registration or credential rotation.

For local testing, a temporary tenant was registered through the existing public bootstrap endpoint. The generated plaintext API key is intentionally kept outside the repository. It must not be committed to Git, placed in `.env.example`, or copied into production configuration.

## Authenticate locally

```sh
curl -sS -X POST http://localhost:3123/api/system/auth/authenticate \
  -H 'Content-Type: application/json' \
  --data '{"apiKey":"<temporary-local-api-key>"}'
```

Use the returned `data.token` as:

```text
Authorization: Bearer <token>
```

The protected API should then be called with that header. Token verification is available through `POST /api/system/auth/verify`.

## Rotate the temporary credential

An administrator must rotate the tenant credential through the protected endpoint:

```sh
curl -sS -X POST http://localhost:3123/api/system/auth/rotate/<tenant-id> \
  -H "X-Admin-Key: <admin-key>"
```

The response contains a new plaintext API key once. Replace the locally stored temporary value and remove the old one. If the tenant should be removed instead of rotated, perform that operation through an owner-approved data-management procedure; do not edit or delete tenant records ad hoc.

## Safety status

PostgreSQL and MinIO are still disabled, `RELEASE_CONTROL_PRIMARY_READS=false` remains unchanged, and no testing credential is stored in tracked files. The temporary tenant is local test data and should be rotated or removed before any shared or production deployment.
