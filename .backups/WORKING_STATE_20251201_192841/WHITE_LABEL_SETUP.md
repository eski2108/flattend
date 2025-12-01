# White-Label Platform Setup Guide

## Overview
This document outlines the white-labelling system for Coin Hub X, enabling deployment of multiple branded instances sharing the same core wallet engine.

---

## 1. Theme & Color Override System

### Frontend Theme Configuration
**Location**: `/app/frontend/src/config/whitelabel.js`

```javascript
export const WHITELABEL_CONFIG = {
  // Brand Identity
  brandName: process.env.REACT_APP_BRAND_NAME || 'Coin Hub X',
  brandSlogan: process.env.REACT_APP_BRAND_SLOGAN || 'Trade Crypto P2P With Total Protection',
  
  // Color Palette
  colors: {
    primary: process.env.REACT_APP_COLOR_PRIMARY || '#00F0FF',      // Cyan
    secondary: process.env.REACT_APP_COLOR_SECONDARY || '#A855F7',   // Purple
    accent: process.env.REACT_APP_COLOR_ACCENT || '#22C55E',         // Green
    background: process.env.REACT_APP_COLOR_BG || '#0B0E13',         // Dark
    text: process.env.REACT_APP_COLOR_TEXT || '#FFFFFF',             // White
    error: process.env.REACT_APP_COLOR_ERROR || '#EF4444',           // Red
    warning: process.env.REACT_APP_COLOR_WARNING || '#F59E0B',       // Orange
    success: process.env.REACT_APP_COLOR_SUCCESS || '#22C55E'        // Green
  },
  
  // Logo Configuration
  logo: {
    main: process.env.REACT_APP_LOGO_URL || '/logo.png',
    favicon: process.env.REACT_APP_FAVICON_URL || '/favicon.ico',
    width: parseInt(process.env.REACT_APP_LOGO_WIDTH) || 150,
    height: parseInt(process.env.REACT_APP_LOGO_HEIGHT) || 50
  },
  
  // Domain & URLs
  domain: process.env.REACT_APP_DOMAIN || 'coinhubx.com',
  backendUrl: process.env.REACT_APP_BACKEND_URL,
  
  // Features Toggle
  features: {
    p2pTrading: process.env.REACT_APP_FEATURE_P2P === 'true',
    spotTrading: process.env.REACT_APP_FEATURE_SPOT === 'true',
    savings: process.env.REACT_APP_FEATURE_SAVINGS === 'true',
    referrals: process.env.REACT_APP_FEATURE_REFERRALS === 'true',
    kyc: process.env.REACT_APP_FEATURE_KYC === 'true'
  },
  
  // Contact & Support
  support: {
    email: process.env.REACT_APP_SUPPORT_EMAIL || 'support@coinhubx.com',
    phone: process.env.REACT_APP_SUPPORT_PHONE || '+44 20 1234 5678',
    chat: process.env.REACT_APP_TAWK_ID || null
  },
  
  // Social Media
  social: {
    twitter: process.env.REACT_APP_SOCIAL_TWITTER,
    telegram: process.env.REACT_APP_SOCIAL_TELEGRAM,
    facebook: process.env.REACT_APP_SOCIAL_FACEBOOK,
    linkedin: process.env.REACT_APP_SOCIAL_LINKEDIN
  }
};
```

---

## 2. Logo Replacement System

### Current Implementation
- Logo stored at: `/app/frontend/public/logo.png`
- Favicon at: `/app/frontend/public/favicon.ico`

### White-Label Logo Setup
1. Create environment-specific logo folders:
   ```
   /app/frontend/public/brands/
   ├── coinhubx/
   │   ├── logo.png
   │   └── favicon.ico
   ├── client1/
   │   ├── logo.png
   │   └── favicon.ico
   └── client2/
       ├── logo.png
       └── favicon.ico
   ```

2. Logo component reads from environment:
   ```javascript
   const logoPath = `/brands/${process.env.REACT_APP_BRAND_ID}/logo.png`;
   ```

---

## 3. Multi-Tenant Configuration

### Backend Multi-Tenancy Setup

**Database Structure**:
```javascript
// New collection: tenant_config
{
  tenant_id: "coinhubx",
  brand_name: "Coin Hub X",
  domain: "coinhubx.com",
  colors: { primary: "#00F0FF", secondary: "#A855F7" },
  features_enabled: ["p2p", "spot", "savings", "referrals"],
  api_keys: {
    nowpayments: "encrypted_key",
    twilio: "encrypted_key"
  },
  commission_rates: {
    p2p: 0.02,
    swap: 0.015,
    express_buy: 0.025
  },
  created_at: "2025-01-01T00:00:00Z",
  is_active: true
}
```

**Tenant Middleware** (`/app/backend/tenant_middleware.py`):
```python
async def get_tenant_from_domain(request):
    """Extract tenant from request domain"""
    host = request.headers.get('host')
    tenant = await db.tenant_config.find_one({"domain": host})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant

async def inject_tenant(request, call_next):
    """Inject tenant context into request"""
    tenant = await get_tenant_from_domain(request)
    request.state.tenant = tenant
    response = await call_next(request)
    return response
```

---

## 4. Per-Client Admin Dashboard

### Admin Portal Structure
- **Super Admin**: Manages all tenants
- **Tenant Admin**: Manages only their instance

**Super Admin Capabilities**:
- Create new tenant instances
- Configure tenant settings
- Monitor all tenant metrics
- Deploy tenant-specific code

**Tenant Admin Capabilities**:
- Manage their users
- Configure fees/commissions
- Access tenant-specific analytics
- Customize branding (within limits)

---

## 5. Domain Routing

