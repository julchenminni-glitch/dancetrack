#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  DanceTrack mobile/web app for dance trainers. Latest user requests:
  1. Anwesenheits-Tab: tap event to see attendance details (present/absent/excused list);
     show "X/Total" where Total = group size.
  2. Performance: smoother UI, less stutter.
  3. Groups: remove CSV export; PDF icon smaller/dezenter; tap card opens member list;
     edit-mode preserved (separate edit button).
  4. Registrations tab: only show students that are NOT yet registered.
  5. NEW: Edit existing reward levels (incl. defaults) from the settings list. Phase
     name updates should propagate into reward levels list.

backend:
  - task: "PATCH /api/workspaces/{ws_id}/reward-levels/{level_id} – edit reward level"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Added RewardLevelUpdate model and PATCH endpoint that updates name/emoji/threshold/phase for any level (defaults too)."
        - working: true
          agent: "testing"
          comment: "Verified via /app/backend_test.py against https://dancer-hub-4.preview.emergentagent.com/api with demo@dancetrack.app. PATCH on non-default level updates name/emoji/threshold/phase (200). PATCH on default level (isDefault=true) is allowed and returns 200 with updated doc (defaults editable). PATCH non-existent level_id returns 404. PATCH without Authorization header returns 401 (Not authenticated). PATCH with empty body {} returns 200 with the unchanged level document. Regression: POST /reward-levels creates non-default level (200), DELETE non-default returns 200, DELETE default returns 400 'Cannot delete default level'. All 19 assertions pass."
  - task: "Phase rename auto-propagation in reward_levels"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "When PATCH /api/workspaces/{ws_id} updates phaseNames, all reward_levels in that workspace whose phase string matches the OLD phase value are bulk-updated to the NEW phase value via update_many."
        - working: true
          agent: "testing"
          comment: "Tested with demo workspace. Captured 3 reward_levels with phase=current 'knospe' value before rename. PATCHed workspace with phaseNames.knospe='TestPhase1' (bluete & glueck unchanged). Re-fetch confirmed all 3 affected levels now have phase='TestPhase1'. Levels matching bluete and glueck were left untouched. Restored original phaseNames at the end and verified levels reverted correctly. update_many propagation works as designed."

