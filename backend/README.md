# Backend: Laravel API

The REST API for the task management platform: JWT authentication, tasks, comments, file attachments, background jobs and WebSocket broadcasting. Requires PHP 8.3+, Composer, MySQL 8+ and ffmpeg (for video streaming).

Full setup, including every environment variable: [../documentation/setup-guide.md](../documentation/setup-guide.md). API reference: [../documentation/api-docs/](../documentation/api-docs/).

## Setup

```bash
composer install
cp .env.example .env        # set DB_* and REVERB_APP_ID / REVERB_APP_KEY / REVERB_APP_SECRET
php artisan key:generate
php artisan jwt:secret --force
php artisan migrate --seed  # or import database/dump.sql
```

## Running

```bash
composer dev
```

starts the API (`php artisan serve`, port 8000), the queue worker, Reverb (port 8081) and a log viewer together. Health check: `GET /up`.

## Testing

```bash
php artisan test
```

Pest, against a separate MySQL database, `transcosmos_testing` (set in `phpunit.xml`; host, user and password come from `.env`). Create it once with `CREATE DATABASE transcosmos_testing`. The tests wipe that database, so never point it at your development one. The queue, mail and broadcasting are faked, so no other services are needed.

Code style: `vendor/bin/pint`.

## Where things are

| Path                                                      | Contents                                                                        |
| --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `routes/api.php`                                          | Every REST endpoint                                                             |
| `routes/channels.php`                                     | Private and presence WebSocket channels and who may join them                   |
| `app/Http/Controllers/`                                   | One controller per resource                                                     |
| `app/Http/Requests/`                                      | Validation and authorization for each write endpoint                            |
| `app/Http/Resources/`                                     | JSON shape of every response                                                    |
| `app/Policies/`                                           | Who may do what (tasks, comments, exports, chunked uploads)                     |
| `app/Jobs/`                                               | Virus scan, thumbnail, video processing, export and bulk status jobs            |
| `app/Notifications/TaskAssigned.php`                      | Queued assignment email                                                         |
| `app/Events/`                                             | Broadcast events (`tasks.changed`, `comment.posted`, `comment.deleted`)         |
| `app/Actions/`                                            | Storing an attachment version; assembling a chunked upload                      |
| `app/Services/EicarVirusScanner.php`                      | The simulated virus scanner (behind `app/Contracts/VirusScanner.php`)           |
| `app/Services/VideoTranscoder.php`, `VideoRenditions.php` | ffmpeg calls for HLS streams and poster frames; which quality levels to build   |
| `config/attachments.php`                                  | Allowed file types, size limits, chunk size, video quality levels, ffmpeg paths |
| `config/exports.php`                                      | Export storage, PDF row limit, retention                                        |
| `database/schema.sql`, `database/dump.sql`                | Generated SQL schema, and schema plus sample data                               |

## Useful commands

| Command                             | Does                                                             |
| ----------------------------------- | ---------------------------------------------------------------- |
| `php artisan queue:work`            | Run background jobs (if not using `composer dev`)                |
| `php artisan reverb:start`          | Run the WebSocket server                                         |
| `php artisan model:prune`           | Delete expired chunked uploads and old exports (scheduled daily) |
| `php artisan migrate:fresh --seed`  | Reset the database to the sample data                            |
| `php artisan route:list --path=api` | List every endpoint                                              |
