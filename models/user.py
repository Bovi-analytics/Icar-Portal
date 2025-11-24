#!/usr/bin/python3
""" User module for ICAR project """
from models.parent_model import ParentModel
import os


class User(ParentModel):
    """ 
    """
    def __init__(self, *args, **kwargs):
        self.organization = ""
        self.name = ""
        self.email = ""
        super().__init__(*args, **kwargs)

    @property
    def generate(self):
        from models import storage
        from models.generate import Generate
        """returns a list of Generate objects"""

        generate_objs = storage.all(Generate)
        list_generate = []
        for obj in generate_objs.values():
            if obj.user_id == self.id:
                list_generate.append(obj)
        return list_generate