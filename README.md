# Task Management Platform

A task management system with real-time updates, file attachments and background processing. A Laravel 13 REST API with JWT authentication, queues and WebSockets, and a Next.js 16 frontend.

## Features

**Backend (Laravel, `backend/`)**

- JWT authentication: login, logout (token blacklisted), current user; login rate-limited
- Tasks: create, read, update, delete; list with pagination, filtering (status, priority, assignee, creator, title search) and sorting
- Role- and ownership-based permissions (admins, task creators, assignees)
- File attachments: type and size validation checked against file content, private storage, downloads through authorized endpoints
- Image thumbnails (WebP), generated in the background
- Video streaming: videos are converted with ffmpeg into adaptive HLS streams (360p, 720p, 1080p) with a poster thumbnail
- Chunked, resumable uploads for files over 50 MB (up to 2 GB)
- Simulated virus scanning (EICAR signature); files can't be downloaded until they pass
- File versioning with restore
- Background jobs: assignment emails, bulk status updates (job batches with progress), thumbnail generation, virus scanning, CSV/PDF exports
- Comments on tasks
- Real-time broadcasting over Laravel Reverb (task changes, comments, presence)

**Frontend (Next.js, `frontend/`)**

- Sign in and out, with the session token kept in an httpOnly cookie
- Task dashboard with create, edit and delete
- Live updates: the task list and comments update across browsers without reloading
- Drag-and-drop file upload with per-file progress bars, cancel, and automatic chunking for large files
- Search, filters and sorting kept in the URL
- Export the current task list as CSV or PDF (generated in the background, then downloaded)
- Video player with automatic and manual quality selection (hls.js)
- Real-time comments
- Online users in the header, who else is viewing a task, and typing indicators on comments
- Toast notifications
- Responsive from 320 px phones to desktop

**Bonus challenges:** video streaming, and presence and typing indicators, are implemented; Redis caching is not.

## Quick start

Needs PHP 8.3+ (with `upload_max_filesize` and `post_max_size` at 50M), Composer, Node.js 20.9+, MySQL 8+ and ffmpeg. The full walkthrough, including every environment variable, is in **[documentation/setup-guide.md](documentation/setup-guide.md)**.

```bash
# Backend
cd backend
composer install
cp .env.example .env               # then set DB_* and REVERB_APP_ID/KEY/SECRET
php artisan key:generate
php artisan jwt:secret --force
php artisan migrate --seed
composer dev                       # API :8000, queue worker, Reverb :8081, logs

# Frontend (second terminal)
cd frontend
npm install
cp .env.example .env.local         # set NEXT_PUBLIC_REVERB_APP_KEY = REVERB_APP_KEY
npm run dev                        # http://localhost:3000
```

Sign in as **`admin@example.com`** / **`password`**.

## Documentation

| Document                                                     | Contents                                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------- |
| [Setup guide](documentation/setup-guide.md)                  | Local installation, configuration, running the tests, troubleshooting |
| [API documentation](documentation/api-docs/)                 | OpenAPI 3.1 spec and a Postman collection                             |
| [Database schema](documentation/database-schema.md)          | Tables, columns, indexes, relationships, sample data                  |
| [Architecture decisions](documentation/architecture.md)      | How the system fits together and why                                  |
| [Deployment guide](documentation/deployment.md)              | Production setup with Nginx, Supervisor and TLS                       |
| [`backend/database/schema.sql`](backend/database/schema.sql) | SQL schema with indexes                                               |
| [`backend/database/dump.sql`](backend/database/dump.sql)     | SQL dump: schema plus sample data                                     |

## Tests

| Suite                                                                | Command                           | Needs                                               |
| -------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------- |
| Backend (Pest): unit, API endpoints, database, uploads, jobs, events | `cd backend && php artisan test`  | An empty MySQL database named `transcosmos_testing` |
| Frontend unit and integration (Vitest)                               | `cd frontend && npm test`         | Nothing                                             |
| End to end (Playwright)                                              | `cd frontend && npm run test:e2e` | Running backend and seeded database                 |

## Project structure

```
backend/                 Laravel API
  app/                   Controllers, requests, resources, models, policies, jobs, events
  config/                Includes attachments.php and exports.php (upload and export limits)
  database/              Migrations, factories, seeder, schema.sql, dump.sql
  routes/                api.php (REST endpoints), channels.php (WebSocket channels)
  tests/                 Pest feature and unit tests
frontend/                Next.js app (App Router, TypeScript, Tailwind CSS)
  app/                   Pages, server actions, API proxy route handlers
  components/, lib/      Shared UI and helpers
  tests/                 Vitest unit tests and Playwright E2E tests
documentation/
  api-docs/              openapi.yaml, postman_collection.json
  architecture.md
  database-schema.md
  deployment.md
  setup-guide.md
```

Laravel keeps application code in `backend/app/` and Next.js in `frontend/app/`; these take the place of the `src/` folders in the suggested layout.

## Tech stack

| Layer     | Technology                                                                              |
| --------- | --------------------------------------------------------------------------------------- |
| API       | PHP 8.3+, Laravel 13, `php-open-source-saver/jwt-auth`, Intervention Image (GD), dompdf |
| Video     | ffmpeg (HLS transcoding, poster frames), hls.js                                         |
| Real time | Laravel Reverb (WebSockets, Pusher protocol), Laravel Echo                              |
| Queue     | Laravel queues on the database driver, job batches                                      |
| Database  | MySQL 8+                                                                                |
| Frontend  | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Sonner                   |
| Testing   | Pest, Vitest, React Testing Library, Playwright                                         |
