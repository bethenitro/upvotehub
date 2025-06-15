from fastapi import Depends, HTTPException, status
from ..utils.auth import get_current_user
from ..models.user import UserInDB
from ..config.settings import get_settings

settings = get_settings()

async def get_admin_user(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """
    Dependency to ensure the current user is an admin.
    Admin is determined by email matching the ADMIN_EMAIL environment variable.
    """
    if current_user.email != settings.ADMIN_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
