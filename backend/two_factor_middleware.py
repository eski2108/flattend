from functools import wraps
from fastapi import HTTPException, Request
from two_factor_auth import TwoFactorAuthService

def require_2fa_verification(action: str):
    """
    Decorator to require 2FA verification for sensitive actions
    Usage: @require_2fa_verification("withdrawal")
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request from args/kwargs
            request = None
            for arg in args:
                if isinstance(arg, dict) and 'user_id' in arg:
                    request = arg
                    break
            
            if not request:
                for key, val in kwargs.items():
                    if isinstance(val, dict) and 'user_id' in val:
                        request = val
                        break
            
            if not request or 'user_id' not in request:
                raise HTTPException(status_code=400, detail="user_id required")
            
            user_id = request['user_id']
            tfa_code = request.get('tfa_code')
            
            # Get database from global scope
            from server import db
            tfa_service = TwoFactorAuthService(db)
            
            # Check if user is exempt
            user = await db.user_accounts.find_one({"user_id": user_id})
            if user:
                is_exempt = await tfa_service.is_user_exempt_from_2fa(user_id, user.get("email", ""))
                if is_exempt:
                    return await func(*args, **kwargs)
            
            # Check if 2FA is enabled
            is_2fa_enabled = await tfa_service.is_2fa_enabled(user_id)
            
            if is_2fa_enabled:
                if not tfa_code:
                    raise HTTPException(
                        status_code=403,
                        detail=f"2FA code required for {action}"
                    )
                
                # Verify code
                verify_result = await tfa_service.verify_2fa_code(user_id, tfa_code)
                if not verify_result.get("success"):
                    raise HTTPException(status_code=401, detail="Invalid 2FA code")
            
            # 2FA verified or not required, proceed
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


async def check_2fa_for_action(db, user_id: str, tfa_code: str = None, action: str = "action") -> dict:
    """
    Helper function to check 2FA for sensitive actions
    Returns {"success": True/False, "message": "..."}
    """
    try:
        tfa_service = TwoFactorAuthService(db)
        
        # Check if user is exempt
        user = await db.user_accounts.find_one({"user_id": user_id})
        if user:
            is_exempt = await tfa_service.is_user_exempt_from_2fa(user_id, user.get("email", ""))
            if is_exempt:
                return {"success": True, "message": "User exempt from 2FA"}
        
        # Check if 2FA is enabled
        is_2fa_enabled = await tfa_service.is_2fa_enabled(user_id)
        
        if not is_2fa_enabled:
            return {"success": True, "message": "2FA not enabled"}
        
        # 2FA is enabled, code required
        if not tfa_code:
            return {"success": False, "message": f"2FA code required for {action}"}
        
        # Verify code
        verify_result = await tfa_service.verify_2fa_code(user_id, tfa_code)
        
        if verify_result.get("success"):
            return {"success": True, "message": "2FA verified"}
        else:
            return {"success": False, "message": "Invalid 2FA code"}
            
    except Exception as e:
        return {"success": False, "message": str(e)}
