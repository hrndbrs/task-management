# Setup Guide

How to run the whole platform locally: the Laravel API, its queue worker and WebSocket server, and the Next.js frontend.

## 1. Prerequisites

| Tool     | Version                                                                                   | Check              |
| -------- | ----------------------------------------------------------------------------------------- | ------------------ |
| PHP      | 8.3 or newer, with the `pdo_mysql`, `gd`, `mbstring`, `fileinfo` and `openssl` extensions | `php -v`, `php -m` |
| Composer | 2.x                                                                                       | `composer -V`      |
| Node.js  | 20.9 or newer                                                                             | `node -v`          |
| MySQL    | 8.0 or newer                                                                              | `mysql --version`  |

**PHP upload limits.** PHP's defaults (`upload_max_filesize = 2M`, `post_max_size = 8M`) are too small: they reject normal uploads and the 5 MB chunks used for large files. Find your `php.ini` with `php --ini` and set:

```ini
upload_max_filesize = 50M
post_max_size = 50M
```

Check with `php -r 'echo ini_get("upload_max_filesize"), " ", ini_get("post_max_size"), PHP_EOL;'`. It should print `50M 50M`.

No MySQL installed? Docker works:

```bash
docker run -d --name mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=secret mysql:8
```

## 2. Backend (Laravel API)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan jwt:secret --force
```

Open `backend/.env` and set:

**Database.** Point it at your MySQL:

```ini
DB_DATABASE=transcosmos
DB_USERNAME=root
DB_PASSWORD=secret
```

**Reverb (WebSockets).** The three values can be any strings, but the key must match the frontend's later. Generate them with:

```bash
echo "REVERB_APP_ID=$(openssl rand -hex 4)"
echo "REVERB_APP_KEY=$(openssl rand -hex 16)"
echo "REVERB_APP_SECRET=$(openssl rand -hex 16)"
```

and paste the output into `.env`, replacing the empty `REVERB_APP_ID=`, `REVERB_APP_KEY=` and `REVERB_APP_SECRET=` lines.

Create the database and load the schema with sample data:

```bash
mysql -u root -p -e "CREATE DATABASE transcosmos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
php artisan migrate --seed
```

(Alternatively, import `backend/database/dump.sql` instead of running `migrate --seed`. See [database-schema.md](database-schema.md).)

Start everything the backend needs:

```bash
composer dev
```

This runs four processes together:

| Process          | Command                    | Address                                                        |
| ---------------- | -------------------------- | -------------------------------------------------------------- |
| API              | `php artisan serve`        | http://localhost:8000                                          |
| Queue worker     | `php artisan queue:listen` | Runs thumbnails, virus scans, emails, exports and bulk updates |
| WebSocket server | `php artisan reverb:start` | ws://localhost:8081                                            |
| Log viewer       | `php artisan pail`         | Prints the application log                                     |

Check it's up: `curl http://localhost:8000/up` returns 200.

> Without the queue worker, uploads stay "Scanning for viruses…" forever and no emails, exports or bulk updates happen. Without Reverb, the app works but nothing updates live.

## 3. Frontend (Next.js)

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env.local
```

Set `NEXT_PUBLIC_REVERB_APP_KEY` in `frontend/.env.local` to the **same value** as `REVERB_APP_KEY` in `backend/.env`. The other defaults match the backend above:

| Variable                     | Default                     | Meaning                                                    |
| ---------------------------- | --------------------------- | ---------------------------------------------------------- |
| `API_URL`                    | `http://localhost:8000/api` | Where the Next.js server calls the API. Server-side only.  |
| `NEXT_PUBLIC_REVERB_APP_KEY` | _(empty)_                   | Reverb app key. Leave empty to turn off real-time updates. |
| `NEXT_PUBLIC_REVERB_HOST`    | `localhost`                 | WebSocket host, as the **browser** sees it                 |
| `NEXT_PUBLIC_REVERB_PORT`    | `8081`                      | WebSocket port                                             |
| `NEXT_PUBLIC_REVERB_SCHEME`  | `http`                      | `https` makes the browser use `wss://`                     |

Start it:

```bash
npm run dev
```

Open http://localhost:3000 and sign in:

| Email               | Password   | Role                                  |
| ------------------- | ---------- | ------------------------------------- |
| `admin@example.com` | `password` | Admin: can edit and delete everything |

The six seeded members also use the password `password`; their emails are random, so look them up in the `users` table.

## 4. Things to try

- **Real time:** open the same task in two browser windows. Post a comment in one; it appears in the other. Create or edit a task; the dashboard in the other window updates.
- **Uploads:** drag files onto the "Files" area of a task. Files over 45 MB are sent in 5 MB chunks with one continuous progress bar. Images get a thumbnail once the virus scan passes.
- **Virus scan:** upload a `.txt` file containing the [EICAR test string](https://www.eicar.org/download-anti-malware-testfile/). It is marked "Removed: failed virus scan" and can't be downloaded.
- **Exports:** filter the task list, then choose **Export → CSV** or **PDF**. The file is generated by the queue worker and downloads when ready.
- **Emails:** assign a task to another user. With `MAIL_MAILER=log` the email is written to `backend/storage/logs/laravel.log`.
- **API directly:** see [api-docs/README.md](api-docs/README.md).

## 5. Running the tests

**Backend** (Pest). The tests run against a separate MySQL database, `transcosmos_testing`, using the host, user and password from `backend/.env`. Create it once:

```bash
mysql -u root -p -e "CREATE DATABASE transcosmos_testing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
```

Then:

```bash
cd backend
php artisan test
```

The tests build the schema themselves and roll back every change, so the database stays empty. Never point them at your development database: they wipe it. The queue, mail and broadcasting are faked, so no other services need to be running.

**Frontend unit and integration tests** (Vitest):

```bash
cd frontend
npm test
```

**End-to-end tests** (Playwright). They drive a real browser against the running app, so the backend (`composer dev`) and a seeded database are required. Playwright starts the backend and frontend itself if they aren't already running.

```bash
cd frontend
npx playwright install chromium   # first time only
npm run test:e2e
```

They sign in as `admin@example.com` / `password`. Override with `E2E_EMAIL`, `E2E_PASSWORD` and `E2E_NAME` if you changed the seed. The tests create and delete their own tasks, but they do use your development database.

## 6. Troubleshooting

| Symptom                                       | Fix                                                                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Login fails with "Can't reach the server"     | The API isn't running on `API_URL`. Start `composer dev` and check `curl http://localhost:8000/up`.                                                                                        |
| Login fails with "Key cannot be empty"        | `JWT_SECRET` is missing. Run `php artisan jwt:secret --force`.                                                                                                                             |
| Uploads stay "Scanning for viruses…"          | The queue worker isn't running. `composer dev` starts it, or run `php artisan queue:work` on its own.                                                                                      |
| Nothing updates live                          | Reverb isn't running, or `NEXT_PUBLIC_REVERB_APP_KEY` doesn't match `REVERB_APP_KEY`. Restart `npm run dev` after changing `.env.local`, since `NEXT_PUBLIC_*` values are read at startup. |
| "This file is too large for the server" (413) | Raise `upload_max_filesize` and `post_max_size` (section 1), then restart `composer dev`.                                                                                                  |
| Downloading a seeded attachment fails         | Seeded attachments are database rows without real files. Upload your own files to test downloads.                                                                                          |
| `SQLSTATE[HY000] [2002] Connection refused`   | MySQL isn't running, or `DB_HOST` / `DB_PORT` are wrong.                                                                                                                                   |
