# Frontend: Next.js app

The web UI for the task management platform. Next.js 16 (App Router), React 19, TypeScript and Tailwind CSS 4. Requires Node.js 20.9+ and the backend running.

Full setup: [../documentation/setup-guide.md](../documentation/setup-guide.md). How it fits with the API: [../documentation/architecture.md](../documentation/architecture.md).

## Setup and running

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_REVERB_APP_KEY to the backend's REVERB_APP_KEY
npm run dev                  # http://localhost:3000
```

| Variable                     | Default                     | Meaning                                                   |
| ---------------------------- | --------------------------- | --------------------------------------------------------- |
| `API_URL`                    | `http://localhost:8000/api` | Where the Next.js server calls the API. Server-side only. |
| `NEXT_PUBLIC_REVERB_APP_KEY` | _(empty)_                   | Reverb app key. Empty turns off real-time updates.        |
| `NEXT_PUBLIC_REVERB_HOST`    | `localhost`                 | WebSocket host as the browser sees it                     |
| `NEXT_PUBLIC_REVERB_PORT`    | `8081`                      | WebSocket port                                            |
| `NEXT_PUBLIC_REVERB_SCHEME`  | `http`                      | `https` uses `wss://`                                     |

`NEXT_PUBLIC_*` values are built into the JavaScript: restart `npm run dev`, or rebuild, after changing them.

Production: `npm run build && npm run start`. See [../documentation/deployment.md](../documentation/deployment.md).

## Testing

| Command            | Runs                                                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`         | Vitest unit and integration tests (components, server actions, API proxy, upload logic)                                                         |
| `npm run test:e2e` | Playwright end-to-end tests against the running app. Needs the backend and a seeded database; run `npx playwright install chromium` once first. |
| `npm run lint`     | ESLint                                                                                                                                          |

## How it talks to the API

The browser never holds the API token. Signing in stores the JWT in an httpOnly cookie, and:

- **Pages** are server components that call the API from the Next.js server (`lib/api.ts`, `lib/tasks.ts`).
- **Changes** go through server actions (`app/actions/`).
- **File uploads and downloads** go through `app/api/[...path]/route.ts`, which streams them to the API with the token attached. It only forwards an allowlist of file routes (uploads, file and thumbnail downloads, video streams, export downloads).
- **WebSocket channel authorization** goes through `app/api/broadcasting/auth/route.ts`.
- **`proxy.ts`** sends signed-out visitors to `/login`.

## Where things are

| Path                                                 | Contents                                                         |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| `app/login/`                                         | Sign-in page                                                     |
| `app/(dashboard)/page.tsx`                           | Task list with search, filters, sort and pagination              |
| `app/(dashboard)/tasks/new/`, `tasks/[id]/`          | Create a task; view or edit one, with its files and comments     |
| `app/(dashboard)/tasks/[id]/attachment-uploader.tsx` | Drag-and-drop uploads with progress                              |
| `app/(dashboard)/tasks/[id]/video-player.tsx`        | HLS video player (hls.js, loaded on demand) with quality picker  |
| `app/(dashboard)/tasks/[id]/task-comments.tsx`       | Real-time comments with typing indicators                        |
| `app/(dashboard)/tasks/[id]/task-viewers.tsx`        | Who else has the task open                                       |
| `components/online-users.tsx`                        | Online users in the header                                       |
| `lib/presence.ts`                                    | Presence channel members as React state                          |
| `app/(dashboard)/live-task-updates.tsx`              | Refreshes the page when tasks change elsewhere                   |
| `app/(dashboard)/export-button.tsx`                  | CSV/PDF export of the current task list                          |
| `app/actions/`                                       | Server actions: auth, tasks, attachments, comments, exports      |
| `components/toasts.tsx`                              | Toast notifications, including messages carried across redirects |
| `lib/upload.ts`                                      | Upload logic: validation, progress, chunking over 45 MB          |
| `lib/task-filters.ts`                                | Reading and writing the task list filters in the URL             |
| `lib/echo.ts`                                        | Laravel Echo (Reverb) connection                                 |
| `tests/unit/`, `tests/e2e/`                          | Vitest and Playwright tests                                      |
