from api.v1.views import app_views
from flask import Blueprint, jsonify, request, send_from_directory
import pandas as pd
import uuid
import os
from azure.storage.blob import BlobServiceClient, ContentSettings
from io import BytesIO
from datetime import datetime

from models import storage
from models.generate import Generate
from dotenv import load_dotenv
from models.user import User
import pandas as pd
from authlib.integrations.flask_oauth2 import ResourceProtector
from api.v1.views.validator import Auth0JWTBearerTokenValidator
from lactationcurve.characteristics import test_interval_method as lc_test_interval_method


load_dotenv()



# Authentication
require_auth = ResourceProtector()
validator = Auth0JWTBearerTokenValidator(
    domain=os.getenv("AUTH0_DOMAIN"),
    audience=os.getenv("AUTH0_AUDIENCE")
)
require_auth.register_token_validator(validator)


# Dataset and Azure setup (test CSV may live in icarwebsite/dataset/ vs app JSON container)
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
AZURE_CONTAINER_NAME = os.getenv("AZURE_CONTAINER_NAME")
AZURE_DATASET_STORAGE_CONNECTION_STRING = os.getenv("AZURE_DATASET_STORAGE_CONNECTION_STRING")
AZURE_DATASET_CONTAINER_NAME = os.getenv("AZURE_DATASET_CONTAINER_NAME", "icarwebsite")
# BLOB_DATASET_NAME is filename only (no "/"); blob key is dataset/<filename>
_dataset_filename = os.getenv("BLOB_DATASET_NAME", "TestDataSet.csv").lstrip("/")
DATASET_BLOB_PATH = os.getenv("AZURE_DATASET_BLOB_PATH") or f"dataset/{_dataset_filename}"
# Virtual folder for generated Excel blobs when storage_mode is azure
AZURE_GENERATED_DATASETS_PREFIX = "Generated_Datasets"






# ======================================================
# NEW FUNCTION: Load TestDataSet.csv from Azure Blob
# ======================================================
def load_csv_from_blob():
    """Load test CSV from blob. BLOB_DATASET_NAME is filename only; blob key is dataset/<filename>."""
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



