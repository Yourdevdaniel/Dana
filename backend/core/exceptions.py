from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def _normalize_dict_errors(data: dict) -> list:
    errors = []
    for field, messages in data.items():
        if isinstance(messages, list):
            errors.extend({"field": field, "message": str(m)} for m in messages)
        else:
            errors.append({"field": field, "message": str(messages)})
    return errors


def _normalize_errors(data) -> list:
    if isinstance(data, dict):
        return _normalize_dict_errors(data)
    if isinstance(data, list):
        return [{"field": "non_field_errors", "message": str(m)} for m in data]
    return []


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            "success": False,
            "data": {},
            "message": "Erro na requisição.",
            "errors": _normalize_errors(response.data),
        }

    return response


class BusinessException(Exception):
    def __init__(self, message, status_code=status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.status_code = status_code
        super().__init__(message)
