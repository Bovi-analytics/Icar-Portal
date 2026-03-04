import React, { useEffect, useState } from "react";
import "../styles/Dashboard.css";
import { FaTrashAlt, FaDownload, FaFilePdf, FaBuilding, FaUser, FaFlask, FaGlobe, FaCalendarAlt, FaStickyNote, FaShieldAlt } from "react-icons/fa";
import { useAuth0 } from "@auth0/auth0-react";
import { jwtDecode } from "jwt-decode";

export default function Admin() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();

  const fetchAllSubmissions = React.useCallback(async () => {
      if (!isAuthenticated || !user?.email) return;

      try {
        setLoading(true);

        // ✅ Get access token
        const token = await getAccessTokenSilently();

        // ✅ Decode roles
        const decoded = jwtDecode(token);
        const rolesClaim =
          decoded[`${process.env.REACT_APP_AUTH0_AUDIENCE}roles`] ||
          decoded["roles"] ||
          [];
        const adminStatus = Array.isArray(rolesClaim) && rolesClaim.includes("admin");
        setIsAdmin(adminStatus);

        // ✅ Build API URL dynamically
        const base = process.env.REACT_APP_BASE_API_URL;

        let url = `${base}/api/v1/submissions?email=${encodeURIComponent(
          user.email
        )}`;
        if (adminStatus) url += "&admin=yes";

        // ✅ Fetch submissions
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await res.json();

        if (res.ok) {
          setSubmissions(data);
        } else {
          console.error("Failed to fetch submissions:", data.message);
          // Don't clear submissions on error - preserve existing data
        }
      } catch (err) {
        console.error("Failed to fetch submissions", err);
        // Don't clear submissions on error - preserve existing data
      } finally {
        setLoading(false);
      }
  }, [isAuthenticated, user?.email, getAccessTokenSilently]); // Use user?.email instead of user object

  useEffect(() => {
    fetchAllSubmissions();
  }, [fetchAllSubmissions]);

  // Listen for new submissions from submit page
  useEffect(() => {
    const handleSubmissionCreated = () => {
      // Refresh submissions when a new one is created
      fetchAllSubmissions();
    };

    window.addEventListener('submissionCreated', handleSubmissionCreated);
    return () => {
      window.removeEventListener('submissionCreated', handleSubmissionCreated);
    };
  }, [fetchAllSubmissions]);

  const handleDelete = async (submissionId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this submission?");
    if (!confirmDelete) return;

    try {
      const token = await getAccessTokenSilently();
      const base = process.env.REACT_APP_BASE_API_URL;

      const res = await fetch(
        `${base}/api/v1/submission/${submissionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.ok) {
        setSubmissions((prev) => prev.filter((item) => item.id !== submissionId));
      } else {
        console.error("Delete failed");
      }
    } catch (err) {
      console.error("Error deleting submission:", err);
    }
  };

  if (isLoading) return <p>Loading authentication...</p>;

  if (!isAuthenticated)
    return (
      <div className="admin-container">
        <h2>Please log in to view submissions.</h2>
      </div>
    );

  return (
    <div className="dashboard-container admin-container">
      <div className="dashboard-header">
        <div className="header-title-section">
          <h2>
            {isAdmin ? (
              <>
                <FaShieldAlt className="admin-icon" />
                Admin Dashboard
              </>
            ) : (
              "Your Submissions"
            )}
          </h2>
          {isAdmin && (
            <span className="admin-badge">
              <FaShieldAlt />
              Admin Mode
            </span>
          )}
        </div>
        <p className="user-info">
          {isAdmin ? "Viewing all submissions across the platform" : `Signed in as: ${user?.email}`}
        </p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading submissions...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No submissions available</h3>
          <p>There are no submissions to display at this time.</p>
        </div>
      ) : (
        <div className="card-grid">
          {submissions.map((item, index) => (
            <div className="submission-card" key={index}>
              <button
                className="delete-btn"
                onClick={() => handleDelete(item.id)}
                title="Delete submission"
              >
                <FaTrashAlt size={14} />
              </button>

              <div className="card-header">
                <div className="test-id-badge">
                  <span className="badge-label">Test Set ID</span>
                  <code className="test-id-value">{item.test_set_id}</code>
                </div>
              </div>

              <div className="card-body">
                <div className="info-row">
                  <FaBuilding className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Organization</span>
                    <span className="info-value">{item.organization || "—"}</span>
                  </div>
                </div>

                <div className="info-row">
                  <FaUser className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Name</span>
                    <span className="info-value">{item.name || "—"}</span>
                  </div>
                </div>

                <div className="info-row">
                  <FaFlask className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Method</span>
                    <span className="info-value">{item.calculation_method || "—"}</span>
                  </div>
                </div>

                <div className="info-row">
                  <FaGlobe className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Country</span>
                    <span className="info-value">{item.country || "—"}</span>
                  </div>
                </div>

                <div className="info-row">
                  <FaCalendarAlt className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Date</span>
                    <span className="info-value">{new Date(item.date).toLocaleDateString()}</span>
                  </div>
                </div>

                {item.notes && (
                  <div className="info-row notes-row">
                    <FaStickyNote className="info-icon" />
                    <div className="info-content">
                      <span className="info-label">Notes</span>
                      <span className="info-value notes-text">{item.notes}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="card-actions">
                <a
                  href={`${process.env.REACT_APP_BASE_API_URL}${item.download_url}`}
                  download
                  className="action-btn download-btn"
                >
                  <FaDownload />
                  <span>Download Data</span>
                </a>

                <a
                  href={`${process.env.REACT_APP_BASE_API_URL}/api/v1/compare/${item.id}?download=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-btn view-btn"
                >
                  <FaFilePdf />
                  <span>View Comparison</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
