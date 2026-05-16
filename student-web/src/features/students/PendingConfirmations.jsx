import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Search, UserPlus } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AppHeader from "../../app/components/AppHeader/AppHeader.jsx";
import "./PendingConfirmations.css";

const API_BASE_URL = "http://localhost:3000";

function PendingConfirmations({
  onOpenDashboard,
  onOpenStudents,
  onOpenCourses,
  onViewProfile,
}) {
  const [query, setQuery] = useState("");
  const [pendingRows, setPendingRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);

  const fetchPendingRows = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/pending-confirmations`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load pending confirmations");
      }

      setPendingRows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading pending confirmations:", error);
      toast.error(error.message || "Failed to load pending confirmations");
      setPendingRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRows();
  }, []);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return pendingRows;

    return pendingRows.filter((row) => {
      return [
        row.imported_name,
        row.imported_email,
        row.imported_phone,
        row.offering_title,
        row.matched_student_name,
        row.matched_student_email,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [pendingRows, query]);

  const handleResolve = async (id, action) => {
    try {
      setWorkingId(id);

      const response = await fetch(
        `${API_BASE_URL}/pending-confirmations/${id}/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to resolve confirmation");
      }

      toast.success(
        action === "merge"
          ? "Merged into the existing student record"
          : "Created a new student record"
      );

      setPendingRows((currentRows) =>
        currentRows.filter((row) => row.id !== id)
      );
    } catch (error) {
      console.error("Error resolving pending confirmation:", error);
      toast.error(error.message || "Failed to resolve confirmation");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="pending-shell">
      <ToastContainer position="top-right" autoClose={3000} />
      <AppHeader
        currentSection="pending"
        onOpenDashboard={onOpenDashboard}
        onOpenStudents={onOpenStudents}
        onOpenCourses={onOpenCourses}
        onOpenPending={() => {}}
        searchPlaceholder="Search pending confirmations..."
        searchValue={query}
        onSearchChange={setQuery}
      />

      <main className="pending-main">
        <section className="pending-hero">
          <div>
            <p className="pending-kicker">Review Queue</p>
            <h1>Pending Confirmations</h1>
            <p className="pending-subtitle">
              These imports matched an existing student on two of the three key
              fields: name, email, and phone. Review each one before it becomes
              part of the permanent record.
            </p>
          </div>

          <div className="pending-count-card">
            <strong>{pendingRows.length}</strong>
            <span>Awaiting review</span>
          </div>
        </section>

        <section className="pending-search-panel">
          <label className="pending-page-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by name, email, phone, or course"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </section>

        <section className="pending-summary-grid">
          <article className="pending-summary-card">
            <div className="pending-summary-icon is-warning">
              <AlertTriangle size={18} />
            </div>
            <span>Total pending</span>
            <strong>{pendingRows.length}</strong>
          </article>

          <article className="pending-summary-card">
            <div className="pending-summary-icon is-info">
              <ArrowRightLeft size={18} />
            </div>
            <span>Potential merges</span>
            <strong>{pendingRows.filter((row) => row.matched_student_id).length}</strong>
          </article>

          <article className="pending-summary-card">
            <div className="pending-summary-icon is-success">
              <CheckCircle2 size={18} />
            </div>
            <span>Filtered results</span>
            <strong>{filteredRows.length}</strong>
          </article>
        </section>

        <section className="pending-list-card">
          <div className="pending-card-header">
            <div>
              <h2>Records Needing Confirmation</h2>
              <p>Choose whether each import should merge into an existing student or create a new student record.</p>
            </div>
          </div>

          <div className="pending-list">
            {loading ? (
              <div className="pending-empty-state">Loading pending confirmations...</div>
            ) : filteredRows.length === 0 ? (
              <div className="pending-empty-state">
                No pending confirmations to review right now.
              </div>
            ) : (
              filteredRows.map((row) => {
                const isWorking = workingId === row.id;

                return (
                  <article key={row.id} className="pending-row-card">
                    <div className="pending-row-top">
                      <section className="pending-row-intro">
                        <p className="pending-row-label">Possible duplicate</p>
                        <h3>{row.imported_name || "Unnamed student"}</h3>
                        <p className="pending-row-caption">
                          Two of the three identity fields matched an existing
                          student record, while the remaining field differed.
                          Choose whether to merge this enrollment or keep it as
                          a new student.
                        </p>
                      </section>

                      <section className="pending-course-pill">
                        <span>Course</span>
                        <strong>{row.offering_title || "Unknown course"}</strong>
                        <small>Imported for review</small>
                      </section>
                    </div>

                    <div className="pending-comparison-grid">
                      <section className="pending-person-card">
                        <p className="pending-row-label">Imported record</p>
                        <strong className="pending-person-name">
                          {row.imported_name || "Unnamed student"}
                        </strong>
                        <div className="pending-info-list">
                          <div>
                            <span>Email</span>
                            <strong>{row.imported_email || "No email"}</strong>
                          </div>
                          <div>
                            <span>Phone</span>
                            <strong>{row.imported_phone || "No phone"}</strong>
                          </div>
                        </div>
                      </section>

                      <div className="pending-compare-divider" aria-hidden="true">
                        <ArrowRightLeft size={16} />
                      </div>

                      <section className="pending-person-card is-match">
                        <p className="pending-row-label">Potential existing student</p>
                        <strong className="pending-person-name">
                          {row.matched_student_name || "No match found"}
                        </strong>
                        <div className="pending-info-list">
                          <div>
                            <span>Email</span>
                            <strong>
                              {row.matched_student_email || "No email available"}
                            </strong>
                          </div>
                          <div>
                            <span>Phone</span>
                            <strong>
                              {row.matched_student_phone || "No phone available"}
                            </strong>
                          </div>
                        </div>
                        {row.matched_student_id ? (
                          <button
                            type="button"
                            className="pending-inline-link"
                            onClick={() =>
                              onViewProfile?.({
                                id: row.matched_student_id,
                                name: row.matched_student_name,
                                email: row.matched_student_email,
                                phone: row.matched_student_phone,
                              })
                            }
                          >
                            View existing profile
                          </button>
                        ) : null}
                      </section>
                    </div>

                    <section className="pending-details-strip">
                      <div className="pending-detail-chip">
                        <span>Begin date</span>
                        <strong>{formatDateTime(row.begin_date)}</strong>
                      </div>
                      <div className="pending-detail-chip">
                        <span>Completion</span>
                        <strong>{formatDateTime(row.completion_date)}</strong>
                      </div>
                      <div className="pending-detail-chip">
                        <span>Status</span>
                        <strong>{row.status || "Not provided"}</strong>
                      </div>
                      <div className="pending-detail-chip">
                        <span>Grade</span>
                        <strong>{row.grade || "Not provided"}</strong>
                      </div>
                    </section>

                    <div className="pending-row-actions">
                      <button
                        type="button"
                        className="pending-secondary-btn"
                        onClick={() => handleResolve(row.id, "create-student")}
                        disabled={isWorking}
                      >
                        <UserPlus size={16} />
                        <span>{isWorking ? "Saving..." : "Create New Student"}</span>
                      </button>

                      <button
                        type="button"
                        className="pending-primary-btn"
                        onClick={() => handleResolve(row.id, "merge")}
                        disabled={isWorking || !row.matched_student_id}
                      >
                        <ArrowRightLeft size={16} />
                        <span>{isWorking ? "Saving..." : "Merge to Existing Student"}</span>
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default PendingConfirmations;
