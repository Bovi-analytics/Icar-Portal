import React, { useState } from "react";
import "../styles/Generate.css";
import { useAuth0 } from "@auth0/auth0-react";

export default function Generate() {
  const [loading, setLoading] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [testSetId, setTestSetId] = useState("");
  const [error, setError] = useState("");

  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();

  const handleGenerate = async () => {
    if (!isAuthenticated || !user?.email) {
      setError("Please log in to generate a dataset.");
      return;
    }

    setLoading(true);
    setFileUrl("");
    setTestSetId("");
    setError("");

    try {
      const token = await getAccessTokenSilently();

      const response = await fetch(
        `http://localhost:5000/api/v1/generate?email=${encodeURIComponent(
          user.email
        )}&name=${encodeURIComponent(user.name)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.download_link && data.test_set_id) {
        setFileUrl(data.download_link);
        setTestSetId(data.test_set_id);
      } else {
        setError(data.message || "Failed to generate dataset. Please try again.");
      }
    } catch (err) {
      console.error("Error generating dataset:", err);
      setError("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return <p>Loading authentication...</p>;

  if (!isAuthenticated)
    return (
      <div className="generate-container">
        <h2>Generate Random Test Dataset</h2>
        <p>Please sign in to generate a dataset.</p>
      </div>
    );

  return (
    <div className="generate-container">
      <h2>Generate Random Test Dataset</h2>
      <p>Click the button below to generate a randomized dataset for your analysis.</p>

      <div className="generate-actions">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="generate-button"
        >
          {loading ? "Generating..." : "Generate Dataset"}
        </button>
        {error && <p id="error-message">{error}</p>}
      </div>

      {fileUrl && (
        <div className="download-section">
          <p><strong>TestSet ID:</strong> {testSetId}</p>
          <p>Your dataset is ready:</p>
          <a
            href={`http://localhost:5000${fileUrl}`}
            download
            className="download-link"
          >
            Download Dataset
          </a>
        </div>
      )}
    </div>
  );
}
