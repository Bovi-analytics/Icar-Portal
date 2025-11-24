import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";
import Landing from "./pages/Landing";
import Generate from "./pages/Generate";
import Submit from "./pages/Submit";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
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

  if (isLoading) return <div className="loading">Loading...</div>;

  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          {/* ===== Left side (Logo + menu toggle) ===== */}
          <div className="navbar-left">
            <Link to="/" className="navbar-logo">
              ICAR Portal
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
              <li>
                <Link to="/admin" onClick={closeMenu}>
                  Admin Page
                </Link>
              </li>
            )}
            <li>
              <Link to="/generate" onClick={closeMenu}>
                Generate
              </Link>
            </li>
            <li>
              <Link to="/submit" onClick={closeMenu}>
                Submit
              </Link>
            </li>
            <li>
              <Link to="/dashboard" onClick={closeMenu}>
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/profile" onClick={closeMenu}>
                Profile
              </Link>
            </li>
          </ul>

          {/* ===== Right side (Auth buttons / profile) ===== */}
          <div className="auth-section">
            {!isAuthenticated ? (
              <>
                <button
                  className="auth-btn signup"
                  onClick={() => loginWithRedirect({ screen_hint: "signup" })}
                >
                  Sign Up
                </button>
                <button
                  className="auth-btn signin"
                  onClick={() => loginWithRedirect()}
                >
                  Sign In
                </button>
              </>
            ) : (
              <div className="profile-area">
                <span className="welcome-text">
                  Hi, {titleCase(user?.name)}
                </span>
                <button
                  className="logout-btn"
                  onClick={() =>
                    logout({ logoutParams: { returnTo: window.location.origin } })
                  }
                >
                  Logout
                </button>
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt="Profile"
                    className="profile-pic"
                    title={user.name}
                  />
                ) : (
                  <div className="profile-fallback" title={user?.name}>
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* ===== Main content ===== */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/submit" element={<Submit />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </Router>
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
