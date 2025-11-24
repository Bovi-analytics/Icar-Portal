import React from "react";
import "../styles/Landing.css";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="landing">
      {/* ===================== HEADER ===================== */}
      <header className="icar-header">
        <img src="/icar-logo.png" alt="ICAR Logo" className="icar-logo" />
        <div className="icar-title-block">
          <h1 className="icar-main-title">THE GLOBAL STANDARD FOR LIVESTOCK DATA</h1>
        </div>
      </header>

      {/* ===================== HERO SECTION ===================== */}
      <section className="hero-section">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="hero-title">ICAR 305-Day Milk Yield Validation Portal</h2>
          <p className="hero-subtitle">
            A global initiative to benchmark and validate milk yield calculations across organizations.
          </p>

          <Link to="/generate" className="hero-button">
            Get Started
          </Link>
        </motion.div>
      </section>

      {/* ===================== INTRODUCTION TEXT ===================== */}
      <section className="landing-section intro">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2>Welcome to the ICAR 305-Day Milk Yield Validation Portal</h2>

          <p>
            Thank you for contributing to our research! Your participation supports global efforts to
            improve the accuracy and standardization of dairy cattle recording systems.
          </p>

          <p>This platform serves as a central hub for:</p>

          <ul className="intro-list">
            <li>Validating cumulative 305-day milk yield calculations.</li>
            <li>Comparing results across organizations to identify variability.</li>
            <li>Supporting global standardization and improving genetic evaluation systems.</li>
          </ul>

          <h3>How It Works</h3>
          <ol className="intro-steps">
            <li>
              <strong>Generate a dataset:</strong> Receive a dataset containing information such as TestId,
              TestDate, CalvingDate, BirthDate, Parity, DaysInMilk, and DailyMilkingYield.
            </li>
            <li>
              <strong>Calculate 305-day yield:</strong> Use your internal calculation system to compute the
              cumulative 305-day yield.
            </li>
            <li>
              <strong>Receive feedback:</strong> Compare your results against ICAR reference standards and
              download a detailed report.
            </li>
            <li>
              <strong>Contribute to research:</strong> All data are used anonymously for research conducted
              by the Cornell Bovi-Analytics Lab.
            </li>
          </ol>

          <p>
            Our mission is to enhance data comparability, improve farm management insights, and
            support ongoing validation efforts worldwide.
          </p>

          <p className="contact-info">
            Need help? Contact:{" "}
            <a href="mailto:mbv32@cornell.edu">mbv32@cornell.edu</a> <br />
            Learn more about our work:{" "}
            <a href="https://bovi-analytics.com/" target="_blank" rel="noreferrer">
              bovi-analytics.com
            </a>{" "}
            |{" "}
            <a
              href="https://www.linkedin.com/company/bovi-analytics/"
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn
            </a>
          </p>
        </motion.div>
      </section>

      {/* ===================== 3 STEP SUMMARY ===================== */}
      <section className="landing-section">
        <h2>Quick Overview</h2>
        <div className="steps">
          <div className="step">
            <h3>1. Generate Data</h3>
            <p>Download a personalized dataset for validation.</p>
          </div>
          <div className="step">
            <h3>2. Submit Results</h3>
            <p>Upload your Excel file containing calculated yields.</p>
          </div>
          <div className="step">
            <h3>3. Get Feedback</h3>
            <p>Instantly compare your values with ICAR standards.</p>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="landing-footer">
        <p>ICAR &copy; 2025 | Cornell Bovi-Analytics Lab</p>
      </footer>
    </div>
  );
}
