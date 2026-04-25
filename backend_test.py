"""
Backend tests for DanceTrack reward-level PATCH endpoint and phase auto-rename.
"""
import requests
import sys
import json
from copy import deepcopy

BASE = "https://dancer-hub-4.preview.emergentagent.com/api"
EMAIL = "demo@dancetrack.app"
PASSWORD = "demo12345"

results = []

def log(name, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name}{(' - ' + detail) if detail else ''}")
    results.append((name, ok, detail))


def main():
    # 1. Login
    r = requests.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=20)
    if r.status_code != 200:
        log("Login", False, f"status={r.status_code} body={r.text}")
        return
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    log("Login demo user", True, f"token len={len(token)}")

    # 2. List workspaces
    r = requests.get(f"{BASE}/workspaces", headers=headers, timeout=20)
    if r.status_code != 200 or not r.json():
        # Create one if none exist
        r = requests.post(f"{BASE}/workspaces", headers=headers,
                          json={"name": "Test Studio", "trainerName": "Demo Trainer"}, timeout=20)
        if r.status_code != 200:
            log("List/Create workspace", False, f"status={r.status_code} body={r.text}")
            return
        ws = r.json()
    else:
        ws = r.json()[0]
    ws_id = ws["id"]
    log("Get workspace", True, f"ws_id={ws_id}, phaseNames={ws.get('phaseNames')}")

    original_phase_names = deepcopy(ws.get("phaseNames", {}))

    # 3. Get reward levels
    r = requests.get(f"{BASE}/workspaces/{ws_id}/reward-levels", headers=headers, timeout=20)
    if r.status_code != 200:
        log("List reward-levels", False, f"status={r.status_code} body={r.text}")
        return
    levels = r.json()
    log("List reward-levels", True, f"count={len(levels)}")

    default_levels = [l for l in levels if l.get("isDefault")]
    non_default_levels = [l for l in levels if not l.get("isDefault")]

    # If no non-default level exists, create one for testing
    created_for_test = None
    if not non_default_levels:
        r = requests.post(f"{BASE}/workspaces/{ws_id}/reward-levels", headers=headers,
                          json={"name": "TestLevelOriginal", "emoji": "⭐", "threshold": 100,
                                "phase": original_phase_names.get("glueck", "Glückstierchenphase")},
                          timeout=20)
        if r.status_code != 200:
            log("Create non-default level (setup)", False, f"status={r.status_code} body={r.text}")
            return
        created_for_test = r.json()
        non_default_levels = [created_for_test]
        log("Create non-default level (setup)", True, f"id={created_for_test['id']}")

    non_default = non_default_levels[0]
    a_default = default_levels[0] if default_levels else None

    # === TEST 1: PATCH non-default level (name, emoji, threshold, phase) ===
    payload = {
        "name": "Tänzer-Star",
        "emoji": "⭐",
        "threshold": 99,
        "phase": original_phase_names.get("glueck", "Glückstierchenphase"),
    }
    r = requests.patch(f"{BASE}/workspaces/{ws_id}/reward-levels/{non_default['id']}",
                       headers=headers, json=payload, timeout=20)
    ok = (r.status_code == 200 and r.json().get("name") == "Tänzer-Star"
          and r.json().get("emoji") == "⭐" and r.json().get("threshold") == 99)
    log("PATCH non-default level updates fields", ok,
        f"status={r.status_code} resp={r.text[:200]}")

    # === TEST 2: PATCH a default level (defaults SHOULD be editable) ===
    if a_default:
        original_default_name = a_default["name"]
        original_default_emoji = a_default["emoji"]
        original_default_thresh = a_default["threshold"]
        original_default_phase = a_default.get("phase", "")
        new_name = original_default_name + "_edited"
        r = requests.patch(f"{BASE}/workspaces/{ws_id}/reward-levels/{a_default['id']}",
                           headers=headers, json={"name": new_name}, timeout=20)
        ok = r.status_code == 200 and r.json().get("name") == new_name and r.json().get("isDefault") is True
        log("PATCH default level (editable)", ok, f"status={r.status_code} resp={r.text[:200]}")

        # restore default name
        requests.patch(f"{BASE}/workspaces/{ws_id}/reward-levels/{a_default['id']}",
                       headers=headers,
                       json={"name": original_default_name,
                             "emoji": original_default_emoji,
                             "threshold": original_default_thresh,
                             "phase": original_default_phase},
                       timeout=20)
    else:
        log("PATCH default level (editable)", False, "No default level present")

    # === TEST 3: PATCH non-existent level_id -> 404 ===
    r = requests.patch(f"{BASE}/workspaces/{ws_id}/reward-levels/does-not-exist-uuid",
                       headers=headers, json={"name": "x"}, timeout=20)
    log("PATCH non-existent level returns 404", r.status_code == 404,
        f"status={r.status_code} body={r.text[:200]}")

    # === TEST 4: PATCH without auth -> 401 ===
    r = requests.patch(f"{BASE}/workspaces/{ws_id}/reward-levels/{non_default['id']}",
                       json={"name": "x"}, timeout=20)
    log("PATCH without auth returns 401", r.status_code == 401,
        f"status={r.status_code} body={r.text[:200]}")

    # === TEST 5: PATCH with empty body -> still 200 returning level ===
    r = requests.patch(f"{BASE}/workspaces/{ws_id}/reward-levels/{non_default['id']}",
                       headers=headers, json={}, timeout=20)
    ok = r.status_code == 200 and r.json().get("id") == non_default["id"]
    log("PATCH empty body returns 200 with level", ok,
        f"status={r.status_code} body={r.text[:200]}")

    # === TEST 6: Phase auto-rename in reward_levels ===
    # Re-fetch ws to get exact current phase names
    r = requests.get(f"{BASE}/workspaces", headers=headers, timeout=20)
    current_ws = next((w for w in r.json() if w["id"] == ws_id), None)
    current_phases = current_ws.get("phaseNames", {})
    old_knospe_value = current_phases.get("knospe", "Knospenphase")
    bluete_value = current_phases.get("bluete", "Blütenphase")
    glueck_value = current_phases.get("glueck", "Glückstierchenphase")

    # Levels prior with phase = old knospe
    r = requests.get(f"{BASE}/workspaces/{ws_id}/reward-levels", headers=headers, timeout=20)
    levels_before = r.json()
    knospe_before_ids = {l["id"] for l in levels_before if l.get("phase") == old_knospe_value}
    bluete_before = {l["id"]: l.get("phase") for l in levels_before if l.get("phase") == bluete_value}
    glueck_before = {l["id"]: l.get("phase") for l in levels_before if l.get("phase") == glueck_value}
    log("Capture pre-rename levels", True,
        f"knospe={len(knospe_before_ids)} bluete={len(bluete_before)} glueck={len(glueck_before)}")

    # PATCH workspace phaseNames
    new_knospe = "TestPhase1"
    r = requests.patch(f"{BASE}/workspaces/{ws_id}", headers=headers,
                       json={"phaseNames": {"knospe": new_knospe,
                                            "bluete": bluete_value,
                                            "glueck": glueck_value}}, timeout=20)
    ok = r.status_code == 200 and r.json().get("phaseNames", {}).get("knospe") == new_knospe
    log("PATCH workspace phaseNames", ok, f"status={r.status_code} body={r.text[:200]}")

    # Re-fetch reward levels
    r = requests.get(f"{BASE}/workspaces/{ws_id}/reward-levels", headers=headers, timeout=20)
    levels_after = r.json()
    after_by_id = {l["id"]: l for l in levels_after}

    # Verify all previously-knospe levels now have phase = TestPhase1
    renamed_ok = all(after_by_id[lid].get("phase") == new_knospe for lid in knospe_before_ids)
    log("All old-knospe levels renamed to TestPhase1", renamed_ok,
        f"checked={len(knospe_before_ids)} sample={[after_by_id[lid].get('phase') for lid in list(knospe_before_ids)[:3]]}")

    # Verify bluete/glueck levels unchanged
    bluete_unchanged = all(after_by_id[lid].get("phase") == bluete_value for lid in bluete_before)
    glueck_unchanged = all(after_by_id[lid].get("phase") == glueck_value for lid in glueck_before)
    log("Bluete levels unchanged", bluete_unchanged)
    log("Glueck levels unchanged", glueck_unchanged)

    # Cleanup: restore original phaseNames (rename TestPhase1 -> old_knospe_value)
    r = requests.patch(f"{BASE}/workspaces/{ws_id}", headers=headers,
                       json={"phaseNames": {"knospe": old_knospe_value,
                                            "bluete": bluete_value,
                                            "glueck": glueck_value}}, timeout=20)
    ok = r.status_code == 200 and r.json().get("phaseNames", {}).get("knospe") == old_knospe_value
    log("Restore original phaseNames (cleanup)", ok, f"status={r.status_code}")

    # Verify levels restored
    r = requests.get(f"{BASE}/workspaces/{ws_id}/reward-levels", headers=headers, timeout=20)
    levels_restored = r.json()
    restored_by_id = {l["id"]: l for l in levels_restored}
    restored_ok = all(restored_by_id[lid].get("phase") == old_knospe_value for lid in knospe_before_ids)
    log("Levels restored to original knospe phase", restored_ok)

    # === TEST 7: Regression - POST create + DELETE non-default + DELETE default 400 ===
    r = requests.post(f"{BASE}/workspaces/{ws_id}/reward-levels", headers=headers,
                      json={"name": "RegressionLevel", "emoji": "🎯", "threshold": 200,
                            "phase": glueck_value}, timeout=20)
    ok = r.status_code == 200 and r.json().get("isDefault") is False
    new_level_id = r.json().get("id") if r.status_code == 200 else None
    log("POST create reward-level (regression)", ok, f"status={r.status_code}")

    if new_level_id:
        r = requests.delete(f"{BASE}/workspaces/{ws_id}/reward-levels/{new_level_id}",
                            headers=headers, timeout=20)
        log("DELETE non-default reward-level (regression)", r.status_code == 200,
            f"status={r.status_code}")

    if a_default:
        r = requests.delete(f"{BASE}/workspaces/{ws_id}/reward-levels/{a_default['id']}",
                            headers=headers, timeout=20)
        log("DELETE default reward-level returns 400", r.status_code == 400,
            f"status={r.status_code} body={r.text[:200]}")

    # Cleanup created_for_test if we created it
    if created_for_test:
        requests.delete(f"{BASE}/workspaces/{ws_id}/reward-levels/{created_for_test['id']}",
                        headers=headers, timeout=20)

    # ==== summary ====
    print()
    print("=" * 60)
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"RESULTS: {passed}/{total} passed")
    failed = [(n, d) for n, ok, d in results if not ok]
    if failed:
        print("\nFAILED:")
        for name, detail in failed:
            print(f"  - {name}: {detail}")
    return failed


if __name__ == "__main__":
    failed = main()
    sys.exit(1 if failed else 0)
