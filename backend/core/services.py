class BaseService:
    repository_class = None

    def __init__(self):
        self.repository = self.repository_class()
