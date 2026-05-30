import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  Mail,
  Phone,
  UserRound
} from "lucide-react";
import AppHeader from "../../app/components/AppHeader/AppHeader.jsx";
import "./StudentProfileHistory.css";

const API_BASE_URL = "http://localhost:3000";

function StudentProfileHistory({
  currentUser,
  student,
  onOpenDashboard,
  onOpenStudents,
  onOpenCourses,
  onOpenPending,
  onOpenUsers,
  onLogout,
}) {
  const [fullStudent, setFullStudent] = useState(student || null);
  const [courses, setCourses] = useState([]);

  const displayName = fullStudent?.name || student?.name || "Student";
  const displayId = (fullStudent?.id ?? student?.id)
    ? String(fullStudent?.id ?? student?.id).padStart(6, "0")
    : "Unavailable";

  // All emails: primary + any alt emails
  const allEmails = useMemo(() => {
    const primary = fullStudent?.email || student?.email;
    const alts = Array.isArray(fullStudent?.alt_emails) ? fullStudent.alt_emails : [];
    return [primary, ...alts].filter(Boolean);
  }, [fullStudent, student]);

  // All phones: primary + any alt phones
  const allPhones = useMemo(() => {
    const primary = fullStudent?.phone || student?.phone;
    const alts = Array.isArray(fullStudent?.alt_phones) ? fullStudent.alt_phones : [];
    return [primary, ...alts].filter(Boolean);
  }, [fullStudent, student]);

  useEffect(() => {
    const studentId = student?.id;
    if (!studentId) {
      setCourses([]);
      return;
    }

    const fetchStudentData = async () => {
      try {
        const [studentRes, coursesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/students/${studentId}`),
          fetch(`${API_BASE_URL}/students/${studentId}/courses`),
        ]);
        const studentData = await studentRes.json();
        const coursesData = await coursesRes.json();
        if (studentRes.ok) setFullStudent(studentData);
        setCourses(Array.isArray(coursesData) ? coursesData : []);
      } catch (error) {
        console.error("Error fetching student profile:", error);
        setCourses([]);
      }
    };

    fetchStudentData();
  }, [student?.id]);

  const trainingHistory = useMemo(() => {
    return courses.map((course, index) => {
      const status = String(course.status || "").toLowerCase();
      let statusTone = "blue";

      if (status.includes("pass") || status.includes("complete")) {
        statusTone = "green";
      } else if (status.includes("expire")) {
        statusTone = "red";
      } else if (status.includes("active") || status.includes("progress")) {
        statusTone = "blue";
      } else if (status.includes("pending")) {
        statusTone = "blue";
      }

      return {
        courseName: course.course_title || `Course ${index + 1}`,
        startDate: formatDate(course.begin_date),
        completion: formatDate(course.completion_date),
        status: course.status || "Status unavailable",
        statusTone,
        grade: course.grade || "N/A",
      };
    });
  }, [courses]);

  const completedCourses = useMemo(() => {
    return courses.filter((course) => {
      const status = String(course.status || "").toLowerCase();
      return (
        status.includes("complete") ||
        status.includes("completed") ||
        status.includes("pass") ||
        status.includes("finished") ||
        Boolean(course.completion_date)
      );
    }).length;
  }, [courses]);

  return (
    <div className="profile-shell">
      <AppHeader
        currentSection="students"
        currentUser={currentUser}
        onOpenDashboard={onOpenDashboard}
        onOpenStudents={onOpenStudents}
        onOpenCourses={onOpenCourses}
        onOpenPending={onOpenPending}
        onOpenUsers={onOpenUsers}
        onLogout={onLogout}
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
              <div className="profile-photo">
                <div className="profile-photo-placeholder">
                  <UserRound size={28} />
                </div>
              </div>
            </div>

            <div className="profile-summary">
              <div className="profile-name-row">
                <h1>{displayName}</h1>
              </div>

              <p className="profile-meta">Student ID: {displayId}</p>

              <div className="profile-contact-list">
                {allEmails.map((email, index) => (
                  <div key={email} className="profile-contact-item">
                    <Mail size={13} strokeWidth={2} />
                    <span>{email}</span>
                    {index === 0 && allEmails.length > 1 && (
                      <span className="profile-contact-badge">Primary</span>
                    )}
                    {index > 0 && (
                      <span className="profile-contact-badge is-alt">Alt</span>
                    )}
                  </div>
                ))}
                {allPhones.map((phone, index) => (
                  <div key={phone} className="profile-contact-item">
                    <Phone size={13} strokeWidth={2} />
                    <span>{phone}</span>
                    {index === 0 && allPhones.length > 1 && (
                      <span className="profile-contact-badge">Primary</span>
                    )}
                    {index > 0 && (
                      <span className="profile-contact-badge is-alt">Alt</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="profile-summary-stats">
                <span>{courses.length} courses</span>
                <span>{completedCourses} completed</span>
              </div>
            </div>
          </div>
        </section>

        <section className="profile-history-card">
          <div className="profile-history-header">
            <div className="profile-history-title">
              <GraduationCap size={16} />
              <h2>Training History</h2>
            </div>
          </div>

          <div className="profile-history-table">
            <div className="profile-history-head">
              <span>Course Name</span>
              <span>Start Date</span>
              <span>Completion</span>
              <span>Status</span>
              <span>Grade %</span>
            </div>

            <div className="profile-history-body">
              {trainingHistory.length === 0 ? (
                <div className="profile-history-empty">
                  No training history found for this student.
                </div>
              ) : (
                trainingHistory.map((item) => (
                  <article key={`${item.courseName}-${item.startDate}-${item.completion}`} className="profile-history-row">
                    <div className="profile-course-cell">
                      <strong>{item.courseName}</strong>
                    </div>
                    <div>{item.startDate}</div>
                    <div>{item.completion}</div>
                    <div>
                      <span className={`profile-status is-${item.statusTone}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="profile-grade">{item.grade}</div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="profile-history-footer">
            <p>Showing {trainingHistory.length} courses</p>
          </div>
        </section>
      </main>
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
