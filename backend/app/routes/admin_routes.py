from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Dict, Any
import json
from ..utils.admin_auth import get_admin_user
from ..services.admin_service import AdminService
from ..models.user import UserInDB
from ..utils.logger import logger

router = APIRouter()

@router.get("/stats")
async def get_admin_stats(admin_user: UserInDB = Depends(get_admin_user)):
    """Get comprehensive admin statistics and metrics"""
    try:
        stats = await AdminService.get_admin_stats()
        return stats
    except Exception as e:
        logger.error("admin_stats_failed", error=str(e), admin_email=admin_user.email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve admin statistics"
        )

@router.get("/users")
async def get_user_management_data(admin_user: UserInDB = Depends(get_admin_user)):
    """Get user management data for admin dashboard"""
    try:
        user_data = await AdminService.get_user_management_data()
        return user_data
    except Exception as e:
        logger.error("admin_user_data_failed", error=str(e), admin_email=admin_user.email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user management data"
        )

@router.post("/bot-config/upload")
async def upload_bot_config(
    config_file: UploadFile = File(...),
    admin_user: UserInDB = Depends(get_admin_user)
):
    """Upload bot configuration file"""
    try:
        # Validate file type
        if not config_file.filename.endswith(('.json', '.yaml', '.yml')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only JSON and YAML files are supported"
            )
        
        # Read and parse the config file
        content = await config_file.read()
        
        try:
            if config_file.filename.endswith('.json'):
                config_data = json.loads(content.decode('utf-8'))
            else:
                # For YAML files, try to import yaml
                try:
                    import yaml
                    config_data = yaml.safe_load(content.decode('utf-8'))
                except ImportError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="YAML support not available. Please install PyYAML or use JSON format."
                    )
        except (json.JSONDecodeError, Exception) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file format: {str(e)}"
            )
        
        # Upload the config
        success = await AdminService.upload_bot_config(config_data)
        
        if success:
            logger.info("bot_config_uploaded_by_admin", 
                filename=config_file.filename,
                admin_email=admin_user.email
            )
            return {
                "success": True,
                "message": "Bot configuration uploaded successfully",
                "filename": config_file.filename
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload bot configuration"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error("bot_config_upload_failed", 
            error=str(e), 
            filename=config_file.filename,
            admin_email=admin_user.email
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process bot configuration file"
        )

@router.get("/bot-config")
async def get_bot_config(admin_user: UserInDB = Depends(get_admin_user)):
    """Get current bot configuration"""
    try:
        config = await AdminService.get_bot_config()
        return config
    except Exception as e:
        logger.error("get_bot_config_failed", error=str(e), admin_email=admin_user.email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve bot configuration"
        )

@router.post("/bot-config")
async def update_bot_config(
    config_data: Dict[str, Any],
    admin_user: UserInDB = Depends(get_admin_user)
):
    """Update bot configuration via JSON payload"""
    try:
        success = await AdminService.upload_bot_config(config_data)
        
        if success:
            logger.info("bot_config_updated_by_admin", admin_email=admin_user.email)
            return {
                "success": True,
                "message": "Bot configuration updated successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update bot configuration"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error("bot_config_update_failed", error=str(e), admin_email=admin_user.email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update bot configuration"
        )
