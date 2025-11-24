import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import "../styles/Submit.css";
import { useAuth0 } from "@auth0/auth0-react";

export default function Submit() {
  const [file, setFile] = useState(null);
  const [orgName, setOrgName] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState("");
  const [otherMethod, setOtherMethod] = useState("");
  const [testSetId, setTestSetId] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState("");
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);

  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();


  // ✅ Fetch country list for dropdown ===
  useEffect(() => {
  const fetchCountries = async () => {
    try {
      const response = await fetch("https://restcountries.com/v3.1/all?fields=name");
      if (!response.ok) throw new Error("Failed to fetch countries");
      const data = await response.json();
      const countryList = data
        .map((c) => c.name.common)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      setCountries(countryList);
    } catch (err) {
      console.error("Error fetching countries:", err);
    } finally {
      setLoadingCountries(false);
    }
  };
  fetchCountries();
}, []);

  // === Schema for your template ===
  const REQUIRED_COLUMNS = ["TestObjectID", "CalculatedMilkYield (kg)"];

  const norm = (s = "") => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  const REQUIRED_NORM = REQUIRED_COLUMNS.map(norm);

  const [headerInfo, setHeaderInfo] = useState({
    headers: [],
    missing: [],
    extra: [],
    sheetName: "",
  });
  const [previewRows, setPreviewRows] = useState([]);
  const [rowIssues, setRowIssues] = useState([]);
  const [dupeIds, setDupeIds] = useState([]);
  const [showSchema, setShowSchema] = useState(false);
  const [localFileError, setLocalFileError] = useState("");

  const MAX_SIZE_MB = 10;

  // ✅ Fetch organization automatically if available
  useEffect(() => {
    const fetchOrganization = async () => {
      if (!isAuthenticated || !user?.email) return;
      try {
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
        if (res.ok) {
          const data = await res.json();
          if (data.organization) setOrgName(data.organization);
        }
      } catch (err) {
        console.warn("Could not fetch organization info:", err);
      }
    };
    fetchOrganization();
  }, [isAuthenticated, user, getAccessTokenSilently]);

  const resetValidation = () => {
    setHeaderInfo({ headers: [], missing: [], extra: [], sheetName: "" });
    setPreviewRows([]);
    setRowIssues([]);
    setDupeIds([]);
    setLocalFileError("");
  };

  const onFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f || null);
    if (f) parseAndValidateExcel(f);
    else resetValidation();
  };

  const parseAndValidateExcel = async (f) => {
    resetValidation();
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    if (!["xlsx", "xls"].includes(ext)) {
      setLocalFileError("Please upload an Excel file (.xlsx or .xls).");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setLocalFileError(`File too large. Max size is ${MAX_SIZE_MB} MB.`);
      return;
    }

    try {
      const data = await f.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      const headers = (rows[0] || []).map((h) => String(h).trim());
      const incomingNorm = headers.map(norm);
      const missing = REQUIRED_NORM
        .filter((need) => !incomingNorm.includes(need))
        .map((need) => REQUIRED_COLUMNS[REQUIRED_NORM.indexOf(need)]);
      const extra = headers.filter((h, i) => !REQUIRED_NORM.includes(incomingNorm[i]));
      const jsonRows = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const remapped = jsonRows.map((r) => {
        const obj = {};
        REQUIRED_COLUMNS.forEach((col, idx) => {
          const i = incomingNorm.indexOf(REQUIRED_NORM[idx]);
          obj[col] = i >= 0 ? r[headers[i]] : "";
        });
        return obj;
      });

      const seen = new Set();
      const dupes = [];
      const issues = [];
      remapped.forEach((r, rowIdx) => {
        const problems = [];
        if (r["TestObjectID"] === "") problems.push("TestObjectID is empty");
        if (r["CalculatedMilkYield (kg)"] === "")
          problems.push("CalculatedMilkYield (kg) is empty");

        const idNum = Number(r["TestObjectID"]);
        if (!Number.isFinite(idNum) || !Number.isInteger(idNum) || idNum < 0)
          problems.push("TestObjectID must be a non-negative integer");

        const y = Number(r["CalculatedMilkYield (kg)"]);
        if (!Number.isFinite(y) || y < 0)
          problems.push("CalculatedMilkYield (kg) must be a number ≥ 0");

        if (Number.isInteger(idNum)) {
          if (seen.has(idNum)) dupes.push(idNum);
          else seen.add(idNum);
        }

        if (problems.length > 0) issues.push({ row: rowIdx + 2, problems });
      });

      setHeaderInfo({ headers, missing, extra, sheetName });
      setPreviewRows(remapped.slice(0, 5));
      setRowIssues(issues);
      setDupeIds([...new Set(dupes)]);
    } catch (e) {
      console.error(e);
      setLocalFileError(
        "Could not read the Excel file. Please re-download the template and try again."
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError("");

    if (!isAuthenticated || !user?.email) {
      setError("Please log in before submitting.");
      setLoading(false);
      return;
    }

    if (localFileError) {
      setError(localFileError);
      setLoading(false);
      return;
    }
    if (!file) {
      setError("Please choose a file to upload.");
      setLoading(false);
      return;
    }
    if (headerInfo.missing.length > 0) {
      setError(`Your file is missing required columns: ${headerInfo.missing.join(", ")}`);
      setLoading(false);
      return;
    }
    if (rowIssues.length > 0) {
      setError(`Please fix ${rowIssues.length} row issue(s) before submitting.`);
      setLoading(false);
      return;
    }
    if (dupeIds.length > 0) {
      setError(
        `Duplicate TestObjectID values found: ${dupeIds
          .slice(0, 5)
          .join(", ")}${dupeIds.length > 5 ? " …" : ""}`
      );
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("organization", orgName);
    formData.append("country", country);
    formData.append("notes", notes);
    formData.append("respondentEmail", user.email);
    formData.append(
      "calculation_method",
      method === "Other" ? otherMethod : method
    );
    formData.append("test_set_id", testSetId);

    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(
        `http://localhost:5000/api/v1/submit?email=${encodeURIComponent(user.email)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (response.ok) {
        setSuccess(true);
        setFile(null);
        setNotes("");
        setMethod("");
        setOtherMethod("");
        setTestSetId("");
        resetValidation();
      } else {
        const data = await response.json();
        setError(data.message || "Submission failed");
      }
    } catch {
      setError("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return <p>Loading authentication...</p>;

  if (!isAuthenticated)
    return (
      <div className="submit-container">
        <h2>Submit Your Results</h2>
        <p>Please sign in to upload your results.</p>
      </div>
    );

  return (
    <div className="submit-container">
      <h2>Submit Your Results</h2>

      <div className="template-helper" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <a className="btn btn-outline" href="/templates/milk_yield_template.xlsx" download>
            ⬇️ Download Excel Template
          </a>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowSchema((s) => !s)}
          >
            {showSchema ? "Hide required columns" : "Show required columns"}
          </button>
        </div>

        {showSchema && (
          <div className="schema-box" style={{ marginTop: "0.75rem" }}>
            <small>Required columns (must be present):</small>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
              {REQUIRED_COLUMNS.map((c) => (
                <span key={c} className="pill">{c}</span>
              ))}
            </div>
            <div style={{ marginTop: "0.5rem" }}>
              <small>Tip: Keep the header row exactly as in the template. Export as <b>.xlsx</b>.</small>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="submit-form">
        <label>Upload Result File (.xlsx)</label>
        <input type="file" accept=".xlsx,.xls" required onChange={onFileChange} />

        {localFileError && <p className="error-message">{localFileError}</p>}

        {headerInfo.sheetName && (
          <div className="validation-panel">
            <p><b>Sheet:</b> {headerInfo.sheetName}</p>
            <p><b>Detected columns:</b> {headerInfo.headers.join(", ") || "—"}</p>

            {headerInfo.missing.length > 0 && (
              <p className="error-message">Missing required: {headerInfo.missing.join(", ")}</p>
            )}
            {headerInfo.extra.length > 0 && (
              <p className="warning-message">Extra columns (ignored): {headerInfo.extra.join(", ")}</p>
            )}
            {dupeIds.length > 0 && (
              <p className="error-message">
                Duplicate TestObjectID values: {dupeIds.slice(0, 5).join(", ")}
                {dupeIds.length > 5 ? " …" : ""}
              </p>
            )}
            {rowIssues.length > 0 && (
              <div className="error-message">
                <b>Row issues ({rowIssues.length}):</b>{" "}
                {rowIssues
                  .slice(0, 5)
                  .map((ri) => `Row ${ri.row}: ${ri.problems.join("; ")}`)
                  .join(" | ")}
                {rowIssues.length > 5 ? " …" : ""}
              </div>
            )}

            {/* ✅ RESTORED Preview table */}
            {previewRows.length > 0 && (
              <div className="preview-wrapper">
                <p><b>Preview (first 5 rows)</b></p>
                <div className="table-scroll">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        {REQUIRED_COLUMNS.map((k) => <th key={k}>{k}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i}>
                          {REQUIRED_COLUMNS.map((k) => (
                            <td key={k + i}>{row[k]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <label>Milk Recording Organization</label>
        <input
          type="text"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="Enter your organization name"
        />

        {/* <label>Country</label>
        <input
          type="text"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Enter your country"
        /> */}

        <label>Country</label>
          {loadingCountries ? (
            <p>Loading countries...</p>
          ) : (
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
            >
              <option value="">Select your country</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}


        <label>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ height: "100px", resize: "none", width: "100%" }}
        />

        <label>Method of Calculation</label>
        <select value={method} onChange={(e) => setMethod(e.target.value)} required>
          <option value="">Select a method</option>
          <option value="TIM">The Test Interval Method (TIM)</option>
          <option value="ISLC">Interpolation using Standard Lactation Curves (ISLC)</option>
          <option value="BP">Best Prediction (BP)</option>
          <option value="MTP">Multiple-Trait Procedure (MTP)</option>
          <option value="Other">Other (please specify)</option>
        </select>

        {method === "Other" && (
          <input
            type="text"
            placeholder="Specify method"
            value={otherMethod}
            onChange={(e) => setOtherMethod(e.target.value)}
            required
          />
        )}

        <label>TestSet ID</label>
        <input
          type="text"
          value={testSetId}
          onChange={(e) => setTestSetId(e.target.value)}
          required
        />

        {success && <p className="success-message">✅ Submission successful!</p>}
        {error && <p className="error-message">{error}</p>}

        <button
          type="submit"
          disabled={
            loading ||
            !!localFileError ||
            (headerInfo.missing && headerInfo.missing.length > 0) ||
            rowIssues.length > 0 ||
            dupeIds.length > 0
          }
          className="submit-button"
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
