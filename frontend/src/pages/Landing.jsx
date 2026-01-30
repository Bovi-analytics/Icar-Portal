import React from "react";
import "../styles/Landing.css";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiDownload, FiUpload, FiBarChart2, FiCheckCircle } from "react-icons/fi";

export default function Landing() {
  return (
    <div className="landing">

      {/* ===================== HERO SECTION ===================== */}
      <section className="hero-section">
        <div className="hero-background"></div>
        <div className="hero-content">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="hero-text"
          >
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="hero-badge"
            >
              Global Standardization Initiative
            </motion.span>
            <h1 className="hero-title">
              ICAR 305-Day Milk Yield
              <span className="hero-title-accent"> Validation Portal</span>
            </h1>
            <p className="hero-subtitle">
              A cutting-edge platform to benchmark and validate milk yield calculations across organizations worldwide. 
              Join the global effort to standardize dairy cattle recording systems.
            </p>
            <div className="hero-buttons">
              <Link to="/generate" className="hero-button primary">
                Get Started
              </Link>
              <Link to="/dashboard" className="hero-button secondary">
                View Dashboard
              </Link>
            </div>
          </motion.div>
        </div>
      </section>


      {/* ===================== ABOUT SECTION ===================== */}
      <section className="about-section">
        <div className="container">
          <div className="about-content">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="about-text"
            >
              <h2 className="section-title">About the Platform</h2>
              <p className="about-description">
                Thank you for contributing to our research! Your participation supports global efforts to
                improve the accuracy and standardization of dairy cattle recording systems.
              </p>
              <p className="about-description">
                This platform serves as a central hub for validating cumulative 305-day milk yield calculations,
                comparing results across organizations to identify variability, and supporting global standardization
                to improve genetic evaluation systems.
              </p>
              <div className="benefits-list">
                <div className="benefit-item">
                  <FiCheckCircle className="benefit-icon" />
                  <span>Validating cumulative 305-day milk yield calculations</span>
                </div>
                <div className="benefit-item">
                  <FiCheckCircle className="benefit-icon" />
                  <span>Comparing results across organizations to identify variability</span>
                </div>
                <div className="benefit-item">
                  <FiCheckCircle className="benefit-icon" />
                  <span>Supporting global standardization and improving genetic evaluation systems</span>
                </div>
              </div>
              <p className="about-mission">
                Our mission is to enhance data comparability, improve farm management insights, and
                support ongoing validation efforts worldwide.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===================== HOW IT WORKS SECTION ===================== */}
      <section className="how-it-works-section">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="section-header"
          >
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Simple, streamlined process in three easy steps</p>
          </motion.div>
          <div className="steps-container">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="step-card"
            >
              <div className="step-number">01</div>
              <div className="step-icon">
                <FiDownload />
              </div>
              <h3>Generate Dataset</h3>
              <p>Download a personalized dataset containing TestId, TestDate, CalvingDate, BirthDate, Parity, DaysInMilk, and DailyMilkingYield for validation.</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="step-card"
            >
              <div className="step-number">02</div>
              <div className="step-icon">
                <FiUpload />
              </div>
              <h3>Submit Results</h3>
              <p>Use your internal calculation system to compute the cumulative 305-day yield and upload your Excel file with the calculated results.</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="step-card"
            >
              <div className="step-number">03</div>
              <div className="step-icon">
                <FiBarChart2 />
              </div>
              <h3>Get Feedback</h3>
              <p>Instantly compare your results against ICAR reference standards and download a detailed validation report with insights.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===================== CTA SECTION ===================== */}
      <section className="cta-section">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="cta-content"
          >
            <h2>Ready to Get Started?</h2>
            <p>Join organizations worldwide in standardizing dairy cattle data validation</p>
            <Link to="/generate" className="cta-button">
              Start Validation Process
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Contact</h4>
              <p>
                <a href="mailto:mbv32@cornell.edu">mbv32@cornell.edu</a>
              </p>
            </div>
            <div className="footer-section">
              <h4>Learn More</h4>
              <div className="footer-links">
                <a href="https://bovi-analytics.com/" target="_blank" rel="noreferrer">
                  bovi-analytics.com
                </a>
                <a
                  href="https://www.linkedin.com/company/bovi-analytics/"
                  target="_blank"
                  rel="noreferrer"
                >
                  LinkedIn
                </a>
              </div>
            </div>
            <div className="footer-section">
              <h4>Partners</h4>
              <p>ICAR &copy; 2025</p>
              <p>Cornell Bovi-Analytics Lab</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 ICAR 305-Day Milk Yield Validation Portal. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
