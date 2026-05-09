import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Plus,
  Search,
  SquarePen,
} from "lucide-react";
import "./coursesCatalog.css";

const API_BASE_URL = "http://localhost:3000";
const pageSize = 10;

function CoursesCatalog({ onOpenDashboard, onOpenStudents, onOpenCourseDetail }) {
  const [courses, setCourses] = useState([]);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoursesData = async () => {
      try {
        setLoading(true);

        const [coursesResponse, studentsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/courses`),
          fetch(`${API_BASE_URL}/students`),
        ]);

        const courseList = await coursesResponse.json();
        const studentList = await studentsResponse.json();

        const historiesByStudent = await Promise.all(
          studentList.map(async (student) => {
            try {
              const response = await fetch(
                `${API_BASE_URL}/students/${student.id}/courses`
              );
              const history = await response.json();
              return Array.isArray(history) ? history : [];
            } catch (error) {
              console.error(
                `Error fetching course history for student ${student.id}:`,
                error
              );
              return [];
            }
          })
        );

        const allHistory = historiesByStudent.flat();

        const enrichedCourses = (Array.isArray(courseList) ? courseList : []).map(
          (course) => {
            const relatedHistory = allHistory.filter(
              (entry) =>
                normalizeTitle(entry.course_title) === normalizeTitle(course.title)
            );

            const latestActivity = relatedHistory.reduce((latest, entry) => {
              const entryDate =
                entry.completion_date || entry.begin_date || null;
              if (!entryDate) return latest;
              if (!latest) return entryDate;
              return new Date(entryDate) > new Date(latest) ? entryDate : latest;
            }, null);

            const activeEnrollments = relatedHistory.filter((entry) =>
              isActiveStatus(entry.status)
            ).length;

            return {
              ...course,
              enrollmentCount: relatedHistory.length,
              activeEnrollments,
              latestActivity,
              isActive:
                activeEnrollments > 0 ||
                relatedHistory.some((entry) => Boolean(entry.completion_date)),
            };
          }
        );

        setCourses(enrichedCourses);
      } catch (error) {
        console.error("Error fetching courses catalog:", error);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCoursesData();
  }, []);

  const filteredCourses = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return courses;

    return courses.filter((course) => {
      return (
        String(course.id).includes(normalized) ||
        course.title?.toLowerCase().includes(normalized) ||
        getCourseDescription(course).toLowerCase().includes(normalized) ||
        getInstructorName(course).toLowerCase().includes(normalized)
      );
    });
  }, [courses, query]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedCourses = filteredCourses.slice(
    startIndex,
    startIndex + pageSize
  );

  const activeCatalogCount = courses.filter((course) => course.isActive).length;
  const totalEnrollments = courses.reduce(
    (sum, course) => sum + course.enrollmentCount,
    0
  );
  const recentUpdates = courses.filter((course) =>
    isInLastThirtyDays(course.latestActivity)
  ).length;

  return (
    <div className="catalog-shell">
      <header className="catalog-topbar">
        <button type="button" className="catalog-brand catalog-plain-btn">
          <div className="catalog-brand-icon">
            <GraduationCap size={15} />
          </div>
          <span>Kugan &amp; Associates</span>
        </button>

        <label className="catalog-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search courses..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <nav className="catalog-nav">
          <button
            type="button"
            className="catalog-nav-link"
            onClick={onOpenDashboard}
          >
            Dashboard
          </button>
          <button
            type="button"
            className="catalog-nav-link is-active"
          >
            Courses Catalog
          </button>
          <button
            type="button"
            className="catalog-nav-link"
            onClick={onOpenStudents}
          >
            Student Profiles
          </button>
          <button
            type="button"
            className="catalog-nav-link"
            onClick={onOpenStudents}
          >
            Training History
          </button>
        </nav>
      </header>

      <main className="catalog-main">
        <section className="catalog-hero">
          <div>
            <h1>Courses Catalog</h1>
            <p>
              Browse the real course catalog, review current usage, and track
              recent training activity from your database.
            </p>
          </div>

          <button type="button" className="catalog-primary-btn">
            <Plus size={16} />
            <span>Add New Course</span>
          </button>
        </section>

        <section className="catalog-table-card">
          <div className="catalog-table-header">
            <span>Course Name</span>
            <span>Instructor</span>
            <span>Passing Grade</span>
            <span>Enrollments</span>
            <span>Actions</span>
          </div>

          <div className="catalog-table-body">
            {loading ? (
              <div className="catalog-empty-state">Loading courses...</div>
            ) : paginatedCourses.length === 0 ? (
              <div className="catalog-empty-state">No courses found.</div>
            ) : (
              paginatedCourses.map((course) => (
                <article
                  key={course.id}
                  className="catalog-row"
                  onClick={() => onOpenCourseDetail?.(course)}
                >
                  <div className="catalog-course-cell">
                    <div className="catalog-course-icon">
                      <BookOpen size={16} />
                    </div>
                    <div className="catalog-course-copy">
                      <strong>{course.title || "Untitled course"}</strong>
                      <span>
                        {course.enrollmentCount > 0
                          ? `${course.activeEnrollments} active enrollments`
                          : "No enrollments yet"}
                      </span>
                    </div>
                  </div>

                  <div className="catalog-muted-cell">
                    {getInstructorName(course) || "Not assigned"}
                  </div>

                  <div className="catalog-muted-cell">
                    {formatPassingGrade(course)}
                  </div>

                  <div className="catalog-muted-cell">
                    {course.enrollmentCount.toLocaleString()}
                  </div>

                  <button
                    type="button"
                    className="catalog-link-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenCourseDetail?.(course);
                    }}
                  >
                    <SquarePen size={14} />
                    <span>Edit</span>
                  </button>
                </article>
              ))
            )}
          </div>

          <footer className="catalog-table-footer">
            <p>
              Showing {filteredCourses.length === 0 ? 0 : startIndex + 1} to{" "}
              {Math.min(startIndex + pageSize, filteredCourses.length)} of{" "}
              {filteredCourses.length.toLocaleString()} courses
            </p>

            <div className="catalog-pagination">
              <button
                type="button"
                className="catalog-page-arrow"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1)
                .slice(0, 5)
                .map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`catalog-page-btn${
                      safeCurrentPage === page ? " is-active" : ""
                    }`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
              <button
                type="button"
                className="catalog-page-arrow"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={safeCurrentPage === totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        </section>

        <section className="catalog-summary-grid">
          <article className="catalog-summary-card">
            <div className="catalog-summary-icon is-blue">
              <BookOpen size={16} />
            </div>
            <h2>Recent Activity</h2>
            <p>{recentUpdates} courses updated in the last 30 days.</p>
          </article>

          <article className="catalog-summary-card">
            <div className="catalog-summary-icon is-green">
              <GraduationCap size={16} />
            </div>
            <h2>Active Catalog</h2>
            <p>{activeCatalogCount} courses currently have active usage.</p>
          </article>

          <article className="catalog-summary-card">
            <div className="catalog-summary-icon is-orange">
              <Plus size={16} />
            </div>
            <h2>Total Enrollments</h2>
            <p>{totalEnrollments.toLocaleString()} course enrollments tracked.</p>
          </article>
        </section>
      </main>

      <footer className="catalog-bottom-bar">
        <p>&copy; 2024 Kugan &amp; Associates. All rights reserved.</p>
        <div>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Help Center</a>
        </div>
      </footer>
    </div>
  );
}

function normalizeTitle(value) {
  return String(value || "").trim().toLowerCase();
}

function getCourseDescription(course) {
  return stripHtml(
    String(
    course?.description ??
      course?.course_description ??
      course?.courseDescription ??
      ""
    )
  ).trim();
}

function getInstructorName(course) {
  return String(
    course?.instructor_name ??
      course?.instructorName ??
      course?.instructor ??
      ""
  ).trim();
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

function stripHtml(value) {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}

function isActiveStatus(status) {
  const normalized = String(status || "").toLowerCase();
  return normalized.includes("active") || normalized.includes("progress");
}

function isInLastThirtyDays(value) {
  if (!value) return false;
  const compareDate = new Date(value);
  if (Number.isNaN(compareDate.getTime())) return false;
  const today = new Date("2026-05-02T00:00:00");
  const diffDays = (today - compareDate) / (1000 * 60 * 60 * 24);
  return diffDays <= 30;
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

export default CoursesCatalog;
