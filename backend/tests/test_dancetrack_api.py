"""DanceTrack API pytest suite - auth, workspaces, groups, students, attendance, lessons, trainer-sessions, reward-levels."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://dancer-hub-4.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@dancetrack.app"
DEMO_PASS = "demo12345"


@pytest.fixture(scope="session")
def auth_token():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS}, timeout=20)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data and "user" in data
    return data["access_token"]


@pytest.fixture(scope="session")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def workspace(headers):
    payload = {"name": f"TEST_WS_{uuid.uuid4().hex[:6]}", "trainerName": "TEST Trainer"}
    r = requests.post(f"{API}/workspaces", json=payload, headers=headers, timeout=20)
    assert r.status_code == 200, r.text
    ws = r.json()
    assert ws["name"] == payload["name"]
    yield ws
    requests.delete(f"{API}/workspaces/{ws['id']}", headers=headers, timeout=20)


# ============ Health ============
def test_health_root():
    r = requests.get(f"{API}/", timeout=10)
    assert r.status_code == 200
    assert r.json().get("message") == "DanceTrack API"


# ============ Auth ============
def test_auth_me(headers):
    r = requests.get(f"{API}/auth/me", headers=headers, timeout=10)
    assert r.status_code == 200
    assert r.json()["email"] == DEMO_EMAIL


def test_auth_invalid_login():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"}, timeout=10)
    assert r.status_code == 401


def test_auth_unauthorized():
    r = requests.get(f"{API}/workspaces", timeout=10)
    assert r.status_code == 401


def test_auth_register_and_login():
    email = f"test_{uuid.uuid4().hex[:8]}@test.com"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pw123456", "name": "TEST"}, timeout=20)
    assert r.status_code == 200
    token = r.json()["access_token"]
    # duplicate
    r2 = requests.post(f"{API}/auth/register", json={"email": email, "password": "pw123456"}, timeout=20)
    assert r2.status_code == 400
    # login
    r3 = requests.post(f"{API}/auth/login", json={"email": email, "password": "pw123456"}, timeout=20)
    assert r3.status_code == 200
    assert token


# ============ Workspace ============
def test_workspace_list_and_seed_levels(headers, workspace):
    r = requests.get(f"{API}/workspaces", headers=headers, timeout=10)
    assert r.status_code == 200
    assert any(w["id"] == workspace["id"] for w in r.json())
    # verify seeded default reward levels (11)
    rl = requests.get(f"{API}/workspaces/{workspace['id']}/reward-levels", headers=headers, timeout=10)
    assert rl.status_code == 200
    levels = rl.json()
    assert len(levels) == 11, f"Expected 11 default levels, got {len(levels)}"
    assert all(l.get("isDefault") for l in levels)


def test_workspace_access_denied(headers):
    r = requests.get(f"{API}/workspaces/{uuid.uuid4()}/groups", headers=headers, timeout=10)
    assert r.status_code == 404  # workspace not found


# ============ Groups ============
@pytest.fixture(scope="session")
def group(headers, workspace):
    payload = {"name": "TEST_Ballet", "weekday": "Mon", "time": "18:00", "color": "#FFB6C1", "rewardSystemEnabled": True}
    r = requests.post(f"{API}/workspaces/{workspace['id']}/groups", json=payload, headers=headers, timeout=10)
    assert r.status_code == 200, r.text
    g = r.json()
    assert g["name"] == "TEST_Ballet"
    return g


def test_groups_list_and_update(headers, workspace, group):
    r = requests.get(f"{API}/workspaces/{workspace['id']}/groups", headers=headers, timeout=10)
    assert r.status_code == 200
    assert any(g["id"] == group["id"] for g in r.json())
    r2 = requests.patch(f"{API}/workspaces/{workspace['id']}/groups/{group['id']}",
                        json={"time": "19:00"}, headers=headers, timeout=10)
    assert r2.status_code == 200
    assert r2.json()["time"] == "19:00"


# ============ Students ============
@pytest.fixture(scope="session")
def student(headers, workspace, group):
    payload = {"groupId": group["id"], "name": "TEST_Anna", "birthday": "2010-05-01", "phone": "123"}
    r = requests.post(f"{API}/workspaces/{workspace['id']}/students", json=payload, headers=headers, timeout=10)
    assert r.status_code == 200, r.text
    s = r.json()
    assert s["level"] == 0
    return s


def test_students_list_update(headers, workspace, student):
    r = requests.get(f"{API}/workspaces/{workspace['id']}/students", headers=headers, timeout=10)
    assert r.status_code == 200
    assert any(s["id"] == student["id"] for s in r.json())
    r2 = requests.patch(f"{API}/workspaces/{workspace['id']}/students/{student['id']}",
                        json={"isRegistered": True}, headers=headers, timeout=10)
    assert r2.status_code == 200
    assert r2.json()["isRegistered"] is True


# ============ Attendance + LevelUp + TrainerSession ============
def test_attendance_training_creates_session_and_levelup(headers, workspace, group, student):
    payload = {
        "groupId": group["id"],
        "type": "Training",
        "date": "2026-01-15",
        "attendance": {student["id"]: "Present"},
        "duration": 1.5,
    }
    r = requests.post(f"{API}/workspaces/{workspace['id']}/attendance", json=payload, headers=headers, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "event" in data and "levelUps" in data
    # verify student level incremented
    sr = requests.get(f"{API}/workspaces/{workspace['id']}/students", headers=headers, timeout=10)
    s_now = next((s for s in sr.json() if s["id"] == student["id"]), None)
    assert s_now and s_now["level"] >= 1
    # verify trainer session auto-created
    ts = requests.get(f"{API}/workspaces/{workspace['id']}/trainer-sessions", headers=headers, timeout=10)
    assert ts.status_code == 200
    assert any(s["groupId"] == group["id"] and s["date"] == "2026-01-15" for s in ts.json())


# ============ Lessons ============
def test_lessons_crud(headers, workspace, group):
    payload = {"groupId": group["id"], "date": "2026-01-20", "choreography": "Waltz", "status": "Planned",
               "checklist": ["warmup", "stretch"]}
    r = requests.post(f"{API}/workspaces/{workspace['id']}/lessons", json=payload, headers=headers, timeout=10)
    assert r.status_code == 200
    lesson = r.json()
    r2 = requests.patch(f"{API}/workspaces/{workspace['id']}/lessons/{lesson['id']}",
                        json={"status": "Done"}, headers=headers, timeout=10)
    assert r2.status_code == 200 and r2.json()["status"] == "Done"
    r3 = requests.delete(f"{API}/workspaces/{workspace['id']}/lessons/{lesson['id']}", headers=headers, timeout=10)
    assert r3.status_code == 200


# ============ Trainer Sessions (manual) ============
def test_trainer_session_manual_and_paid(headers, workspace, group):
    payload = {"groupId": group["id"], "date": "2026-01-16", "duration": 2.0, "notes": "TEST manual"}
    r = requests.post(f"{API}/workspaces/{workspace['id']}/trainer-sessions", json=payload, headers=headers, timeout=10)
    assert r.status_code == 200
    sess = r.json()
    assert sess["isPaid"] is False
    r2 = requests.patch(f"{API}/workspaces/{workspace['id']}/trainer-sessions/{sess['id']}",
                        json={"isPaid": True}, headers=headers, timeout=10)
    assert r2.status_code == 200 and r2.json()["isPaid"] is True


# ============ Reward Levels (custom + default protection) ============
def test_reward_level_custom_create_and_default_protected(headers, workspace):
    r = requests.post(f"{API}/workspaces/{workspace['id']}/reward-levels",
                      json={"name": "TEST_Star", "emoji": "⭐", "threshold": 60, "phase": "custom"},
                      headers=headers, timeout=10)
    assert r.status_code == 200
    lvl = r.json()
    assert lvl["isDefault"] is False
    # delete custom ok
    r2 = requests.delete(f"{API}/workspaces/{workspace['id']}/reward-levels/{lvl['id']}", headers=headers, timeout=10)
    assert r2.status_code == 200
    # try to delete default
    lst = requests.get(f"{API}/workspaces/{workspace['id']}/reward-levels", headers=headers, timeout=10).json()
    default = next(l for l in lst if l.get("isDefault"))
    r3 = requests.delete(f"{API}/workspaces/{workspace['id']}/reward-levels/{default['id']}", headers=headers, timeout=10)
    assert r3.status_code == 400


# ============ Workspace phaseNames update (iteration 2) ============
def test_workspace_phase_names_update(headers, workspace):
    # initial defaults seeded
    ws0 = next(w for w in requests.get(f"{API}/workspaces", headers=headers, timeout=10).json() if w["id"] == workspace["id"])
    assert ws0.get("phaseNames", {}).get("knospe") == "Knospenphase"
    # update
    new_names = {"knospe": "TEST_Phase1", "bluete": "TEST_Phase2", "glueck": "TEST_Phase3"}
    r = requests.patch(f"{API}/workspaces/{workspace['id']}", json={"phaseNames": new_names}, headers=headers, timeout=10)
    assert r.status_code == 200, r.text
    assert r.json()["phaseNames"] == new_names
    # verify persisted via GET
    ws1 = next(w for w in requests.get(f"{API}/workspaces", headers=headers, timeout=10).json() if w["id"] == workspace["id"])
    assert ws1["phaseNames"] == new_names


# ============ Group cascade delete ============
def test_group_cascade_delete(headers, workspace):
    g = requests.post(f"{API}/workspaces/{workspace['id']}/groups",
                      json={"name": "TEST_Cascade", "weekday": "Tue", "time": "17:00", "color": "#fff"},
                      headers=headers, timeout=10).json()
    s = requests.post(f"{API}/workspaces/{workspace['id']}/students",
                      json={"groupId": g["id"], "name": "TEST_Cas"},
                      headers=headers, timeout=10).json()
    r = requests.delete(f"{API}/workspaces/{workspace['id']}/groups/{g['id']}", headers=headers, timeout=10)
    assert r.status_code == 200
    students = requests.get(f"{API}/workspaces/{workspace['id']}/students", headers=headers, timeout=10).json()
    assert not any(x["id"] == s["id"] for x in students)
