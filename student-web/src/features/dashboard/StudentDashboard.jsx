import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  FileUp,
  GraduationCap,
  Trash2,
  Users,
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AppHeader from "../../app/components/AppHeader/AppHeader.jsx";
import "./StudentDashboard.css";

const API_BASE_URL = "http://localhost:3000";

function StudentDashboard({
  currentUser,
  onOpenStudents,
  onOpenCourses,
  onOpenPending,
  onOpenUsers,
  onLogout,
  onOpenProfile,
  focusedStudentId,
  onFocusedStudentHandled,
}) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [orgStats, setOrgStats] = useState({
    totalStudents: 0,
    totalEnrollments: 0,
    pendingConfirmations: 0,
    totalCourses: 0,
  });

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

  const fetchOrgStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stats`);
      const data = await response.json();
      setOrgStats(data);
    } catch (error) {
      console.error("Error fetching org stats:", error);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchOrgStats();
  }, []);

  useEffect(() => {
    if (!focusedStudentId || students.length === 0) return;

    const matchedStudent = students.find((student) => student.id === focusedStudentId);
    if (matchedStudent) {
      loadCourses(matchedStudent);
      onFocusedStudentHandled?.();
    }
  }, [focusedStudentId, students, onFocusedStudentHandled]);

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
        headers: { "x-user-id": String(currentUser?.id ?? "") },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      await Promise.all([fetchStudents(), fetchOrgStats()]);

      const pendingText =
        result.pendingConfirmations > 0
          ? `, sent ${result.pendingConfirmations} to pending review`
          : "";

      const newStudents = result.newStudents ?? 0;
      const courseRecords = result.insertedRows ?? 0;
      const skipped = result.skippedDuplicates ?? 0;

      toast.success(
        `${newStudents} new student${newStudents !== 1 ? "s" : ""} · ${courseRecords} course record${courseRecords !== 1 ? "s" : ""} imported, ${skipped} skipped${pendingText}`
      );
    } catch (error) {
      console.error("Error uploading students:", error);
      toast.error(error.message || "Failed to upload students");
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
        headers: { "x-user-id": String(currentUser?.id ?? "") },
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      await response.json();
      setStudents([]);
      setSelectedStudent(null);
      setCourses([]);
      await fetchOrgStats();
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
        currentUser={currentUser}
        onOpenDashboard={() => {}}
        onOpenStudents={onOpenStudents}
        onOpenCourses={onOpenCourses}
        onOpenPending={onOpenPending}
        onOpenUsers={onOpenUsers}
        onLogout={onLogout}
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
              Import student data, monitor org-wide enrollment stats, and
              quickly look up individual students.
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
            <strong>{orgStats.totalStudents.toLocaleString()}</strong>
          </article>

          <article className="dashboard-summary-card">
            <div className="dashboard-summary-icon">
              <BookOpen size={18} />
            </div>
            <span>Total Enrollments</span>
            <strong>{orgStats.totalEnrollments.toLocaleString()}</strong>
          </article>

          <article className="dashboard-summary-card">
            <div className="dashboard-summary-icon">
              <GraduationCap size={18} />
            </div>
            <span>Courses in Catalog</span>
            <strong>{orgStats.totalCourses.toLocaleString()}</strong>
          </article>

          <article className="dashboard-summary-card">
            <div className="dashboard-summary-icon">
              <AlertCircle size={18} />
            </div>
            <span>Pending Reviews</span>
            <strong>{orgStats.pendingConfirmations.toLocaleString()}</strong>
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
                    ? "Quick overview — open the full profile for course history"
                    : "Choose a student from the left to see their details"}
                </p>
              </div>
            </div>

            {!selectedStudent ? (
              <div className="dashboard-empty-block">
                <div className="dashboard-empty-icon">
                  <Users size={22} />
                </div>
                <h3>No student selected</h3>
                <p>
                  Pick a student from the list to see their identity details
                  and open their full training profile.
                </p>
              </div>
            ) : (
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
                  <span>{courses.length} course{courses.length !== 1 ? "s" : ""}</span>
                  <span>{completedCourses} completed</span>
                  <span>{activeCourses} active</span>
                </div>

                <button
                  type="button"
                  className="dashboard-profile-btn"
                  onClick={() => onOpenProfile?.(selectedStudent)}
                >
                  <span>Open Full Profile</span>
                  <ArrowRight size={15} />
                </button>
              </div>
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

export default StudentDashboard;
