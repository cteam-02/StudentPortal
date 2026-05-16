const express = require("express");
const pool = require("./db");
const cors = require("cors");
require("dotenv").config();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
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

app.get("/", (req, res) => {
  res.send("Student API is running");
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
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


app.post("/upload-students", upload.single("file"), async (req, res) => {
  const results = [];
  let insertedCount = 0;
  let skippedDuplicates = 0;

  console.log("NEW upload-students API running");

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (row) => {
      const cleanRow = {};

      Object.keys(row).forEach((key) => {
        const cleanKey = key
          .replace(/^\uFEFF/, "")
          .trim()
          .toLowerCase();

        cleanRow[cleanKey] = row[key];
      });

      console.log("CSV keys:", Object.keys(cleanRow));
      console.log("Sample row:", cleanRow);

      results.push(cleanRow);
    })
    .on("end", async () => {
      try {
        for (const row of results) {
          const offeringTitle = row["offering title"]?.trim();
          const email = row["student email"]?.toLowerCase().trim();
          const beginDate = parseCsvDateTime(row["begin date"]);
          const completionDate = parseCsvDateTime(row["completion date"]);

          if (!offeringTitle) {
            throw new Error("Offering Title is missing in CSV");
          }

          if (!email) {
            throw new Error("Student Email is missing in CSV");
          }

          console.log("Raw begin date:", row["begin date"]);
          console.log("Raw completion date:", row["completion date"]);
          console.log("Parsed begin date:", beginDate);
          console.log("Parsed completion date:", completionDate);

          const studentRes = await pool.query(
            `
            INSERT INTO Student (name, email, phone)
            VALUES ($1, $2, $3)
            ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
            `,
            [
              `${row["student first name"] || ""} ${row["student last name"] || ""}`.trim(),
              email,
              row["phone number"],
            ]
          );

          const studentId = studentRes.rows[0].id;

          const courseRes = await pool.query(
            `
            SELECT id, title
            FROM Course
            WHERE LOWER(TRIM(title)) = LOWER(TRIM($1))
            `,
            [offeringTitle]
          );

          if (courseRes.rowCount === 0) {
            throw new Error(`Course not found: ${offeringTitle}`);
          }

          const courseId = courseRes.rows[0].id;
          const normalizedStatus = normalizeField(row["status"]);
          const normalizedGrade = normalizeField(row["grade"]);

          console.log("CourseHistory insert payload:", {
            studentId,
            courseId,
            beginDate,
            completionDate,
            status: normalizedStatus,
            grade: normalizedGrade,
          });

          const duplicateHistoryRes = await pool.query(
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
            [
              studentId,
              courseId,
              beginDate,
              completionDate,
              normalizedStatus,
              normalizedGrade,
            ]
          );

          if (duplicateHistoryRes.rowCount > 0) {
            console.log("Skipping duplicate CourseHistory row", {
              studentId,
              courseId,
              beginDate,
              completionDate,
            });
            skippedDuplicates += 1;
            continue;
          }

          await pool.query(
            `
INSERT INTO CourseHistory
  (student_id, course_id, begin_date, completion_date, status, grade)
VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
              studentId,
              courseId,
              beginDate,
              completionDate,
              normalizedStatus,
              normalizedGrade,
            ]
          );
          insertedCount += 1;
        }

        res.json({
          message: "Students & courses imported successfully 🎉",
          processedRows: results.length,
          insertedRows: insertedCount,
          skippedDuplicates,
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
});

// app.delete("/students/:id", async (req, res) => {
//   try {
//     const studentId = req.params.id;

//     // 🔥 First delete course history (FK constraint)
//     await pool.query(
//       "DELETE FROM CourseHistory WHERE student_id = $1",
//       [studentId]
//     );

//     // 🔥 Then delete student
//     const result = await pool.query(
//       "DELETE FROM Student WHERE id = $1 RETURNING *",
//       [studentId]
//     );

//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: "Student not found" });
//     }

//     res.json({ message: "Student deleted successfully" });

//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

app.delete("/students", async (req, res) => {
  try {
    await pool.query("DELETE FROM CourseHistory");
    const result = await pool.query("DELETE FROM Student");

    res.json({
      message: "All student data deleted successfully",
      deletedStudents: result.rowCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
