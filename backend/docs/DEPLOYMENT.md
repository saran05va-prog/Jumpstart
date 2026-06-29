# Deployment Guide

Three paths, from simplest to most flexible. All of them need the same six
environment variables — see the table in the main [README](../README.md).

## Option A — Railway (simplest for a side project / demo)

1. Push this repo to GitHub.
2. In Railway: **New Project → Deploy from GitHub repo**, pick this repo.
3. **Add a MySQL plugin** from Railway's database catalog — it gives you
   `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`,
   `MYSQL_PASSWORD` automatically as variables.
4. On the API service, set environment variables (Settings → Variables):
   - `SPRING_PROFILES_ACTIVE=prod`
   - `DB_HOST` = the MySQL plugin's host, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` = its credentials
   - `JWT_SECRET` = output of `openssl rand -base64 64`
   - `CORS_ALLOWED_ORIGINS` = your deployed frontend's URL (e.g. `https://jumpstart.vercel.app`)
5. Railway detects the `Dockerfile` automatically and builds from it. First
   deploy will run Flyway migrations on boot — watch the logs for
   `Successfully applied N migrations`.
6. Once deployed, Railway gives you a public URL like
   `https://jumpstart-backend.up.railway.app` — that's your API base URL.

## Option B — Render

1. Push to GitHub, then in Render: **New → Web Service**, connect the repo,
   choose **Docker** as the environment (Render reads the `Dockerfile`
   directly).
2. **New → MySQL** for the database (or use Render's PostgreSQL if you'd
   rather adapt the migrations — see the architecture doc on why MySQL was
   chosen, it's not load-bearing).
3. Set the same environment variables as Option A in the web service's
   **Environment** tab.
4. Render assigns a public URL automatically on first successful deploy.

## Option C — Any VM / VPS with Docker (most control, most setup)

```bash
git clone <your-repo-url>
cd jumpstart-backend
cp .env.example .env   # fill in real values, especially JWT_SECRET and DB_PASSWORD
docker compose up -d --build
```

For production on a bare VM you'll additionally want to:

- Put a reverse proxy (nginx, Caddy, or Traefik) in front of port `8080` to
  terminate TLS — Caddy is the least configuration for a first deploy
  (`yourapi.com { reverse_proxy localhost:8080 }` is close to the entire
  config).
- Not expose MySQL's port `3306` publicly — remove the `ports: ["3306:3306"]`
  line from `docker-compose.yml` once you're not connecting to it from your
  local machine, and let only the `api` service reach it over the internal
  Docker network.
- Set up automated MySQL backups (`mysqldump` on a cron, or your cloud
  provider's managed-MySQL backup feature if you switch from the
  Compose-managed database to something like Aiven or RDS).

## CI: GitHub Actions

A minimal workflow you can drop in at `.github/workflows/ci.yml` to run
tests on every push/PR (build verification — since this sandbox couldn't
reach Maven Central, this is the first place that will actually prove the
project compiles and the test suite passes):

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: "21"
          distribution: "temurin"
          cache: maven
      - run: mvn -B clean verify
```

Add a second job that builds and pushes the Docker image to a registry
(GitHub Container Registry is the path of least resistance, since it needs
no extra secrets beyond the automatically-provided `GITHUB_TOKEN`) once
you're ready to automate deploys rather than triggering them manually from
Railway/Render's GitHub integration.

## Post-deploy checklist

- [ ] `GET /api/health` returns `200` with `"status":"UP"`
- [ ] `GET /swagger-ui.html` loads (confirms the app started cleanly)
- [ ] `POST /api/auth/register` with a throwaway account succeeds, and
      `POST /api/auth/login` with the same credentials returns a token
- [ ] Frontend's `CORS_ALLOWED_ORIGINS` matches exactly (including scheme —
      `https://` vs `http://` mismatches are the most common first bug)
- [ ] `JWT_SECRET` is **not** the placeholder from `.env.example`
- [ ] Decide whether to keep or delete the `V2__seed.sql` demo account
      before letting real users in
