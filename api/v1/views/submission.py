from api.v1.views import app_views
from flask import Blueprint, jsonify, request, send_from_directory, send_file, Response
import pandas as pd
import uuid
import os
from azure.storage.blob import BlobServiceClient, ContentSettings
from datetime import datetime
import base64
from models import storage
from models.submission import Submission
from models.generate import Generate
from dotenv import load_dotenv
from fpdf import FPDF
from models.user import User
import pandas as pd
from io import BytesIO
import matplotlib.pyplot as plt
from authlib.integrations.flask_oauth2 import ResourceProtector
from api.v1.views.validator import Auth0JWTBearerTokenValidator


# Authentication
require_auth = ResourceProtector()
validator = Auth0JWTBearerTokenValidator(
    domain=os.getenv("AUTH0_DOMAIN"),
    audience=os.getenv("AUTH0_AUDIENCE")
)
require_auth.register_token_validator(validator)


# Dataset and Azure setup (app JSON may live in a different container/account than the reference CSV)
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
AZURE_CONTAINER_NAME = os.getenv("AZURE_CONTAINER_NAME")
AZURE_DATASET_STORAGE_CONNECTION_STRING = os.getenv("AZURE_DATASET_STORAGE_CONNECTION_STRING")
AZURE_DATASET_CONTAINER_NAME = os.getenv("AZURE_DATASET_CONTAINER_NAME", "icarwebsite")
# FULL_DATASET_PATH is the blob filename only (no "/"); it is stored under dataset/ in the container.
_dataset_filename = os.getenv("FULL_DATASET_PATH", "ActualMilkYields.csv").lstrip("/")
DATASET_BLOB_PATH = os.getenv("AZURE_DATASET_BLOB_PATH") or f"dataset/{_dataset_filename}"



def safe_calculate_metrics(true_vals, pred_vals):
    import numpy as np
    from sklearn.metrics import mean_absolute_error, mean_squared_error
    from scipy.stats import pearsonr

    """Return metrics safely even if dataset is small."""
    true = np.array(true_vals, dtype=float)
    pred = np.array(pred_vals, dtype=float)
    mask = ~np.isnan(true) & ~np.isnan(pred)
    true, pred = true[mask], pred[mask]
    if len(true) < 2:
        return {k: 0 for k in ["pearson_correlation","root_mean_squared_error","mean_absolute_error","mean_absolute_percentage_error"]}
    pearson_corr, _ = pearsonr(true, pred)
    mae = mean_absolute_error(true, pred)
    mape = np.mean(np.abs((true - pred) / true)) * 100
    rmse = np.sqrt(mean_squared_error(true, pred))
    return {
        "pearson_correlation": pearson_corr,
        "root_mean_squared_error": rmse,
        "mean_absolute_error": mae,
        "mean_absolute_percentage_error": mape
    }

# ======================================================
# NEW FUNCTION: Load ActualMilkYields.csv from Azure Blob
# ======================================================
def load_csv_from_blob():
    """Load reference CSV from blob. FULL_DATASET_PATH is filename only; blob key is dataset/<filename>."""
    conn = AZURE_DATASET_STORAGE_CONNECTION_STRING or AZURE_STORAGE_CONNECTION_STRING
    if not conn:
        raise ValueError(
            "AZURE_STORAGE_CONNECTION_STRING or AZURE_DATASET_STORAGE_CONNECTION_STRING must be set"
        )
    blob_service = BlobServiceClient.from_connection_string(conn)
    container_client = blob_service.get_container_client(AZURE_DATASET_CONTAINER_NAME)
    blob_client = container_client.get_blob_client(DATASET_BLOB_PATH)
    if not blob_client.exists():
        raise FileNotFoundError(
            f"Dataset blob not found: {AZURE_DATASET_CONTAINER_NAME}/{DATASET_BLOB_PATH}"
        )
    csv_bytes = blob_client.download_blob().readall()
    return pd.read_csv(BytesIO(csv_bytes))

