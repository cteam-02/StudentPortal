import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Filter,
  PlusCircle,
  SquarePen,
  GraduationCap
} from "lucide-react";
import AppHeader from "../../app/components/AppHeader/AppHeader.jsx";
import "./StudentProfileHistory.css";

const API_BASE_URL = "http://localhost:3000";

function StudentProfileHistory({
  student,
  onOpenDashboard,
  onOpenStudents,
  onOpenCourses,
}) {
  const displayName = student?.name || "Johnathan Doe";
  const displayEmail = student?.email || "john.doe@kugan.edu";
  const displayId = student?.id ? String(student.id).padStart(6, "0") : "128495";
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    if (!student?.id) {
      setCourses([]);
      return;
    }

    const fetchCourses = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/students/${student.id}/courses`
        );
        const data = await response.json();
        setCourses(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching student profile courses:", error);
        setCourses([]);
      }
    };

    fetchCourses();
  }, [student?.id]);

  const trainingHistory = useMemo(() => {
    return courses.map((course, index) => {
      const status = String(course.status || "").toLowerCase();
      let statusTone = "blue";
      let actionType = "download";
      let action = "Certificate";

      if (status.includes("pass") || status.includes("complete")) {
        statusTone = "green";
      } else if (status.includes("expire")) {
        statusTone = "red";
        action = "Renew";
        actionType = "renew";
      } else if (status.includes("active") || status.includes("progress")) {
        statusTone = "blue";
        action = "Locked";
        actionType = "locked";
      } else if (status.includes("pending")) {
        statusTone = "blue";
        action = "Locked";
        actionType = "locked";
      }

      return {
        courseName: course.course_title || `Course ${index + 1}`,
        courseId: `TRN-${String(student?.id || 0).padStart(4, "0")}-${String(
          index + 1
        ).padStart(3, "0")}`,
        startDate: formatDate(course.begin_date),
        completion: formatDate(course.completion_date),
        status: course.status || "Active",
        statusTone,
        grade: course.grade || "In progress",
        action,
        actionType,
      };
    });
  }, [courses, student?.id]);

  return (
    <div className="profile-shell">
      <AppHeader
        currentSection="students"
        onOpenDashboard={onOpenDashboard}
        onOpenStudents={onOpenStudents}
        onOpenCourses={onOpenCourses}
        searchPlaceholder="Search students..."
      />

      <main className="profile-main">
        <div className="profile-breadcrumb">
          <button
            type="button"
            className="profile-breadcrumb-btn"
            onClick={onOpenStudents}
          >
            Students
          </button>
          <span>&gt;</span>
          <strong>Student Profile</strong>
        </div>

        <section className="profile-card">
          <div className="profile-card-main">
            <div className="profile-photo-wrap">
              <div className="profile-photo" />
              <span className="profile-online-dot" />
            </div>

            <div className="profile-summary">
              <div className="profile-name-row">
                <h1>{displayName}</h1>
                <span className="profile-badge">Premium</span>
              </div>

              <p className="profile-meta">
                Student ID: {displayId} • {displayEmail}
              </p>

              <div className="profile-tags">
                <span className="profile-pill is-green">Active</span>
                <span className="profile-pill">Undergraduate</span>
                <span className="profile-pill">Dean&apos;s List 2024</span>
              </div>
            </div>

            <div className="profile-actions">
              <button type="button" className="profile-secondary-btn">
                <SquarePen size={15} />
                <span>Edit Profile</span>
              </button>
              <button type="button" className="profile-primary-btn">
                <PlusCircle size={15} />
                <span>Add Course</span>
              </button>
            </div>
          </div>

          <div className="profile-tabs">
            <button type="button" className="profile-tab">
              Personal Details
            </button>
            <button type="button" className="profile-tab is-active">
              Course &amp; Training History
            </button>
            <button type="button" className="profile-tab">
              Documents
            </button>
          </div>
        </section>

        <section className="profile-history-card">
          <div className="profile-history-header">
            <div className="profile-history-title">
              <GraduationCap size={16} />
              <h2>Training History</h2>
            </div>

            <div className="profile-history-tools">
              <button type="button" className="profile-tool-btn">
                <Filter size={16} />
              </button>
              <button type="button" className="profile-tool-btn">
                <Download size={16} />
              </button>
            </div>
          </div>

          <div className="profile-history-table">
            <div className="profile-history-head">
              <span>Course Name</span>
              <span>Start Date</span>
              <span>Completion</span>
              <span>Status</span>
              <span>Grade %</span>
              <span>Actions</span>
            </div>

            <div className="profile-history-body">
              {trainingHistory.length === 0 ? (
                <div className="profile-history-empty">
                  No training history found for this student.
                </div>
              ) : (
                trainingHistory.map((item) => (
                  <article key={item.courseId} className="profile-history-row">
                    <div className="profile-course-cell">
                      <strong>{item.courseName}</strong>
                      <span>ID: {item.courseId}</span>
                    </div>
                    <div>{item.startDate}</div>
                    <div>{item.completion}</div>
                    <div>
                      <span className={`profile-status is-${item.statusTone}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="profile-grade">{item.grade}</div>
                    <div>
                      <button
                        type="button"
                        className={`profile-action-link is-${item.actionType}`}
                      >
                        {item.actionType === "download" && (
                          <Download size={14} />
                        )}
                        {item.actionType === "locked" && <Lock size={14} />}
                        {item.actionType === "renew" && <RefreshCw size={14} />}
                        <span>{item.action}</span>
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="profile-history-footer">
            <p>Showing {trainingHistory.length} courses</p>
            <div className="profile-history-pagination">
              <button type="button" className="profile-page-btn">
                Previous
              </button>
              <button type="button" className="profile-page-btn is-active">
                Next
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="profile-footer">
        <p>&copy; 2024 Kugan &amp; Associates. All rights reserved.</p>
        <div>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export default StudentProfileHistory;
