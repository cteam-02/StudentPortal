const express = require("express");
const pool = require("./db");
const cors = require("cors");
require("dotenv").config();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ dest: "uploads/" });

const parseCsvDateTime = (value) => {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const normalizeField = (value) => {
  if (value === undefined || value === null) return null;

  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
};

const normalizeText = (value) => normalizeField(value)?.toLowerCase() || null;

async function ensurePortalUserTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS PortalUser (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const existing = await pool.query(
    `SELECT id FROM PortalUser WHERE LOWER(email) = $1 LIMIT 1`,
    ["cteam02@kugan.com"]
  );

  if (existing.rowCount === 0) {
    const hash = await bcrypt.hash("Admin@2024", 10);
    await pool.query(
      `INSERT INTO PortalUser (name, email, password_hash, role) VALUES ($1, $2, $3, $4)`,
      ["Super Admin", "cteam02@kugan.com", hash, "super_admin"]
    );
    console.log("Super admin seeded: cteam02@kugan.com / Admin@2024");
  }
}

async function ensureUserActivityLogTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS UserActivityLog (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES PortalUser(id) ON DELETE SET NULL,
      user_name TEXT,
      user_email TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function logActivity(userId, action, details = null) {
  try {
    let userName = null;
    let userEmail = null;

    if (userId) {
      const userRes = await pool.query(
        `SELECT name, email FROM PortalUser WHERE id = $1 LIMIT 1`,
        [userId]
      );
      if (userRes.rowCount > 0) {
        userName = userRes.rows[0].name;
        userEmail = userRes.rows[0].email;
      }
    }

    await pool.query(
      `INSERT INTO UserActivityLog (user_id, user_name, user_email, action, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, userName, userEmail, action, details]
    );
  } catch (err) {
    console.error("Failed to log activity:", err.message);
  }
}

async function ensurePendingConfirmationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS PendingStudentConfirmation (
      id SERIAL PRIMARY KEY,
      imported_name TEXT NOT NULL,
      imported_email TEXT,
      imported_phone TEXT,
      offering_title TEXT NOT NULL,
      course_id INTEGER REFERENCES Course(id),
      begin_date TIMESTAMPTZ,
      completion_date TIMESTAMPTZ,
      status TEXT,
      grade TEXT,
      matched_student_id INTEGER REFERENCES Student(id),
      resolution_status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function ensureStudentAltContactColumns() {
  await pool.query(
    `ALTER TABLE Student ADD COLUMN IF NOT EXISTS alt_phones TEXT[] NOT NULL DEFAULT '{}'`
  );
  await pool.query(
    `ALTER TABLE Student ADD COLUMN IF NOT EXISTS alt_emails TEXT[] NOT NULL DEFAULT '{}'`
  );
}

async function addAltPhone(studentId, phone) {
  if (!phone) return;
  await pool.query(
    `UPDATE Student
     SET alt_phones = array_append(alt_phones, $1)
     WHERE id = $2
       AND NOT ($1 = ANY(alt_phones))
       AND COALESCE(TRIM(phone), '') != TRIM($1)`,
    [phone.trim(), studentId]
  );
}

async function addAltEmail(studentId, email) {
  if (!email) return;
  await pool.query(
    `UPDATE Student
     SET alt_emails = array_append(alt_emails, $1)
     WHERE id = $2
       AND NOT ($1 = ANY(alt_emails))
       AND LOWER(TRIM(COALESCE(email, ''))) != LOWER(TRIM($1))`,
    [email.trim(), studentId]
  );
}

async function findExistingStudentByFullMatch(email, fullName, phone) {
  return pool.query(
    `
    SELECT id, name, email, phone
    FROM Student
    WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
      AND LOWER(TRIM(email)) = LOWER(TRIM($2))
      AND COALESCE(TRIM(phone), '') = COALESCE(TRIM($3), '')
    LIMIT 1
    `,
    [fullName, email, phone || ""]
  );
}

async function findPotentialStudentByAnyTwo(fullName, email, phone) {
  return pool.query(
    `
    SELECT id, name, email, phone
    FROM Student
    WHERE (
      LOWER(TRIM(name)) = LOWER(TRIM($1))
      AND LOWER(TRIM(email)) = LOWER(TRIM($2))
    ) OR (
      LOWER(TRIM(name)) = LOWER(TRIM($1))
      AND COALESCE(TRIM(phone), '') = COALESCE(TRIM($3), '')
    ) OR (
      LOWER(TRIM(email)) = LOWER(TRIM($2))
      AND COALESCE(TRIM(phone), '') = COALESCE(TRIM($3), '')
    )
    ORDER BY id
    LIMIT 1
    `,
    [fullName, email, phone || ""]
  );
}

// Finds a student whose name matches but BOTH email AND phone differ —
// the caller treats this as a possible duplicate that needs human review.
async function findStudentByNameOnlyMismatch(fullName, email, phone) {
  return pool.query(
    `
    SELECT id, name, email, phone
    FROM Student
    WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
      AND LOWER(TRIM(COALESCE(email, ''))) != LOWER(TRIM(COALESCE($2, '')))
      AND TRIM(COALESCE(phone, '')) != TRIM(COALESCE($3, ''))
    ORDER BY id
    LIMIT 1
    `,
    [fullName, email || "", phone || ""]
  );
}

// Finds a student whose phone matches but BOTH name AND email differ.
async function findStudentByPhoneOnlyMismatch(fullName, email, phone) {
  if (!phone) return { rowCount: 0, rows: [] };
  return pool.query(
    `
    SELECT id, name, email, phone
    FROM Student
    WHERE TRIM(COALESCE(phone, '')) = TRIM($3)
      AND LOWER(TRIM(COALESCE(name, '')))  != LOWER(TRIM($1))
      AND LOWER(TRIM(COALESCE(email, ''))) != LOWER(TRIM(COALESCE($2, '')))
    ORDER BY id
    LIMIT 1
    `,
    [fullName, email || "", phone]
  );
}

// Finds a student whose email matches but BOTH name AND phone differ.
async function findStudentByEmailOnlyMismatch(fullName, email, phone) {
  if (!email) return { rowCount: 0, rows: [] };
  return pool.query(
    `
    SELECT id, name, email, phone
    FROM Student
    WHERE LOWER(TRIM(email)) = LOWER(TRIM($2))
      AND LOWER(TRIM(COALESCE(name, '')))  != LOWER(TRIM($1))
      AND TRIM(COALESCE(phone, '')) != TRIM(COALESCE($3, ''))
    ORDER BY id
    LIMIT 1
    `,
    [fullName, email, phone || ""]
  );
}

async function findCourseByTitle(offeringTitle) {
  return pool.query(
    `
    SELECT id, title
    FROM Course
    WHERE LOWER(TRIM(title)) = LOWER(TRIM($1))
    LIMIT 1
    `,
    [offeringTitle]
  );
}

async function hasDuplicateCourseHistory({
  studentId,
  courseId,
  beginDate,
  completionDate,
  status,
  grade,
}) {
  const result = await pool.query(
    `
    SELECT 1
    FROM CourseHistory
    WHERE student_id = $1
      AND course_id = $2
      AND begin_date IS NOT DISTINCT FROM $3
      AND completion_date IS NOT DISTINCT FROM $4
      AND status IS NOT DISTINCT FROM $5
      AND grade IS NOT DISTINCT FROM $6
    LIMIT 1
    `,
    [studentId, courseId, beginDate, completionDate, status, grade]
  );

  return result.rowCount > 0;
}

async function insertCourseHistory({
  studentId,
  courseId,
  beginDate,
  completionDate,
  status,
  grade,
}) {
  return pool.query(
    `
    INSERT INTO CourseHistory
      (student_id, course_id, begin_date, completion_date, status, grade)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING student_id, course_id, begin_date, completion_date, status, grade
    `,
    [studentId, courseId, beginDate, completionDate, status, grade]
  );
}

async function findDuplicatePendingConfirmation({
  importedName,
  importedEmail,
  importedPhone,
  courseId,
  beginDate,
  completionDate,
  status,
  grade,
  matchedStudentId,
}) {
  return pool.query(
    `
    SELECT id
    FROM PendingStudentConfirmation
    WHERE resolution_status = 'pending'
      AND LOWER(TRIM(imported_name)) = LOWER(TRIM($1))
      AND COALESCE(LOWER(TRIM(imported_email)), '') = COALESCE(LOWER(TRIM($2)), '')
      AND COALESCE(TRIM(imported_phone), '') = COALESCE(TRIM($3), '')
      AND course_id = $4
      AND begin_date IS NOT DISTINCT FROM $5
      AND completion_date IS NOT DISTINCT FROM $6
      AND status IS NOT DISTINCT FROM $7
      AND grade IS NOT DISTINCT FROM $8
      AND matched_student_id = $9
    LIMIT 1
    `,
    [
      importedName,
      importedEmail,
      importedPhone,
      courseId,
      beginDate,
      completionDate,
      status,
      grade,
      matchedStudentId,
    ]
  );
}

app.get("/", (req, res) => {
  res.send("Student API is running");
});

app.get("/stats", async (req, res) => {
  try {
    const [studentsRes, enrollmentsRes, pendingRes, coursesRes] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM Student"),
      pool.query("SELECT COUNT(*) FROM CourseHistory"),
      pool.query("SELECT COUNT(*) FROM PendingStudentConfirmation WHERE resolution_status = 'pending'"),
      pool.query("SELECT COUNT(*) FROM Course"),
    ]);
    res.json({
      totalStudents: parseInt(studentsRes.rows[0].count),
      totalEnrollments: parseInt(enrollmentsRes.rows[0].count),
      pendingConfirmations: parseInt(pendingRes.rows[0].count),
      totalCourses: parseInt(coursesRes.rows[0].count),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, password_hash FROM PortalUser WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );
    if (result.rowCount === 0) {
      await logActivity(null, "LOGIN_FAILED", `Failed login attempt for email: ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      await logActivity(user.id, "LOGIN_FAILED", `Incorrect password for: ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    await logActivity(user.id, "LOGIN_SUCCESS", `Logged in as ${user.role}`);
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/auth/users", async (req, res) => {
  const requesterId = req.headers["x-user-id"];
  try {
    const authCheck = await pool.query(
      `SELECT role FROM PortalUser WHERE id = $1 LIMIT 1`,
      [requesterId]
    );
    if (authCheck.rowCount === 0 || authCheck.rows[0].role !== "super_admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const result = await pool.query(
      `SELECT id, name, email, role, created_at FROM PortalUser ORDER BY id`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/auth/users", async (req, res) => {
  const requesterId = req.headers["x-user-id"];
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }
  try {
    const authCheck = await pool.query(
      `SELECT role FROM PortalUser WHERE id = $1 LIMIT 1`,
      [requesterId]
    );
    if (authCheck.rowCount === 0 || authCheck.rows[0].role !== "super_admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO PortalUser (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name, email, hash, role || "admin"]
    );
    await logActivity(requesterId, "USER_CREATED", `Created portal user: ${email} (${role || "admin"})`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "A user with that email already exists" });
    }
    res.status(500).json({ error: error.message });
  }
});

app.get("/students", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM Student ORDER BY id");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/courses", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM Course ORDER BY id");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Must be registered BEFORE /students/:id so Express doesn't treat "duplicates" as an ID
app.get("/students/duplicates", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.name, s.email, s.phone, s.alt_phones, s.alt_emails
      FROM Student s
      WHERE s.phone IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM Student s2
          WHERE s2.id != s.id
            AND LOWER(TRIM(s2.name)) = LOWER(TRIM(s.name))
            AND TRIM(s2.phone) = TRIM(s.phone)
        )
      ORDER BY LOWER(TRIM(s.name)), s.id
    `);

    // Group by name+phone key
    const groups = {};
    for (const row of result.rows) {
      const key = `${row.name.trim().toLowerCase()}||${row.phone.trim()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    }

    res.json(Object.values(groups));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/students/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, alt_phones, alt_emails FROM Student WHERE id = $1 LIMIT 1`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/students/:id/courses", async (req, res) => {
  try {
    const studentId = req.params.id;

    const result = await pool.query(
      `
      SELECT 
        s.id,
        s.name,
        s.email,
        c.title AS course_title,
        ch.begin_date,
        ch.completion_date,
        ch.status,
        ch.grade
      FROM CourseHistory ch
      JOIN Student s ON ch.student_id = s.id
      JOIN Course c ON ch.course_id = c.id
      WHERE s.id = $1
      ORDER BY ch.begin_date
      `,
      [studentId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/pending-confirmations", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        pc.id,
        pc.imported_name,
        pc.imported_email,
        pc.imported_phone,
        pc.offering_title,
        pc.begin_date,
        pc.completion_date,
        pc.status,
        pc.grade,
        pc.matched_student_id,
        pc.created_at,
        s.name AS matched_student_name,
        s.email AS matched_student_email,
        s.phone AS matched_student_phone
      FROM PendingStudentConfirmation pc
      LEFT JOIN Student s ON s.id = pc.matched_student_id
      WHERE pc.resolution_status = 'pending'
      ORDER BY pc.created_at DESC, pc.id DESC
      `
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CSV import decision table (evaluated in order, first match wins):
//
//  Tier 1 — EXACT DUPLICATE
//    name + email + phone + course + dates + status + grade all match
//    → skip row silently
//
//  Tier 2 — EXACT STUDENT, NEW COURSE HISTORY  ← auto-merge
//    name + email + phone all match, different course or date/status/grade
//    → insert new CourseHistory row for the existing student
//
//  Tier 3 — TWO-FIELD STUDENT MATCH  ← auto-merge + store alt contact
//    name + email match, phone differs → merge course history, append alt_phone
//    name + phone match, email differs → merge course history, append alt_email
//
//  Tier 4a — NAME-ONLY MATCH  ← human review (pending)
//    name matches, email AND phone both differ
//
//  Tier 4b — PHONE-ONLY MATCH  ← human review (pending)
//    phone matches, name AND email both differ
//
//  Tier 4c — EMAIL-ONLY MATCH  ← safe auto-merge
//    email matches, name AND phone both differ
//    → merge course history, append new phone as alt_phone (no name/phone overwrite)
//
//  Tier 5 — NO MATCH
//    → create new Student + CourseHistory
app.post("/upload-students", upload.single("file"), async (req, res) => {
  const results = [];
  let insertedCount = 0;
  let newStudentsCount = 0;
  let skippedDuplicates = 0;
  let pendingConfirmations = 0;

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (row) => {
      const cleanRow = {};

      Object.keys(row).forEach((key) => {
        const cleanKey = key.replace(/^\uFEFF/, "").trim().toLowerCase();
        cleanRow[cleanKey] = row[key];
      });

      results.push(cleanRow);
    })
    .on("end", async () => {
      try {
        for (const row of results) {
          const offeringTitle = row["offering title"]?.trim();
          const email = normalizeText(row["student email"]);
          const fullName = `${row["student first name"] || ""} ${row["student last name"] || ""}`.trim();
          const phone = normalizeField(row["phone number"]);
          const beginDate = parseCsvDateTime(row["begin date"]);
          const completionDate = parseCsvDateTime(row["completion date"]);
          const normalizedStatus = normalizeField(row["status"]);
          const normalizedGrade = normalizeField(row["grade"]);

          if (!offeringTitle) {
            throw new Error("Offering Title is missing in CSV");
          }

          if (!email) {
            throw new Error("Student Email is missing in CSV");
          }

          const courseRes = await findCourseByTitle(offeringTitle);
          if (courseRes.rowCount === 0) {
            throw new Error(`Course not found: ${offeringTitle}`);
          }

          const courseId = courseRes.rows[0].id;
          console.log("Evaluating import row", {
            fullName,
            email,
            phone,
            offeringTitle,
          });

          const exactStudentRes = await findExistingStudentByFullMatch(
            email,
            fullName,
            phone
          );

          console.log("Exact student match result", {
            fullName,
            email,
            phone,
            rowCount: exactStudentRes.rowCount,
            matchedStudent: exactStudentRes.rows[0] || null,
          });

          if (exactStudentRes.rowCount > 0) {
            // Tier 1 / Tier 2: student identity is a confirmed exact match.
            // Only skip if the course history record is also identical in every field.
            // Different course, different date, or any other field change → auto-merge
            // by adding a new CourseHistory row to this student's record.
            const studentId = exactStudentRes.rows[0].id;
            const isExactDuplicate = await hasDuplicateCourseHistory({
              studentId,
              courseId,
              beginDate,
              completionDate,
              status: normalizedStatus,
              grade: normalizedGrade,
            });

            if (isExactDuplicate) {
              // Tier 1: every field is identical — true duplicate, skip silently
              skippedDuplicates += 1;
              console.log(`[SKIP] Exact duplicate row — student: "${fullName}" (${email}), course: "${offeringTitle}", studentId: ${studentId}`);
              continue;
            }

            // Tier 2: same student, new course history (different course or different date)
            const insertHistoryRes = await insertCourseHistory({
              studentId,
              courseId,
              beginDate,
              completionDate,
              status: normalizedStatus,
              grade: normalizedGrade,
            });

            insertedCount += 1;
            console.log(`[MERGE] New course history added — student: "${fullName}" (${email}), course: "${offeringTitle}", studentId: ${studentId}`);
            continue;
          }

          const potentialStudentRes = await findPotentialStudentByAnyTwo(
            fullName,
            email,
            phone
          );

          console.log("Potential two-field match result", {
            fullName,
            email,
            phone,
            rowCount: potentialStudentRes.rowCount,
            matchedStudent: potentialStudentRes.rows[0] || null,
          });

          if (potentialStudentRes.rowCount > 0) {
            const matchedStudent = potentialStudentRes.rows[0];
            const matchedStudentId = matchedStudent.id;

            // If the email matches, the identity is certain enough — merge directly
            // rather than queuing a pending confirmation that would always fail
            // "Create New Student" due to the unique constraint on email.
            if (normalizeText(matchedStudent.email) === email) {
              const isDuplicate = await hasDuplicateCourseHistory({
                studentId: matchedStudentId,
                courseId,
                beginDate,
                completionDate,
                status: normalizedStatus,
                grade: normalizedGrade,
              });

              if (isDuplicate) {
                skippedDuplicates += 1;
                console.log("Skipping duplicate CourseHistory row (email match auto-merge)", {
                  matchedStudentId,
                  courseId,
                  beginDate,
                  completionDate,
                });
                continue;
              }

              await insertCourseHistory({
                studentId: matchedStudentId,
                courseId,
                beginDate,
                completionDate,
                status: normalizedStatus,
                grade: normalizedGrade,
              });

              // Phone differs from existing — record as an alternate phone number
              if (phone && normalizeField(matchedStudent.phone) !== phone) {
                await addAltPhone(matchedStudentId, phone);
                console.log("Alt phone added during auto-merge (email matched, phone differs)", {
                  matchedStudentId,
                  newPhone: phone,
                  existingPhone: matchedStudent.phone,
                });
              }

              insertedCount += 1;
              console.log("CourseHistory auto-merged (email matched)", {
                matchedStudentId,
                courseId,
                beginDate,
                completionDate,
              });
              continue;
            }

            // Name+phone matched, email differs — auto-merge course history and record the
            // new email as an alternate email (mirrors the email-match path above)
            const isPhoneMatchDuplicate = await hasDuplicateCourseHistory({
              studentId: matchedStudentId,
              courseId,
              beginDate,
              completionDate,
              status: normalizedStatus,
              grade: normalizedGrade,
            });

            if (isPhoneMatchDuplicate) {
              skippedDuplicates += 1;
              console.log("Skipping duplicate CourseHistory row (phone match auto-merge)", {
                matchedStudentId,
                courseId,
              });
              continue;
            }

            await insertCourseHistory({
              studentId: matchedStudentId,
              courseId,
              beginDate,
              completionDate,
              status: normalizedStatus,
              grade: normalizedGrade,
            });

            // Email differs from existing — record as an alternate email
            if (email && normalizeText(matchedStudent.email) !== email) {
              await addAltEmail(matchedStudentId, email);
              console.log("Alt email added during auto-merge (phone matched, email differs)", {
                matchedStudentId,
                newEmail: email,
                existingEmail: matchedStudent.email,
              });
            }

            insertedCount += 1;
            console.log("CourseHistory auto-merged (phone matched)", {
              matchedStudentId,
              courseId,
              beginDate,
              completionDate,
            });
            continue;
          }

          // Name matches but both email AND phone differ — send to pending for human review
          const nameOnlyRes = await findStudentByNameOnlyMismatch(fullName, email, phone);

          console.log("Name-only match result", {
            fullName,
            email,
            phone,
            rowCount: nameOnlyRes.rowCount,
            matchedStudent: nameOnlyRes.rows[0] || null,
          });

          if (nameOnlyRes.rowCount > 0) {
            const nameMatchedStudent = nameOnlyRes.rows[0];
            const nameMatchedStudentId = nameMatchedStudent.id;

            const duplicatePendingRes = await findDuplicatePendingConfirmation({
              importedName: fullName,
              importedEmail: email,
              importedPhone: phone,
              courseId,
              beginDate,
              completionDate,
              status: normalizedStatus,
              grade: normalizedGrade,
              matchedStudentId: nameMatchedStudentId,
            });

            if (duplicatePendingRes.rowCount > 0) {
              skippedDuplicates += 1;
              console.log(`[SKIP] Duplicate pending confirmation (name-only match) — student: "${fullName}", course: "${offeringTitle}"`);
              continue;
            }

            await pool.query(
              `
              INSERT INTO PendingStudentConfirmation
                (imported_name, imported_email, imported_phone, offering_title,
                 course_id, begin_date, completion_date, status, grade, matched_student_id)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              `,
              [
                fullName, email, phone, offeringTitle,
                courseId, beginDate, completionDate,
                normalizedStatus, normalizedGrade, nameMatchedStudentId,
              ]
            );

            pendingConfirmations += 1;
            console.log("Pending confirmation created (name-only match)", {
              fullName,
              email,
              phone,
              nameMatchedStudentId,
              courseId,
            });
            continue;
          }

          // Tier 4b — PHONE-ONLY MATCH: same phone, different name AND email → pending
          const phoneOnlyRes = await findStudentByPhoneOnlyMismatch(fullName, email, phone);
          console.log("Phone-only match result", {
            fullName, email, phone,
            rowCount: phoneOnlyRes.rowCount,
            matchedStudent: phoneOnlyRes.rows[0] || null,
          });

          if (phoneOnlyRes.rowCount > 0) {
            const phoneMatchedStudent = phoneOnlyRes.rows[0];
            const phoneMatchedStudentId = phoneMatchedStudent.id;

            const dupPhoneRes = await findDuplicatePendingConfirmation({
              importedName: fullName, importedEmail: email, importedPhone: phone,
              courseId, beginDate, completionDate,
              status: normalizedStatus, grade: normalizedGrade,
              matchedStudentId: phoneMatchedStudentId,
            });

            if (dupPhoneRes.rowCount > 0) {
              skippedDuplicates += 1;
              console.log(`[SKIP] Duplicate pending confirmation (phone-only match) — student: "${fullName}", course: "${offeringTitle}"`);
              continue;
            }

            await pool.query(
              `INSERT INTO PendingStudentConfirmation
                (imported_name, imported_email, imported_phone, offering_title,
                 course_id, begin_date, completion_date, status, grade, matched_student_id)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
              [fullName, email, phone, offeringTitle, courseId, beginDate, completionDate,
               normalizedStatus, normalizedGrade, phoneMatchedStudentId]
            );
            pendingConfirmations += 1;
            console.log("Pending confirmation created (phone-only match)", { fullName, email, phone, phoneMatchedStudentId, courseId });
            continue;
          }

          // Tier 4c — EMAIL-ONLY MATCH: same email, different name AND phone
          // Safe auto-merge: add course history + store phone as alt; do NOT overwrite
          // the existing student's name or primary phone.
          const emailOnlyRes = await findStudentByEmailOnlyMismatch(fullName, email, phone);
          console.log("Email-only match result", {
            fullName, email, phone,
            rowCount: emailOnlyRes.rowCount,
            matchedStudent: emailOnlyRes.rows[0] || null,
          });

          if (emailOnlyRes.rowCount > 0) {
            const emailMatchedStudentId = emailOnlyRes.rows[0].id;
            const isEmailOnlyDuplicate = await hasDuplicateCourseHistory({
              studentId: emailMatchedStudentId,
              courseId, beginDate, completionDate,
              status: normalizedStatus, grade: normalizedGrade,
            });

            if (isEmailOnlyDuplicate) {
              skippedDuplicates += 1;
              console.log("Skipping duplicate CourseHistory row (email-only match)", { emailMatchedStudentId, courseId });
              continue;
            }

            await insertCourseHistory({
              studentId: emailMatchedStudentId,
              courseId, beginDate, completionDate,
              status: normalizedStatus, grade: normalizedGrade,
            });

            if (phone && normalizeField(emailOnlyRes.rows[0].phone) !== phone) {
              await addAltPhone(emailMatchedStudentId, phone);
            }
            insertedCount += 1;
            console.log("CourseHistory auto-merged (email-only match)", { emailMatchedStudentId, courseId });
            continue;
          }

          // Tier 5 — NO MATCH: create a brand-new student
          const studentRes = await pool.query(
            `INSERT INTO Student (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
            [fullName, email, phone]
          );

          const studentId = studentRes.rows[0].id;
          await insertCourseHistory({
            studentId,
            courseId,
            beginDate,
            completionDate,
            status: normalizedStatus,
            grade: normalizedGrade,
          });

          newStudentsCount += 1;
          insertedCount += 1;
          console.log(`[NEW] Student: "${fullName}" (${email}), course: "${offeringTitle}" — newStudents: ${newStudentsCount}, totalCourseRecords: ${insertedCount}`);
        }

        const requesterId = req.headers["x-user-id"];
        await logActivity(
          requesterId || null,
          "CSV_IMPORT",
          `Imported ${newStudentsCount} new students, ${insertedCount} course records, skipped ${skippedDuplicates} duplicates, ${pendingConfirmations} pending confirmations (${results.length} total rows processed)`
        );
        res.json({
          message: "Students & courses imported successfully 🎉",
          processedRows: results.length,
          newStudents: newStudentsCount,
          insertedRows: insertedCount,
          skippedDuplicates,
          pendingConfirmations,
        });
      } catch (error) {
        console.error("Error processing /upload-students:", error);
        res.status(500).json({ error: error.message });
      }
    });
});

app.post("/pending-confirmations/:id/merge", async (req, res) => {
  try {
    const pendingId = req.params.id;
    const pendingRes = await pool.query(
      `
      SELECT *
      FROM PendingStudentConfirmation
      WHERE id = $1 AND resolution_status = 'pending'
      LIMIT 1
      `,
      [pendingId]
    );

    if (pendingRes.rowCount === 0) {
      return res.status(404).json({ error: "Pending confirmation not found" });
    }

    const pending = pendingRes.rows[0];
    const targetStudentId = pending.matched_student_id;

    if (!targetStudentId) {
      return res.status(400).json({ error: "No matched student available to merge" });
    }

    // Fetch current student contact info to determine what has changed
    const studentRes = await pool.query(
      `SELECT email, phone FROM Student WHERE id = $1 LIMIT 1`,
      [targetStudentId]
    );
    if (studentRes.rowCount === 0) {
      return res.status(404).json({ error: "Matched student not found" });
    }
    const existingStudent = studentRes.rows[0];

    // Insert course history (unless it is already there)
    const isDuplicate = await hasDuplicateCourseHistory({
      studentId: targetStudentId,
      courseId: pending.course_id,
      beginDate: pending.begin_date,
      completionDate: pending.completion_date,
      status: pending.status,
      grade: pending.grade,
    });

    if (!isDuplicate) {
      await insertCourseHistory({
        studentId: targetStudentId,
        courseId: pending.course_id,
        beginDate: pending.begin_date,
        completionDate: pending.completion_date,
        status: pending.status,
        grade: pending.grade,
      });
    }

    // If the imported phone differs from the existing primary phone, record it as an alt phone
    const importedPhone = normalizeField(pending.imported_phone);
    const existingPhone = normalizeField(existingStudent.phone);
    if (importedPhone && importedPhone !== existingPhone) {
      await addAltPhone(targetStudentId, importedPhone);
      console.log("Alt phone added during pending merge", {
        targetStudentId,
        importedPhone,
        existingPhone,
      });
    }

    // If the imported email differs from the existing primary email, record it as an alt email
    const importedEmail = normalizeText(pending.imported_email);
    const existingEmail = normalizeText(existingStudent.email);
    if (importedEmail && importedEmail !== existingEmail) {
      await addAltEmail(targetStudentId, importedEmail);
      console.log("Alt email added during pending merge", {
        targetStudentId,
        importedEmail,
        existingEmail,
      });
    }

    await pool.query(
      `
      UPDATE PendingStudentConfirmation
      SET resolution_status = 'merged'
      WHERE id = $1
      `,
      [pendingId]
    );

    const mergeRequesterId = req.headers["x-user-id"];
    await logActivity(
      mergeRequesterId || null,
      "PENDING_MERGED",
      `Merged pending confirmation #${pendingId} into student ID ${targetStudentId}${importedPhone && importedPhone !== existingPhone ? ` (added alt phone: ${importedPhone})` : ""}${importedEmail && importedEmail !== existingEmail ? ` (added alt email: ${importedEmail})` : ""}`
    );
    res.json({ message: "Pending confirmation merged successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/pending-confirmations/:id/create-student", async (req, res) => {
  try {
    const pendingId = req.params.id;
    const pendingRes = await pool.query(
      `
      SELECT *
      FROM PendingStudentConfirmation
      WHERE id = $1 AND resolution_status = 'pending'
      LIMIT 1
      `,
      [pendingId]
    );

    if (pendingRes.rowCount === 0) {
      return res.status(404).json({ error: "Pending confirmation not found" });
    }

    const pending = pendingRes.rows[0];

    // Guard: reject if a student with the same name + same phone already exists.
    // Same name + same phone = same person (just a different email on record).
    // Creating a second record would be a duplicate — the admin should merge instead.
    if (pending.imported_phone) {
      const phoneConflict = await pool.query(
        `
        SELECT id, name, email, phone
        FROM Student
        WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
          AND TRIM(phone) = TRIM($2)
        LIMIT 1
        `,
        [pending.imported_name, pending.imported_phone]
      );

      if (phoneConflict.rowCount > 0) {
        const conflict = phoneConflict.rows[0];
        return res.status(409).json({
          error: `A student named "${conflict.name}" with phone ${conflict.phone} already exists (ID ${conflict.id}, email: ${conflict.email}). Use "Merge to Existing Student" instead.`,
          conflictStudentId: conflict.id,
        });
      }
    }

    const studentRes = await pool.query(
      `
      INSERT INTO Student (name, email, phone)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [pending.imported_name, pending.imported_email, pending.imported_phone]
    );

    const studentId = studentRes.rows[0].id;

    await insertCourseHistory({
      studentId,
      courseId: pending.course_id,
      beginDate: pending.begin_date,
      completionDate: pending.completion_date,
      status: pending.status,
      grade: pending.grade,
    });

    await pool.query(
      `
      UPDATE PendingStudentConfirmation
      SET resolution_status = 'created_new'
      WHERE id = $1
      `,
      [pendingId]
    );

    const createRequesterId = req.headers["x-user-id"];
    await logActivity(
      createRequesterId || null,
      "STUDENT_CREATED_FROM_PENDING",
      `Created new student "${pending.imported_name}" (${pending.imported_email}) from pending confirmation #${pendingId}`
    );
    res.json({ message: "New student created from pending confirmation" });
  } catch (error) {
    if (error.code === "23505" && error.constraint === "student_email_key") {
      return res.status(409).json({
        error:
          "A student with this email already exists. Use 'Merge to Existing Student' instead, or correct the email in the source data and re-import.",
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// Merge two existing student records: move everything from `sourceId` into `targetId`,
// then delete the source student. Used to clean up duplicates.
app.post("/students/:targetId/merge-from/:sourceId", async (req, res) => {
  const { targetId, sourceId } = req.params;

  if (String(targetId) === String(sourceId)) {
    return res.status(400).json({ error: "Source and target must be different students" });
  }

  try {
    const [targetRes, sourceRes] = await Promise.all([
      pool.query(`SELECT id, name, email, phone, alt_phones, alt_emails FROM Student WHERE id = $1 LIMIT 1`, [targetId]),
      pool.query(`SELECT id, name, email, phone, alt_phones, alt_emails FROM Student WHERE id = $1 LIMIT 1`, [sourceId]),
    ]);

    if (targetRes.rowCount === 0) return res.status(404).json({ error: "Target student not found" });
    if (sourceRes.rowCount === 0) return res.status(404).json({ error: "Source student not found" });

    const target = targetRes.rows[0];
    const source = sourceRes.rows[0];

    // Collect every phone/email from the source that the target doesn't already have
    const sourcePhones = [source.phone, ...(source.alt_phones || [])].filter(Boolean);
    const sourceEmails = [source.email, ...(source.alt_emails || [])].filter(Boolean);

    for (const phone of sourcePhones) {
      await addAltPhone(target.id, phone);
    }
    for (const email of sourceEmails) {
      await addAltEmail(target.id, email);
    }

    // Re-assign all course history rows from source → target (skip exact duplicates)
    const sourceCourses = await pool.query(
      `SELECT course_id, begin_date, completion_date, status, grade FROM CourseHistory WHERE student_id = $1`,
      [source.id]
    );

    for (const row of sourceCourses.rows) {
      const alreadyExists = await hasDuplicateCourseHistory({
        studentId: target.id,
        courseId: row.course_id,
        beginDate: row.begin_date,
        completionDate: row.completion_date,
        status: row.status,
        grade: row.grade,
      });
      if (!alreadyExists) {
        await insertCourseHistory({
          studentId: target.id,
          courseId: row.course_id,
          beginDate: row.begin_date,
          completionDate: row.completion_date,
          status: row.status,
          grade: row.grade,
        });
      }
    }

    // Update any pending confirmations that pointed at the source student
    await pool.query(
      `UPDATE PendingStudentConfirmation SET matched_student_id = $1 WHERE matched_student_id = $2`,
      [target.id, source.id]
    );

    // Delete the source student (course history was already re-assigned above)
    await pool.query(`DELETE FROM CourseHistory WHERE student_id = $1`, [source.id]);
    await pool.query(`DELETE FROM Student WHERE id = $1`, [source.id]);

    const requesterId = req.headers["x-user-id"];
    await logActivity(
      requesterId || null,
      "STUDENTS_MERGED",
      `Merged student ID ${source.id} ("${source.name}", ${source.email}) into student ID ${target.id} ("${target.name}", ${target.email})`
    );

    // Return the updated target student
    const updatedTarget = await pool.query(
      `SELECT id, name, email, phone, alt_phones, alt_emails FROM Student WHERE id = $1`,
      [target.id]
    );

    res.json({
      message: `Student "${source.name}" (ID ${source.id}) merged into "${target.name}" (ID ${target.id})`,
      student: updatedTarget.rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/auth/activity-logs", async (req, res) => {
  const requesterId = req.headers["x-user-id"];
  try {
    const authCheck = await pool.query(
      `SELECT role FROM PortalUser WHERE id = $1 LIMIT 1`,
      [requesterId]
    );
    if (authCheck.rowCount === 0 || authCheck.rows[0].role !== "super_admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const result = await pool.query(
      `SELECT id, user_id, user_name, user_email, action, details, created_at
       FROM UserActivityLog
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/students", async (req, res) => {
  try {
    await pool.query("DELETE FROM PendingStudentConfirmation");
    await pool.query("DELETE FROM CourseHistory");
    const result = await pool.query("DELETE FROM Student");

    const deleteRequesterId = req.headers["x-user-id"];
    await logActivity(
      deleteRequesterId || null,
      "ALL_DATA_DELETED",
      `Deleted all student data — ${result.rowCount} students removed`
    );
    res.json({
      message: "All student data deleted successfully",
      deletedStudents: result.rowCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 3000;

Promise.all([ensurePendingConfirmationTable(), ensurePortalUserTable(), ensureUserActivityLogTable(), ensureStudentAltContactColumns()])
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize API:", error);
    process.exit(1);
  });