def generate_comparison_pdf(details, metrics, user_name, generate_obj, submission_obj):
    import numpy as np
    import pandas as pd
    from io import BytesIO
    import matplotlib.pyplot as plt
    from fpdf import FPDF
    import os
    from scipy.stats import pearsonr
    from sklearn.metrics import mean_absolute_error, mean_squared_error

    plt.switch_backend("Agg")  # prevents Tkinter GUI errors

    # ===== Load ICAR reference data =====
    # ICAR_REFERENCE_PATH = "ActualMilkYields.csv"  # ensure file exists
    # ref_df = pd.read_csv(ICAR_REFERENCE_PATH)
    ref_df = load_csv_from_blob()
    ref_df.columns = ref_df.columns.str.strip()
    ref_map = dict(zip(ref_df["TestId"].astype(str), ref_df["TotalActualProduction"]))

    def safe_calculate_metrics(true_vals, pred_vals):
        """Return metrics safely even if dataset is small."""
        true = np.array(true_vals, dtype=float)
        pred = np.array(pred_vals, dtype=float)
        mask = ~np.isnan(true) & ~np.isnan(pred)
        true, pred = true[mask], pred[mask]
        if len(true) < 2:
            return {k: 0 for k in ["pearson_correlation","root_mean_squared_error","mean_absolute_error","mean_absolute_percentage_error"]}
        pearson_corr, _ = pearsonr(true, pred)
        mae = mean_absolute_error(true, pred)
        mape = np.mean(np.abs((true - pred) / true)) * 100
        rmse = np.sqrt(mean_squared_error(true, pred))
        return {
            "pearson_correlation": pearson_corr,
            "root_mean_squared_error": rmse,
            "mean_absolute_error": mae,
            "mean_absolute_percentage_error": mape
        }

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=20)

    # ===== HEADER WITH LOGOS =====
    # Try multiple possible paths for logos
    base_paths = [
        os.path.join(os.getcwd(), "frontend", "public"),
        os.path.join(os.getcwd(), "api", "v1", "views"),
        os.getcwd(),
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ]
    
    icar_logo_path = None
    bovi_logo_path = None
    
    for base in base_paths:
        icar_path = os.path.join(base, "icar-logo.png")
        bovi_path = os.path.join(base, "Bovi-Analytics-Transparent.png")
        if not icar_logo_path and os.path.exists(icar_path):
            icar_logo_path = icar_path
        if not bovi_logo_path and os.path.exists(bovi_path):
            bovi_logo_path = bovi_path
    
    # Add logos at the top
    y_pos = 10
    if bovi_logo_path:
        try:
            pdf.image(bovi_logo_path, x=15, y=y_pos, w=25)
        except:
            pass
    
    if icar_logo_path:
        try:
            pdf.image(icar_logo_path, x=170, y=y_pos, w=25)
        except:
            pass

    # Title with better styling
    pdf.set_font("Arial", 'B', 18)
    pdf.set_text_color(0, 0, 128)
    pdf.ln(8)
    pdf.cell(0, 12, "Cumulative Milk Yield Calculation Report", ln=True, align="C")
    pdf.ln(2)
    
    # Add a decorative line
    pdf.set_draw_color(0, 109, 132)
    pdf.set_line_width(0.5)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(8)

    # Report details with better formatting
    pdf.set_font("Arial", 'B', 11)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(60, 7, "Name of Organization:", 0, 0)
    pdf.set_font("Arial", '', 11)
    pdf.cell(0, 7, details['organization'], ln=True)
    
    pdf.set_font("Arial", 'B', 11)
    pdf.cell(60, 7, "Report generated on:", 0, 0)
    pdf.set_font("Arial", '', 11)
    pdf.cell(0, 7, details['date_reported'], ln=True)
    
    pdf.set_font("Arial", 'B', 11)
    pdf.cell(60, 7, "Report Requested By:", 0, 0)
    pdf.set_font("Arial", '', 11)
    pdf.cell(0, 7, user_name.title(), ln=True)
    
    pdf.set_font("Arial", 'B', 11)
    pdf.cell(60, 7, "Method of Calculation Applied:", 0, 0)
    pdf.set_font("Arial", '', 11)
    pdf.cell(0, 7, details['calculation_method'], ln=True)
    
    pdf.set_font("Arial", 'B', 11)
    pdf.cell(60, 7, "Test Set ID:", 0, 0)
    pdf.set_font("Arial", '', 11)
    pdf.cell(0, 7, details['test_set_id'], ln=True)
    
    pdf.set_font("Arial", 'B', 11)
    pdf.cell(60, 7, "Country:", 0, 0)
    pdf.set_font("Arial", '', 11)
    pdf.cell(0, 7, details['country'] if details['country'] else "N/A", ln=True)
    pdf.ln(8)
    
    # ===== Introduction Section =====
    pdf.set_font("Arial", 'B', 13)
    pdf.set_fill_color(201, 227, 242)
    pdf.set_text_color(0, 0, 128)
    pdf.cell(190, 9, "Introduction", ln=True, fill=True)
    pdf.ln(5)
    
    pdf.set_font("Arial", '', 10)
    pdf.set_text_color(0, 0, 0)
    intro_text = (
        "This report compares the results of the calculation of cumulative milk yield per lactation "
        "(calculated over 305 days) of the organization (SCALY) with the reference calculation of ICAR "
        "for the chosen method (RCALY) and with the actual milk production of the cow for that lactation (ALY). "
        "The reference calculations are coming from the ICAR guideline Procedure 2 of section 2 "
        "(https://www.icar.org/Guidelines/02-Procedure-2-Computing-Lactation-Yield.pdf). "
        "The actual milk production is obtained by measuring the cow's milk yield every day and summing "
        "these daily values to determine the true 305-day milk yield.\n\n"
        "We acknowledge that even when the same methods are applied, variability in results can occur due to "
        "differences in standard lactation curves; therefore, complete agreement is not realistic.\n\n"
        "The calculation of the organization is evaluated using four different metrics: R², root mean squared error (RMSE), "
        "mean absolute error (MAE), and mean absolute percentage error (MAPE). The results are presented in a table with "
        "two rows: the first compares the organization's calculation with the reference calculation, and the second compares "
        "the organization's calculation with the actual cumulative milk yield.\n\n"
        "To analyze the results further, the calculation is also evaluated by parity, using only the milk recordings of "
        "cows in each category and applying the same evaluation metrics."
    )
    pdf.multi_cell(0, 6, intro_text)
    pdf.ln(6)

    # ===== TABLE STRUCTURE =====
    # Make each column with the same width
    col_widths = [38, 38, 38, 38, 38]
    headers = ["Comparison", "R²", "RMSE", "MAE", "MAPE"]

    def draw_metrics_table(section_name, primary_metrics, icar_metrics):
        """Draws a 2-row metrics table with professional styling."""
        # Section header with better styling
        pdf.set_font("Arial", 'B', 13)
        pdf.set_fill_color(201, 227, 242)
        pdf.set_text_color(0, 0, 128)
        pdf.cell(190, 9, section_name, ln=True, fill=True)
        pdf.ln(4)

        # Table header with bold styling
        pdf.set_font("Arial", 'B', 10)
        pdf.set_text_color(255, 255, 255)
        pdf.set_fill_color(0, 109, 132)
        for h, w in zip(headers, col_widths):
            pdf.cell(w, 9, h, 1, 0, 'C', fill=True)
        pdf.ln()

        # Row 1 — Reference Calculation (RCALY)
        pdf.set_font("Arial", 'B', 10)
        pdf.set_text_color(0, 0, 0)
        pdf.set_fill_color(245, 245, 245)
        pdf.cell(col_widths[0], 9, "RCALY", 1, 0, 'L', fill=True)
        pdf.set_font("Arial", '', 10)
        pdf.set_fill_color(255, 255, 255)
        pdf.cell(col_widths[1], 9, f"{primary_metrics['pearson_correlation']:.3f}", 1, 0, 'C', fill=True)
        pdf.cell(col_widths[2], 9, f"{primary_metrics['root_mean_squared_error']:.2f}", 1, 0, 'C', fill=True)
        pdf.cell(col_widths[3], 9, f"{primary_metrics['mean_absolute_error']:.2f}", 1, 0, 'C', fill=True)
        pdf.cell(col_widths[4], 9, f"{primary_metrics['mean_absolute_percentage_error']:.2f}%", 1, 0, 'C', fill=True)
        pdf.ln()

        # Row 2 — Actual Accumulated (ALY)
        pdf.set_fill_color(0, 109, 132)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Arial", 'B', 10)
        pdf.cell(col_widths[0], 9, "ALY", 1, 0, 'L', fill=True)
        pdf.set_font("Arial", '', 10)
        pdf.set_fill_color(230, 240, 245)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(col_widths[1], 9, f"{icar_metrics['pearson_correlation']:.3f}", 1, 0, 'C', fill=True)
        pdf.cell(col_widths[2], 9, f"{icar_metrics['root_mean_squared_error']:.2f}", 1, 0, 'C', fill=True)
        pdf.cell(col_widths[3], 9, f"{icar_metrics['mean_absolute_error']:.2f}", 1, 0, 'C', fill=True)
        pdf.cell(col_widths[4], 9, f"{icar_metrics['mean_absolute_percentage_error']:.2f}%", 1, 0, 'C', fill=True)
        pdf.ln(12)

    def plot_and_add_to_pdf(x_vals, y_vals, title, xlabel, ylabel, color, add_45_line=False):
        """Generate scatter plot and insert neatly into PDF with better styling."""
        fig, ax = plt.subplots(figsize=(5, 3))
        ax.scatter(x_vals, y_vals, s=20, alpha=0.6, color=color, edgecolors="white", linewidth=0.3)
        
        # Add 45-degree line with high transparency if requested
        if add_45_line:
            min_val = min(min(x_vals), min(y_vals))
            max_val = max(max(x_vals), max(y_vals))
            ax.plot([min_val, max_val], [min_val, max_val], 'k--', alpha=0.25, linewidth=1.2)
        
        ax.set_title(title, fontsize=10, fontweight='bold', pad=10)
        ax.set_xlabel(xlabel, fontsize=9, fontweight='bold')
        ax.set_ylabel(ylabel, fontsize=9, fontweight='bold')
        ax.tick_params(axis='both', labelsize=8)
        ax.grid(True, linestyle="--", linewidth=0.5, alpha=0.5, color='gray')
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        plt.tight_layout()
        buf = BytesIO()
        plt.savefig(buf, format="PNG", dpi=150, bbox_inches="tight", facecolor='white')
        plt.close()
        buf.seek(0)
        img_path = f"/tmp/temp_plot_{np.random.randint(100000)}.png"
        with open(img_path, "wb") as f:
            f.write(buf.getvalue())
        if pdf.get_y() > 160:
            pdf.add_page()
        pdf.image(img_path, x=15, w=180)
        os.remove(img_path)
        pdf.ln(8)

    # ===== Overall Section =====
    ref = metrics['reference_yields']
    actual = metrics['actual_yields']
    icar_ref = [ref_map.get(str(tid)) for tid in submission_obj.test_obj_ids]
    icar_metrics = safe_calculate_metrics(icar_ref, submission_obj.calculated_milk_yields)

    draw_metrics_table("Calculation Evaluation and Comparison", metrics, icar_metrics)

    # Add Abbreviations Section with better styling
    pdf.set_font("Arial", 'B', 9)
    pdf.set_text_color(0, 0, 128)
    pdf.cell(0, 6, "Abbreviations Used:", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", '', 9)
    pdf.set_text_color(60, 60, 60)
    pdf.multi_cell(0, 5,
        "RCALY - Reference Calculated Accumulated Lactation Yield\n"
        "SCALY - Submitted Calculated Accumulated Lactation Yield\n"
        "ALY - Actual Accumulated Lactation Yield"
    )
    pdf.ln(6)
    pdf.set_text_color(0, 0, 0)

    # Overall scatter plots
    plot_and_add_to_pdf(ref, actual, 
                        "Calculation of organization versus the ICAR reference calculation", 
                        "RCALY (kg milk)", "SCALY (kg milk)", "#1f77b4", add_45_line=True)
    plot_and_add_to_pdf(icar_ref, submission_obj.calculated_milk_yields,
                        "Calculation of organization versus actual 305 milk yield", 
                        "ALY (kg milk)", "SCALY (kg milk)", "#ff7f0e", add_45_line=True)

    # ===== Parity-specific Sections =====
    parity_list = generate_obj.parity
    test_ids = generate_obj.test_obj_ids
    ref_yields = generate_obj.calculated_milk_yields
    submission_map = {sid: val for sid, val in zip(submission_obj.test_obj_ids, submission_obj.calculated_milk_yields)}

    parity_to_ref, parity_to_act, parity_to_icar = {}, {}, {}

    for tid, ref_val, p in zip(test_ids, ref_yields, parity_list):
        # === NEW LOGIC: Combine parity >= 3 into "3+" ===
        try:
            p_int = int(p)
        except:
            p_int = 0
        group_label = "3+" if p_int >= 3 else str(p_int)

        if tid in submission_map:
            parity_to_ref.setdefault(group_label, []).append(ref_val)
            parity_to_act.setdefault(group_label, []).append(submission_map[tid])
            icar_val = ref_map.get(str(tid))
            if icar_val is not None:
                parity_to_icar.setdefault(group_label, []).append(icar_val)

    # ===== Parity-specific Sections with Header =====
    # Add main header: "Calculation evaluation per parity"
    if any(p in parity_to_ref for p in ["1", "2", "3+"]):
        if pdf.get_y() > 180:
            pdf.add_page()
        
        pdf.set_font("Arial", 'B', 13)
        pdf.set_fill_color(201, 227, 242)
        pdf.set_text_color(0, 0, 128)
        pdf.cell(190, 9, "Calculation Evaluation per Parity", ln=True, fill=True)
        pdf.ln(6)
    
    # We'll iterate only over Parity 1, 2, and 3+ (if they exist)
    for p in ["1", "2", "3+"]:
        if p not in parity_to_ref:
            continue

        ref_vals = parity_to_ref[p]
        act_vals = parity_to_act[p]
        icar_vals = parity_to_icar.get(p, [])
        if len(ref_vals) < 2 or len(icar_vals) < 2:
            continue

        parity_metrics = safe_calculate_metrics(ref_vals, act_vals)
        parity_icar_metrics = safe_calculate_metrics(icar_vals, act_vals)

        # Smaller subheader for each parity
        draw_metrics_table(f"Parity {p} Performance", parity_metrics, parity_icar_metrics)
        plot_and_add_to_pdf(ref_vals, act_vals, 
                          f"Parity {p} Scatter: RCALY vs SCALY", 
                          "RCALY (kg milk)", "SCALY (kg milk)", "#1f77b4", add_45_line=True)
        plot_and_add_to_pdf(icar_vals, act_vals, 
                          f"Parity {p} Scatter: Actual vs SCALY", 
                          "ALY (kg milk)", "SCALY (kg milk)", "#ff7f0e", add_45_line=True)

    # ===== Appendix =====
    if pdf.get_y() > 180:
        pdf.add_page()

    pdf.set_font("Arial", 'B', 13)
    pdf.set_fill_color(201, 227, 242)
    pdf.set_text_color(0, 0, 128)
    pdf.cell(190, 9, "Appendix", ln=True, fill=True)
    pdf.ln(5)

    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Arial", 'B', 10)
    pdf.cell(0, 7, "Data set we gave them + result that they gave back", ln=True)
    pdf.ln(4)

    # Download links with better styling
    if 'dataset_link' in details:
        pdf.set_text_color(0, 0, 255)
        pdf.set_font("Arial", 'U', 10)
        pdf.cell(0, 8, "Download TestSet used for the calculation", ln=True,
                 link='http://localhost:5000/' + details['dataset_link'])
        pdf.ln(4)
    
    # Disclaimer with better styling
    pdf.set_font("Arial", 'B', 10)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 7, "Disclaimer", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", '', 9)
    pdf.set_text_color(60, 60, 60)
    pdf.multi_cell(0, 5, 
        "All submitted data will be collected for research purposes by the Cornell Bovi-Analytics lab. "
        "Any publications based on this data will be fully anonymized."
    )
    pdf.ln(6)
    
    # Contact information with better styling
    pdf.set_font("Arial", 'B', 10)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 7, "Contact Information", ln=True)
    pdf.ln(2)
    pdf.set_font("Arial", '', 9)
    pdf.set_text_color(60, 60, 60)
    pdf.multi_cell(0, 5,
        "For questions or support, contact: mbv32@cornell.edu\n\n"
        "Interested in what the Bovi-Analytics lab is doing? "
        "See https://bovi-analytics.org/ and https://www.linkedin.com/company/bovi-analytics/"
    )

    pdf_bytes = pdf.output(dest='S').encode('latin-1')
    return BytesIO(pdf_bytes)


