import React, { useEffect, useState } from "react";
import "../styles/Dashboard.css";
import { FaTrashAlt, FaDownload, FaFilePdf, FaBuilding, FaUser, FaFlask, FaGlobe, FaCalendarAlt, FaStickyNote } from "react-icons/fa";
import { useAuth0 } from "@auth0/auth0-react";
// import { jwtDecode } from "jwt-decode";

export default function Dashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState({}); // Track which submission is being compared
  const [compareError, setCompareError] = useState(null);
  // const [isAdmin, setIsAdmin] = useState(false);

  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();

  const fetchSubmissions = React.useCallback(async () => {
      if (!isAuthenticated || !user?.email) return;

      try {
        setLoading(true);

        const token = await getAccessTokenSilently();

        // ✅ Build endpoint dynamically
        const base = process.env.REACT_APP_BASE_API_URL;

        let url = `${base}/api/v1/submissions?email=${encodeURIComponent(
          user.email
        )}`;

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await res.json();
        if (res.ok) {
          console.log("Fetched submissions:", data);
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
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Listen for new submissions from submit page
  useEffect(() => {
    const handleSubmissionCreated = () => {
      // Refresh submissions when a new one is created
      fetchSubmissions();
    };

    window.addEventListener('submissionCreated', handleSubmissionCreated);
    return () => {
      window.removeEventListener('submissionCreated', handleSubmissionCreated);
    };
  }, [fetchSubmissions]);

  const handleDelete = async (submissionId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this submission?");
    if (!confirmDelete) return;

    try {
      const token = await getAccessTokenSilently();
      const base = process.env.REACT_APP_BASE_API_URL;

      const res = await fetch(`${base}/api/v1/submission/${submissionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        setSubmissions((prev) => prev.filter((item) => item.id !== submissionId));
      } else {
        console.error("Delete failed");
      }
    } catch (err) {
      console.error("Error deleting submission:", err);
    }
  };

  const handleCompare = async (submissionId) => {
    setComparing(prev => ({ ...prev, [submissionId]: true }));
    setCompareError(null);

    try {
      const token = await getAccessTokenSilently();
      const base = process.env.REACT_APP_BASE_API_URL;

      const res = await fetch(
        `${base}/api/v1/compare/${submissionId}?download=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to download comparison PDF");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `comparison-${submissionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
      setCompareError(null);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      setCompareError(submissionId);
      // Show error for 5 seconds, then clear
      setTimeout(() => {
        setCompareError(prev => prev === submissionId ? null : prev);
      }, 5000);
    } finally {
      setComparing(prev => {
        const newState = { ...prev };
        delete newState[submissionId];
        return newState;
      });
    }
  };

  if (isLoading) return <p>Loading authentication...</p>;

  if (!isAuthenticated)
    return (
      <div className="dashboard-container">
        <h2>Please log in to view your submissions.</h2>
      </div>
    );

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>My Submissions</h2>
        <p className="user-info">Signed in as: {user?.email}</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading submissions...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No submissions yet</h3>
          <p>Start by generating a test dataset and submitting your results.</p>
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

                <button 
                  className="action-btn view-btn" 
                  onClick={() => handleCompare(item.id)}
                  disabled={comparing[item.id]}
                >
                  {comparing[item.id] ? (
                    <>
                      <div className="btn-spinner"></div>
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <FaFilePdf />
                      <span>View Comparison</span>
                    </>
                  )}
                </button>
              </div>

              {compareError === item.id && (
                <div className="error-message">
                  <span>⚠️</span>
                  <span>Failed to generate comparison. Please try again.</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
