import { GraduationCap, Search, UserRound } from "lucide-react";
import "./AppHeader.css";

function AppHeader({
  currentSection,
  onOpenDashboard,
  onOpenStudents,
  onOpenCourses,
  onOpenPending,
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
}) {
  return (
    <header className="app-header">
      <div className="app-header-brand">
        <div className="app-header-brand-icon">
          <GraduationCap size={16} />
        </div>
        <span>Kugan &amp; Associates</span>
      </div>

      <nav className="app-header-nav">
        <button
          type="button"
          className={`app-header-nav-link${
            currentSection === "dashboard" ? " is-active" : ""
          }`}
          onClick={onOpenDashboard}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={`app-header-nav-link${
            currentSection === "students" ? " is-active" : ""
          }`}
          onClick={onOpenStudents}
        >
          Students
        </button>
        <button
          type="button"
          className={`app-header-nav-link${
            currentSection === "courses" ? " is-active" : ""
          }`}
          onClick={onOpenCourses}
        >
          Courses
        </button>
        <button
          type="button"
          className={`app-header-nav-link${
            currentSection === "pending" ? " is-active" : ""
          }`}
          onClick={onOpenPending}
        >
          Pending
        </button>
      </nav>

      <div className="app-header-actions">
        <label className="app-header-search">
          <Search size={16} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
          />
        </label>

        <div className="app-header-user">
          <div className="app-header-user-avatar">
            <UserRound size={18} />
          </div>
          <div>
            <strong>Admin User</strong>
            <span>Student Records</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