load_dotenv()


def calculate_metrics(true: list, pred: list) -> dict:
    """
    Calculate evaluation metrics between true and predicted values.

    Args:
        true (pd.Series): True values.
        pred (pd.Series): Predicted values.

    Returns:
        dict: A dictionary containing the calculated metrics.
    """
    from scipy.stats import pearsonr
    from sklearn.metrics import mean_absolute_error, mean_squared_error
    import numpy as np


    # convert to float arrays and drop invalid pairs
    true = np.array(true, dtype=float)
    pred = np.array(pred, dtype=float)
    mask = ~np.isnan(true) & ~np.isnan(pred)
    true, pred = true[mask], pred[mask]
    if len(true) < 2:
        return {
            "pearson_correlation": 0.0,
            "mean_absolute_error": 0.0,
            "mean_absolute_percentage_error": 0.0,
            "root_mean_squared_error": 0.0
        }

    # Pearson is undefined for constant arrays; avoid scipy warning
    if np.all(true == true[0]) or np.all(pred == pred[0]):
        pearson_corr = 0.0
    else:
        pearson_corr, _ = pearsonr(true, pred)

    # Mean Absolute Error
    mae = mean_absolute_error(true, pred)

    # Mean Absolute Percentage Error
    # Avoid division-by-zero when true contains zeros
    safe_true = np.where(true == 0, np.nan, true)
    mape = np.nanmean(np.abs((true - pred) / safe_true)) * 100
    if np.isnan(mape):
        mape = 0.0

    # Root Mean Squared Error
    rmse = np.sqrt(mean_squared_error(true, pred))

    return {
        "pearson_correlation": pearson_corr,
        "mean_absolute_error": mae,
        "mean_absolute_percentage_error": mape,
        "root_mean_squared_error": rmse
    }


