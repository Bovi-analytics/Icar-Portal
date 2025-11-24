#!/usr/bin/python3
"""This module instantiates an object of class FileStorage"""

# from models.engine.file_storage import FileStorage
from models.engine.blob_storage import FileStorage

storage = FileStorage()
# storage = BlobStorage()
storage.reload()