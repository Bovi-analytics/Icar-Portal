import React, { useEffect, useState } from "react";
import "../styles/Dashboard.css";
import { FaTrashAlt } from "react-icons/fa";
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
      <p>You are viewing all submissions. Signed in as: {user?.email}</p>

      {loading ? (
        <p>Loading submissions...</p>
      ) : submissions.length === 0 ? (
        <p>No submissions found.</p>
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

              <h3>TestSet ID: {item.test_set_id}</h3>
              <p><strong>Organization:</strong> {item.organization}</p>
              <p><strong>Name:</strong> {item.name}</p>
              <p><strong>Method:</strong> {item.calculation_method || "—"}</p>
              <p><strong>Country:</strong> {item.country || "—"}</p>
              <p><strong>Date:</strong> {new Date(item.date).toLocaleDateString()}</p>
              <p><strong>Notes:</strong> {item.notes}</p>

              <a
                href={`${process.env.REACT_APP_BASE_API_URL}${item.download_url}`}
                download
                // className="download-link"
              >
                Download Test Data
              </a>

              <button 
                className="view-button" 
                onClick={() => handleCompare(item.id)}
                disabled={comparing[item.id]}
              >
                {comparing[item.id] ? "Loading..." : "View Comparison"}
              </button>
              {compareError === item.id && (
                <p className="compare-error" style={{ 
                  color: "#ef4444", 
                  fontSize: "0.9rem", 
                  marginTop: "0.5rem",
                  textAlign: "center"
                }}>
                  Failed to compare. Please try again.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
