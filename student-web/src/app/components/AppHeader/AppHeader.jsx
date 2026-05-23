import { GraduationCap, LogOut, Search, UserRound, Users } from "lucide-react";
import "./AppHeader.css";

function AppHeader({
  currentSection,
  currentUser,
  onOpenDashboard,
  onOpenStudents,
  onOpenCourses,
  onOpenPending,
  onOpenUsers,
  onLogout,
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
}) {
  const isSuperAdmin = currentUser?.role === "super_admin";

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
          className={`app-header-nav-link${currentSection === "dashboard" ? " is-active" : ""}`}
          onClick={onOpenDashboard}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={`app-header-nav-link${currentSection === "students" ? " is-active" : ""}`}
          onClick={onOpenStudents}
        >
          Students
        </button>
        <button
          type="button"
          className={`app-header-nav-link${currentSection === "courses" ? " is-active" : ""}`}
          onClick={onOpenCourses}
        >
          Courses
        </button>
        <button
          type="button"
          className={`app-header-nav-link${currentSection === "pending" ? " is-active" : ""}`}
          onClick={onOpenPending}
        >
          Pending
        </button>
        {isSuperAdmin && (
          <button
            type="button"
            className={`app-header-nav-link app-header-nav-users${currentSection === "users" ? " is-active" : ""}`}
            onClick={onOpenUsers}
          >
            <Users size={13} strokeWidth={2.5} />
            Users
          </button>
        )}
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
            <strong>{currentUser?.name || "Admin"}</strong>
            <span className={`app-header-role-badge${isSuperAdmin ? " is-super" : ""}`}>
              {isSuperAdmin ? "Super Admin" : "Admin"}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="app-header-logout-btn"
          onClick={onLogout}
          title="Log out"
        >
          <LogOut size={15} strokeWidth={2.2} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}

export default AppHeader;
