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
import numpy as np
from scipy.interpolate import interp1d
from authlib.integrations.flask_oauth2 import ResourceProtector
from api.v1.views.validator import Auth0JWTBearerTokenValidator


load_dotenv()



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
# FULL_DATASET_PATH = os.getenv("FULL_DATASET_PATH", "TestDataSet.csv")
BLOB_DATASET_NAME = os.getenv("BLOB_DATASET_NAME", "TestDataSet.csv")   # 👈 your blob dataset file name






# ======================================================
# NEW FUNCTION: Load TestDataSet.csv from Azure Blob
# ======================================================
def load_csv_from_blob():
    """Downloads TestDataSet.csv from Azure Blob Storage into a pandas DataFrame."""
    blob_service = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
    container_client = blob_service.get_container_client(AZURE_CONTAINER_NAME)
    blob_client = container_client.get_blob_client(BLOB_DATASET_NAME)

    download_stream = blob_client.download_blob()
    csv_bytes = download_stream.readall()

    df = pd.read_csv(BytesIO(csv_bytes))
    return df



def test_interval_method(df):
    """
    Calculate the total 305-day milk yield using the trapezoidal rule
    for interim days, and linear projection for start and end beyond the sampling period.

    Parameters:
        df (DataFrame): Input DataFrame with 'DaysInMilk', 'TestId', and 'DailyMilkingYield'.

    Returns:
        DataFrame: Columns TestId and Total305Yield
    """
    result = []

    # Filter out records where Day > 305
    df = df[df['DaysInMilk'] <= 305]

    # Iterate over each lactation
    for lactation in df['TestId'].unique():
        lactation_df = df[df['TestId'] == lactation].copy()

        # Sort by DaysInMilk ascending
        lactation_df.sort_values(by='DaysInMilk', ascending=True, inplace=True)

        if len(lactation_df) < 2:
            print(f"Skipping TestId {lactation}: not enough data points for interpolation.")
            continue

        # Start and end points
        start = lactation_df.iloc[0]
        end = lactation_df.iloc[-1]

        # Start contribution
        MY0 = start['DaysInMilk'] * start['DailyMilkingYield']

        # End contribution
        MYend = (306 - end['DaysInMilk']) * end['DailyMilkingYield']

        # Intermediate trapezoidal contributions
        lactation_df['width'] = lactation_df['DaysInMilk'].diff().shift(-1)
        lactation_df['avg_yield'] = (lactation_df['DailyMilkingYield'] + lactation_df['DailyMilkingYield'].shift(-1)) / 2
        lactation_df['trapezoid_area'] = lactation_df['width'] * lactation_df['avg_yield']

        total_intermediate = lactation_df['trapezoid_area'].sum()

        total_yield = MY0 + total_intermediate + MYend
        result.append((lactation, total_yield))

    return pd.DataFrame(result, columns=['TestId', 'Total305Yield'])


def upload_excel_file(excel_stream, filename, storage_mode="local"):
    """
    Uploads an Excel file stream to either Azure Blob Storage or local disk.
    Returns a public URL (Azure) or route link (local).
    """
    if storage_mode == "azure":
        AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        AZURE_CONTAINER_NAME = os.getenv("AZURE_CONTAINER_NAME")

        blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
        container_client = blob_service_client.get_container_client(AZURE_CONTAINER_NAME)
        blob_client = container_client.get_blob_client(filename)

        blob_client.upload_blob(
            excel_stream,
            overwrite=True,
            content_settings=ContentSettings(
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
        )

        return f"https://{blob_service_client.account_name}.blob.core.windows.net/{AZURE_CONTAINER_NAME}/{filename}"

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
        filename = f"{test_set_id}_{timestamp}.xlsx"

        # Upload both copies
        download_link_locally = upload_excel_file(excel_stream_local, filename, storage_mode="local")
        download_link = upload_excel_file(excel_stream_azure, filename, storage_mode="azure")

        # User handling
        user_email = request.args.get('email')
        user_name = request.args.get('name')

        all_users = storage.all(User)
        user = None
        for user in all_users.values():
            if user.email == user_email:
                user.name = user_name
                user.save()
                generate_obj.user_id = user.id
                break

        if not user or user.email != user_email:
            user = User()
            user.email = user_email
            user.name = user_name
            user.save()
            generate_obj.user_id = user.id

        # Estimated yields
        estimated_yields = test_interval_method(generated_df)
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
