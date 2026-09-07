import json
import sqlite3
import uuid
import datetime

def generate_id(prefix=""):
    return f"{prefix}{uuid.uuid4().hex[:24]}"

def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

def run_import():
    manifest_path = "tool-results/lahore-manifest.json"
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    conn = sqlite3.connect("prisma/dev.db")
    c = conn.cursor()

    # 1. Target City: Lahore
    lhr_city = c.execute("SELECT id, name FROM cities WHERE code = 'LHR'").fetchone()
    if not lhr_city:
        raise Exception("City with code LHR not found in database!")
    city_id = lhr_city[0]
    print(f"Target City: {lhr_city[1]} (ID: {city_id})")

    now = now_iso()

    # 2. Parks
    # Check existing parks in Lahore
    existing_parks = {p[1].lower(): p[0] for p in c.execute("SELECT id, name FROM parks WHERE cityId = ?", (city_id,)).fetchall()}
    park_ids = {}

    park_names = ["Gulberg", "Gulshan Iqbal", "Griffin", "Johar Town", "Gulshan Ravi", "State Life"]
    for p_name in park_names:
        # Check if exists (e.g. 'gulberg' or 'gulberg park')
        matched_id = None
        for ep_name, ep_id in existing_parks.items():
            if p_name.lower() in ep_name:
                matched_id = ep_id
                # Normalize name if desired
                c.execute("UPDATE parks SET name = ?, updatedAt = ? WHERE id = ?", (p_name, now, matched_id))
                break
        
        if not matched_id:
            matched_id = generate_id("cm_p_")
            c.execute("""
                INSERT INTO parks (id, name, cityId, address, isActive, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, 1, ?, ?)
            """, (matched_id, p_name, city_id, f"{p_name}, Lahore", now, now))
            print(f"Created Park: {p_name} ({matched_id})")
        else:
            print(f"Using Existing Park: {p_name} ({matched_id})")
        
        park_ids[p_name] = matched_id

    # 3. Batches
    # Ensure Batch 4 exists for each park
    batch_ids = {}
    for p_name, p_id in park_ids.items():
        existing_batch = c.execute("SELECT id FROM batches WHERE parkId = ? AND name LIKE '%Batch 4%'", (p_id,)).fetchone()
        if existing_batch:
            b_id = existing_batch[0]
            c.execute("UPDATE batches SET name = 'Batch 4', cityId = ?, updatedAt = ? WHERE id = ?", (city_id, now, b_id))
            print(f"Using Existing Batch for {p_name}: {b_id}")
        else:
            b_id = generate_id("cm_b_")
            c.execute("""
                INSERT INTO batches (id, name, parkId, cityId, startDate, isActive, createdAt, updatedAt)
                VALUES (?, 'Batch 4', ?, ?, '2026-05-23 00:00:00', 1, ?, ?)
            """, (b_id, p_id, city_id, now, now))
            print(f"Created Batch 4 for {p_name}: {b_id}")
        batch_ids[p_name] = b_id

    # 4. Groups
    # Extract unique groups from manifest participants
    group_ids = {} # key: (park, group_name) -> group_id
    distinct_groups = set((p["park"], p["group"]) for p in manifest["participants"])

    for p_name, g_name in sorted(distinct_groups):
        p_id = park_ids[p_name]
        b_id = batch_ids[p_name]
        
        # Check if group already exists
        existing_g = c.execute("SELECT id FROM groups WHERE batchId = ? AND name = ?", (b_id, g_name)).fetchone()
        if existing_g:
            g_id = existing_g[0]
            print(f"Using Existing Group: {p_name} - {g_name} ({g_id})")
        else:
            g_id = generate_id("cm_g_")
            c.execute("""
                INSERT INTO groups (id, name, batchId, parkId, isActive, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, 1, ?, ?)
            """, (g_id, g_name, b_id, p_id, now, now))
            print(f"Created Group: {p_name} - {g_name} ({g_id})")
        
        group_ids[(p_name, g_name)] = g_id

    # 5. Participants
    participant_ids = {} # key: sourceRef -> participant_id
    inserted_participants = 0
    updated_participants = 0

    for pt in manifest["participants"]:
        p_name = pt["park"]
        g_name = pt["group"]
        g_id = group_ids[(p_name, g_name)]
        ref = pt["sourceRef"]

        # Check existing participant by name and group
        existing_pt = c.execute("SELECT id FROM participants WHERE groupId = ? AND name = ?", (g_id, pt["name"])).fetchone()
        if existing_pt:
            pt_id = existing_pt[0]
            c.execute("""
                UPDATE participants 
                SET phone = ?, age = ?, gradeClass = ?, state = ?, updatedAt = ?
                WHERE id = ?
            """, (pt.get("phone"), pt.get("age"), pt.get("gradeClass"), pt.get("state", "active"), now, pt_id))
            updated_participants += 1
        else:
            pt_id = generate_id("cm_pt_")
            c.execute("""
                INSERT INTO participants (id, name, phone, age, gradeClass, groupId, state, joinedAt, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, '2026-05-23 00:00:00', ?, ?)
            """, (pt_id, pt["name"], pt.get("phone"), pt.get("age"), pt.get("gradeClass"), g_id, pt.get("state", "active"), now, now))
            inserted_participants += 1
        
        participant_ids[ref] = pt_id

    print(f"\nParticipants: {inserted_participants} inserted, {updated_participants} updated. Total mapped: {len(participant_ids)}")

    # 6. Staff / Murabbis
    inserted_staff = 0
    default_pw_hash = "$2a$12$e0MYzXy3v4f6A67L6.jZt.W3eN2Q9x9uGzR7wE4vB8yS1aD5cE7yq" # dummy bcrypt hash
    for st in manifest.get("staff", []):
        st_name = st.get("name")
        p_name = st.get("park")
        p_id = park_ids.get(p_name)
        role = st.get("role", "murabbi")
        if role == "pending_assignment":
            role = "murabbi"
        
        # Clean email
        email = f"staff.{uuid.uuid4().hex[:8]}@shabab360.pk"
        
        # Check if staff user already exists by name
        existing_u = c.execute("SELECT id FROM users WHERE name = ?", (st_name,)).fetchone()
        if not existing_u:
            u_id = generate_id("cm_u_")
            c.execute("""
                INSERT INTO users (id, email, passwordHash, name, phone, mustResetPwd, tokenVersion, isActive, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, 1, 0, 1, ?, ?)
            """, (u_id, email, default_pw_hash, st_name, st.get("phone"), now, now))
            
            s_id = generate_id("cm_sm_")
            c.execute("""
                INSERT INTO staff_meta (id, userId, role, assignedCityId, assignedParkId, isActive, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            """, (s_id, u_id, role, city_id, p_id, now, now))
            inserted_staff += 1

    print(f"Staff Members: {inserted_staff} inserted.")

    # 7. Attendance Events & Records
    inserted_events = 0
    inserted_records = 0

    for ev in manifest["events"]:
        p_name = ev["park"]
        g_name = ev["group"]
        g_id = group_ids[(p_name, g_name)]
        ev_date = f"{ev['date']} 00:00:00"

        # Check if event already exists
        existing_ev = c.execute("SELECT id FROM attendance_events WHERE groupId = ? AND eventDate = ?", (g_id, ev_date)).fetchone()
        if existing_ev:
            ev_id = existing_ev[0]
        else:
            ev_id = generate_id("cm_ae_")
            c.execute("""
                INSERT INTO attendance_events (id, groupId, title, eventDate, isClosed, closedAt, createdAt, updatedAt)
                VALUES (?, ?, 'Regular Session - Batch 4', ?, 1, ?, ?, ?)
            """, (ev_id, g_id, ev_date, now, now, now))
            inserted_events += 1

        # Records
        for rec in ev["records"]:
            pt_id = participant_ids.get(rec["sourceRef"])
            if not pt_id:
                continue
            
            # Check if record exists
            existing_rec = c.execute("SELECT id FROM attendance_records WHERE eventId = ? AND participantId = ?", (ev_id, pt_id)).fetchone()
            if not existing_rec:
                rec_id = generate_id("cm_ar_")
                c.execute("""
                    INSERT INTO attendance_records (id, eventId, participantId, status, markedAt, editReason, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, 'Imported from Lahore Batch 4 workbook', ?, ?)
                """, (rec_id, ev_id, pt_id, rec["status"], now, now, now))
                inserted_records += 1

    print(f"Attendance: {inserted_events} events created, {inserted_records} records inserted.")

    conn.commit()
    conn.close()
    print("\nSUCCESS: All Lahore Batch 4 data safely committed to database!")

if __name__ == "__main__":
    run_import()
