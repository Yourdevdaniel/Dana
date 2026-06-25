from rest_framework.response import Response


def success_response(data=None, message="", status=200):
    return Response(
        {"success": True, "data": data if data is not None else {}, "message": message, "errors": []},
        status=status,
    )


def error_response(errors=None, message="", status=400):
    return Response(
        {"success": False, "data": {}, "message": message, "errors": errors or []},
        status=status,
    )
