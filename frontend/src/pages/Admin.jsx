import React, { useEffect, useState } from "react";
import { FaTrashAlt } from "react-icons/fa";
import { useAuth0 } from "@auth0/auth0-react";
import { jwtDecode } from "jwt-decode";

export default function Admin() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    const fetchAllSubmissions = async () => {
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
        }
      } catch (err) {
        console.error("Failed to fetch submissions", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllSubmissions();
  }, [isAuthenticated, user, getAccessTokenSilently]);

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
    <div className="admin-container">
      <h2>
        {isAdmin ? "Admin Dashboard (All Submissions)" : "Your Submissions"}
      </h2>
      <p>{isAdmin ? "You have admin privileges." : `Signed in as: ${user?.email}`}</p>

      {loading ? (
        <p>Loading submissions...</p>
      ) : submissions.length === 0 ? (
        <p>No submissions available.</p>
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
                className="download-link"
              >
                Download Test Data
              </a>

              <a
                href={`${process.env.REACT_APP_BASE_API_URL}/api/v1/compare/${item.id}?download=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="view-button"
              >
                View Comparison
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