### Nginx Configuration Template
```nginx
# Main instance
server {
    listen 80;
    server_name coinhubx.com www.coinhubx.com;
    
    location /api {
        proxy_pass http://backend:8001;
        proxy_set_header X-Tenant-ID coinhubx;
    }
    
    location / {
        proxy_pass http://frontend:3000;
    }
}

# Client 1 instance
server {
    listen 80;
    server_name client1domain.com www.client1domain.com;
    
    location /api {
        proxy_pass http://backend:8001;
        proxy_set_header X-Tenant-ID client1;
    }
    
    location / {
        proxy_pass http://frontend-client1:3000;
    }
}
```

---

## 6. Environment Duplication

### Deployment Template for New Client

**Directory Structure**:
```
/deployments/
├── coinhubx/          # Main instance
│   ├── .env
│   ├── docker-compose.yml
│   └── nginx.conf
├── client1/           # Client 1 instance
│   ├── .env
│   ├── docker-compose.yml
│   └── nginx.conf
└── client2/           # Client 2 instance
    ├── .env
    ├── docker-compose.yml
    └── nginx.conf
```

**Environment Template** (`.env.template`):
```bash
# Brand Configuration
REACT_APP_BRAND_NAME="Client Brand Name"
REACT_APP_BRAND_ID="client1"
REACT_APP_DOMAIN="clientdomain.com"

# Colors
REACT_APP_COLOR_PRIMARY="#0088FF"
REACT_APP_COLOR_SECONDARY="#FF6B35"

# Backend
REACT_APP_BACKEND_URL="https://clientdomain.com"
BACKEND_PORT=8001

# Database (Shared wallet engine)
MONGO_URL="mongodb://mongo:27017"
MONGO_DB_NAME="crypto_platform_client1"

# Feature Toggles
REACT_APP_FEATURE_P2P=true
REACT_APP_FEATURE_SPOT=true
REACT_APP_FEATURE_SAVINGS=true
REACT_APP_FEATURE_REFERRALS=true

# API Keys (Client-specific)
NOWPAYMENTS_API_KEY="client1_nowpayments_key"
TWILIO_ACCOUNT_SID="client1_twilio_sid"

# License
PLATFORM_LICENSE_KEY="encrypted_license_key_for_client1"
```

---

## 7. License Protection System

### License Validation
**Location**: `/app/backend/license_validator.py`

```python
import jwt
from datetime import datetime, timezone

def validate_license(license_key: str, tenant_id: str) -> bool:
    """Validate platform license for tenant"""
    try:
        payload = jwt.decode(license_key, SECRET_KEY, algorithms=["HS256"])
        
        # Check expiry
        if datetime.fromtimestamp(payload['exp'], timezone.utc) < datetime.now(timezone.utc):
            return False
        
        # Check tenant
        if payload['tenant_id'] != tenant_id:
            return False
        
        # Check feature limits
        if not check_feature_limits(tenant_id, payload['features']):
            return False
        
        return True
    except:
        return False

async def license_middleware(request, call_next):
    """Check license before processing requests"""
    tenant = request.state.tenant
    license_key = tenant.get('license_key')
    
    if not validate_license(license_key, tenant['tenant_id']):
        raise HTTPException(status_code=403, detail="Invalid or expired license")
    
    return await call_next(request)
```

---

## 8. Backend Config Templates

### Wallet Engine Configuration
**Core wallet logic remains shared** across all instances:
- `wallet_service.py` (same for all)
- `withdrawal_system_v2.py` (same for all)
- `p2p_wallet_service.py` (same for all)

**Tenant-specific configurations**:
- Commission rates
- Fee structures
- Withdrawal limits
- KYC requirements
- Payment processors

---

## 9. Deployment Workflow

### Creating New White-Label Instance

**Step 1**: Create tenant configuration
```bash
python scripts/create_tenant.py --name "Client Name" --domain "client.com" --brand-id "client1"
```

**Step 2**: Generate environment files
```bash
python scripts/generate_env.py --tenant client1 --template .env.template
```

**Step 3**: Build branded frontend
```bash
cd /app/frontend
REACT_APP_BRAND_ID=client1 yarn build
```

**Step 4**: Deploy with Docker Compose
```bash
cd /deployments/client1
docker-compose up -d
```

**Step 5**: Run tenant-specific migrations
```bash
python scripts/setup_tenant_db.py --tenant client1
```

---

## 10. Monitoring & Analytics

### Per-Tenant Metrics
- User registrations
- Trading volume
- Revenue generated
- Active users
- Transaction counts

### Centralized Dashboard
Super admin can view all tenant metrics in one place:
- `/admin/super/tenants` - List all tenants
- `/admin/super/analytics` - Cross-tenant analytics
- `/admin/super/billing` - Tenant billing management

---

## Next Steps

1. ✅ Create `/app/frontend/src/config/whitelabel.js`
2. ✅ Implement Logo component with dynamic loading
3. ✅ Create tenant middleware for backend
4. ✅ Build super admin panel
5. ✅ Create deployment automation scripts
6. ✅ Implement license validation system
7. ✅ Create client onboarding workflow
8. ✅ Test multi-tenant deployment

---

## Files to Create

1. `/app/frontend/src/config/whitelabel.js` - Theme configuration
2. `/app/backend/tenant_middleware.py` - Multi-tenancy middleware
3. `/app/backend/license_validator.py` - License system
4. `/app/scripts/create_tenant.py` - Tenant creation script
5. `/app/scripts/generate_env.py` - Environment generation
6. `/app/scripts/setup_tenant_db.py` - Database setup per tenant
7. `/app/deployments/docker-compose.template.yml` - Deployment template

---

**Status**: WHITE-LABEL SYSTEM DESIGN COMPLETE
**Next**: Implementation of components listed above
