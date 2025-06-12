import re
from typing import Optional, Tuple
from urllib.parse import urlparse
from ..utils.logger import logger

class ValidationError(Exception):
    pass

def validate_reddit_url(url: str) -> Tuple[bool, Optional[str]]:
    """
    Validate a Reddit URL and extract the post ID.
    Returns (is_valid, post_id)
    """
    try:
        # Parse the URL
        parsed = urlparse(url)
        
        # Check if it's a Reddit URL
        if not parsed.netloc.endswith('reddit.com'):
            return False, None
            
        # Extract the path components
        path_parts = parsed.path.strip('/').split('/')
        
        # Check if it's a post URL (should be r/subreddit/comments/post_id)
        if len(path_parts) < 4 or path_parts[1] != 'comments':
            return False, None
            
        # Extract the post ID
        post_id = path_parts[2]
        
        # Validate post ID format (should be alphanumeric)
        if not re.match(r'^[a-zA-Z0-9]+$', post_id):
            return False, None
            
        return True, post_id
        
    except Exception as e:
        logger.error("reddit_url_validation_error", error=str(e), url=url)
        return False, None

def validate_payment_amount(amount: float, min_amount: float = 5.0, max_amount: float = 1000.0) -> bool:
    """Validate payment amount"""
    try:
        if not isinstance(amount, (int, float)):
            return False
        if amount < min_amount or amount > max_amount:
            return False
        return True
    except Exception as e:
        logger.error("payment_amount_validation_error", error=str(e), amount=amount)
        return False

def validate_upvotes(upvotes: int, min_upvotes: int = 1, max_upvotes: int = 1000) -> bool:
    """Validate upvote count"""
    try:
        if not isinstance(upvotes, int):
            return False
        if upvotes < min_upvotes or upvotes > max_upvotes:
            return False
        return True
    except Exception as e:
        logger.error("upvotes_validation_error", error=str(e), upvotes=upvotes)
        return False

def validate_credit_card(card_number: str, expiry_month: int, expiry_year: int, cvv: str) -> bool:
    """Validate credit card details"""
    try:
        # Remove spaces and dashes
        card_number = re.sub(r'[\s-]', '', card_number)
        
        # Check card number length
        if not (13 <= len(card_number) <= 19):
            return False
            
        # Check expiry date
        if not (1 <= expiry_month <= 12):
            return False
        if expiry_year < 2024:  # Basic check, should be more sophisticated
            return False
            
        # Check CVV
        if not (3 <= len(cvv) <= 4) or not cvv.isdigit():
            return False
            
        # Luhn algorithm for card number validation
        def digits_of(n):
            return [int(d) for d in str(n)]
            
        digits = digits_of(card_number)
        odd_digits = digits[-1::-2]
        even_digits = digits[-2::-2]
        checksum = sum(odd_digits)
        for d in even_digits:
            checksum += sum(digits_of(d*2))
        return checksum % 10 == 0
        
    except Exception as e:
        logger.error("credit_card_validation_error", error=str(e))
        return False

def validate_crypto_address(address: str, currency: str) -> bool:
    """Validate cryptocurrency address"""
    try:
        # Basic format validation for common cryptocurrencies
        patterns = {
            'BTC': r'^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$',
            'ETH': r'^0x[a-fA-F0-9]{40}$',
            'LTC': r'^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$',
            'XRP': r'^r[0-9a-zA-Z]{24,34}$',
            'BCH': r'^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$'
        }
        
        if currency not in patterns:
            return False
            
        return bool(re.match(patterns[currency], address))
        
    except Exception as e:
        logger.error("crypto_address_validation_error", 
            error=str(e),
            currency=currency,
            address=address
        )
        return False 