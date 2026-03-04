import React, { useEffect, useState } from "react";
import "../styles/Profile.css";
import { useAuth0 } from "@auth0/auth0-react";
import { FaUser, FaEnvelope, FaBuilding, FaEdit, FaSave, FaCheckCircle } from "react-icons/fa";

export default function Profile() {
  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [organization, setOrganization] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Get display name: use name if available, otherwise use email without @domain
  const getDisplayName = (user) => {
    if (user?.name && user.name.trim()) {
      return user.name.split('@')[0];
    }
    if (user?.email) {
      // Return the part before @ (username part of email)
      return user.email.split('@')[0];
    }
    return 'User';
  };

  // Fetch profile from backend
  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated || !user?.email) return;
      try {
        setLoading(true);
        const token = await getAccessTokenSilently();
        const base = process.env.REACT_APP_BASE_API_URL;

        const res = await fetch(
          `${base}/api/v1/profile?email=${encodeURIComponent(user.email)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) throw new Error("Failed to fetch profile");

        const data = await res.json();
        setProfile(data);
        setOrganization(data.organization || "");
        setError(""); // Clear any previous errors
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Could not load profile. Please try again.");
        // Don't clear profile on error - preserve existing data
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, user?.email, getAccessTokenSilently]); // Use user?.email instead of user object

  const handleSave = async () => {
    if (!organization.trim()) {
      alert("Organization cannot be empty.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const token = await getAccessTokenSilently();
      const base = process.env.REACT_APP_BASE_API_URL;

      const res = await fetch(`${base}/api/v1/profile-update`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          organization: organization.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update profile");
      }

      const updated = await res.json();
      // Ensure consistent structure
      const profileData = {
        organization: updated.organization || organization.trim(),
        email: updated.email || user.email
      };
      setProfile(profileData);
      setOrganization(profileData.organization);
      setError(""); // Clear errors on success
      setSuccess(true);
      // Exit edit mode after successful save to show the updated value
      setEditMode(false);
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving organization:", err);
      setError(err.message || "Error updating organization. Try again.");
      // Stay in edit mode on error so user can fix and try again
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="profile-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated)
    return (
      <div className="profile-container">
        <h2>User Profile</h2>
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <p className="profile-status">Please log in to view your profile.</p>
        </div>
      </div>
    );

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>Your Profile</h2>
        <p className="profile-subtitle">Manage your account information</p>
      </div>

      <div className="profile-card">
        <div className="avatar-section">
          {user.picture ? (
            <img src={user.picture} alt={user.name} className="profile-avatar" />
          ) : (
            <div className="profile-avatar-placeholder">
              <FaUser size={40} />
            </div>
          )}
          <div className="avatar-badge">
            <span>{getDisplayName(user).charAt(0).toUpperCase()}</span>
          </div>
        </div>

        <div className="profile-info">
          <div className="info-row">
            <div className="info-icon-wrapper">
              <FaUser className="info-icon" />
            </div>
            <div className="info-content">
              <span className="info-label">Name</span>
              <span className="info-value">{getDisplayName(user)}</span>
            </div>
          </div>

          <div className="info-row">
            <div className="info-icon-wrapper">
              <FaEnvelope className="info-icon" />
            </div>
            <div className="info-content">
              <span className="info-label">Email</span>
              <span className="info-value">{user.email}</span>
            </div>
          </div>

          <div className="info-row">
            <div className="info-icon-wrapper">
              <FaBuilding className="info-icon" />
            </div>
            <div className="info-content">
              <span className="info-label">Organization</span>
              {editMode ? (
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Enter organization name"
                  className="organization-input"
                  autoFocus
                />
              ) : (
                <span className="info-value">
                  {profile?.organization || <span className="no-value">Not set</span>}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="profile-actions">
          {editMode ? (
            <div className="action-buttons">
              <button 
                className="action-btn cancel-btn" 
                onClick={() => {
                  setEditMode(false);
                  setOrganization(profile?.organization || "");
                  setError("");
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                className="action-btn save-btn" 
                onClick={handleSave}
                disabled={saving || !organization.trim()}
              >
                {saving ? (
                  <>
                    <div className="btn-spinner"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FaSave />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <button 
              className="action-btn edit-btn" 
              onClick={() => {
                setEditMode(true);
                setError("");
                setSuccess(false);
              }}
            >
              <FaEdit />
              <span>Edit Organization</span>
            </button>
          )}
        </div>

        {success && (
          <div className="success-message">
            <FaCheckCircle />
            <span>Organization updated successfully!</span>
          </div>
        )}

        {error && (
          <div className="error-message">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
