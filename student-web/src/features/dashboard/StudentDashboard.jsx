import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Download,
  FileUp,
  Trash2,
  Users,
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AppHeader from "../../app/components/AppHeader/AppHeader.jsx";
import "./StudentDashboard.css";

const API_BASE_URL = "http://localhost:3000";

function StudentDashboard({
  onOpenStudents,
  onOpenCourses,
  onOpenProfile,
  focusedStudentId,
}) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/students`);
      const data = await response.json();
      setStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to load students");
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!focusedStudentId || students.length === 0) return;

    const matchedStudent = students.find((student) => student.id === focusedStudentId);
    if (matchedStudent) {
      loadCourses(matchedStudent);
    }
  }, [focusedStudentId, students]);

  const loadCourses = async (student) => {
    try {
      setSelectedStudent(student);

      const response = await fetch(`${API_BASE_URL}/students/${student.id}/courses`);
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to load courses");
    }
  };

  const uploadStudentCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/upload-students`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      await response.json();
      await fetchStudents();
      toast.success("Students uploaded successfully");
    } catch (error) {
      console.error("Error uploading students:", error);
      toast.error("Failed to upload students");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const deleteAllStudentData = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/students`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      await response.json();
      setStudents([]);
      setSelectedStudent(null);
      setCourses([]);
      toast.success("All student data deleted successfully");
    } catch (error) {
      console.error("Error deleting all student data:", error);
      toast.error("Failed to delete all student data");
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return students;

    return students.filter((student) => {
      return (
        student.name?.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query) ||
        student.phone?.toLowerCase().includes(query) ||
        String(student.id).includes(query)
      );
    });
  }, [searchQuery, students]);

  const completedCourses = courses.filter(isCompletedCourse).length;

  const activeCourses = courses.filter((course) => {
    const status = String(course.status || "").toLowerCase();
    return status.includes("active") || status.includes("progress");
  }).length;

  const studentPreview = filteredStudents.slice(0, 8);

  return (
    <div className="dashboard-shell">
      <ToastContainer position="top-right" autoClose={3000} />
      <AppHeader
        currentSection="dashboard"
        onOpenDashboard={() => {}}
        onOpenStudents={onOpenStudents}
        onOpenCourses={onOpenCourses}
        searchPlaceholder="Search students, email, phone..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="dashboard-main">
        <section className="dashboard-hero">
          <div>
            <p className="dashboard-kicker">Overview</p>
            <h1>Student Dashboard</h1>
            <p className="dashboard-subtitle">
              Manage imports, review students, and inspect real course history
              from one place.
            </p>
          </div>

          <div className="dashboard-hero-actions">
            <label className="dashboard-primary-btn dashboard-upload-btn">
              <input
                type="file"
                accept=".csv"
                onChange={uploadStudentCSV}
                disabled={loading}
              />
              <FileUp size={16} />
              <span>{loading ? "Uploading..." : "Import Students CSV"}</span>
            </label>

            <button
              type="button"
              className="dashboard-secondary-btn"
              onClick={deleteAllStudentData}
              disabled={loading || students.length === 0}
            >
              <Trash2 size={16} />
              <span>Delete All Data</span>
            </button>
          </div>
        </section>

        <section className="dashboard-summary-grid">
          <article className="dashboard-summary-card">
            <div className="dashboard-summary-icon">
              <Users size={18} />
            </div>
            <span>Total Students</span>
            <strong>{students.length.toLocaleString()}</strong>
          </article>

          <article className="dashboard-summary-card">
            <div className="dashboard-summary-icon">
              <BookOpen size={18} />
            </div>
            <span>Selected Courses</span>
            <strong>{courses.length.toLocaleString()}</strong>
          </article>

          <article className="dashboard-summary-card">
            <div className="dashboard-summary-icon">
              <Download size={18} />
            </div>
            <span>Completed Courses</span>
            <strong>{completedCourses.toLocaleString()}</strong>
          </article>

          <article className="dashboard-summary-card">
            <div className="dashboard-summary-icon">
              <ArrowRight size={18} />
            </div>
            <span>Active Courses</span>
            <strong>{activeCourses.toLocaleString()}</strong>
          </article>
        </section>

        <section className="dashboard-layout">
          <article className="dashboard-panel dashboard-list-panel">
            <div className="dashboard-panel-header">
              <div>
                <h2>Students</h2>
                <p>{filteredStudents.length} matching records</p>
              </div>

              <button
                type="button"
                className="dashboard-inline-link"
                onClick={onOpenStudents}
              >
                View full directory
              </button>
            </div>

            <div className="dashboard-student-list">
              {studentPreview.length === 0 ? (
                <p className="dashboard-empty-state">
                  No students found. Import a CSV or adjust the search.
                </p>
              ) : (
                studentPreview.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    className={`dashboard-student-item${
                      selectedStudent?.id === student.id ? " is-selected" : ""
                    }`}
                    onClick={() => loadCourses(student)}
                  >
                    <div className="dashboard-student-main">
                      <div className="dashboard-student-avatar">
                        {getInitials(student.name)}
                      </div>
                      <div className="dashboard-student-copy">
                        <strong>{student.name || "Unnamed student"}</strong>
                        <span>{student.email || "No email"}</span>
                      </div>
                    </div>
                    <span className="dashboard-student-meta">
                      {student.phone || `ID ${student.id}`}
                    </span>
                  </button>
                ))
              )}
            </div>
          </article>

          <article className="dashboard-panel dashboard-detail-panel">
            <div className="dashboard-panel-header">
              <div>
                <h2>Student Record</h2>
                <p>
                  {selectedStudent
                    ? "Current selection and course history"
                    : "Choose a student to inspect their details"}
                </p>
              </div>

              {selectedStudent && (
                <button
                  type="button"
                  className="dashboard-inline-link"
                  onClick={() => onOpenProfile?.(selectedStudent)}
                >
                  Open profile
                </button>
              )}
            </div>

            {!selectedStudent ? (
              <div className="dashboard-empty-block">
                <div className="dashboard-empty-icon">
                  <Users size={22} />
                </div>
                <h3>No student selected</h3>
                <p>
                  Pick a student from the left panel to load real course
                  history, grades, and completion dates.
                </p>
              </div>
            ) : (
              <>
                <div className="dashboard-record-card">
                  <div className="dashboard-student-hero">
                    <div className="dashboard-student-avatar large">
                      {getInitials(selectedStudent.name)}
                    </div>
                    <div className="dashboard-student-hero-copy">
                      <span className="dashboard-student-label">
                        Selected student
                      </span>
                      <h3>{selectedStudent.name}</h3>
                      <p>{selectedStudent.email || "No email on file"}</p>
                    </div>
                  </div>

                  <div className="dashboard-student-badges">
                    <span>ID {selectedStudent.id}</span>
                    <span>{selectedStudent.phone || "Phone unavailable"}</span>
                    <span>{courses.length} courses</span>
                    <span>{completedCourses} completed</span>
                  </div>
                </div>

                <div className="dashboard-course-section">
                  <div className="dashboard-course-heading">
                    <h3>Course History</h3>
                    <span>{courses.length} records</span>
                  </div>

                  {courses.length === 0 ? (
                    <p className="dashboard-empty-state">
                      No course history found for this student.
                    </p>
                  ) : (
                    <div className="dashboard-course-list">
                      {courses.map((course, index) => (
                        <div
                          key={`${course.course_title || "course"}-${index}`}
                          className="dashboard-course-item"
                        >
                          <div className="dashboard-course-main">
                            <strong>{course.course_title || "Untitled course"}</strong>
                            <div className="dashboard-course-meta">
                              <span className="dashboard-course-grade">
                                Grade {course.grade || "N/A"}
                              </span>
                              <span
                                className={`dashboard-course-status ${getStatusTone(
                                  course.status
                                )}`}
                              >
                                {course.status || "Status unavailable"}
                              </span>
                            </div>
                          </div>
                          <div className="dashboard-course-dates">
                            <span>Start: {formatDateTime(course.begin_date)}</span>
                            <span>End: {formatDateTime(course.completion_date)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}

function getInitials(name) {
  if (!name) return "S";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDateTime(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isCompletedCourse(course) {
  const status = String(course?.status || "").toLowerCase();

  if (
    status.includes("complete") ||
    status.includes("completed") ||
    status.includes("pass") ||
    status.includes("finished")
  ) {
    return true;
  }

  return Boolean(course?.completion_date);
}

function getStatusTone(status) {
  const value = String(status || "").toLowerCase();

  if (value.includes("complete") || value.includes("pass")) {
    return "is-complete";
  }

  if (value.includes("active") || value.includes("progress")) {
    return "is-active";
  }

  if (value.includes("pending")) {
    return "is-pending";
  }

  return "is-neutral";
}

export default StudentDashboard;
