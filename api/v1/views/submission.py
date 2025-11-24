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


# Dataset and Azure setup
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
AZURE_CONTAINER_NAME = os.getenv("AZURE_CONTAINER_NAME")
BLOB_DATASET_NAME = os.getenv("FULL_DATASET_PATH", "ActualMilkYields.csv")  # 👈 your blob dataset file name


# ======================================================
# NEW FUNCTION: Load ActualMilkYields.csv from Azure Blob
# ======================================================
def load_csv_from_blob():
    """Downloads ActualMilkYields.csv from Azure Blob Storage into a pandas DataFrame."""
    blob_service = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
    container_client = blob_service.get_container_client(AZURE_CONTAINER_NAME)
    blob_client = container_client.get_blob_client(BLOB_DATASET_NAME)

    download_stream = blob_client.download_blob()
    csv_bytes = download_stream.readall()

    df = pd.read_csv(BytesIO(csv_bytes))
    return df

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
    pdf.set_auto_page_break(auto=True, margin=15)

    # ===== HEADER =====
    logo_path = "icar_logo.png"
    if os.path.exists(logo_path):
        pdf.image(logo_path, x=160, y=10, w=30)

    pdf.set_font("Arial", 'B', 15)
    pdf.set_text_color(0, 0, 128)
    pdf.cell(0, 10, "Cumulative Milk Yield Calculation Report", ln=True, align="C")
    pdf.ln(6)

    pdf.set_font("Arial", '', 11)
    pdf.set_text_color(0, 0, 0)
    pdf.multi_cell(0, 8,
        f"Name of Organization: {details['organization']}\n"
        f"Date Reported: {details['date_reported']}\n"
        f"Report Requested By: {user_name}\n"
        f"Method of Calculation Applied: {details['calculation_method']}\n"
        f"Country: {details['country']}\n"
    )
    pdf.ln(4)

    # ===== TABLE STRUCTURE =====
    col_widths = [50, 28, 28, 28, 50]
    headers = ["Comparison", "R²", "RMSE", "MAE", "MAPE"]

    def draw_metrics_table(section_name, primary_metrics, icar_metrics):
        """Draws a 2-row metrics table."""
        pdf.set_font("Arial", 'B', 12)
        pdf.set_fill_color(201, 227, 242)
        pdf.set_text_color(0, 0, 128)
        pdf.cell(190, 8, section_name, ln=True, fill=True)
        pdf.ln(3)

        pdf.set_font("Arial", 'B', 10)
        pdf.set_text_color(0, 0, 0)
        for h, w in zip(headers, col_widths):
            pdf.cell(w, 8, h, 1, 0, 'C')
        pdf.ln()

        # Row 1 — Reference Calculation
        pdf.set_font("Arial", '', 10)
        pdf.cell(col_widths[0], 8, "Reference Calculation", 1)
        pdf.cell(col_widths[1], 8, f"{primary_metrics['pearson_correlation']:.3f}", 1, 0, 'C')
        pdf.cell(col_widths[2], 8, f"{primary_metrics['root_mean_squared_error']:.2f}", 1, 0, 'C')
        pdf.cell(col_widths[3], 8, f"{primary_metrics['mean_absolute_error']:.2f}", 1, 0, 'C')
        pdf.cell(col_widths[4], 8, f"{primary_metrics['mean_absolute_percentage_error']:.2f}%", 1, 0, 'C')
        pdf.ln()

        # Row 2 — Actual Accumulated (ICAR)
        pdf.set_fill_color(0, 109, 132)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Arial", 'B', 10)
        pdf.cell(col_widths[0], 8, "Actual Accum. Lactation Yields", 1, fill=True)
        pdf.set_font("Arial", '', 10)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(col_widths[1], 8, f"{icar_metrics['pearson_correlation']:.3f}", 1, 0, 'C')
        pdf.cell(col_widths[2], 8, f"{icar_metrics['root_mean_squared_error']:.2f}", 1, 0, 'C')
        pdf.cell(col_widths[3], 8, f"{icar_metrics['mean_absolute_error']:.2f}", 1, 0, 'C')
        pdf.cell(col_widths[4], 8, f"{icar_metrics['mean_absolute_percentage_error']:.2f}%", 1, 0, 'C')
        pdf.ln(10)

    def plot_and_add_to_pdf(x_vals, y_vals, title, xlabel, ylabel, color):
        """Generate scatter plot and insert neatly into PDF."""
        fig, ax = plt.subplots(figsize=(4.6, 2.5))
        ax.scatter(x_vals, y_vals, s=18, alpha=0.7, color=color, edgecolors="none")
        ax.set_title(title, fontsize=9)
        ax.set_xlabel(xlabel, fontsize=8)
        ax.set_ylabel(ylabel, fontsize=8)
        ax.tick_params(axis='both', labelsize=7)
        ax.grid(True, linestyle="--", linewidth=0.5, alpha=0.6)
        plt.tight_layout()
        buf = BytesIO()
        plt.savefig(buf, format="PNG", dpi=130, bbox_inches="tight")
        plt.close()
        buf.seek(0)
        img_path = f"/tmp/temp_plot_{np.random.randint(100000)}.png"
        with open(img_path, "wb") as f:
            f.write(buf.getvalue())
        if pdf.get_y() > 160:
            pdf.add_page()
        pdf.image(img_path, x=20, w=165)
        os.remove(img_path)
        pdf.ln(10)

    # ===== Overall Section =====
    ref = metrics['reference_yields']
    actual = metrics['actual_yields']
    icar_ref = [ref_map.get(str(tid)) for tid in submission_obj.test_obj_ids]
    icar_metrics = safe_calculate_metrics(icar_ref, submission_obj.calculated_milk_yields)

    draw_metrics_table("Overall Performance (All Parities Combined)", metrics, icar_metrics)

    # Add Abbreviations Section
    pdf.set_font("Arial", 'I', 8)
    pdf.set_text_color(80, 80, 80)
    pdf.multi_cell(0, 5,
        "Abbreviations Used:\n"
        "RCALY - Reference Calculated Accumulated Lactation Yield\n"
        "SCALY - Submitted Calculated Accumulated Lactation Yield"
    )
    pdf.ln(2)
    pdf.set_text_color(0, 0, 0)

    # Overall scatter plots
    plot_and_add_to_pdf(ref, actual, "Overall Scatter Plot: RCALY vs SCALY", "Reference (RCALY)", "Submitted (SCALY)", "#1f77b4")
    plot_and_add_to_pdf(icar_ref, submission_obj.calculated_milk_yields,
                        "Overall Scatter Plot: Actual vs SCALY", "Actual Accum. Lactation Yields (kg)", "Submitted (SCALY)", "#ff7f0e")

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

    # We’ll iterate only over Parity 1, 2, and 3+ (if they exist)
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

        draw_metrics_table(f"Parity {p} Performance", parity_metrics, parity_icar_metrics)
        plot_and_add_to_pdf(ref_vals, act_vals, f"Parity {p} Scatter: RCALY vs SCALY", "Reference (RCALY)", "Submitted (SCALY)", "#1f77b4")
        plot_and_add_to_pdf(icar_vals, act_vals, f"Parity {p} Scatter: Actual vs SCALY", "Actual Accum. Lactation Yields (kg)", "Submitted (SCALY)", "#ff7f0e")

    # ===== Appendix =====
    if pdf.get_y() > 180:
        pdf.add_page()

    pdf.set_font("Arial", 'B', 12)
    pdf.set_fill_color(201, 227, 242)
    pdf.set_text_color(0, 0, 128)
    pdf.cell(190, 8, "Appendix", ln=True, fill=True)
    pdf.ln(3)

    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Arial", '', 10)
    pdf.multi_cell(0, 6, "Data set we gave them + result that they gave back")
    pdf.ln(2)

    if 'dataset_link' in details:
        pdf.set_text_color(0, 0, 255)
        pdf.set_font("Arial", 'U', 10)
        pdf.cell(0, 8, "Download Dataset Used", ln=True,
                 link='http://localhost:5000/' + details['dataset_link'])

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


    # convert the lists to numpy arrays
    true = np.array(true)
    pred = np.array(pred)

    # Pearson Correlation Coefficient
    pearson_corr, _ = pearsonr(true, pred)

    # Mean Absolute Error
    mae = mean_absolute_error(true, pred)

    # Mean Absolute Percentage Error
    mape = np.mean(np.abs((true - pred) / true)) * 100

    # Root Mean Squared Error
    rmse = np.sqrt(mean_squared_error(true, pred))

    return {
        "pearson_correlation": pearson_corr,
        "mean_absolute_error": mae,
        "mean_absolute_percentage_error": mape,
        "root_mean_squared_error": rmse
    }

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

        file_stream = BytesIO(file.read())
        milk_yield_dict = extract_milk_yield_data_from_excel(file_stream)

        # get the email of the user from the request args
        user_email = request.args.get("email")
        if not user_email:
            return jsonify({"success": False, "message": "Missing user email"}), 400
        
        # Check if user exists
        all_users = storage.all(User)
        for user in all_users.values():
            if user.email == user_email:
                break
        
        if not user or user.email != user_email:
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
            return "Test set ID not found", 404
        
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
        # Check if user exists
        all_users = storage.all(User)
        for user in all_users.values():
            if user.email == user_email:
                break
        
        # get the admin role from the request args
        admin_role = request.args.get("admin")

        if (not user or user.email != user_email) and admin_role == "yes":
            all_submissions = storage.all(Submission)
            submissions_list = []
            # print("User found:", user.name, user.email)
            for submission in all_submissions.values():
                # print("Found submission:", submission.id)
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
                })
            # print(submissions_list)
            return jsonify(submissions_list), 200

        if not user or user.email != user_email:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        
        if admin_role == "yes":
            all_submissions = storage.all(Submission)
            submissions_list = []
            # print("User found:", user.name, user.email)
            for submission in all_submissions.values():
                # print("Found submission:", submission.id)
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
            })
            # print(submissions_list)
        return jsonify(submissions_list), 200
        



    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# create a delete route to delete submission based on the id
@app_views.route('/submission/<submission_id>', methods=['DELETE'], strict_slashes=False)
def delete_submission(submission_id):
    try:
        # print("Deleting submission with ID:", submission_id)
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

        external_milk_yields = submission.calculated_milk_yields
        internal_milk_yields = generate.calculated_milk_yields

        if not external_milk_yields or not internal_milk_yields:
            return jsonify({"success": False, "message": "No milk yields found for comparison"}), 400

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