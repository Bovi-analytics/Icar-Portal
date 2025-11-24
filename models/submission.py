#!/usr/bin/python3
""" submission"""
from models.parent_model import ParentModel
import os


class Submission(ParentModel):
    """Submission class for ICAR project"""

    calculation_method = ""
    organization = ""
    country = ""
    generate_id = ""
    notes = ""
    download_url = ""
    test_obj_ids = []
    calculated_milk_yields = []
