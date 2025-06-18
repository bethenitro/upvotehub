from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from datetime import timedelta
from pydantic import BaseModel, EmailStr
from typing import Optional
from ..models.user import User, UserCreate, UserInDB
from ..services.user_service import UserService
from ..utils.auth import authenticate_user, create_access_token, get_password_hash
from ..utils.logger import logger
from ..config.settings import get_settings

settings = get_settings()

router = APIRouter()

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    referral_code: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest):
    """Authenticate user and return access token"""
    try:
        # Authenticate user
        user = await authenticate_user(login_data.email, login_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )

        # Convert user to response format
        user_data = {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "credits": user.credits,
            "profileImage": str(user.profile_image) if user.profile_image else f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.username}",
            "my_referral_code": getattr(user, 'my_referral_code', ''),
            "referral_earnings": getattr(user, 'referral_earnings', 0.0),
            "total_referrals": getattr(user, 'total_referrals', 0)
        }

        logger.info("user_logged_in", user_id=str(user.id), email=user.email)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_data
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("login_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.post("/signup", response_model=TokenResponse)
async def signup(signup_data: SignupRequest):
    """Register a new user and return access token"""
    try:
        # Check if user already exists by email
        existing_user = await UserService.get_user_by_email(signup_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )

        # Check if username already exists
        existing_username = await UserService.get_user_by_username(signup_data.username)
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username is already taken"
            )

        # Hash password
        hashed_password = get_password_hash(signup_data.password)

        # Create user
        user_create = UserCreate(
            username=signup_data.username,
            email=signup_data.email,
            password=hashed_password,
            credits=0.0,
            referral_code=signup_data.referral_code
        )

        user = await UserService.create_user(user_create)

        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )

        # Convert user to response format
        user_data = {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "credits": user.credits,
            "profileImage": f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.username}",
            "my_referral_code": user.my_referral_code,
            "referral_earnings": user.referral_earnings,
            "total_referrals": user.total_referrals
        }

        logger.info("user_signed_up", user_id=str(user.id), email=user.email)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_data
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("signup_failed", error=str(e), email=signup_data.email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Signup failed"
        )

@router.post("/logout")
async def logout():
    """Logout user (client-side token invalidation)"""
    return {"message": "Successfully logged out"}
