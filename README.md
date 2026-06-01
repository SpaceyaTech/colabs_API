# Colabs Backend API

Node.js + TypeScript REST API for the SpaceYaTech open-source collaboration & freelance platform.

## Tech Stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Runtime      | Node.js 20+                         |
| Framework    | Express.js + TypeScript             |
| Database     | PostgreSQL 16 (Prisma ORM)          |
| Cache        | Redis 7                             |
| Auth         | GitHub OAuth 2.0 + JWT              |
| File Storage | MinIO                               |
| Validation   | Zod                                 |
| Testing      | Vitest                              |

---

## Prerequisites

- Node.js 20+
- Docker & Docker Compose

---

## Local Setup

### 1. Clone & install

```bash
git clone https://github.com/SpaceyaTech/colabs-backend.git
cd colabs-backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in these values — everything else has working defaults:

| Variable               | How to get it                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `POSTGRES_USER`        | Any username, e.g. `colabs`                                                                                                     |
| `POSTGRES_PASSWORD`    | Any password                                                                                                                    |
| `POSTGRES_DB`          | Any db name, e.g. `colabs_db`                                                                                                   |
| `DATABASE_URL`         | Update to match the three values above: `postgresql://POSTGRES_USER:POSTGRES_PASSWORD@localhost:5432/POSTGRES_DB?schema=public` |
| `MINIO_ROOT_USER`      | Any username, e.g. `minioadmin`                                                                                                 |
| `MINIO_ROOT_PASSWORD`  | Any password                                                                                                                    |
| `JWT_SECRET`           | Any random string, 32+ characters                                                                                               |
| `GITHUB_CLIENT_ID`     | Create a GitHub OAuth App (see below)                                                                                           |
| `GITHUB_CLIENT_SECRET` | Same OAuth App                                                                                                                  |
| `GITHUB_API_TOKEN`     | GitHub personal access token (see below)                                                                                        |

**GitHub OAuth App** — go to `github.com/settings/developers` → New OAuth App:

- Homepage URL: `http://localhost:3000`
- Callback URL: `http://localhost:8000/api/auth/github/callback`
- Copy the Client ID and generate a Client Secret into `.env`

**GitHub API Token** — go to `github.com/settings/tokens` → Generate classic token. No scopes needed for public repos.

### 3. Start infrastructure

```bash
docker compose up -d
```

Starts PostgreSQL on `:5432`, Redis on `:6379`, and MinIO on `:9000` (console at `:9001`).

### 4. Run migrations & seed

```bash
npm run db:migrate
npm run db:generate
npm run db:seed
```

### 5. Start the server

```bash
npm run dev
```

Server: `http://localhost:8000`
Health check: `http://localhost:8000/health`

### API Documentation

Interactive API docs are available at **`http://localhost:8000/api/docs`** once the server is running.

The docs cover all endpoints, request/response schemas, auth requirements, and let you test requests directly from the browser.

---

## Available Scripts

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled production build
npm run db:migrate   # Run Prisma migrations
npm run db:generate  # Regenerate Prisma client
npm run db:studio    # Open Prisma Studio (database GUI)
npm run db:seed      # Seed initial data
npm run test         # Run tests
npm run lint         # Lint with ESLint
```

---

## Health Check

```
GET http://localhost:8000/health
```

Returns `{ "status": "ok" }` — use this to confirm the server is up.

---

## Project Structure

```
src/
├── app.ts
├── config/env.ts
├── lib/
│   ├── prisma.ts
│   ├── redis.ts
│   ├── s3.ts
│   └── github.ts
├── middleware/
│   ├── auth.ts
│   ├── errorHandler.ts
│   └── rateLimiter.ts
└── modules/
    ├── auth/
    ├── users/
    ├── projects/
    ├── issues/
    ├── gigs/
    ├── proposals/
    └── teams/

prisma/
├── schema.prisma
└── seed.ts
docker-compose.yml
```

---

## Contributing

Part of the [SpaceYaTech](https://github.com/SpaceyaTech) community. PRs welcome!

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Commit: `git commit -m 'feat: add your feature'`
4. Push and open a Pull Request

---

## License

Apache 2.0 — see [LICENSE](LICENSE)
