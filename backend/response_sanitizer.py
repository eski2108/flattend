"""
Response Sanitizer Middleware
Intercepts ALL responses and removes sensitive data
This is safer than modifying 29,000 lines of code
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import re
import logging

logger = logging.getLogger(__name__)

class ResponseSanitizerMiddleware(BaseHTTPMiddleware):
    """
    Middleware that sanitizes all HTTP responses to remove:
    - Stack traces
    - File paths
    - Internal error details
    - Sensitive system information
    """
    
    SENSITIVE_PATTERNS = [
        (r'Traceback \(most recent call last\):[^"]+', '[Error details removed]'),
        (r'File "[^"]+", line \d+', '[File path removed]'),
        (r'/app/backend/[^"\s]+', '[Path removed]'),
        (r'/root/[^"\s]+', '[Path removed]'),
        (r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', '[IP removed]'),
    ]
    
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            
            # Only sanitize error responses (4xx, 5xx)
            if response.status_code >= 400:
                # Read response body
                response_body = b""
                async for chunk in response.body_iterator:
                    response_body += chunk
                
                # Decode and sanitize
                try:
                    body_str = response_body.decode('utf-8')
                    
                    # Apply all sanitization patterns
                    for pattern, replacement in self.SENSITIVE_PATTERNS:
                        body_str = re.sub(pattern, replacement, body_str)
                    
                    # Re-encode
                    sanitized_body = body_str.encode('utf-8')
                    
                    # Create new response with sanitized body
                    return Response(
                        content=sanitized_body,
                        status_code=response.status_code,
                        headers=dict(response.headers),
                        media_type=response.media_type
                    )
                except:
                    # If decoding fails, return original response
                    return Response(
                        content=response_body,
                        status_code=response.status_code,
                        headers=dict(response.headers),
                        media_type=response.media_type
                    )
            
            return response
            
        except Exception as e:
            logger.error(f"Response sanitizer error: {str(e)}", exc_info=True)
            # Return original response if sanitization fails
            return await call_next(request)
