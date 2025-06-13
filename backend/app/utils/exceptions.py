from fastapi import HTTPException, status

class InvalidRedditUrlError(HTTPException):
    def __init__(self, detail: str = "Invalid Reddit URL"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )

class InsufficientCreditsError(HTTPException):
    def __init__(self, detail: str = "Insufficient credits"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )

class PaymentProcessingError(HTTPException):
    def __init__(self, detail: str = "Payment processing failed"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )

class OrderProcessingError(HTTPException):
    def __init__(self, detail: str = "Order processing failed"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )

class InvalidPaymentMethodError(HTTPException):
    def __init__(self, detail: str = "Invalid payment method"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        ) 