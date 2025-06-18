from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional
from ..models.user import User
from ..services.referral_service import ReferralService
from ..utils.auth import get_current_user
from ..utils.logger import logger
from pydantic import BaseModel

router = APIRouter(prefix="/api/referral", tags=["referral"])

class ValidateReferralRequest(BaseModel):
    referral_code: str

class ReferralStatsResponse(BaseModel):
    my_referral_code: str
    total_referrals: int
    referral_earnings: float
    recent_referrals: list

@router.get("/stats", response_model=ReferralStatsResponse)
async def get_referral_stats(current_user: User = Depends(get_current_user)):
    """Get user's referral statistics"""
    try:
        stats = await ReferralService.get_referral_stats(current_user.id)
        return ReferralStatsResponse(
            my_referral_code=stats.get("my_referral_code", ""),
            total_referrals=stats.get("total_referrals", 0),
            referral_earnings=stats.get("referral_earnings", 0.0),
            recent_referrals=stats.get("recent_referrals", [])
        )
    except Exception as e:
        logger.error("get_referral_stats_failed", user_id=current_user.id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get referral statistics"
        )

@router.post("/validate")
async def validate_referral_code(request: ValidateReferralRequest):
    """Validate a referral code"""
    try:
        referrer_id = await ReferralService.validate_referral_code(request.referral_code)
        if referrer_id:
            return {"valid": True, "message": "Referral code is valid"}
        else:
            return {"valid": False, "message": "Invalid referral code"}
    except Exception as e:
        logger.error("validate_referral_code_failed", code=request.referral_code, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate referral code"
        )

@router.get("/my-code")
async def get_my_referral_code(current_user: User = Depends(get_current_user)):
    """Get current user's referral code"""
    try:
        return {
            "referral_code": current_user.my_referral_code,
            "referral_link": f"https://upvotezone.com/signup?ref={current_user.my_referral_code}"
        }
    except Exception as e:
        logger.error("get_my_referral_code_failed", user_id=current_user.id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get referral code"
        )