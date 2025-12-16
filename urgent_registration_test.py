#!/usr/bin/env python3
"""
URGENT: Registration Endpoint Testing
Testing the specific registration issue reported by user.

POST https://coinhubx.net/api/auth/register

Test data:
{
  "email": "testuser@test.com",
  "password": "TestPass123!",
  "full_name": "Test User",
  "phone": "+447700900000"
}
"""

import asyncio
import aiohttp
import json
import sys
import time
from datetime import datetime, timezone

# Backend URL from frontend .env
BACKEND_URL = "https://quickstart-27.preview.emergentagent.com"

class UrgentRegistrationTester:
    """Urgent Registration Endpoint Tester"""
    
    def __init__(self):
        self.base_url = f"{BACKEND_URL}/api"
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def make_request(self, method: str, endpoint: str, **kwargs):
        """Make HTTP request and return detailed response info"""
        start_time = time.time()
        try:
            url = f"{self.base_url}{endpoint}"
            print(f"🔗 Making {method} request to: {url}")
            
            async with self.session.request(method, url, **kwargs) as response:
                response_time = (time.time() - start_time) * 1000
                
                # Get response headers
                headers = dict(response.headers)
                
                # Try to get JSON response
                try:
                    data = await response.json()
                except:
                    try:
                        data = await response.text()
                    except:
                        data = "Could not read response body"
                
                return {
                    "success": response.status in [200, 201],
                    "status_code": response.status,
                    "response_time_ms": response_time,
                    "data": data,
                    "headers": headers,
                    "url": url
                }
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return {
                "success": False,
                "status_code": 0,
                "response_time_ms": response_time,
                "data": {"error": str(e)},
                "headers": {},
                "url": f"{self.base_url}{endpoint}"
            }
    
    async def test_backend_connectivity(self):
        """Test if backend is reachable"""
        print("🏥 Testing Backend Connectivity...")
        print("-" * 50)
        
        result = await self.make_request("GET", "/health")
        
        print(f"Status Code: {result['status_code']}")
        print(f"Response Time: {result['response_time_ms']:.0f}ms")
        print(f"Response Data: {json.dumps(result['data'], indent=2)}")
        
        if result['success']:
            print("✅ Backend is reachable and healthy")
        else:
            print("❌ Backend connectivity issue")
        
        print()
        return result['success']
    
    async def test_registration_endpoint(self):
        """Test the specific registration endpoint with user's data"""
        print("🔐 Testing Registration Endpoint...")
        print("-" * 50)
        
        # Exact test data from user request
        test_data = {
            "email": "testuser@test.com",
            "password": "TestPass123!",
            "full_name": "Test User",
            "phone": "+447700900000"
        }
        
        print(f"Test Data: {json.dumps(test_data, indent=2)}")
        print()
        
        result = await self.make_request(
            "POST", 
            "/auth/register", 
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {result['status_code']}")
        print(f"Response Time: {result['response_time_ms']:.0f}ms")
        print(f"Response Headers: {json.dumps(result['headers'], indent=2)}")
        print(f"Response Data: {json.dumps(result['data'], indent=2)}")
        
        # Analyze the response
        if result['success']:
            print("✅ Registration endpoint responded successfully")
            if isinstance(result['data'], dict) and result['data'].get('success'):
                print("✅ Registration completed successfully")
            else:
                print("⚠️ Registration endpoint responded but registration may have failed")
        else:
            print("❌ Registration endpoint failed")
            
            # Analyze common failure reasons
            if result['status_code'] == 0:
                print("🔍 Analysis: Network/Connection error - backend may be down")
            elif result['status_code'] == 400:
                print("🔍 Analysis: Bad Request - likely validation error")
            elif result['status_code'] == 422:
                print("🔍 Analysis: Unprocessable Entity - validation failed")
            elif result['status_code'] == 500:
                print("🔍 Analysis: Internal Server Error - backend issue")
            elif result['status_code'] == 502:
                print("🔍 Analysis: Bad Gateway - proxy/load balancer issue")
            elif result['status_code'] == 503:
                print("🔍 Analysis: Service Unavailable - backend overloaded")
            elif result['status_code'] == 504:
                print("🔍 Analysis: Gateway Timeout - backend too slow")
            else:
                print(f"🔍 Analysis: Unexpected status code {result['status_code']}")
        
        print()
        return result
    
    async def test_database_connectivity(self):
        """Test if database is accessible by trying to get users"""
        print("💾 Testing Database Connectivity...")
        print("-" * 50)
        
        # Try an endpoint that would require database access
        result = await self.make_request("GET", "/users/stats")
        
        print(f"Status Code: {result['status_code']}")
        print(f"Response Time: {result['response_time_ms']:.0f}ms")
        print(f"Response Data: {json.dumps(result['data'], indent=2)}")
        
        if result['status_code'] == 500:
            print("❌ Possible database connection issue")
        elif result['status_code'] in [200, 401, 403]:
            print("✅ Database appears to be accessible")
        else:
            print("⚠️ Database status unclear")
        
        print()
        return result
    
    async def test_alternative_registration_formats(self):
        """Test registration with different field names"""
        print("🔄 Testing Alternative Registration Formats...")
        print("-" * 50)
        
        # Test with phone_number instead of phone
        test_data_alt1 = {
            "email": "testuser2@test.com",
            "password": "TestPass123!",
            "full_name": "Test User 2",
            "phone_number": "+447700900001"
        }
        
        print("Testing with 'phone_number' field:")
        result1 = await self.make_request(
            "POST", 
            "/auth/register", 
            json=test_data_alt1,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status: {result1['status_code']}, Data: {result1['data']}")
        
        # Test minimal required fields
        test_data_minimal = {
            "email": "testuser3@test.com",
            "password": "TestPass123!",
            "full_name": "Test User 3"
        }
        
        print("\nTesting with minimal fields (no phone):")
        result2 = await self.make_request(
            "POST", 
            "/auth/register", 
            json=test_data_minimal,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status: {result2['status_code']}, Data: {result2['data']}")
        print()
        
        return [result1, result2]
    
    async def check_backend_logs(self):
        """Check if we can get any backend error information"""
        print("📋 Checking Backend Status...")
        print("-" * 50)
        
        # Try to get any available status endpoints
        endpoints_to_check = [
            "/",
            "/status", 
            "/info",
            "/version"
        ]
        
        for endpoint in endpoints_to_check:
            result = await self.make_request("GET", endpoint)
            if result['success']:
                print(f"✅ {endpoint}: {result['data']}")
            else:
                print(f"❌ {endpoint}: Status {result['status_code']}")
        
        print()
    
    async def run_urgent_tests(self):
        """Run all urgent registration tests"""
        print("🚨 URGENT REGISTRATION TESTING")
        print("=" * 60)
        print(f"Backend URL: {self.base_url}")
        print(f"Test Time: {datetime.now(timezone.utc).isoformat()}")
        print("=" * 60)
        print()
        
        # 1. Test backend connectivity
        backend_ok = await self.test_backend_connectivity()
        
        # 2. Test database connectivity
        await self.test_database_connectivity()
        
        # 3. Check backend status
        await self.check_backend_logs()
        
        # 4. Test the specific registration endpoint
        registration_result = await self.test_registration_endpoint()
        
        # 5. Test alternative formats
        await self.test_alternative_registration_formats()
        
        # Generate summary
        print("=" * 60)
        print("📊 URGENT TEST SUMMARY")
        print("=" * 60)
        
        if not backend_ok:
            print("🚨 CRITICAL: Backend is not reachable!")
            print("   - Check if backend service is running")
            print("   - Check network connectivity")
            print("   - Check DNS resolution")
        elif not registration_result['success']:
            print("🚨 CRITICAL: Registration endpoint is failing!")
            print(f"   - Status Code: {registration_result['status_code']}")
            print(f"   - Error: {registration_result['data']}")
            
            if registration_result['status_code'] == 500:
                print("   - Likely backend/database issue")
                print("   - Check backend logs")
                print("   - Check database connection")
            elif registration_result['status_code'] in [400, 422]:
                print("   - Likely validation issue")
                print("   - Check required fields")
                print("   - Check field formats")
        else:
            print("✅ Registration endpoint appears to be working")
            if isinstance(registration_result['data'], dict):
                if registration_result['data'].get('success'):
                    print("✅ Registration completed successfully")
                else:
                    print("⚠️ Registration endpoint works but registration failed")
                    print(f"   - Response: {registration_result['data']}")
        
        print("=" * 60)
        
        return registration_result

async def main():
    """Main test runner"""
    try:
        async with UrgentRegistrationTester() as tester:
            result = await tester.run_urgent_tests()
            
            # Return appropriate exit code
            if result['success']:
                return 0
            else:
                return 1
            
    except Exception as e:
        print(f"❌ Test runner failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)