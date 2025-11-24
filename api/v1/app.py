from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from azure.storage.blob import BlobServiceClient
import os
from api.v1.views import app_views
from flask_swagger_ui import get_swaggerui_blueprint

app = Flask(__name__)
app.register_blueprint(app_views)
CORS(app, resources={r"/api/v1/*": {"origins": "*"}})

# add blueprint for API views



if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=int(os.getenv('PORT', 5000)))