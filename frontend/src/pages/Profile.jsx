import React, { useEffect, useState } from "react";
import "../styles/Profile.css";
import { useAuth0 } from "@auth0/auth0-react";

export default function Profile() {
  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [organization, setOrganization] = useState("");
  const [error, setError] = useState("");

  // Get display name: use name if available, otherwise use email without @domain
  const getDisplayName = (user) => {
    if (user?.name && user.name.trim()) {
      return user.name;
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
      // Exit edit mode after successful save to show the updated value
      setEditMode(false);
    } catch (err) {
      console.error("Error saving organization:", err);
      setError(err.message || "Error updating organization. Try again.");
      // Stay in edit mode on error so user can fix and try again
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loading) return <p className="profile-status">Loading profile...</p>;

  if (!isAuthenticated)
    return (
      <div className="profile-container">
        <h2>User Profile</h2>
        <p className="profile-status">Please log in to view your profile.</p>
      </div>
    );

  return (
    <div className="profile-container">
      <h2>Your Profile</h2>
      <div className="profile-card">
        {user.picture && (
          <img src={user.picture} alt={user.name} className="profile-avatar" />
        )}

        <p>
          <strong>Name:</strong> {getDisplayName(user)}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>

        <p>
          <strong>Organization:</strong>{" "}
          {editMode ? (
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Enter organization"
            />
          ) : (
            profile?.organization || "N/A"
          )}
        </p>

        {editMode ? (
          <button 
            className="save-btn" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        ) : (
          <button className="edit-btn" onClick={() => setEditMode(true)}>
            Edit Organization
          </button>
        )}

        {error && <p className="profile-error">{error}</p>}
      </div>
    </div>
  );
}