def _aligned_yields(generate_obj, submission_obj):
    """
    Align generate/submission yields by shared TestId.
    Returns (internal_yields, external_yields) in matching order.
    """
    gen_map = {
        str(tid): val
        for tid, val in zip(generate_obj.test_obj_ids or [], generate_obj.calculated_milk_yields or [])
    }
    sub_map = {
        str(tid): val
        for tid, val in zip(submission_obj.test_obj_ids or [], submission_obj.calculated_milk_yields or [])
    }
    common_ids = [tid for tid in sub_map.keys() if tid in gen_map]
    internal = [gen_map[tid] for tid in common_ids]
    external = [sub_map[tid] for tid in common_ids]
    return internal, external


def _metrics_payload_for_submission(submission):
    """ICAR reference-calculation vs submitted yields (same as /compare). JSON-serializable floats."""
    generate_obj = storage.get(Generate, submission.generate_id)
    if not generate_obj:
        return None
    internal_milk_yields, external_milk_yields = _aligned_yields(generate_obj, submission)
    if not external_milk_yields or not internal_milk_yields:
        return None
    try:
        m = calculate_metrics(internal_milk_yields, external_milk_yields)
        return {k: float(v) for k, v in m.items()}
    except Exception:
        return None


def extract_milk_yield_data_from_excel(file_stream):
    """
    Reads an Excel file stream and returns a dictionary of test object IDs and their calculated yields.

    Args:
        file_stream (BytesIO): The uploaded Excel file stream.

    Returns:
        dict: A dictionary with TestObjectID as keys and yield (float) as values.

    Raises:
        ValueError: If required columns are missing or data is malformed.
    """
    try:
        # Load into pandas
        df = pd.read_excel(file_stream)

        # Clean column names just in case
        df.columns = df.columns.str.strip()

        required_cols = ["TestObjectID", "CalculatedMilkYield (kg)"]
        if not all(col in df.columns for col in required_cols):
            raise ValueError("Excel file must contain 'TestObjectID' and 'CalculatedMilkYield (kg)' columns.")

        # Drop empty rows
        df = df.dropna(subset=required_cols)

        # Convert to dictionary
        yield_dict = {
            str(row["TestObjectID"]).strip(): float(row["CalculatedMilkYield (kg)"])
            for _, row in df.iterrows()
        }

        return yield_dict

    except Exception as e:
        raise ValueError(f"Error processing Excel file: {str(e)}")


