# API Documentation

| File                                                 | What it is                                                                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [`openapi.yaml`](openapi.yaml)                       | OpenAPI 3.1 specification of every endpoint: parameters, request bodies, responses, error codes and validation rules |
| [`postman_collection.json`](postman_collection.json) | Postman collection generated from the spec, ready to run against a local backend                                     |

Base URL: `http://localhost:8000/api`. All endpoints except `POST /auth/login` need `Authorization: Bearer <token>`.

## Using the Postman collection

1. In Postman, **Import** `postman_collection.json`.
2. Start the backend (`composer dev` in `backend/`, see [../setup-guide.md](../setup-guide.md)).
3. Run **Auth → Log in and receive a JWT**. It signs in as the seeded `admin@example.com` / `password` and saves the token into the collection's `bearerToken` variable. Every other request uses it automatically.
4. Path variables default to `1` (for example `/tasks/1`). Change them on each request as needed. Query parameters are listed but switched off; tick the ones you want.

"Log out" invalidates the saved token, so it's the last request in the Auth folder. Run "Log in" again afterwards.

Running whole folders with the Postman runner also runs the update and delete requests against your data, so run requests one at a time on a database you care about.

## Viewing the spec

Any OpenAPI 3.1 viewer works. To build a single HTML page and open it:

```bash
npx @redocly/cli build-docs documentation/api-docs/openapi.yaml -o api-docs.html
open api-docs.html
```

Or paste `openapi.yaml` into https://editor.swagger.io.

## Endpoint summary

| Method | Path                              | Purpose                                                                                                     |
| ------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/login`                     | Log in, receive a JWT (5 attempts per minute)                                                               |
| POST   | `/auth/logout`                    | Invalidate the token                                                                                        |
| GET    | `/auth/me`                        | The signed-in user                                                                                          |
| GET    | `/users`                          | All users (for assigning tasks)                                                                             |
| GET    | `/tasks`                          | List tasks: pagination, filters (`status`, `priority`, `assigned_user_id`, `created_by`, `search`), sorting |
| POST   | `/tasks`                          | Create a task                                                                                               |
| GET    | `/tasks/{id}`                     | A task with its attachments                                                                                 |
| PUT    | `/tasks/{id}`                     | Update a task                                                                                               |
| DELETE | `/tasks/{id}`                     | Delete a task and its files                                                                                 |
| POST   | `/tasks/bulk-status`              | Change the status of up to 1000 tasks in the background                                                     |
| GET    | `/tasks/bulk-status/{batchId}`    | Progress of a bulk update                                                                                   |
| GET    | `/tasks/{id}/comments`            | A task's comments                                                                                           |
| POST   | `/tasks/{id}/comments`            | Comment on a task (broadcast live)                                                                          |
| DELETE | `/comments/{id}`                  | Delete a comment (broadcast live)                                                                           |
| POST   | `/tasks/{id}/attachments`         | Upload a file (up to 50 MB)                                                                                 |
| GET    | `/attachments/{id}/download`      | Download a file                                                                                             |
| GET    | `/attachments/{id}/thumbnail`     | An image's thumbnail                                                                                        |
| GET    | `/attachments/{id}/stream/{path}` | Stream a video: HLS playlists and segments                                                                  |
| DELETE | `/attachments/{id}`               | Delete a file and all its versions                                                                          |
| GET    | `/attachments/{id}/versions`      | Every version of a file                                                                                     |
| POST   | `/attachments/{id}/versions`      | Upload a new version                                                                                        |
| POST   | `/attachments/{id}/restore`       | Restore an older version                                                                                    |
| POST   | `/tasks/{id}/attachments/uploads` | Start a chunked upload (files over 50 MB, up to 2 GB)                                                       |
| GET    | `/uploads/{uuid}`                 | Which chunks have arrived                                                                                   |
| POST   | `/uploads/{uuid}/chunks/{index}`  | Send one chunk                                                                                              |
| POST   | `/uploads/{uuid}/complete`        | Assemble the chunks into an attachment                                                                      |
| DELETE | `/uploads/{uuid}`                 | Cancel a chunked upload                                                                                     |
| GET    | `/exports`                        | Your exports                                                                                                |
| POST   | `/exports`                        | Request a CSV or PDF export (background)                                                                    |
| GET    | `/exports/{id}`                   | Export status                                                                                               |
| GET    | `/exports/{id}/download`          | Download a finished export                                                                                  |
| POST   | `/broadcasting/auth`              | Authorize a private WebSocket channel                                                                       |

Outside `/api`, `GET /up` is a health check that returns 200 when the app is running.

## Conventions

- **Errors** are JSON: `{ "message": "…" }`. Validation errors (422) add `errors`, keyed by field: `{ "message": "…", "errors": { "title": ["The title field is required."] } }`.
- **Status codes**: 401 no or expired token, 403 not allowed, 404 not found (also used instead of 403 for other users' exports and bulk operations, so their ids reveal nothing), 409 not ready yet (file still being scanned, export still generating), 410 gone (file failed the virus scan, export failed), 422 invalid input, 429 rate limited.
- **Lists** are wrapped in `data`. Paginated lists add `links` and `meta` (`current_page`, `last_page`, `per_page`, `total`, …).
- **Background work** (bulk updates, exports) returns **202** with a resource to poll.
- **Dates** are ISO 8601 in UTC; `due_date` is a plain `YYYY-MM-DD` date.
