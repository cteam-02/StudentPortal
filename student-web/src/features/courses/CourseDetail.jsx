import { BookOpen, SquarePen } from "lucide-react";
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
  const title = course?.title || "Untitled course";
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
  const status = course?.isActive ? "Active" : "Idle";

  return (
    <div className="course-detail-shell">
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

      <main className="course-detail-main">
        <div className="course-detail-breadcrumb">
          <button
            type="button"
            className="course-detail-breadcrumb-btn"
            onClick={onOpenCourses}
          >
            Courses
          </button>
          <span>&gt;</span>
          <strong>Course Detail</strong>
        </div>

        <section className="course-detail-hero">
          <div className="course-detail-title-wrap">
            <div className="course-detail-icon">
              <BookOpen size={22} />
            </div>
            <div>
              <p className="course-detail-kicker">Course overview</p>
              <h1>{title}</h1>
              {descriptionHtml ? (
                <div
                  className="course-detail-subtitle course-detail-description"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              ) : (
                <p className="course-detail-subtitle">
                  No description available for this course yet.
                </p>
              )}
            </div>
          </div>

          <button type="button" className="course-detail-edit-btn">
            <SquarePen size={16} />
            <span>Edit Course</span>
          </button>
        </section>

        <section className="course-detail-grid">
          <article className="course-detail-card">
            <h2>Course Information</h2>
            <div className="course-detail-meta-list">
              <DetailRow label="Course ID" value={`CRS-${String(course?.id || 0).padStart(3, "0")}`} />
              <DetailRow label="Instructor" value={instructor} />
              <DetailRow label="Passing Grade" value={passingGrade} />
              <DetailRow label="Status" value={status} />
            </div>
          </article>

          <article className="course-detail-card">
            <h2>Catalog Activity</h2>
            <div className="course-detail-stats">
              <div>
                <span>Total Enrollments</span>
                <strong>{enrollmentCount.toLocaleString()}</strong>
              </div>
              <div>
                <span>Active Enrollments</span>
                <strong>{activeEnrollments.toLocaleString()}</strong>
              </div>
              <div>
                <span>Last Activity</span>
                <strong>{latestActivity}</strong>
              </div>
            </div>
          </article>
        </section>

      </main>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="course-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatPassingGrade(course) {
  const value =
    course?.passing_grade ??
    course?.passingGrade ??
    course?.grade_threshold ??
    null;

  if (value === null || value === undefined || value === "") {
    return "Not set";
  }

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