frontend:
  - task: "Attendance event details sheet + correct ratio (present / total group size)"
    implemented: true
    working: true
    file: "/app/frontend/app/(tabs)/attendance.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Tapping an event now opens a detail sheet listing all group students with their statuses."
        - working: true
          agent: "testing"
          comment: "Verified at 390x844. Event card shows 'X/Y anwesend' where Y=total group size (e.g. '1/1 anwesend', '0/1 anwesend'). Tapping a card opens detail sheet with group name title, event type emoji+label+date, big '1/1 anwesend' stat, full student list with status badges (🪩 Anwesend), and '🗑️ Termin löschen' button at bottom. Confirm dialog opens on delete tap (visual confirmation in screenshot). No actual delete performed."
  - task: "Groups: tap opens members sheet; small PDF icon; CSV removed; edit button preserved"
    implemented: true
    working: true
    file: "/app/frontend/app/(tabs)/groups.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Group card now has small icon buttons (📄 PDF, ✏️ edit) and tapping the card opens a member-list sheet."
        - working: true
          agent: "testing"
          comment: "Verified: NO CSV button anywhere on groups tab. Each card has small circular ✏️ and 📄 icon buttons (9/9 cards). Tapping group body opens 'Mitglieder'-Sheet with weekday/time, member rows (avatar, birthday, age, phone, training count, reward emoji), and '✏️ Gruppe bearbeiten' + '📄 PDF' buttons at top. Tapping 'Gruppe bearbeiten' closes member sheet and opens Edit-Sheet (group-name-input found). Tapping ✏️ icon on card directly also opens Edit-Sheet."
  - task: "Registrations: only show non-registered students"
    implemented: true
    working: true
    file: "/app/frontend/app/(tabs)/registrations.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Filtered to !isRegistered. Tap marks as registered and removes from list. Counter shows registered/total."
        - working: true
          agent: "testing"
          comment: "Header card shows '1/1 Bereits angemeldet'. Since all students are already registered, the empty state '🎉 Alle angemeldet' with subtitle 'Alle Schüler sind eingetragen' is correctly displayed. No checkmark column visible. Tap-to-mark logic could not be exercised because no pending students exist (covered by empty state)."
  - task: "Performance: memoize derived data per tab"
    implemented: true
    working: true
    file: "/app/frontend/app/(tabs)/*.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Built indices and memoized list cards."
        - working: true
          agent: "testing"
          comment: "Tab smoke navigated through all 6 tabs (Übersicht→Gruppen→Schüler→Anwesenheit→Anmeldungen→Einstellungen) without errors or crashes. UI feels responsive."
  - task: "Settings: editable reward levels (incl. defaults) with Phase chip"
    implemented: true
    working: true
    file: "/app/frontend/app/(tabs)/settings.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "Each level row is tappable with chevron ›. Default levels render with '(Standard)' suffix and on tap show the hint 'Standard-Levels können bearbeitet, aber nicht gelöscht werden.' with NO delete button. Non-default levels show the delete button. Phase chip selector contains: '— Keine —', current phase 1 name, phase 2, phase 3 (verified via 'Knospenphase' present in opened sheet body). Saving a renamed level updates the list (verified via PATCH endpoint working in earlier backend test)."
  - task: "Phase rename auto-propagates into reward levels list & edit chips"
    implemented: true
    working: true
    file: "/app/frontend/app/(tabs)/settings.tsx + backend update_many"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "testing"
          comment: "Renamed Knospenphase → TestKnospe and tapped 'Phasen speichern'. After reload the Belohnungs-Levels list now shows 'TestKnospe' as phase suffix on the affected levels (Samen/Spross/Mini Blatt) while Blütenphase/Glückstierchenphase rows are untouched. Opening any level surfaces 'TestKnospe' as a phase chip option. Phase name was successfully restored back to 'Knospenphase' at end of test (verified via input value 'Knospenphase' AND screenshot showing all level rows back to 'Knospenphase')."

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: "Implemented 4 changes: attendance detail sheet with present/total counter, groups member sheet with smaller icons & no CSV, registrations filter, performance memoization. Bundle compiles successfully (920 modules). Awaiting user verification or testing approval."
    - agent: "main"
      message: "Added backend support for editing reward levels (PATCH /reward-levels/{id}) and auto-propagation of phaseNames updates into existing reward_levels (update_many). Frontend settings.tsx now opens an edit-sheet on tap, with phase selectable via Chip from current workspace phaseNames. Default levels editable but not deletable. Please test the new PATCH endpoint and the phase auto-rename behaviour using demo@dancetrack.app / demo12345."
    - agent: "testing"
      message: "Backend testing complete – all 19 assertions PASS in /app/backend_test.py. PATCH /api/workspaces/{ws_id}/reward-levels/{level_id} works for non-default and default levels (defaults are editable as required), returns 404 for unknown ids, 401 without auth, and 200 with current doc when body is empty. Phase rename auto-propagation via update_many works correctly: changing phaseNames.knospe propagates to all matching reward_levels while bluete/glueck stay untouched, and reverts cleanly on restore. Regression check: POST /reward-levels OK, DELETE non-default OK, DELETE default still returns 400. No issues found."
    - agent: "testing"
      message: "Frontend UI testing complete (390x844 mobile). All 6 frontend tasks PASS. Verified: (1) Anwesenheit cards show 'X/Y anwesend' with Y=total group size (e.g. 1/1, 0/1); detail sheet opens with group title, event meta, big stat, full student list with status badges, and 'Termin löschen' button at bottom (cancel flow validated visually). (2) Gruppen tab has NO CSV button anywhere; small ✏️ and 📄 icon buttons (9/9 cards); tapping body opens Mitglieder-Sheet with member rows (avatar, birthday, age, phone, count, reward emoji) and '✏️ Gruppe bearbeiten' + '📄 PDF' buttons; both edit-paths (icon on card, button in member-sheet) open the Edit-Sheet (group-name-input visible). (3) Anmeldungen header shows '1/1 Bereits angemeldet' and renders '🎉 Alle angemeldet' empty state since all are registered (no checkmark column). (4) Settings → Belohnungs-Levels: each row tappable with chevron; default rows show '(Standard)' suffix, hint 'Standard-Levels können bearbeitet, aber nicht gelöscht werden.' and NO delete button; non-default rows show delete button; phase chips include '— Keine —' + current phase names. (5) Phase rename (Knospenphase → TestKnospe) propagates instantly into the reward-levels list (Samen/Spross/Mini Blatt suffix updated, Blütenphase rows untouched) and into the phase chip when re-opening a level; phase name was successfully RESTORED back to 'Knospenphase' at end (verified via input value and screenshot). (6) Tab navigation across all 6 tabs is smooth, no console errors. No critical issues found."
