import React, { useEffect, useState } from "react";
import "../styles/Profile.css";
import { useAuth0 } from "@auth0/auth0-react";

export default function Profile() {
  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [organization, setOrganization] = useState("");
  const [error, setError] = useState("");

  // Fetch profile from backend
  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated || !user?.email) return;
      try {
        setLoading(true);
        const token = await getAccessTokenSilently();

        const res = await fetch(
          `http://localhost:5000/api/v1/profile?email=${encodeURIComponent(user.email)}`,
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
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Could not load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, user, getAccessTokenSilently]);

  const handleSave = async () => {
    if (!organization.trim()) {
      alert("Organization cannot be empty.");
      return;
    }

    try {
      const token = await getAccessTokenSilently();

      const res = await fetch("http://localhost:5000/api/v1/profile-update", {
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

      if (!res.ok) throw new Error("Failed to update profile");

      const updated = await res.json();
      setProfile(updated);
      setEditMode(false);
    } catch (err) {
      console.error("Error saving organization:", err);
      setError("Error updating organization. Try again.");
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
          <strong>Name:</strong> {user.name}
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
          <button className="save-btn" onClick={handleSave}>
            Save
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
