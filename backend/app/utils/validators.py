import re
from typing import Dict, Optional, Tuple
from urllib.parse import urlparse
from ..utils.logger import logger

class ValidationError(Exception):
    """Custom validation error"""
    pass

async def get_current_limits() -> Dict[str, int]:
    """Get current system limits from database"""
    try:
        from ..services.admin_service import AdminService
        settings = await AdminService.get_system_settings()
        return {
            "min_upvotes": settings.get("min_upvotes", 1),
            "max_upvotes": settings.get("max_upvotes", 1000),
            "min_upvotes_per_minute": settings.get("min_upvotes_per_minute", 1),
            "max_upvotes_per_minute": settings.get("max_upvotes_per_minute", 60),
        }
    except Exception as e:
        logger.error("get_current_limits_failed", error=str(e))
        # Return default limits on error
        return {
            "min_upvotes": 1,
            "max_upvotes": 1000,
            "min_upvotes_per_minute": 1,
            "max_upvotes_per_minute": 60,
        }

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
            logger.debug("reddit_url_validation_failed", reason="not_reddit_domain", url=url)
            return False, None
            
        # Extract the path components
        path_parts = parsed.path.strip('/').split('/')
        
        logger.debug("reddit_url_parsing", url=url, path_parts=path_parts)
        
        # Check if it's a post URL (should be r/subreddit/comments/post_id)
        if len(path_parts) < 4:
            logger.debug("reddit_url_validation_failed", reason="insufficient_path_parts", path_parts=path_parts)
            return False, None
            
        if path_parts[0] != 'r':
            logger.debug("reddit_url_validation_failed", reason="not_subreddit_url", first_part=path_parts[0])
            return False, None
            
        if path_parts[2] != 'comments':
            logger.debug("reddit_url_validation_failed", reason="not_comments_url", third_part=path_parts[2])
            return False, None
            
        # Extract the post ID
        post_id = path_parts[3]
        
        # Validate post ID format (should be alphanumeric)
        if not re.match(r'^[a-zA-Z0-9]+$', post_id):
            logger.debug("reddit_url_validation_failed", reason="invalid_post_id", post_id=post_id)
            return False, None
            
        logger.debug("reddit_url_validation_success", url=url, post_id=post_id)
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

async def validate_upvotes(upvotes: int) -> bool:
    """Validate upvote count using dynamic limits"""
    try:
        limits = await get_current_limits()
        min_upvotes = limits["min_upvotes"]
        max_upvotes = limits["max_upvotes"]
        
        if not isinstance(upvotes, int):
            return False
        if upvotes < min_upvotes or upvotes > max_upvotes:
            logger.warning("upvotes_validation_failed", 
                upvotes=upvotes, 
                min_upvotes=min_upvotes, 
                max_upvotes=max_upvotes)
            return False
        return True
    except Exception as e:
        logger.error("upvotes_validation_error", error=str(e), upvotes=upvotes)
        return False

async def validate_upvotes_per_minute(upvotes_per_minute: int) -> bool:
    """Validate upvotes per minute using dynamic limits"""
    try:
        limits = await get_current_limits()
        min_upvotes_per_minute = limits["min_upvotes_per_minute"]
        max_upvotes_per_minute = limits["max_upvotes_per_minute"]
        
        if not isinstance(upvotes_per_minute, int):
            return False
        if upvotes_per_minute < min_upvotes_per_minute or upvotes_per_minute > max_upvotes_per_minute:
            logger.warning("upvotes_per_minute_validation_failed", 
                upvotes_per_minute=upvotes_per_minute, 
                min_upvotes_per_minute=min_upvotes_per_minute, 
                max_upvotes_per_minute=max_upvotes_per_minute)
            return False
        return True
    except Exception as e:
        logger.error("upvotes_per_minute_validation_error", error=str(e), upvotes_per_minute=upvotes_per_minute)
        return False

# Legacy sync functions for backward compatibility
def validate_upvotes_sync(upvotes: int, min_upvotes: int = 1, max_upvotes: int = 1000) -> bool:
    """Validate upvote count (sync version for backward compatibility)"""
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