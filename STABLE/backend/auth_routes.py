"""
CoinHubX Authentication API Routes
===================================

All authentication endpoints with proper error handling and standard error codes.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import logging

from auth_service import AuthService, AuthErrorCode

logger = logging.getLogger(__name__)

# Create router
auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# ==================== REQUEST MODELS ====================

class RegisterRequest(BaseModel):
    email: EmailStr
    phone_number: str = Field(..., min_length=10, max_length=20)
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=1)
    referral_code: Optional[str] = None

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginOTPRequest(BaseModel):
    user_id: str
    code: str = Field(..., min_length=6, max_length=6)

class SendOTPRequest(BaseModel):
    user_id: str

class AdminResetPhoneRequest(BaseModel):
    user_id: str
    admin_id: str

class AdminToggle2FARequest(BaseModel):
    user_id: str
    enabled: bool
    admin_id: str

class AdminResendSMSRequest(BaseModel):
    user_id: str
    admin_id: str

# ==================== HELPER FUNCTIONS ====================

def get_client_info(request: Request) -> tuple:
    """Extract client IP and user agent from request"""
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    return client_ip, user_agent

def handle_auth_error(error: ValueError) -> HTTPException:
    """Convert auth service errors to HTTP exceptions with standard error codes"""
    error_msg = str(error)
    
    error_map = {
        AuthErrorCode.INVALID_OTP: (400, "Invalid OTP code"),
        AuthErrorCode.USER_NOT_FOUND: (404, "User not found"),
        AuthErrorCode.USER_NOT_VERIFIED: (403, "User not verified"),
        AuthErrorCode.WRONG_PASSWORD: (401, "Invalid credentials"),
        AuthErrorCode.OTP_EXPIRED: (400, "OTP code expired"),
        AuthErrorCode.RATE_LIMIT_EXCEEDED: (429, "Too many attempts. Please try again in 1 hour."),
        AuthErrorCode.ACCOUNT_DISABLED: (403, "Account disabled")
    }
    
    for code, (status, message) in error_map.items():
        if code in error_msg:
            return HTTPException(
                status_code=status,
                detail={"error_code": code, "message": message}
            )
    
    # Default error
    return HTTPException(
        status_code=400,
        detail={"error_code": "UNKNOWN_ERROR", "message": error_msg}
    )

# ==================== SIGNUP ENDPOINTS ====================

@auth_router.post("/register")
async def register(request_body: RegisterRequest, request: Request, db = None):
    """
    SIGNUP STEPS 1-3:
    1. User enters email + phone + password
    2. Backend creates pending user (status = 'unverified')
    3. Backend sends SMS OTP
    
    Returns:
    {
        "success": true,
        "user_id": "...",
        "email": "...",
        "phone_verification_required": true,
        "test_verification_code": "123456"  // Only in dev mode
    }
    """
    if not db:
        raise HTTPException(status_code=500, detail="Database not available")
    
    auth_service = AuthService(db)
    client_ip, user_agent = get_client_info(request)
    
    try:
        result = await auth_service.register_user(
            email=request_body.email,
            phone_number=request_body.phone_number,
            password=request_body.password,
            full_name=request_body.full_name,
            referral_code=request_body.referral_code,
            client_ip=client_ip,
            user_agent=user_agent
        )
        
        return {
            "success": True,
            "message": "Registration successful! Please verify your phone number.",
            **result
        }
    
    except ValueError as e:
        if "Email already registered" in str(e):
            raise HTTPException(
                status_code=400,
                detail={"error_code": "EMAIL_EXISTS", "message": "Email already registered"}
            )
        raise handle_auth_error(e)
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@auth_router.post("/verify-phone")
async def verify_phone(request_body: VerifyOTPRequest, request: Request, db = None):
    """
    SIGNUP STEPS 4-7:
    4. User enters OTP
    5. Backend verifies OTP (correct → status = 'active', wrong → reject)
    6. Backend generates JWT tokens
    7. User redirected to dashboard
    
    Returns JWT tokens on success:
    {
        "success": true,
        "access_token": "...",
        "refresh_token": "...",
        "user": {...}
    }
    """
    if not db:
        raise HTTPException(status_code=500, detail="Database not available")
    
    auth_service = AuthService(db)
    
    try:
        result = await auth_service.verify_otp_and_activate(
            email=request_body.email,
            otp_code=request_body.code
        )
        return result
    
    except ValueError as e:
        raise handle_auth_error(e)
    except Exception as e:
        logger.error(f"Phone verification error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ==================== LOGIN ENDPOINTS ====================

@auth_router.post("/login")
async def login(request_body: LoginRequest, request: Request, db = None):
    """
    LOGIN STEPS 1-3:
    1. User enters email + password
    2. Backend checks credentials
    3. Backend checks status
    
    Returns:
    {
        "requires_2fa": true,
        "user_id": "...",
        "email": "...",
        "message": "2FA required"
    }
    
    OR if unverified:
    {
        "requires_verification": true,
        "user_id": "...",
        "email": "...",
        "message": "Please verify your phone number first"
    }
    """
    if not db:
        raise HTTPException(status_code=500, detail="Database not available")
    
    auth_service = AuthService(db)
    client_ip, user_agent = get_client_info(request)
    
    try:
        result = await auth_service.login_step1_credentials(
            email=request_body.email,
            password=request_body.password,
            client_ip=client_ip,
            user_agent=user_agent
        )
        
        # If user requires verification (unverified status)
        if result.get("requires_verification"):
            return result
        
        # If 2FA is disabled, generate tokens immediately
        if not result.get("requires_2fa"):
            user = await db.user_accounts.find_one({"user_id": result["user_id"]})
            access_token, refresh_token = auth_service._generate_jwt(
                result["user_id"],
                result["email"],
                user.get("role", "user")
            )
            return {
                "success": True,
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": {
                    "user_id": result["user_id"],
                    "email": result["email"],
                    "full_name": user.get("full_name"),
                    "role": user.get("role", "user")
                }
            }
        
        # 2FA required - return that info
        return result
    
    except ValueError as e:
        raise handle_auth_error(e)
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@auth_router.post("/login/send-otp")
async def login_send_otp(request_body: SendOTPRequest, request: Request, db = None):
    """
    LOGIN STEP 4:
    4. Backend sends OTP for 2FA
    
    Returns:
    {
        "success": true,
        "message": "OTP sent",
        "test_code": "123456"  // Only in dev mode
    }
    """
    if not db:
        raise HTTPException(status_code=500, detail="Database not available")
    
    auth_service = AuthService(db)
    
    try:
        result = await auth_service.login_step2_send_otp(request_body.user_id)
        return result
    
    except ValueError as e:
        raise handle_auth_error(e)
    except Exception as e:
        logger.error(f"Send OTP error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@auth_router.post("/login/verify-otp")
async def login_verify_otp(request_body: LoginOTPRequest, request: Request, db = None):
    """
    LOGIN STEPS 5-7:
    5. User enters OTP
    6. Backend validates OTP (correct → generate JWT, incorrect → deny)
    7. User enters dashboard
    
    Returns JWT tokens on success:
    {
        "success": true,
        "access_token": "...",
        "refresh_token": "...",
        "user": {...}
    }
    """
    if not db:
        raise HTTPException(status_code=500, detail="Database not available")
    
    auth_service = AuthService(db)
    client_ip, user_agent = get_client_info(request)
    
    try:
        result = await auth_service.login_step3_verify_otp(
            user_id=request_body.user_id,
            otp_code=request_body.code,
            client_ip=client_ip,
            user_agent=user_agent
        )
        return result
    
    except ValueError as e:
        raise handle_auth_error(e)
    except Exception as e:
        logger.error(f"OTP verification error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ==================== ADMIN ENDPOINTS ====================

@auth_router.post("/admin/reset-phone-verification")
async def admin_reset_phone(request_body: AdminResetPhoneRequest, db = None):
    """Admin: Reset user's phone verification"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not available")
    
    auth_service = AuthService(db)
    
    try:
        result = await auth_service.admin_reset_phone_verification(
            request_body.user_id,
            request_body.admin_id
        )
        return result
    except Exception as e:
        logger.error(f"Admin reset phone error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@auth_router.post("/admin/toggle-2fa")
async def admin_toggle_2fa(request_body: AdminToggle2FARequest, db = None):
    """Admin: Enable/disable 2FA for user"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not available")
    
    auth_service = AuthService(db)
    
    try:
        result = await auth_service.admin_toggle_2fa(
            request_body.user_id,
            request_body.enabled,
            request_body.admin_id
        )
        return result
    except Exception as e:
        logger.error(f"Admin toggle 2FA error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@auth_router.post("/admin/resend-verification-sms")
async def admin_resend_sms(request_body: AdminResendSMSRequest, db = None):
    """Admin: Manually resend verification SMS"""
    if not db:
        raise HTTPException(status_code=500, detail="Database not available")
    
    auth_service = AuthService(db)
    
    try:
        result = await auth_service.admin_resend_verification_sms(
            request_body.user_id,
            request_body.admin_id
        )
        return result
    except Exception as e:
        logger.error(f"Admin resend SMS error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# ==================== UTILITY ENDPOINTS ====================

@auth_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "auth"}
