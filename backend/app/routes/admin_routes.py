from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Dict, Any, List
import json
from pydantic import BaseModel
from ..utils.admin_auth import get_admin_user
from ..services.admin_service import AdminService
from ..models.user import UserInDB
from ..utils.logger import logger

# Pydantic models for request/response validation
class ProxyConfig(BaseModel):
    server: str
    username: str
    password: str
    rotation_url: str

class ProxyListRequest(BaseModel):
    proxies: List[ProxyConfig]

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

@router.get("/proxies")
async def get_proxies(admin_user: UserInDB = Depends(get_admin_user)):
    """Get current proxy configurations"""
    try:
        logger.info("get_proxies_endpoint_called", admin_email=admin_user.email)
        proxies = await AdminService.get_proxies()
        logger.info("get_proxies_endpoint_success", 
            admin_email=admin_user.email,
            proxy_count=proxies.get("total_count", 0))
        return proxies
    except Exception as e:
        logger.error("get_proxies_failed", error=str(e), admin_email=admin_user.email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve proxy configurations"
        )

@router.post("/proxies")
async def add_proxy(
    proxy: ProxyConfig,
    admin_user: UserInDB = Depends(get_admin_user)
):
    """Add a new proxy configuration"""
    try:
        logger.info("add_proxy_endpoint_called", 
            admin_email=admin_user.email,
            proxy_server=proxy.server,
            proxy_username=proxy.username)
        
        success = await AdminService.add_proxy(proxy.dict())
        
        if success:
            logger.info("add_proxy_endpoint_success", 
                proxy_server=proxy.server,
                proxy_username=proxy.username,
                admin_email=admin_user.email
            )
            return {
                "success": True,
                "message": "Proxy added successfully"
            }
        else:
            logger.error("add_proxy_service_returned_false",
                proxy_server=proxy.server,
                admin_email=admin_user.email)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to add proxy"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error("add_proxy_endpoint_failed", 
            error=str(e), 
            proxy_server=proxy.server,
            admin_email=admin_user.email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add proxy"
        )

@router.put("/proxies")
async def update_proxies(
    proxy_list: ProxyListRequest,
    admin_user: UserInDB = Depends(get_admin_user)
):
    """Update all proxy configurations"""
    try:
        proxies_data = [proxy.dict() for proxy in proxy_list.proxies]
        proxy_servers = [proxy.server for proxy in proxy_list.proxies]
        
        logger.info("update_proxies_endpoint_called", 
            admin_email=admin_user.email,
            proxy_count=len(proxies_data),
            proxy_servers=proxy_servers)
        
        success = await AdminService.update_proxies(proxies_data)
        
        if success:
            logger.info("update_proxies_endpoint_success", 
                proxy_count=len(proxies_data),
                proxy_servers=proxy_servers,
                admin_email=admin_user.email
            )
            return {
                "success": True,
                "message": f"Updated {len(proxies_data)} proxies successfully"
            }
        else:
            logger.error("update_proxies_service_returned_false",
                proxy_count=len(proxies_data),
                admin_email=admin_user.email)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update proxies"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error("update_proxies_endpoint_failed", 
            error=str(e), 
            proxy_count=len(proxy_list.proxies),
            admin_email=admin_user.email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update proxies"
        )

@router.delete("/proxies/{proxy_index}")
async def delete_proxy(
    proxy_index: int,
    admin_user: UserInDB = Depends(get_admin_user)
):
    """Delete a proxy configuration by index"""
    try:
        logger.info("delete_proxy_endpoint_called", 
            proxy_index=proxy_index,
            admin_email=admin_user.email)
        
        success = await AdminService.delete_proxy(proxy_index)
        
        if success:
            logger.info("delete_proxy_endpoint_success", 
                proxy_index=proxy_index,
                admin_email=admin_user.email
            )
            return {
                "success": True,
                "message": "Proxy deleted successfully"
            }
        else:
            logger.warning("delete_proxy_not_found_or_failed",
                proxy_index=proxy_index,
                admin_email=admin_user.email)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proxy not found or failed to delete"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error("delete_proxy_endpoint_failed", 
            error=str(e), 
            proxy_index=proxy_index,
            admin_email=admin_user.email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete proxy"
        )
