#!/usr/bin/python3
"""Blob-based storage engine for ICAR project"""

import json
import os
from azure.storage.blob import BlobServiceClient
from models.parent_model import ParentModel
from models.user import User
from models.submission import Submission
from models.generate import Generate
from dotenv import load_dotenv

load_dotenv()

# Map class names to class objects
classes = {
    'ParentModel': ParentModel,
    'User': User,
    'Submission': Submission,
    'Generate': Generate
}

validClasses = list(classes.values())


class FileStorage:
    """Stores ICAR models as JSON file inside Azure Blob Storage"""

    __objects = {}  # in-memory cache of all objects

    def __init__(self):
        # Load details from environment variables
        self.blob_conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        self.container_name = os.getenv("AZURE_CONTAINER_NAME")
        self.blob_name = os.getenv("AZURE_BLOB_NAME")

        if not self.blob_conn_str:
            raise ValueError("AZURE_STORAGE_CONNECTION_STRING is not set.")

        # Initialize Azure Client
        self.blob_service_client = BlobServiceClient.from_connection_string(
            self.blob_conn_str
        )
        self.container_client = self.blob_service_client.get_container_client(
            self.container_name
        )

        # Create the container if it doesn't exist
        try:
            self.container_client.create_container()
        except Exception:
            pass  # ignore if exists

    # =======================================
    # CORE STORAGE METHODS (Same API as original)
    # =======================================

    def all(self, cls=None):
        """Return all stored objects, or filtered by class"""
        if cls and cls in validClasses:
            return {
                key: obj for key, obj in FileStorage.__objects.items()
                if isinstance(obj, cls)
            }
        return FileStorage.__objects

    def new(self, obj):
        """Add new object to memory"""
        key = f"{obj.__class__.__name__}.{obj.id}"
        FileStorage.__objects[key] = obj

    def save(self):
        """Save memory objects into Azure Blob as JSON"""
        temp = {key: obj.to_dict() for key, obj in FileStorage.__objects.items()}
        json_data = json.dumps(temp)

        self.container_client.upload_blob(
            name=self.blob_name,
            data=json_data,
            overwrite=True
        )

    def reload(self):
        """Load objects from blob into memory"""
        try:
            blob_client = self.container_client.get_blob_client(self.blob_name)

            if not blob_client.exists():
                print("Blob does not exist yet. Starting empty storage.")
                return

            data = blob_client.download_blob().readall().decode("utf-8")
            temp = json.loads(data)

            FileStorage.__objects = {}
            for key, val in temp.items():
                cls = classes.get(val["__class__"])
                if cls:
                    FileStorage.__objects[key] = cls(**val)

        except Exception as e:
            print("Blob reload failed:", e)

    def delete(self, obj=None):
        """Delete object from memory"""
        if obj:
            key = f"{obj.__class__.__name__}.{obj.id}"
            FileStorage.__objects.pop(key, None)

    def get(self, cls, id):
        """Retrieve a single object by class + id"""
        if cls in classes.values():
            key = f"{cls.__name__}.{id}"
            return FileStorage.__objects.get(key)
        return None

    def count(self, cls=None):
        """Count objects, optionally filtered by class"""
        return len(self.all(cls))

    def check_attr_val(self, cls, attr, val):
        """Check if a class contains an object where attr == value"""
        if cls in classes.values():
            for obj in self.all(cls).values():
                if getattr(obj, attr, None) == val:
                    return True
        return False

    def close(self):
        """Reload from Azure blob (for compatibility)"""
        self.reload()

