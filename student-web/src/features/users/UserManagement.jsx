import { useEffect, useState } from "react";
import { Activity, Plus, RefreshCw, ShieldCheck, User, X } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AppHeader from "../../app/components/AppHeader/AppHeader.jsx";
import "./UserManagement.css";

const API_BASE_URL = "http://localhost:3000";

function UserManagement({
  currentUser,
  onOpenDashboard,
  onOpenStudents,
  onOpenCourses,
  onOpenPending,
  onOpenUsers,
  onLogout,
}) {
  const [activeTab, setActiveTab] = useState("users");

  if (currentUser?.role !== "super_admin") {
    return (
      <div className="um-shell">
        <AppHeader
          currentSection="users"
          currentUser={currentUser}
          onOpenDashboard={onOpenDashboard}
          onOpenStudents={onOpenStudents}
          onOpenCourses={onOpenCourses}
          onOpenPending={onOpenPending}
          onOpenUsers={onOpenUsers}
          onLogout={onLogout}
        />
        <main className="um-main">
          <div className="um-forbidden">
            <ShieldCheck size={32} strokeWidth={1.5} />
            <h2>Access Restricted</h2>
            <p>Only Super Admins can manage portal users.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="um-shell">
      <ToastContainer position="top-right" autoClose={3000} />
      <AppHeader
        currentSection="users"
        currentUser={currentUser}
        onOpenDashboard={onOpenDashboard}
        onOpenStudents={onOpenStudents}
        onOpenCourses={onOpenCourses}
        onOpenPending={onOpenPending}
        onOpenUsers={onOpenUsers}
        onLogout={onLogout}
      />

      <main className="um-main">
        {/* Page header */}
        <section className="um-hero">
          <div>
            <p className="um-kicker">Administration</p>
            <h1>{activeTab === "users" ? "Portal Users" : "Activity Log"}</h1>
            <p className="um-subtitle">
              {activeTab === "users"
                ? "Manage who can access this portal. Add new admins or view existing accounts."
                : "Track all user actions across the portal in real time."}
            </p>
          </div>
        </section>

        {/* Tabs */}
        <div className="um-tabs">
          <button
            type="button"
            className={`um-tab${activeTab === "users" ? " is-active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <User size={14} strokeWidth={2.2} />
            Users
          </button>
          <button
            type="button"
            className={`um-tab${activeTab === "activity" ? " is-active" : ""}`}
            onClick={() => setActiveTab("activity")}
          >
            <Activity size={14} strokeWidth={2.2} />
            Activity Log
          </button>
        </div>

        {activeTab === "users" ? (
          <UsersTab currentUser={currentUser} />
        ) : (
          <ActivityLogTab currentUser={currentUser} />
        )}
      </main>
    </div>
  );
}

/* ── Users tab ────────────────────────────��─────────── */
function UsersTab({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/auth/users`, {
        headers: { "x-user-id": String(currentUser?.id) },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load users");
      setUsers(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserAdded = (newUser) => {
    setUsers((prev) => [...prev, newUser]);
    setShowForm(false);
    toast.success(`User "${newUser.name}" added successfully`);
  };

  return (
    <>
      <div className="um-tab-toolbar">
        <button
          type="button"
          className="um-add-btn"
          onClick={() => setShowForm(true)}
        >
          <Plus size={15} strokeWidth={2.5} />
          Add User
        </button>
      </div>

      {showForm && (
        <AddUserForm
          currentUser={currentUser}
          onUserAdded={handleUserAdded}
          onClose={() => setShowForm(false)}
        />
      )}

      <section className="um-table-section">
        {loading ? (
          <p className="um-loading">Loading users…</p>
        ) : (
          <table className="um-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="um-user-cell">
                      <div className="um-avatar">{getInitials(user.name)}</div>
                      <span>{user.name}</span>
                    </div>
                  </td>
                  <td className="um-email">{user.email}</td>
                  <td>
                    <span className={`um-role-badge${user.role === "super_admin" ? " is-super" : ""}`}>
                      {user.role === "super_admin" ? (
                        <><ShieldCheck size={11} strokeWidth={2.5} /> Super Admin</>
                      ) : (
                        <><User size={11} strokeWidth={2.5} /> Admin</>
                      )}
                    </span>
                  </td>
                  <td className="um-date">{formatDate(user.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

/* ── Activity Log tab ─���─────────────────────────────── */
function ActivityLogTab({ currentUser }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/auth/activity-logs?limit=100`, {
        headers: { "x-user-id": String(currentUser?.id) },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load logs");
      setLogs(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <>
      <div className="um-tab-toolbar">
        <span className="um-log-count">{logs.length} recent entries</span>
        <button
          type="button"
          className="um-refresh-btn"
          onClick={fetchLogs}
          disabled={loading}
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? "um-spin" : ""} />
          Refresh
        </button>
      </div>

      <section className="um-table-section">
        {loading ? (
          <p className="um-loading">Loading activity log…</p>
        ) : logs.length === 0 ? (
          <p className="um-loading">No activity recorded yet.</p>
        ) : (
          <table className="um-table um-log-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="um-log-time">
                    <span>{formatDateTime(log.created_at)}</span>
                  </td>
                  <td>
                    {log.user_name ? (
                      <div className="um-user-cell">
                        <div className="um-avatar um-avatar-sm">
                          {getInitials(log.user_name)}
                        </div>
                        <div>
                          <span className="um-log-username">{log.user_name}</span>
                          <span className="um-log-useremail">{log.user_email}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="um-log-unknown">Unknown</span>
                    )}
                  </td>
                  <td>
                    <span className={`um-action-badge um-action-${getActionTone(log.action)}`}>
                      {formatAction(log.action)}
                    </span>
                  </td>
                  <td className="um-log-details">{log.details || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

/* ── Add user form ───────────────────────────��──────── */
function AddUserForm({ currentUser, onUserAdded, onClose }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUser?.id),
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add user");
      onUserAdded(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="um-form-card">
      <div className="um-form-header">
        <h2>Add New User</h2>
        <button type="button" className="um-form-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <form className="um-form" onSubmit={handleSubmit}>
        <div className="um-form-row">
          <div className="um-field">
            <label htmlFor="um-name">Full Name</label>
            <input
              id="um-name"
              type="text"
              placeholder="e.g. Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="um-field">
            <label htmlFor="um-email">Email Address</label>
            <input
              id="um-email"
              type="email"
              placeholder="jane@kugan.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="um-form-row">
          <div className="um-field">
            <label htmlFor="um-password">Password</label>
            <input
              id="um-password"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div className="um-field">
            <label htmlFor="um-role">Role</label>
            <select
              id="um-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
        </div>

        {error && <p className="um-form-error">{error}</p>}

        <div className="um-form-actions">
          <button type="button" className="um-cancel-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="um-submit-btn" disabled={saving}>
            {saving ? "Adding…" : "Add User"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────── */
function getInitials(name) {
  if (!name) return "U";
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatAction(action) {
  const map = {
    LOGIN_SUCCESS:              "Login",
    LOGIN_FAILED:               "Login Failed",
    USER_CREATED:               "User Created",
    CSV_IMPORT:                 "CSV Import",
    PENDING_MERGED:             "Pending Merged",
    STUDENT_CREATED_FROM_PENDING: "Student Created",
    ALL_DATA_DELETED:           "Data Deleted",
  };
  return map[action] || action;
}

function getActionTone(action) {
  const map = {
    LOGIN_SUCCESS:              "green",
    LOGIN_FAILED:               "red",
    USER_CREATED:               "purple",
    CSV_IMPORT:                 "blue",
    PENDING_MERGED:             "teal",
    STUDENT_CREATED_FROM_PENDING: "teal",
    ALL_DATA_DELETED:           "red",
  };
  return map[action] || "grey";
}

export default UserManagement;