@app_views.route('/submit', methods=['POST'], strict_slashes=False)
@require_auth()
def submit_data():
    try:
        # 1. Parse the uploaded Excel file
        if 'file' not in request.files:
            return jsonify({"success": False, "message": "No file uploaded"}), 400
        file = request.files['file']

        if file.filename == '':
            return jsonify({"success": False, "message": "Empty file name"}), 400

        ref_df = load_csv_from_blob()
        ref_df.columns = ref_df.columns.str.strip()
        ref_map = dict(zip(ref_df["TestId"].astype(str), ref_df["TotalActualProduction"]))

        file_stream = BytesIO(file.read())
        milk_yield_dict = extract_milk_yield_data_from_excel(file_stream)

        # get the email of the user from the request args
        user_email = request.args.get("email")
        if not user_email:
            return jsonify({"success": False, "message": "Missing user email"}), 400
        
        # Reload storage to get latest data before write operation
        storage.reload()
        
        # Check if user exists
        all_users = storage.all(User)
        user = None
        for u in all_users.values():
            if u.email == user_email:
                user = u
                break
        
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        # 2. Parse metadata
        test_set_id = request.form.get("test_set_id")
        calculation_method = request.form.get("calculation_method", "")
        notes = request.form.get("notes", "")
        organization = request.form.get("organization")

        if not test_set_id or not calculation_method:
            return jsonify({"success": False, "message": "Missing required metadata (test_set_id or calculation_method)"}), 400

        # check if the test_set_id exists in any of the Generate objects
        generate = storage.get(Generate, test_set_id)
        if not generate:
            print("Test set ID not found:", test_set_id)
            return jsonify({
                "success": False,
                "message": "Test set ID not found",
                "error": "TEST_SET_NOT_FOUND",
                "test_set_id": test_set_id
            }), 404
        
        generate_download_link = generate.download_url
        

        # 4. Save to blob database
        submission = Submission()
        submission.generate_id = test_set_id
        submission.calculation_method = calculation_method
        submission.notes = notes
        submission.download_url = generate_download_link
        submission.organization = organization
        submission.country = request.form.get("country", "")
        # make sure all keys in the submission.test_obj_ids are integers
        submission.test_obj_ids = list(map(lambda x: int(float(x)), milk_yield_dict.keys()))
        submission.calculated_milk_yields = list(milk_yield_dict.values())

        # storage.new(submission)
        # storage.save()
        print(submission.to_dict())
        submission.save()

        return jsonify({
            "success": True,
            "message": "Submission uploaded successfully",
            "submission_id": submission.id
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app_views.route('/submissions', methods=['GET'], strict_slashes=False)
@require_auth()
def get_submissions():
    try:
        user_email = request.args.get("email")
        if not user_email:
            return jsonify({"success": False, "message": "Missing user email"}), 400
        
        # Reload storage to get latest data (optional for reads, but helps with data freshness)
        storage.reload()
        
        # Check if user exists
        all_users = storage.all(User)
        user = None
        for u in all_users.values():
            if u.email == user_email:
                user = u
                break
        


        # get the admin role from the request args
        admin_role = request.args.get("admin")

        if not user and admin_role == "yes":
            all_submissions = storage.all(Submission)
            submissions_list = []
            for submission in all_submissions.values():
                # Get user name from the generate object
                generate_obj = storage.get(Generate, submission.generate_id)
                user_name = "Unknown"
                if generate_obj:
                    gen_user = storage.get(User, generate_obj.user_id)
                    if gen_user:
                        user_name = gen_user.name or "Unknown"

                submissions_list.append({
                    "id": submission.id,
                    "generate_id": submission.generate_id,
                    "calculation_method": submission.calculation_method,
                    "notes": submission.notes,
                    "download_url": submission.download_url,
                    "organization": submission.organization,
                    "name": user_name,
                    "country": submission.country,
                    "test_set_id": submission.generate_id,
                    "date": submission.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "metrics": _metrics_payload_for_submission(submission),
                })
            return jsonify(submissions_list), 200

        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        
        if admin_role == "yes":
            all_submissions = storage.all(Submission)
            submissions_list = []
            # print("User found:", user.name, user.email)
            for submission in all_submissions.values():
                submissions_list.append({
                    "id": submission.id,
                    "generate_id": submission.generate_id,
                    "calculation_method": submission.calculation_method,
                    "notes": submission.notes,
                    "download_url": submission.download_url,
                    "organization": submission.organization,
                    "name": user.name,
                    "country": submission.country,
                    "test_set_id": submission.generate_id,
                    "date": submission.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "metrics": _metrics_payload_for_submission(submission),
                })
            # print(submissions_list)
            return jsonify(submissions_list), 200
        
        # if admin role is no
        all_generates = user.generate
        all_submissions = []
        submissions_list = []
        for gen in all_generates:
            all_submissions.extend(gen.submission)
        for submission in all_submissions:
            submissions_list.append({
                "id": submission.id,
                "generate_id": submission.generate_id,
                "calculation_method": submission.calculation_method,
                "notes": submission.notes,
                "download_url": submission.download_url,
                "organization": submission.organization,
                "name": user.name,
                "country": submission.country,
                "test_set_id": submission.generate_id,
                "date": submission.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "metrics": _metrics_payload_for_submission(submission),
            })
            # print(submissions_list)
        return jsonify(submissions_list), 200
        



    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# create a delete route to delete submission based on the id
@app_views.route('/submission/<submission_id>', methods=['DELETE'], strict_slashes=False)
@require_auth()
def delete_submission(submission_id):
    try:
        # Reload storage to get latest data before delete operation
        storage.reload()
        
        submission = storage.get(Submission, submission_id)
        if not submission:
            return jsonify({"success": False, "message": "Submission not found"}), 404
        
        storage.delete(submission)
        storage.save()

        return jsonify({"success": True, "message": "Submission deleted successfully"}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app_views.route('/compare/<submission_id>', methods=['GET'], strict_slashes=False)
def compare_submission(submission_id):
    try:
        submission = storage.get(Submission, submission_id)
        if not submission:
            return jsonify({"success": False, "message": "Submission not found"}), 404

        generate = storage.get(Generate, submission.generate_id)
        if not generate:
            return jsonify({"success": False, "message": "Generate object not found"}), 404

        internal_milk_yields, external_milk_yields = _aligned_yields(generate, submission)

        if not external_milk_yields or not internal_milk_yields:
            return jsonify({
                "success": False,
                "message": "No overlapping Test IDs found between generated and submitted yields for comparison"
            }), 400

        metrics = calculate_metrics(internal_milk_yields, external_milk_yields)
        metrics['reference_yields'] = internal_milk_yields
        metrics['actual_yields'] = external_milk_yields

        user = storage.get(User, generate.user_id)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        details = {
            "organization": user.organization,
            "date_reported": submission.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "calculation_method": submission.calculation_method,
            "notes": submission.notes,
            "country": submission.country,
            "test_set_id": submission.generate_id,
            "dataset_link": submission.download_url
        }

        if request.args.get('download') == 'true':
            # pdf_stream = generate_comparison_pdf(details, metrics, user.name)
            pdf_stream = generate_comparison_pdf(details, metrics, user.name, generate, submission)
            return send_file(
                pdf_stream,
                as_attachment=True,
                download_name=f"icar_comparison_{submission_id}.pdf",
                mimetype='application/pdf'
            )
            # return "<h1>nice one</h1>"
            # response = Response(pdf_stream.getvalue(), mimetype='application/pdf')
            # response.headers.set('Content-Disposition', 'attachment', filename=f"icar_comparison_{submission_id}.pdf")
            # return response

        return jsonify({
            "success": True,
            "message": "Comparison successful",
            "metrics": metrics,
            "details": details
        }), 200

    except Exception as e:
        print(e)
        return jsonify({"success": False, "message": str(e)}), 500


@app_views.route('/analytics', methods=['GET'], strict_slashes=False)
@require_auth()
def get_analytics():
    """Get analytics data - admin only"""
    try:
        user_email = request.args.get("email")
        if not user_email:
            return jsonify({"success": False, "message": "Missing user email"}), 400
        
        # Reload storage to get latest data
        storage.reload()
        
        # Check if user exists and get admin status from request
        admin_role = request.args.get("admin")
        if admin_role != "yes":
            return jsonify({"success": False, "message": "Admin access required"}), 403
        
        # Get counts for each object type
        user_count = storage.count(User)
        submission_count = storage.count(Submission)
        generate_count = storage.count(Generate)
        
        # Get additional statistics
        all_users = storage.all(User)
        all_submissions = storage.all(Submission)
        all_generates = storage.all(Generate)
        
        # Count users with organizations
        users_with_org = sum(1 for u in all_users.values() if u.organization and u.organization.strip())
        
        # Count submissions by country (if available)
        countries = {}
        for sub in all_submissions.values():
            country = sub.country or "Unknown"
            countries[country] = countries.get(country, 0) + 1
        
        # Count submissions by calculation method
        methods = {}
        for sub in all_submissions.values():
            method = sub.calculation_method or "Unknown"
            methods[method] = methods.get(method, 0) + 1
        
        # Get date range for submissions
        submission_dates = []
        for sub in all_submissions.values():
            if hasattr(sub, 'created_at') and sub.created_at:
                submission_dates.append(sub.created_at.strftime("%Y-%m-%d"))
        
        return jsonify({
            "success": True,
            "data": {
                "counts": {
                    "users": user_count,
                    "submissions": submission_count,
                    "generates": generate_count
                },
                "statistics": {
                    "users_with_organization": users_with_org,
                    "users_without_organization": user_count - users_with_org,
                    "submissions_by_country": countries,
                    "submissions_by_method": methods,
                    "submission_dates": submission_dates
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500