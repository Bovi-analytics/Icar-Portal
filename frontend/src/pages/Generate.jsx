import React, { useState } from "react";
import "../styles/Generate.css";
import { useAuth0 } from "@auth0/auth0-react";

export default function Generate() {
  const [loading, setLoading] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [testSetId, setTestSetId] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();

  const copyToClipboard = async () => {
    if (testSetId) {
      try {
        await navigator.clipboard.writeText(testSetId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = testSetId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

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
      const base = process.env.REACT_APP_BASE_API_URL;

      const response = await fetch(
        `${base}/api/v1/generate?email=${encodeURIComponent(
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
      <div className="generate-header">
        <h2>Generate Random Test Dataset</h2>
        <p>Click the button below to generate a randomized dataset for your analysis.</p>
      </div>

      <div className="generate-actions">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="generate-button"
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Generating...
            </>
          ) : (
            <>
              <span className="icon">📊</span>
              Generate Dataset
            </>
          )}
        </button>
        {error && <p className="error-message">{error}</p>}
      </div>

      {fileUrl && (
        <div className="download-section">
          <div className="success-badge">
            <span className="check-icon">✓</span>
            <span>Dataset Generated Successfully!</span>
          </div>
          
          <div className="test-id-container">
            <div className="test-id-header">
              <label>
                <strong>Test Set ID</strong>
                <span className="warning-badge">⚠️ Copy Now</span>
              </label>
              <p className="warning-text">
                ⚠️ <strong>Important:</strong> Please copy this Test Set ID immediately. 
                You will need it to submit your results, and it may not be displayed again.
              </p>
            </div>
            <div className="test-id-display">
              <code className="test-id-value">{testSetId}</code>
              <button
                onClick={copyToClipboard}
                className="copy-button"
                title="Copy to clipboard"
              >
                {copied ? (
                  <>
                    <span className="copy-icon">✓</span>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <span className="copy-icon">📋</span>
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="download-container">
            <p className="download-label">Your dataset is ready to download:</p>
            <a
              href={`${process.env.REACT_APP_BASE_API_URL}${fileUrl}`}
              download
              className="download-link"
            >
              <span className="download-icon">⬇️</span>
              Download Dataset
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
