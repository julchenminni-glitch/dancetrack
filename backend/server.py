from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ============ Config ============
JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]
ACCESS_TOKEN_MIN = 60 * 24 * 30  # 30 days for mobile

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="DanceTrack API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============ Helpers ============
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MIN),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def require_workspace_access(workspace_id: str, user: dict) -> dict:
    ws = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if user["id"] not in ws.get("members", []):
        raise HTTPException(status_code=403, detail="Access denied")
    return ws

# ============ Models ============
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordReset(BaseModel):
    email: EmailStr
    new_password: str

class AuthResponse(BaseModel):
    access_token: str
    user: Dict[str, Any]

class WorkspaceCreate(BaseModel):
    name: str
    trainerName: str

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    trainerName: Optional[str] = None
    phaseNames: Optional[Dict[str, str]] = None

class GroupCreate(BaseModel):
    name: str
    weekday: str
    time: str
    color: str
    rewardSystemEnabled: bool = True

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    weekday: Optional[str] = None
    time: Optional[str] = None
    color: Optional[str] = None
    rewardSystemEnabled: Optional[bool] = None

class StudentCreate(BaseModel):
    groupId: str
    name: str
    birthday: Optional[str] = ""
    photoUrl: Optional[str] = ""
    phone: Optional[str] = ""
    isRegistered: bool = False

class StudentUpdate(BaseModel):
    groupId: Optional[str] = None
    name: Optional[str] = None
    birthday: Optional[str] = None
    photoUrl: Optional[str] = None
    phone: Optional[str] = None
    isRegistered: Optional[bool] = None
    level: Optional[int] = None

class AttendanceSave(BaseModel):
    groupId: str
    type: str  # Training / Performance / Event
    date: str
    attendance: Dict[str, str]  # studentId -> status
    duration: float = 1.0

class LessonCreate(BaseModel):
    groupId: str
    date: str
    notes: Optional[str] = ""
    choreography: Optional[str] = ""
    music: Optional[str] = ""
    exercises: Optional[str] = ""
    status: str = "Planned"
    checklist: List[str] = []

class LessonUpdate(BaseModel):
    notes: Optional[str] = None
    choreography: Optional[str] = None
    music: Optional[str] = None
    exercises: Optional[str] = None
    status: Optional[str] = None
    checklist: Optional[List[str]] = None

class TrainerSessionCreate(BaseModel):
    groupId: Optional[str] = None
    date: str
    duration: float
    notes: Optional[str] = ""
    isPaid: bool = False

class TrainerSessionUpdate(BaseModel):
    duration: Optional[float] = None
    notes: Optional[str] = None
    isPaid: Optional[bool] = None

class RewardLevelCreate(BaseModel):
    name: str
    emoji: str
    threshold: int
    phase: Optional[str] = ""

class RewardLevelUpdate(BaseModel):
    name: Optional[str] = None
    emoji: Optional[str] = None
    threshold: Optional[int] = None
    phase: Optional[str] = None

DEFAULT_REWARD_LEVELS = [
    {"name": "Samen", "emoji": "🌱", "threshold": 0, "phase": "Knospenphase"},
    {"name": "Spross", "emoji": "🌿", "threshold": 5, "phase": "Knospenphase"},
    {"name": "Mini Blatt", "emoji": "🍃", "threshold": 10, "phase": "Knospenphase"},
    {"name": "Kleeblatt", "emoji": "🍀", "threshold": 15, "phase": "Blütenphase"},
    {"name": "Knospe", "emoji": "🌱", "threshold": 20, "phase": "Blütenphase"},
    {"name": "Blüte", "emoji": "🌼", "threshold": 25, "phase": "Blütenphase"},
    {"name": "Blume", "emoji": "🌻", "threshold": 30, "phase": "Blütenphase"},
    {"name": "Biene", "emoji": "🐝", "threshold": 35, "phase": "Glückstierchenphase"},
    {"name": "Marienkäfer", "emoji": "🐞", "threshold": 40, "phase": "Glückstierchenphase"},
    {"name": "Raupe", "emoji": "🐛", "threshold": 45, "phase": "Glückstierchenphase"},
    {"name": "Schmetterling", "emoji": "🦋", "threshold": 50, "phase": "Glückstierchenphase"},
]

# ============ Auth Routes ============
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(body: UserRegister):
    email = body.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": email,
        "name": body.name or email.split("@")[0],
        "password_hash": hash_password(body.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    return {"access_token": token, "user": {"id": user_id, "email": email, "name": doc["name"]}}

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(body: UserLogin):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email)
    return {
        "access_token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user.get("name", "")},
    }

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/reset-password")
async def reset_password(body: PasswordReset):
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Passwort muss mindestens 6 Zeichen lang sein")
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        # Don't leak existence – but we DO need to confirm to user.
        # For a personal-use app we surface the result.
        raise HTTPException(status_code=404, detail="Keine Konto mit dieser E-Mail gefunden")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    return {"ok": True}

