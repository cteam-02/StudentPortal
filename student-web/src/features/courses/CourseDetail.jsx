import { BookOpen, Calendar, ChevronRight, GraduationCap, Users } from "lucide-react";
import AppHeader from "../../app/components/AppHeader/AppHeader.jsx";
import "./CourseDetail.css";

function CourseDetail({
  currentUser,
  course,
  onOpenDashboard,
  onOpenStudents,
  onOpenCourses,
  onOpenPending,
  onOpenUsers,
  onLogout,
}) {
  const title = course?.title || "Untitled Course";
  const descriptionHtml =
    course?.description ||
    course?.course_description ||
    course?.courseDescription ||
    "";
  const instructor =
    course?.instructor_name ||
    course?.instructorName ||
    course?.instructor ||
    "Not assigned";
  const passingGrade = formatPassingGrade(course);
  const enrollmentCount = course?.enrollmentCount ?? 0;
  const activeEnrollments = course?.activeEnrollments ?? 0;
  const latestActivity = formatDate(course?.latestActivity);
  const isActive = course?.isActive ?? false;
  const courseId = `CRS-${String(course?.id || 0).padStart(3, "0")}`;

  const completionRate =
    enrollmentCount > 0
      ? Math.round(((enrollmentCount - activeEnrollments) / enrollmentCount) * 100)
      : 0;

  return (
    <div className="cd-shell">
      <AppHeader
        currentSection="courses"
        currentUser={currentUser}
        onOpenDashboard={onOpenDashboard}
        onOpenStudents={onOpenStudents}
        onOpenCourses={onOpenCourses}
        onOpenPending={onOpenPending}
        onOpenUsers={onOpenUsers}
        onLogout={onLogout}
        searchPlaceholder="Search courses..."
      />

      <main className="cd-main">
        {/* Breadcrumb */}
        <nav className="cd-breadcrumb">
          <button type="button" className="cd-breadcrumb-btn" onClick={onOpenCourses}>
            Courses
          </button>
          <ChevronRight size={13} strokeWidth={2.5} />
          <span>{title}</span>
        </nav>

        {/* Hero banner */}
        <section className="cd-hero">
          <div className="cd-hero-left">
            <div className="cd-hero-icon">
              <BookOpen size={26} />
            </div>
            <div className="cd-hero-copy">
              <div className="cd-hero-meta">
                <span className="cd-course-id">{courseId}</span>
                <span className={`cd-status-badge ${isActive ? "is-active" : "is-idle"}`}>
                  {isActive ? "Active" : "Idle"}
                </span>
              </div>
              <h1 className="cd-title">{title}</h1>
              <p className="cd-instructor">
                <GraduationCap size={14} strokeWidth={2} />
                {instructor}
              </p>
            </div>
          </div>

        </section>

        {/* Stats row */}
        <section className="cd-stats-row">
          <div className="cd-stat">
            <div className="cd-stat-icon is-blue">
              <Users size={16} />
            </div>
            <div>
              <strong>{enrollmentCount.toLocaleString()}</strong>
              <span>Total Enrollments</span>
            </div>
          </div>
          <div className="cd-stat">
            <div className="cd-stat-icon is-green">
              <Users size={16} />
            </div>
            <div>
              <strong>{activeEnrollments.toLocaleString()}</strong>
              <span>Active Enrollments</span>
            </div>
          </div>
          <div className="cd-stat">
            <div className="cd-stat-icon is-purple">
              <GraduationCap size={16} />
            </div>
            <div>
              <strong>{completionRate}%</strong>
              <span>Completion Rate</span>
            </div>
          </div>
          <div className="cd-stat">
            <div className="cd-stat-icon is-orange">
              <Calendar size={16} />
            </div>
            <div>
              <strong className="cd-stat-date">{latestActivity}</strong>
              <span>Last Activity</span>
            </div>
          </div>
        </section>

        {/* Body grid */}
        <div className="cd-body-grid">

          {/* Description card */}
          <article className="cd-card cd-description-card">
            <h2 className="cd-card-title">Course Description</h2>
            {descriptionHtml ? (
              <div
                className="cd-html-body"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            ) : (
              <p className="cd-empty-text">No description has been added for this course yet.</p>
            )}
          </article>

          {/* Side column */}
          <aside className="cd-aside">

            {/* Course info */}
            <article className="cd-card">
              <h2 className="cd-card-title">Course Information</h2>
              <dl className="cd-info-list">
                <InfoRow label="Course ID" value={courseId} />
                <InfoRow label="Instructor" value={instructor} />
                <InfoRow label="Passing Grade" value={passingGrade} />
                <InfoRow
                  label="Status"
                  value={
                    <span className={`cd-status-badge ${isActive ? "is-active" : "is-idle"}`}>
                      {isActive ? "Active" : "Idle"}
                    </span>
                  }
                />
              </dl>
            </article>

            {/* Enrollment summary */}
            <article className="cd-card cd-enrollment-card">
              <h2 className="cd-card-title">Enrollment Summary</h2>
              <div className="cd-progress-wrap">
                <div className="cd-progress-labels">
                  <span>Completion</span>
                  <span>{completionRate}%</span>
                </div>
                <div className="cd-progress-bar">
                  <div
                    className="cd-progress-fill"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
              <dl className="cd-info-list" style={{ marginTop: "16px" }}>
                <InfoRow label="Total" value={enrollmentCount.toLocaleString()} />
                <InfoRow label="Active" value={activeEnrollments.toLocaleString()} />
                <InfoRow
                  label="Completed"
                  value={(enrollmentCount - activeEnrollments).toLocaleString()}
                />
              </dl>
            </article>

          </aside>
        </div>
      </main>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="cd-info-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatPassingGrade(course) {
  const value =
    course?.passing_grade ??
    course?.passingGrade ??
    course?.grade_threshold ??
    null;
  if (value === null || value === undefined || value === "") return "Not set";
  return String(value).includes("%") ? String(value) : `${value}%`;
}

function formatDate(value) {
  if (!value) return "No activity yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default CourseDetail;
