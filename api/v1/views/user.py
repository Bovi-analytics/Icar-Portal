from api.v1.views import app_views
from flask import Blueprint, jsonify, request, send_from_directory
import pandas as pd
from models import storage
from models.user import User
from authlib.integrations.flask_oauth2 import ResourceProtector
from api.v1.views.validator import Auth0JWTBearerTokenValidator
import os


# Authentication
require_auth = ResourceProtector()
validator = Auth0JWTBearerTokenValidator(
    domain=os.getenv("AUTH0_DOMAIN"),
    audience=os.getenv("AUTH0_AUDIENCE")
)
require_auth.register_token_validator(validator)


@app_views.route('/profile', methods=['GET'], strict_slashes=False)
@require_auth()
def fetch_profile():
    """Get User info route"""
    email = request.args.get("email")
    # print(email)
    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    # Check if user already exists
    all_users = storage.all(User)
    for user in all_users.values():
        if user.email == email:
            return jsonify({"organization": user.organization})

    return jsonify({"organization": ""})

@app_views.route('/profile-update', methods=['POST'], strict_slashes=False)
@require_auth()
def update_profile():
    """Update user info"""
    # get the email and organization from the body
    organization = request.json.get("organization")
    email = request.json.get("email")
    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    # Check if user already exists
    all_users = storage.all(User)
    for user in all_users.values():
        if user.email == email:
            user.organization = organization
            user.save()
            return jsonify({"organization": user.organization})
    
    # otherwise create a new user
    user = User()
    user.organization = organization
    user.email = email
    user.save()
    return jsonify({"organization": user.organization})
