"""
Custom application exceptions with structured error codes.
"""


class AMSBaseException(Exception):
    """Base exception for all AMS errors."""

    def __init__(self, message: str, code: str = "INTERNAL_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class NotFoundError(AMSBaseException):
    """Resource not found."""

    def __init__(self, resource: str, identifier: str | None = None):
        msg = f"{resource} not found"
        if identifier:
            msg = f"{resource} '{identifier}' not found"
        super().__init__(message=msg, code="NOT_FOUND")


class UnauthorizedError(AMSBaseException):
    """Authentication required or invalid credentials."""

    def __init__(self, message: str = "Invalid credentials"):
        super().__init__(message=message, code="UNAUTHORIZED")


class ForbiddenError(AMSBaseException):
    """Insufficient permissions."""

    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message=message, code="FORBIDDEN")


class ValidationError(AMSBaseException):
    """Input validation failure."""

    def __init__(self, message: str, details: list[str] | None = None):
        self.details = details or []
        super().__init__(message=message, code="VALIDATION_ERROR")


class ConflictError(AMSBaseException):
    """Resource conflict (e.g., duplicate entry)."""

    def __init__(self, message: str):
        super().__init__(message=message, code="CONFLICT")


class IntegrationError(AMSBaseException):
    """External integration failure."""

    def __init__(self, provider: str, message: str):
        super().__init__(
            message=f"Integration error ({provider}): {message}",
            code="INTEGRATION_ERROR",
        )


class BusinessRuleError(AMSBaseException):
    """Business rule violation."""

    def __init__(self, message: str):
        super().__init__(message=message, code="BUSINESS_RULE_VIOLATION")