def estimate_yields_with_lactationcurve(df):
    """
    Calculate 305-day yields via the installed `lactationcurve` package and
    normalize output to columns: TestId, Total305Yield.
    """

    required_cols = ["DaysInMilk", "DailyMilkingYield", "TestId"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns for lactationcurve: {missing}")

    input_df = df[required_cols].copy()

    result_df = lc_test_interval_method(
        input_df,
        days_in_milk_col="DaysInMilk",
        milking_yield_col="DailyMilkingYield",
        test_id_col="TestId",
    )

    if not isinstance(result_df, pd.DataFrame):
        raise ValueError("lactationcurve test_interval_method did not return a DataFrame.")

    if result_df.empty:
        return pd.DataFrame(columns=["TestId", "Total305Yield"])

    normalized_names = {c: c.lower().replace(" ", "").replace("_", "") for c in result_df.columns}
    test_id_col = None
    yield_col = None

    for col, norm in normalized_names.items():
        if norm in {"testid", "testids", "id"} and test_id_col is None:
            test_id_col = col
        if norm in {"total305yield", "totalyield", "total305", "predicted305yield"} and yield_col is None:
            yield_col = col

    if test_id_col is None or yield_col is None:
        if len(result_df.columns) >= 2:
            test_id_col = result_df.columns[0]
            yield_col = result_df.columns[1]
        else:
            raise ValueError(
                f"Unexpected lactationcurve output columns: {list(result_df.columns)}"
            )

    normalized_df = result_df[[test_id_col, yield_col]].copy()
    normalized_df.columns = ["TestId", "Total305Yield"]
    return normalized_df


def upload_excel_file(excel_stream, filename, storage_mode="local"):
    """
    Uploads an Excel file stream to either Azure Blob Storage or local disk.
    Returns a public URL (Azure) or route link (local).
    """
    if storage_mode == "azure":
        conn = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        container_name = os.getenv("AZURE_CONTAINER_NAME")
        if not conn:
            raise ValueError("AZURE_STORAGE_CONNECTION_STRING is not set")
        blob_name = f"{AZURE_GENERATED_DATASETS_PREFIX}/{filename}"

        blob_service_client = BlobServiceClient.from_connection_string(conn)
        container_client = blob_service_client.get_container_client(container_name)
        blob_client = container_client.get_blob_client(blob_name)

        blob_client.upload_blob(
            excel_stream,
            overwrite=True,
            content_settings=ContentSettings(
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
        )

        return (
            f"https://{blob_service_client.account_name}.blob.core.windows.net/"
            f"{container_name}/{AZURE_GENERATED_DATASETS_PREFIX}/{filename}"
        )

    elif storage_mode == "local":
        local_dir = os.path.join(os.getcwd(), "data", "generated")
        os.makedirs(local_dir, exist_ok=True)
        file_path = os.path.join(local_dir, filename)

        with open(file_path, "wb") as f:
            f.write(excel_stream.read())

        return f"/api/v1/download/{filename}"

    else:
        raise ValueError("Invalid storage_mode. Must be 'azure' or 'local'.")


@app_views.route('/generate', methods=['POST', 'GET'], strict_slashes=False)
@require_auth()
def generate_random_dataset():
    try:
        df = load_csv_from_blob()

        unique_animals = df['TestId'].unique()
        selected_ids = pd.Series(unique_animals).sample(n=300, random_state=42).tolist()
        generated_df = df[df['TestId'].isin(selected_ids)]

        generate_obj = Generate()
        test_set_id = generate_obj.id

        # Convert DataFrame to Excel in memory
        excel_stream = BytesIO()
        generated_df.to_excel(excel_stream, index=False)
        excel_stream.seek(0)

        # ✅ FIX: Create two independent streams for upload
        excel_bytes = excel_stream.getvalue()
        excel_stream_local = BytesIO(excel_bytes)
        excel_stream_azure = BytesIO(excel_bytes)

        # Filename
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"{test_set_id}.xlsx"

        # Upload both copies
        download_link_locally = upload_excel_file(excel_stream_local, filename, storage_mode="local")
        download_link = upload_excel_file(excel_stream_azure, filename, storage_mode="azure")

        # User handling - reload to get latest data
        storage.reload()
        
        user_email = request.args.get('email')
        user_name = request.args.get('name')

        all_users = storage.all(User)
        user = None
        for u in all_users.values():
            if u.email == user_email:
                user = u
                break

        if user:
            # Update existing user - preserve organization if it exists
            if user_name:
                user.name = user_name
            # Don't overwrite organization - preserve existing value
            user.save()
            generate_obj.user_id = user.id
        else:
            # Create new user
            user = User()
            user.email = user_email
            user.name = user_name or ""
            # Organization will be empty for new users - they can set it in profile
            user.save()
            generate_obj.user_id = user.id
        
        generate_obj.save()
        # Estimated yields
        estimated_yields = estimate_yields_with_lactationcurve(generated_df)
        generate_obj.test_obj_ids = list(estimated_yields['TestId'])
        generate_obj.calculated_milk_yields = list(estimated_yields['Total305Yield'])
        generate_obj.download_url = download_link

        # Parity
        if "Parity" in generated_df.columns:
            parity_map = generated_df.groupby("TestId")["Parity"].first().to_dict()
            generate_obj.parity = [parity_map[i] for i in generate_obj.test_obj_ids]
        else:
            generate_obj.parity = []

        generate_obj.save()

        return jsonify({
            "success": True,
            "test_set_id": test_set_id,
            "download_link": download_link_locally
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500



@app_views.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    """
    Serves generated Excel files from local storage directory.
    """
    file_dir = os.path.join(os.getcwd(), "data", "generated")
    return send_from_directory(directory=file_dir, path=filename, as_attachment=True)