# ============ Workspace Routes ============
@api_router.get("/workspaces")
async def list_workspaces(user: dict = Depends(get_current_user)):
    items = await db.workspaces.find({"members": user["id"]}, {"_id": 0}).to_list(1000)
    return items

@api_router.post("/workspaces")
async def create_workspace(body: WorkspaceCreate, user: dict = Depends(get_current_user)):
    ws_id = str(uuid.uuid4())
    doc = {
        "id": ws_id,
        "name": body.name,
        "trainerName": body.trainerName,
        "ownerId": user["id"],
        "members": [user["id"]],
        "createdAt": now_iso(),
        "phaseNames": {"knospe": "Knospenphase", "bluete": "Blütenphase", "glueck": "Glückstierchenphase"},
    }
    await db.workspaces.insert_one(dict(doc))
    # seed default reward levels
    for level in DEFAULT_REWARD_LEVELS:
        await db.reward_levels.insert_one({
            "id": str(uuid.uuid4()),
            "workspaceId": ws_id,
            "isDefault": True,
            **level,
        })
    return doc

@api_router.patch("/workspaces/{ws_id}")
async def update_workspace(ws_id: str, body: WorkspaceUpdate, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    upd = {k: v for k, v in body.dict(exclude_none=True).items()}
    # If phaseNames are being updated, sync existing reward_levels' phase strings
    if upd.get("phaseNames"):
        old_ws = await db.workspaces.find_one({"id": ws_id}, {"_id": 0}) or {}
        old_phases = old_ws.get("phaseNames") or {}
        new_phases = upd["phaseNames"]
        # Build mapping old_value -> new_value for keys whose value changed
        renames = {}
        for k in ("knospe", "bluete", "glueck"):
            old_v = old_phases.get(k)
            new_v = new_phases.get(k)
            if old_v and new_v and old_v != new_v:
                renames[old_v] = new_v
        for old_v, new_v in renames.items():
            await db.reward_levels.update_many(
                {"workspaceId": ws_id, "phase": old_v},
                {"$set": {"phase": new_v}},
            )
    if upd:
        await db.workspaces.update_one({"id": ws_id}, {"$set": upd})
    ws = await db.workspaces.find_one({"id": ws_id}, {"_id": 0})
    return ws

@api_router.delete("/workspaces/{ws_id}")
async def delete_workspace(ws_id: str, user: dict = Depends(get_current_user)):
    ws = await require_workspace_access(ws_id, user)
    if ws["ownerId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only owner can delete")
    await db.workspaces.delete_one({"id": ws_id})
    for coll in ["groups", "students", "events", "attendance", "lessons", "trainer_sessions", "reward_levels"]:
        await db[coll].delete_many({"workspaceId": ws_id})
    return {"ok": True}

# ============ Groups ============
@api_router.get("/workspaces/{ws_id}/groups")
async def list_groups(ws_id: str, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    return await db.groups.find({"workspaceId": ws_id}, {"_id": 0}).to_list(1000)

@api_router.post("/workspaces/{ws_id}/groups")
async def create_group(ws_id: str, body: GroupCreate, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    doc = {"id": str(uuid.uuid4()), "workspaceId": ws_id, **body.dict()}
    await db.groups.insert_one(dict(doc))
    return doc

@api_router.patch("/workspaces/{ws_id}/groups/{group_id}")
async def update_group(ws_id: str, group_id: str, body: GroupUpdate, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    upd = body.dict(exclude_none=True)
    if upd:
        await db.groups.update_one({"id": group_id, "workspaceId": ws_id}, {"$set": upd})
    return await db.groups.find_one({"id": group_id}, {"_id": 0})

@api_router.delete("/workspaces/{ws_id}/groups/{group_id}")
async def delete_group(ws_id: str, group_id: str, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    await db.groups.delete_one({"id": group_id, "workspaceId": ws_id})
    # Cascade: delete students in this group + their events/attendance
    students = await db.students.find({"workspaceId": ws_id, "groupId": group_id}).to_list(10000)
    student_ids = [s["id"] for s in students]
    await db.students.delete_many({"workspaceId": ws_id, "groupId": group_id})
    events = await db.events.find({"workspaceId": ws_id, "groupId": group_id}).to_list(10000)
    event_ids = [e["id"] for e in events]
    await db.events.delete_many({"workspaceId": ws_id, "groupId": group_id})
    await db.attendance.delete_many({"eventId": {"$in": event_ids}})
    await db.attendance.delete_many({"studentId": {"$in": student_ids}})
    await db.lessons.delete_many({"workspaceId": ws_id, "groupId": group_id})
    await db.trainer_sessions.delete_many({"workspaceId": ws_id, "groupId": group_id})
    return {"ok": True}

# ============ Students ============
@api_router.get("/workspaces/{ws_id}/students")
async def list_students(ws_id: str, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    return await db.students.find({"workspaceId": ws_id}, {"_id": 0}).to_list(5000)

@api_router.post("/workspaces/{ws_id}/students")
async def create_student(ws_id: str, body: StudentCreate, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    doc = {
        "id": str(uuid.uuid4()),
        "workspaceId": ws_id,
        "level": 0,
        "createdAt": now_iso(),
        **body.dict(),
    }
    await db.students.insert_one(dict(doc))
    return doc

@api_router.patch("/workspaces/{ws_id}/students/{student_id}")
async def update_student(ws_id: str, student_id: str, body: StudentUpdate, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    upd = body.dict(exclude_none=True)
    if upd:
        await db.students.update_one({"id": student_id, "workspaceId": ws_id}, {"$set": upd})
    return await db.students.find_one({"id": student_id}, {"_id": 0})

@api_router.delete("/workspaces/{ws_id}/students/{student_id}")
async def delete_student(ws_id: str, student_id: str, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    await db.students.delete_one({"id": student_id, "workspaceId": ws_id})
    await db.attendance.delete_many({"studentId": student_id})
    return {"ok": True}

# ============ Events + Attendance ============
@api_router.get("/workspaces/{ws_id}/events")
async def list_events(ws_id: str, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    return await db.events.find({"workspaceId": ws_id}, {"_id": 0}).to_list(5000)

@api_router.get("/workspaces/{ws_id}/attendance")
async def list_attendance(ws_id: str, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    return await db.attendance.find({"workspaceId": ws_id}, {"_id": 0}).to_list(20000)

@api_router.post("/workspaces/{ws_id}/attendance")
async def save_attendance(ws_id: str, body: AttendanceSave, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    event_id = str(uuid.uuid4())
    session_id = str(uuid.uuid4())
    event_doc = {
        "id": event_id,
        "workspaceId": ws_id,
        "groupId": body.groupId,
        "type": body.type,
        "date": body.date,
        "trainerSessionId": session_id,
    }
    await db.events.insert_one(dict(event_doc))
    records = []
    for student_id, status in body.attendance.items():
        records.append({
            "id": str(uuid.uuid4()),
            "workspaceId": ws_id,
            "eventId": event_id,
            "studentId": student_id,
            "status": status,
            "date": body.date,
        })
    if records:
        await db.attendance.insert_many([dict(r) for r in records])
    # Update student levels if Training
    level_ups = []
    if body.type == "Training":
        levels = await db.reward_levels.find({"workspaceId": ws_id}).sort("threshold", -1).to_list(100)
        for student_id, status in body.attendance.items():
            if status != "Present":
                continue
            student = await db.students.find_one({"id": student_id})
            if not student:
                continue
            old_count = student.get("level", 0)
            new_count = old_count + 1
            await db.students.update_one({"id": student_id}, {"$set": {"level": new_count}})
            old_lvl = next((l for l in levels if l["threshold"] <= old_count), None)
            new_lvl = next((l for l in levels if l["threshold"] <= new_count), None)
            if new_lvl and (not old_lvl or new_lvl["id"] != old_lvl["id"]):
                level_ups.append({
                    "studentId": student_id,
                    "studentName": student["name"],
                    "level": {"name": new_lvl["name"], "emoji": new_lvl["emoji"]},
                })
    # Create trainer session
    await db.trainer_sessions.insert_one({
        "id": session_id,
        "workspaceId": ws_id,
        "groupId": body.groupId,
        "date": body.date,
        "duration": body.duration,
        "notes": "",
        "isPaid": False,
        "eventId": event_id,
    })
    return {"event": event_doc, "levelUps": level_ups}

@api_router.delete("/workspaces/{ws_id}/events/{event_id}")
async def delete_event(ws_id: str, event_id: str, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    await db.events.delete_one({"id": event_id, "workspaceId": ws_id})
    await db.attendance.delete_many({"eventId": event_id})
    await db.trainer_sessions.delete_many({"eventId": event_id})
    return {"ok": True}

# ============ Lessons ============
@api_router.get("/workspaces/{ws_id}/lessons")
async def list_lessons(ws_id: str, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    return await db.lessons.find({"workspaceId": ws_id}, {"_id": 0}).to_list(5000)

@api_router.post("/workspaces/{ws_id}/lessons")
async def create_lesson(ws_id: str, body: LessonCreate, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    doc = {"id": str(uuid.uuid4()), "workspaceId": ws_id, **body.dict()}
    await db.lessons.insert_one(dict(doc))
    return doc

@api_router.patch("/workspaces/{ws_id}/lessons/{lesson_id}")
async def update_lesson(ws_id: str, lesson_id: str, body: LessonUpdate, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    upd = body.dict(exclude_none=True)
    if upd:
        await db.lessons.update_one({"id": lesson_id, "workspaceId": ws_id}, {"$set": upd})
    return await db.lessons.find_one({"id": lesson_id}, {"_id": 0})

@api_router.delete("/workspaces/{ws_id}/lessons/{lesson_id}")
async def delete_lesson(ws_id: str, lesson_id: str, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    await db.lessons.delete_one({"id": lesson_id, "workspaceId": ws_id})
    return {"ok": True}

# ============ Trainer Sessions ============
@api_router.get("/workspaces/{ws_id}/trainer-sessions")
async def list_sessions(ws_id: str, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    return await db.trainer_sessions.find({"workspaceId": ws_id}, {"_id": 0}).to_list(5000)

@api_router.post("/workspaces/{ws_id}/trainer-sessions")
async def create_session(ws_id: str, body: TrainerSessionCreate, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    doc = {"id": str(uuid.uuid4()), "workspaceId": ws_id, **body.dict()}
    await db.trainer_sessions.insert_one(dict(doc))
    return doc

@api_router.patch("/workspaces/{ws_id}/trainer-sessions/{session_id}")
async def update_session(ws_id: str, session_id: str, body: TrainerSessionUpdate, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    upd = body.dict(exclude_none=True)
    if upd:
        await db.trainer_sessions.update_one({"id": session_id, "workspaceId": ws_id}, {"$set": upd})
    return await db.trainer_sessions.find_one({"id": session_id}, {"_id": 0})

@api_router.delete("/workspaces/{ws_id}/trainer-sessions/{session_id}")
async def delete_session(ws_id: str, session_id: str, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    await db.trainer_sessions.delete_one({"id": session_id, "workspaceId": ws_id})
    return {"ok": True}

# ============ Reward Levels ============
@api_router.get("/workspaces/{ws_id}/reward-levels")
async def list_levels(ws_id: str, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    return await db.reward_levels.find({"workspaceId": ws_id}, {"_id": 0}).to_list(200)

@api_router.post("/workspaces/{ws_id}/reward-levels")
async def create_level(ws_id: str, body: RewardLevelCreate, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    doc = {"id": str(uuid.uuid4()), "workspaceId": ws_id, "isDefault": False, **body.dict()}
    await db.reward_levels.insert_one(dict(doc))
    return doc

@api_router.delete("/workspaces/{ws_id}/reward-levels/{level_id}")
async def delete_level(ws_id: str, level_id: str, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    lvl = await db.reward_levels.find_one({"id": level_id, "workspaceId": ws_id})
    if lvl and lvl.get("isDefault"):
        raise HTTPException(status_code=400, detail="Cannot delete default level")
    await db.reward_levels.delete_one({"id": level_id, "workspaceId": ws_id})
    return {"ok": True}

@api_router.patch("/workspaces/{ws_id}/reward-levels/{level_id}")
async def update_level(ws_id: str, level_id: str, body: RewardLevelUpdate, user: dict = Depends(get_current_user)):
    await require_workspace_access(ws_id, user)
    lvl = await db.reward_levels.find_one({"id": level_id, "workspaceId": ws_id})
    if not lvl:
        raise HTTPException(status_code=404, detail="Level not found")
    upd = {k: v for k, v in body.dict(exclude_none=True).items()}
    if upd:
        await db.reward_levels.update_one({"id": level_id, "workspaceId": ws_id}, {"$set": upd})
    new_lvl = await db.reward_levels.find_one({"id": level_id, "workspaceId": ws_id}, {"_id": 0})
    return new_lvl

# ============ Health ============
@api_router.get("/")
async def root():
    return {"message": "DanceTrack API"}

# ============ Startup ============
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.workspaces.create_index("members")
    await db.groups.create_index("workspaceId")
    await db.students.create_index([("workspaceId", 1), ("groupId", 1)])
    await db.events.create_index("workspaceId")
    await db.attendance.create_index("workspaceId")
    # Seed demo user
    demo_email = "demo@dancetrack.app"
    existing = await db.users.find_one({"email": demo_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": demo_email,
            "name": "Demo Trainer",
            "password_hash": hash_password("demo12345"),
            "created_at": now_iso(),
        })

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()
