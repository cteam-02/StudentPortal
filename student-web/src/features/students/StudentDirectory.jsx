import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import AppHeader from "../../app/components/AppHeader/AppHeader.jsx";
import "./StudentDirectory.css";

const API_BASE_URL = "http://localhost:3000";
const pageSize = 10;

function StudentDirectory({ onOpenDashboard, onOpenCourses, onViewProfile }) {
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDirectoryData = async () => {
      try {
        setLoading(true);

        const response = await fetch(`${API_BASE_URL}/students`);
        const studentList = await response.json();

        const studentsWithHistory = await Promise.all(
          studentList.map(async (student) => {
            try {
              const courseResponse = await fetch(
                `${API_BASE_URL}/students/${student.id}/courses`
              );
              const courseHistory = await courseResponse.json();
              const sortedHistory = Array.isArray(courseHistory)
                ? [...courseHistory].sort((a, b) => {
                    const aTime = a.begin_date ? new Date(a.begin_date).getTime() : 0;
                    const bTime = b.begin_date ? new Date(b.begin_date).getTime() : 0;
                    return bTime - aTime;
                  })
                : [];
              const latestCourse = sortedHistory[0] ?? null;

              return {
                ...student,
                courseHistory: sortedHistory,
                latestCourseTitle: latestCourse?.course_title || "No courses",
                latestStatus: latestCourse?.status || "No courses",
                latestDate: latestCourse?.begin_date || null,
              };
            } catch (error) {
              console.error(
                `Error fetching course history for student ${student.id}:`,
                error
              );

              return {
                ...student,
                courseHistory: [],
                latestCourseTitle: "No courses",
                latestStatus: "No courses",
                latestDate: null,
              };
            }
          })
        );

        setStudents(studentsWithHistory);
      } catch (error) {
        console.error("Error fetching students:", error);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDirectoryData();
  }, []);

  const courseOptions = useMemo(() => {
    const titles = new Set();
    students.forEach((student) => {
      student.courseHistory?.forEach((course) => {
        if (course.course_title) {
          titles.add(course.course_title);
        }
      });
    });
    return Array.from(titles).sort((a, b) => a.localeCompare(b));
  }, [students]);

  const statusOptions = useMemo(() => {
    const statuses = new Set();
    students.forEach((student) => {
      if (student.latestStatus && student.latestStatus !== "No courses") {
        statuses.add(student.latestStatus);
      }
    });
    return Array.from(statuses).sort((a, b) => a.localeCompare(b));
  }, [students]);

  const filteredStudents = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return students.filter((student) => {
      const matchesQuery =
        !normalized ||
        student.name?.toLowerCase().includes(normalized) ||
        student.email?.toLowerCase().includes(normalized) ||
        student.phone?.toLowerCase().includes(normalized);

      const matchesStatus =
        statusFilter === "All" || student.latestStatus === statusFilter;

      const matchesCourse =
        courseFilter === "All" ||
        student.courseHistory?.some(
          (course) => course.course_title === courseFilter
        );

      const matchesDate =
        dateFilter === "All" || matchesDateRange(student.latestDate, dateFilter);

      return matchesQuery && matchesStatus && matchesCourse && matchesDate;
    });
  }, [courseFilter, dateFilter, query, statusFilter, students]);

  useEffect(() => {
    setCurrentPage(1);
  }, [courseFilter, dateFilter, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedStudents = filteredStudents.slice(
    startIndex,
    startIndex + pageSize
  );
  const visiblePageNumbers = getVisiblePages(safeCurrentPage, totalPages);

  return (
    <div className="directory-shell">
      <AppHeader
        currentSection="students"
        onOpenDashboard={onOpenDashboard}
        onOpenStudents={() => {}}
        onOpenCourses={onOpenCourses}
        searchPlaceholder="Search by name, email, or phone"
        searchValue={query}
        onSearchChange={setQuery}
      />

      <main className="directory-main">
        <section className="directory-hero">
          <div>
            <h1>Student Directory</h1>
            <p>
              Manage and search through your centralized student database and
              enrollment history.
            </p>
          </div>

          <div className="directory-total-card">
            <strong>{students.length.toLocaleString()}</strong>
            <span>Total Students</span>
          </div>
        </section>

        <section className="directory-search-panel">
          <label className="directory-page-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by name, email, or phone number"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </section>

        <section className="directory-filter-bar">
          <div className="directory-filters">
            <label className="directory-filter-btn directory-filter-select">
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="All">All</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="directory-filter-btn directory-filter-select">
              <span>Course</span>
              <select
                value={courseFilter}
                onChange={(event) => setCourseFilter(event.target.value)}
              >
                <option value="All">All</option>
                {courseOptions.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </label>

            <label className="directory-filter-btn directory-filter-select">
              <CalendarDays size={14} />
              <select
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              >
                <option value="All">All Dates</option>
                <option value="Last 30 Days">Last 30 Days</option>
                <option value="Last 6 Months">Last 6 Months</option>
                <option value="This Year">This Year</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            className="directory-reset-btn"
            onClick={() => {
              setQuery("");
              setStatusFilter("All");
              setCourseFilter("All");
              setDateFilter("All");
            }}
          >
            <SlidersHorizontal size={14} />
            <span>Reset Filters</span>
          </button>
        </section>

        <section className="directory-table-card">
          <div className="directory-table-header">
            <span>Full Name</span>
            <span>Email</span>
            <span>Phone</span>
            <span>Enrollment Status</span>
            <span>Action</span>
          </div>

          <div className="directory-table-body">
            {loading ? (
              <div className="directory-empty-state">Loading students...</div>
            ) : paginatedStudents.length === 0 ? (
              <div className="directory-empty-state">No students found.</div>
            ) : (
              paginatedStudents.map((student, index) => {
                const absoluteIndex = startIndex + index;
                const initials = getInitials(student.name);
                const avatarTone = avatarTones[absoluteIndex % avatarTones.length];
                const statusTone = getStatusTone(student.latestStatus);

                return (
                  <article key={student.id ?? student.email} className="directory-row">
                    <div className="directory-student-cell">
                      <div className={`directory-avatar tone-${avatarTone}`}>
                        {initials}
                      </div>
                      <strong>{student.name}</strong>
                    </div>

                    <div className="directory-muted-cell">{student.email}</div>
                    <div className="directory-muted-cell">
                      {student.phone || "Not provided"}
                    </div>

                    <div>
                      <span className={`directory-status tone-${statusTone}`}>
                        <span className="directory-status-dot" />
                        {student.latestStatus}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="directory-link-btn"
                      onClick={() => onViewProfile?.(student)}
                    >
                      <span>View Profile</span>
                      <ChevronRight size={14} />
                    </button>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <footer className="directory-footer">
          <p>
            Showing {filteredStudents.length === 0 ? 0 : startIndex + 1} to{" "}
            {Math.min(startIndex + pageSize, filteredStudents.length)} of{" "}
            {filteredStudents.length.toLocaleString()} entries
          </p>

          <div className="directory-pagination">
            <button
              type="button"
              className="directory-page-arrow"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safeCurrentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>
            {visiblePageNumbers.map((page, index) =>
              page === "dots" ? (
                <span key={`${page}-${index}`}>...</span>
              ) : (
                <button
                  key={page}
                  type="button"
                  className={`directory-page-btn${
                    safeCurrentPage === page ? " is-active" : ""
                  }`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              )
            )}
            <button
              type="button"
              className="directory-page-arrow"
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              disabled={safeCurrentPage === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      </main>

      <div className="directory-bottom-bar">
        <p>
          &copy; 2024 Kugan &amp; Associates Student Directory. All rights
          reserved.
        </p>
        <div>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Help Center</a>
        </div>
      </div>
    </div>
  );
}

const avatarTones = ["blue", "purple", "yellow", "pink", "slate"];

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getStatusTone(status = "") {
  const normalized = String(status).toLowerCase();

  if (
    normalized.includes("pass") ||
    normalized.includes("complete") ||
    normalized.includes("active")
  ) {
    return normalized.includes("complete") ? "blue" : "green";
  }

  if (normalized.includes("pending")) {
    return "orange";
  }

  return "gray";
}

function matchesDateRange(date, range) {
  if (!date) return false;

  const today = new Date("2026-05-02T00:00:00");
  const compareDate = new Date(date);
  const diffDays = (today - compareDate) / (1000 * 60 * 60 * 24);

  if (range === "Last 30 Days") return diffDays <= 30;
  if (range === "Last 6 Months") return diffDays <= 183;
  if (range === "This Year") return compareDate.getFullYear() === 2026;
  return true;
}

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "dots", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "dots", totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "dots", currentPage, "dots", totalPages];
}

export default StudentDirectory;
