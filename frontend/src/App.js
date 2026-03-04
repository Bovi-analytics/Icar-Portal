import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { FiMenu, FiX, FiDatabase, FiUpload, FiBarChart2, FiUser, FiShield, FiTrendingUp } from "react-icons/fi";
import Landing from "./pages/Landing";
import Generate from "./pages/Generate";
import Submit from "./pages/Submit";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Analytics from "./pages/Analytics";
import "./App.css";
import { useAuth0 } from "@auth0/auth0-react";
import { jwtDecode } from "jwt-decode";

export default function App() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userRoles, setUserRoles] = useState([]);

  const {
    loginWithRedirect,
    logout,
    user,
    isAuthenticated,
    isLoading,
    getAccessTokenSilently,
  } = useAuth0();

  const toggleMenu = () => setIsNavOpen(!isNavOpen);
  const closeMenu = () => setIsNavOpen(false);

  // Fetch roles from token
  useEffect(() => {
    const fetchRoles = async () => {
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          const decoded = jwtDecode(token);
          const roles =
            decoded[`${process.env.REACT_APP_AUTH0_AUDIENCE}roles`] || [];
          setUserRoles(roles);
          console.log("🔑 Roles from token:", roles);
        } catch (error) {
          console.error("Error fetching token or roles:", error);
        }
      }
    };
    fetchRoles();
  }, [isAuthenticated, getAccessTokenSilently]);

  const titleCase = (str) =>
    str
      ?.toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

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

  if (isLoading) return <div className="loading">Loading...</div>;

  return (
    <Router>
      <div className="app-container">
        <NavBarContent 
          isNavOpen={isNavOpen}
          toggleMenu={toggleMenu}
          closeMenu={closeMenu}
          userRoles={userRoles}
          isAuthenticated={isAuthenticated}
          user={user}
          loginWithRedirect={loginWithRedirect}
          logout={logout}
          titleCase={titleCase}
          getDisplayName={getDisplayName}
        />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/submit" element={<Submit />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// Separate component for navbar that can use useLocation
function NavBarContent({ 
  isNavOpen, 
  toggleMenu, 
  closeMenu, 
  userRoles, 
  isAuthenticated, 
  user, 
  loginWithRedirect, 
  logout, 
  titleCase, 
  getDisplayName 
}) {
  const location = useLocation();
  
  const NavLink = ({ to, onClick, icon, children }) => {
    const isActive = location.pathname === to;
    
    return (
      <Link 
        to={to} 
        onClick={onClick}
        className={`nav-link ${isActive ? 'active' : ''}`}
      >
        <span className="nav-icon">{icon}</span>
        <span className="nav-text">{children}</span>
      </Link>
    );
  };

  return (
    <nav className="navbar">
      {/* ===== Left side (Logo + menu toggle) ===== */}
      <div className="navbar-left">
        <Link to="/" className="navbar-logo">
          <img src="/Bovi-Analytics-Transparent.png" alt="Bovi Analytics Logo" className="navbar-logo-img" />
        </Link>

        <button
          className="hamburger"
          onClick={toggleMenu}
          aria-label="Toggle navigation"
        >
          {isNavOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>

      {/* ===== Middle nav links ===== */}
      <ul className={`nav-links ${isNavOpen ? "nav-open" : ""}`}>
        {userRoles.includes("admin") && (
          <>
            <li>
              <NavLink to="/admin" onClick={closeMenu} icon={<FiShield />}>
                Admin
              </NavLink>
            </li>
            <li>
              <NavLink to="/analytics" onClick={closeMenu} icon={<FiTrendingUp />}>
                Analytics
              </NavLink>
            </li>
          </>
        )}
        <li>
          <NavLink to="/generate" onClick={closeMenu} icon={<FiDatabase />}>
            Generate
          </NavLink>
        </li>
        <li>
          <NavLink to="/submit" onClick={closeMenu} icon={<FiUpload />}>
            Submit
          </NavLink>
        </li>
        <li>
          <NavLink to="/dashboard" onClick={closeMenu} icon={<FiBarChart2 />}>
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/profile" onClick={closeMenu} icon={<FiUser />}>
            Profile
          </NavLink>
        </li>
      </ul>

      {/* ===== Right side (Auth buttons / profile) ===== */}
      <div className="auth-section">
        {!isAuthenticated ? (
          <div className="auth-buttons">
            <button
              className="auth-btn signin-btn"
              onClick={() => loginWithRedirect()}
            >
              Sign In
            </button>
            <button
              className="auth-btn signup-btn"
              onClick={() => loginWithRedirect({ screen_hint: "signup" })}
            >
              Sign Up
            </button>
          </div>
        ) : (
          <div className="profile-area">
            <div className="user-greeting">
              <span className="welcome-text">
                Hi, <strong>{titleCase(getDisplayName(user))}</strong>
              </span>
            </div>
            {user?.picture ? (
              <Link to="/profile" onClick={closeMenu} className="profile-pic-link">
                <img
                  src={user.picture}
                  alt="Profile"
                  className="profile-pic"
                  title={getDisplayName(user)}
                />
                {userRoles.includes("admin") && (
                  <div className="admin-crown" title="Administrator">
                    <FiShield />
                  </div>
                )}
              </Link>
            ) : (
              <Link to="/profile" onClick={closeMenu} className="profile-pic-link">
                <div className="profile-fallback" title={getDisplayName(user)}>
                  {getDisplayName(user)?.charAt(0).toUpperCase()}
                </div>
                {userRoles.includes("admin") && (
                  <div className="admin-crown" title="Administrator">
                    <FiShield />
                  </div>
                )}
              </Link>
            )}
            <button
              className="logout-btn"
              onClick={() =>
                logout({ logoutParams: { returnTo: window.location.origin } })
              }
              title="Logout"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}








// import React, { useState } from "react";
// import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
// import { FiMenu, FiX } from "react-icons/fi";
// import Landing from "./pages/Landing";
// import Generate from "./pages/Generate";
// import Submit from "./pages/Submit";
// import Dashboard from "./pages/Dashboard";
// import Profile from "./pages/Profile";
// import "./App.css";
// import Admin from "./pages/Admin";
// import { useAuth0 } from '@auth0/auth0-react';
// import { jwtDecode } from 'jwt-decode';



// export default function App() {
//   const [isNavOpen, setIsNavOpen] = useState(false);

//   const toggleMenu = () => setIsNavOpen(!isNavOpen);
//   const closeMenu = () => setIsNavOpen(false);

//   // Authentication section
//   const [userRoles, setUserRoles] = useState([]);
//   const { loginWithRedirect, logout, user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();

//   // Fetch and decode token to get roles when authenticated
//   useEffect(() => {
//     const fetchTokenAndRoles = async () => {
//       if (isAuthenticated) {
//         try {
//           const token = await getAccessTokenSilently();
//           const decoded = jwtDecode(token);
//           const roles = decoded[`${process.env.REACT_APP_AUTH0_AUDIENCE}roles`] || [];
//           setUserRoles(roles);
//           console.log('🔑 Roles from token :) :', roles);
//         } catch (error) {
//           console.error('Error fetching token or roles:', error);
//         }
//       }
//     };
//     fetchTokenAndRoles();
//   }, [isAuthenticated, getAccessTokenSilently]);


//   return (
//     <Router>
//       <div className="app-container">
//         <nav className="navbar">
//           <div className="navbar-left">
//             <Link to="/" className="navbar-logo">ICAR Portal</Link>

//             <button className="hamburger" onClick={toggleMenu} aria-label="Toggle navigation">
//               {isNavOpen ? <FiX size={24} /> : <FiMenu size={24} />}
//             </button>
//           </div>

//           <ul className={`nav-links ${isNavOpen ? "nav-open" : ""}`}>
//             <li><Link to="/admin" onClick={closeMenu}>Admin Page</Link></li>
//             <li><Link to="/generate" onClick={closeMenu}>Generate</Link></li>
//             <li><Link to="/submit" onClick={closeMenu}>Submit</Link></li>
//             <li><Link to="/dashboard" onClick={closeMenu}>Dashboard</Link></li>
//             <li><Link to="/profile" onClick={closeMenu}>Profile</Link></li>
            
//           </ul>
//         </nav>

//         <main className="main-content">
//           <Routes>
//             <Route path="/" element={<Landing />} />
//             <Route path="/generate" element={<Generate />} />
//             <Route path="/submit" element={<Submit />} />
//             <Route path="/dashboard" element={<Dashboard />} />
//             <Route path="/profile" element={<Profile />} />
//             <Route path="/admin" element={<Admin />} />
//           </Routes>
//         </main>
//       </div>
//     </Router>
//   );
// }
