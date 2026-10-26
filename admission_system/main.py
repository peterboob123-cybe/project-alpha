from pathlib import Path
import os, sqlite3
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from passlib.context import CryptContext
import secrets
import hashlib

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "admissions.db"
STATIC_DIR = BASE_DIR / "static"
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "ChangeThisPassword123!")
TOKEN_SECRET = os.getenv("TOKEN_SECRET", "change-this-token-secret")

app = FastAPI(title="The Master Skills Institute - Admission System")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Token sessions are kept in memory; use a persistent session store for large production deployments.
sessions = set()

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with db() as conn:
        conn.execute("""
        CREATE TABLE IF NOT EXISTS admissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            father_name TEXT NOT NULL,
            dob_figure TEXT NOT NULL,
            dob_words TEXT,
            admission_date TEXT NOT NULL,
            qualification TEXT NOT NULL,
            father_occupation TEXT,
            student_id TEXT,
            address TEXT NOT NULL,
            student_mobile TEXT NOT NULL,
            guardian_mobile TEXT NOT NULL,
            course_3_months TEXT,
            course_6_months TEXT,
            declaration INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )
        """)
init_db()

class Admission(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    father_name: str = Field(min_length=2, max_length=150)
    dob_figure: str
    dob_words: Optional[str] = ""
    admission_date: str
    qualification: str
    father_occupation: Optional[str] = ""
    student_id: Optional[str] = ""
    address: str = Field(min_length=3, max_length=500)
    student_mobile: str = Field(min_length=7, max_length=30)
    guardian_mobile: str = Field(min_length=7, max_length=30)
    course_3_months: Optional[str] = ""
    course_6_months: Optional[str] = ""
    declaration: bool

class Login(BaseModel):
    username: str
    password: str

def require_admin(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Admin login required")
    token = authorization[7:]
    if token not in sessions:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    return True

@app.get("/")
def home():
    return FileResponse(STATIC_DIR / "index.html")

@app.get("/admin")
def admin_page():
    return FileResponse(STATIC_DIR / "admin.html")

@app.post("/api/admissions")
def create_admission(data: Admission):
    if not data.declaration:
        raise HTTPException(status_code=400, detail="Please accept the declaration.")
    if not data.course_3_months and not data.course_6_months:
        raise HTTPException(status_code=400, detail="Please select at least one course.")
    with db() as conn:
        cur = conn.execute("""
        INSERT INTO admissions
        (name, father_name, dob_figure, dob_words, admission_date, qualification,
         father_occupation, student_id, address, student_mobile, guardian_mobile,
         course_3_months, course_6_months, declaration, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.name.strip(), data.father_name.strip(), data.dob_figure, data.dob_words,
            data.admission_date, data.qualification, data.father_occupation, data.student_id,
            data.address.strip(), data.student_mobile, data.guardian_mobile,
            data.course_3_months, data.course_6_months, int(data.declaration),
            datetime.utcnow().isoformat(timespec="seconds") + "Z"
        ))
        new_id = cur.lastrowid
    return {"ok": True, "application_id": new_id, "message": "Admission form submitted successfully."}

@app.post("/api/admin/login")
def admin_login(data: Login):
    # Configure ADMIN_USERNAME and ADMIN_PASSWORD as environment variables before public deployment.
    if not secrets.compare_digest(data.username, ADMIN_USERNAME) or not secrets.compare_digest(data.password, ADMIN_PASSWORD):
        raise HTTPException(status_code=401, detail="Incorrect username or password.")
    token = secrets.token_urlsafe(32)
    sessions.add(token)
    return {"token": token, "message": "Login successful"}

@app.post("/api/admin/logout")
def admin_logout(authorization: Optional[str] = Header(default=None)):
    if authorization and authorization.startswith("Bearer "):
        sessions.discard(authorization[7:])
    return {"ok": True}

@app.get("/api/admin/admissions")
def list_admissions(_: bool = Depends(require_admin), q: str = ""):
    with db() as conn:
        if q.strip():
            term = f"%{q.strip()}%"
            rows = conn.execute("""
            SELECT * FROM admissions
            WHERE name LIKE ? OR father_name LIKE ? OR student_id LIKE ? OR student_mobile LIKE ?
            ORDER BY id DESC
            """, (term, term, term, term)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM admissions ORDER BY id DESC").fetchall()
        count = conn.execute("SELECT COUNT(*) FROM admissions").fetchone()[0]
    return {"total": count, "records": [dict(row) for row in rows]}

@app.get("/api/admin/admissions/{record_id}")
def get_admission(record_id: int, _: bool = Depends(require_admin)):
    with db() as conn:
        row = conn.execute("SELECT * FROM admissions WHERE id = ?", (record_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Record not found.")
    return dict(row)

@app.delete("/api/admin/admissions/{record_id}")
def delete_admission(record_id: int, _: bool = Depends(require_admin)):
    with db() as conn:
        cur = conn.execute("DELETE FROM admissions WHERE id = ?", (record_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Record not found.")
    return {"ok": True, "message": "Record deleted."}

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
