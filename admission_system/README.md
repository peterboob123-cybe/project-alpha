# The Master Skills Institute — Admission Form

## Included
- `static/index.html`: public admission form based on the supplied 2026 form image
- `static/styles.css`: responsive styling
- `static/app.js`: client-side validation and submission to the API
- `static/admin.html`, `static/admin.js`: password-protected admin interface and searchable records
- `main.py`: FastAPI backend and SQLite database (`admissions.db` is created automatically)

## Run locally (Windows)
1. Install Python 3.10 or newer.
2. Open a terminal in this folder.
3. Create and activate a virtual environment (optional but recommended):
   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
4. Install packages:
   ```powershell
   pip install -r requirements.txt
   ```
5. Set an admin password before starting the server:
   ```powershell
   $env:ADMIN_USERNAME="admin"
   $env:ADMIN_PASSWORD="Use-A-Strong-Unique-Password"
   ```
6. Start the server:
   ```powershell
   uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
7. Applicant form: http://127.0.0.1:8000
8. Admin panel: http://127.0.0.1:8000/admin

## Sharing the link
`127.0.0.1` / `localhost` works only on your own computer. To let people submit forms from anywhere, deploy this app to a hosting provider that supports Python/FastAPI and persistent storage, then share its public HTTPS URL. Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in the host's environment settings. Do not publish the default password.

SQLite is appropriate for a small pilot. For a high-traffic production service or multiple server instances, use PostgreSQL and persistent file/database storage. Back up `admissions.db` regularly. This starter stores application data, not uploaded CV files.

## Important
The browser JavaScript does not contain database credentials. It sends the form to the backend API, which writes to SQLite. This is necessary for applicants using different devices to share one database.
