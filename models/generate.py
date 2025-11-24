#!/usr/bin/python3
""" generate module for ICAR project """
from models.parent_model import ParentModel
import os


class Generate(ParentModel):
    """Submission class for ICAR project"""

    user_id = ""
    download_url = ""
    parity = []
    test_obj_ids = []
    calculated_milk_yields = []

    @property
    def submission(self):
        from models import storage
        from models.submission import Submission
        """returns a list of Submission objects"""
        
        submission_objs = storage.all(Submission)
        list_submission = []
        for obj in submission_objs.values():
            if obj.generate_id == self.id:
                list_submission.append(obj)
        return list_submission