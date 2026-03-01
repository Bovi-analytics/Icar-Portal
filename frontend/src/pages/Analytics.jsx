import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { jwtDecode } from "jwt-decode";
import "../styles/Analytics.css";

export default function Analytics() {
  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const [analytics, setAnalytics] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!isAuthenticated || !user?.email) return;

      try {
        setError("");

        const token = await getAccessTokenSilently();

        // Check admin status
        const decoded = jwtDecode(token);
        const rolesClaim =
          decoded[`${process.env.REACT_APP_AUTH0_AUDIENCE}roles`] ||
          decoded["roles"] ||
          [];
        const adminStatus = Array.isArray(rolesClaim) && rolesClaim.includes("admin");
        setIsAdmin(adminStatus);

        if (!adminStatus) {
          setError("Admin access required");
          return;
        }

        const base = process.env.REACT_APP_BASE_API_URL;
        const url = `${base}/api/v1/analytics?email=${encodeURIComponent(
          user.email
        )}&admin=yes`;

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setAnalytics(data.data);
        } else {
          setError(data.message || "Failed to fetch analytics");
        }
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError("Failed to load analytics. Please try again.");
      }
    };

    fetchAnalytics();
  }, [isAuthenticated, user?.email, getAccessTokenSilently]);

  if (isLoading) return <p className="analytics-loading">Loading analytics...</p>;

  if (!isAuthenticated)
    return (
      <div className="analytics-container">
        <h2>Please log in to view analytics.</h2>
      </div>
    );

  if (!isAdmin)
    return (
      <div className="analytics-container">
        <h2>Access Denied</h2>
        <p>You need admin privileges to view this page.</p>
      </div>
    );

  if (error)
    return (
      <div className="analytics-container">
        <h2>Error</h2>
        <p className="analytics-error">{error}</p>
      </div>
    );

  if (!analytics)
    return (
      <div className="analytics-container">
        <h2>No Data Available</h2>
      </div>
    );

  const { counts, statistics } = analytics;
  const maxCount = Math.max(counts.users, counts.submissions, counts.generates, 1);

  return (
    <div className="analytics-container">
      <h2>System Analytics</h2>
      <p className="analytics-subtitle">Overview of system data and statistics</p>

      {/* Main Counts Section */}
      <div className="analytics-section">
        <h3>Object Counts</h3>
        <div className="counts-grid">
          <div className="count-card">
            <div className="count-icon">👥</div>
            <div className="count-value">{counts.users}</div>
            <div className="count-label">Users</div>
          </div>
          <div className="count-card">
            <div className="count-icon">📊</div>
            <div className="count-value">{counts.submissions}</div>
            <div className="count-label">Submissions</div>
          </div>
          <div className="count-card">
            <div className="count-icon">📁</div>
            <div className="count-value">{counts.generates}</div>
            <div className="count-label">Generated Datasets</div>
          </div>
        </div>
      </div>

      {/* Bar Chart Visualization */}
      <div className="analytics-section">
        <h3>Counts Visualization</h3>
        <div className="bar-chart">
          <div className="bar-item">
            <div className="bar-label">Users</div>
            <div className="bar-wrapper">
              <div
                className="bar-fill"
                style={{
                  width: `${(counts.users / maxCount) * 100}%`,
                  backgroundColor: "#0084ca",
                }}
              >
                <span className="bar-value">{counts.users}</span>
              </div>
            </div>
          </div>
          <div className="bar-item">
            <div className="bar-label">Submissions</div>
            <div className="bar-wrapper">
              <div
                className="bar-fill"
                style={{
                  width: `${(counts.submissions / maxCount) * 100}%`,
                  backgroundColor: "#f15a22",
                }}
              >
                <span className="bar-value">{counts.submissions}</span>
              </div>
            </div>
          </div>
          <div className="bar-item">
            <div className="bar-label">Generated Datasets</div>
            <div className="bar-wrapper">
              <div
                className="bar-fill"
                style={{
                  width: `${(counts.generates / maxCount) * 100}%`,
                  backgroundColor: "#28a745",
                }}
              >
                <span className="bar-value">{counts.generates}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Statistics */}
      <div className="analytics-section">
        <h3>User Statistics</h3>
        <div className="user-stats-container">
          <div className="pie-chart-wrapper">
            <div className="pie-chart">
              <svg viewBox="0 0 200 200" className="pie-svg">
                {(() => {
                  const total = statistics.users_with_organization + statistics.users_without_organization;
                  if (total === 0) return null;
                  
                  const withOrgPercent = (statistics.users_with_organization / total) * 100;
                  const withoutOrgPercent = (statistics.users_without_organization / total) * 100;
                  
                  const radius = 80;
                  const circumference = 2 * Math.PI * radius;
                  const withOrgOffset = circumference - (withOrgPercent / 100) * circumference;
                  const withoutOrgOffset = circumference - (withoutOrgPercent / 100) * circumference;
                  
                  return (
                    <>
                      <circle
                        cx="100"
                        cy="100"
                        r={radius}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="30"
                      />
                      {withOrgPercent > 0 && (
                        <circle
                          cx="100"
                          cy="100"
                          r={radius}
                          fill="none"
                          stroke="#0084ca"
                          strokeWidth="30"
                          strokeDasharray={circumference}
                          strokeDashoffset={withOrgOffset}
                          strokeLinecap="round"
                          transform="rotate(-90 100 100)"
                          className="pie-segment"
                        />
                      )}
                      {withoutOrgPercent > 0 && (
                        <circle
                          cx="100"
                          cy="100"
                          r={radius}
                          fill="none"
                          stroke="#f15a22"
                          strokeWidth="30"
                          strokeDasharray={circumference}
                          strokeDashoffset={withoutOrgOffset + (withOrgPercent / 100) * circumference}
                          strokeLinecap="round"
                          transform="rotate(-90 100 100)"
                          className="pie-segment"
                        />
                      )}
                      <text x="100" y="100" textAnchor="middle" dominantBaseline="middle" className="pie-center-text">
                        <tspan x="100" dy="-5" className="pie-total">{total}</tspan>
                        <tspan x="100" dy="15" className="pie-label">Users</tspan>
                      </text>
                    </>
                  );
                })()}
              </svg>
            </div>
            <div className="pie-legend">
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: "#0084ca" }}></div>
                <span className="legend-label">With Organization</span>
                <span className="legend-value">{statistics.users_with_organization}</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: "#f15a22" }}></div>
                <span className="legend-label">Without Organization</span>
                <span className="legend-value">{statistics.users_without_organization}</span>
              </div>
            </div>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{statistics.users_with_organization}</div>
              <div className="stat-label">Users with Organization</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{statistics.users_without_organization}</div>
              <div className="stat-label">Users without Organization</div>
            </div>
          </div>
        </div>
      </div>

      {/* Submissions by Country - Enhanced Chart */}
      {Object.keys(statistics.submissions_by_country).length > 0 && (
        <div className="analytics-section">
          <h3>Submissions by Country</h3>
          <div className="chart-container">
            <div className="chart-wrapper">
              {Object.entries(statistics.submissions_by_country)
                .sort((a, b) => b[1] - a[1])
                .map(([country, count], index) => {
                  const total = Object.values(statistics.submissions_by_country).reduce((a, b) => a + b, 0);
                  const percentage = (count / total) * 100;
                  const colors = ["#0084ca", "#f15a22", "#28a745", "#ffc107", "#17a2b8", "#6f42c1", "#e83e8c"];
                  const color = colors[index % colors.length];
                  
                  return (
                    <div key={country} className="chart-item">
                      <div className="chart-label-row">
                        <span className="chart-label">{country}</span>
                        <span className="chart-count">{count}</span>
                      </div>
                      <div className="chart-bar-wrapper">
                        <div
                          className="chart-bar"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: color,
                          }}
                        >
                          <span className="chart-percentage">{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Submissions by Method - Enhanced Chart */}
      {Object.keys(statistics.submissions_by_method).length > 0 && (
        <div className="analytics-section">
          <h3>Submissions by Calculation Method</h3>
          <div className="chart-container">
            <div className="chart-wrapper">
              {Object.entries(statistics.submissions_by_method)
                .sort((a, b) => b[1] - a[1])
                .map(([method, count], index) => {
                  const total = Object.values(statistics.submissions_by_method).reduce((a, b) => a + b, 0);
                  const percentage = (count / total) * 100;
                  const colors = ["#0084ca", "#f15a22", "#28a745", "#ffc107", "#17a2b8", "#6f42c1", "#e83e8c"];
                  const color = colors[index % colors.length];
                  
                  return (
                    <div key={method} className="chart-item">
                      <div className="chart-label-row">
                        <span className="chart-label">{method}</span>
                        <span className="chart-count">{count}</span>
                      </div>
                      <div className="chart-bar-wrapper">
                        <div
                          className="chart-bar"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: color,
                          }}
                        >
                          <span className="chart-percentage">{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
