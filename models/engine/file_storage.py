#!/usr/bin/python3
"""This module defines a class to manage file storage for hbnb clone"""
import json
from models.parent_model import ParentModel
from models.user import User
from models.submission import Submission
from models.generate import Generate

validClasses = [ParentModel, User, Submission, Generate]
classes = {
            'ParentModel': ParentModel, 'User': User,
            'Submission': Submission, 'Generate': Generate
        }

class FileStorage:
    """This class manages storage of hbnb models in JSON format"""
    __file_path = 'file.json'
    __objects = {}

    def all(self, cls=None):
        """Returns a dictionary of models of either one type or
            all types(if specified) currently in storage
        """
        if cls and cls in validClasses:
            new_dict = {}
            for key, value in FileStorage.__objects.items():
                if isinstance(value, cls):
                    new_dict[key] = value
            return new_dict
        return FileStorage.__objects

    def new(self, obj):
        """Adds new object to storage dictionary"""
        self.all().update({obj.to_dict()['__class__'] + '.' + obj.id: obj})

    def save(self):
        """Saves storage dictionary to file"""
        with open(FileStorage.__file_path, 'w') as f:
            temp = {}
            temp.update(FileStorage.__objects)
            for key, val in temp.items():
                temp[key] = val.to_dict()
            json.dump(temp, f)

    def reload(self):
        """Loads storage dictionary from file"""
        from models.parent_model import ParentModel
        from models.user import User
        from models.submission import Submission
        from models.generate import Generate

        try:
            temp = {}
            with open(FileStorage.__file_path, 'r') as f:
                temp = json.load(f)
                for key, val in temp.items():
                    self.all()[key] = classes[val['__class__']](**val)
        except Exception:
            pass

    def delete(self, obj=None):
        """delete an object from the __objects dictionary"""
        if obj:
            key = "{}.{}".format(obj.__class__.__name__, obj.id)
            if FileStorage.__objects.get(key):
                del FileStorage.__objects[key]

    def get(self, cls, id):
        """retrieve an object with the specified cls and id"""
        if cls in classes.values():
            all_cls = self.all(cls)
            for key, value in classes.items():
                if value == cls:
                    key1 = "{}.{}".format(key, id)
                    obj_found = all_cls.get(key1)
                    if obj_found:
                        return obj_found
                    else:
                        return None
        else:
            return None

    def count(self, cls=None):
        """count the number of objects in storage that belong to cls"""
        count = 0
        if cls in classes.values():
            all_cls = self.all(cls)
        else:
            all_cls = self.all()
        for key in all_cls.keys():
            count += 1
        return count

    def check_attr_val(self, cls, attr, val):
        """check if the attribute value is in the database"""
        if cls in classes.values():
            all_cls = self.all(cls)
            for key, value in classes.items():
                if value == cls:
                    for obj in all_cls.values():
                        if getattr(obj, attr) == val:
                            return True
        return False

    def close(self):
        """deserialize the json file to objects"""
        self.reload()
