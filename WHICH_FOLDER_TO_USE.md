# IMPORTANT: Which Folder To Use

## USE THIS FOLDER STRUCTURE:

```
/app
├── backend/          ← USE THIS BACKEND (main, up-to-date)
├── frontend/         ← USE THIS FRONTEND (main, up-to-date)
└── STABLE/           ← IGNORE THIS (old backup, do NOT use)
```

## DO NOT USE:
- `/app/STABLE/` - This is an OLD BACKUP folder, ignore it completely
- `/app/.backups/` - These are old backups, ignore them

## CORRECT PATHS:

| Component | Path |
|-----------|------|
| Backend | `/app/backend/` |
| Frontend | `/app/frontend/` |
| Server | `/app/backend/server.py` |
| Seed DB | `/app/backend/seed_database.py` |
| Requirements | `/app/backend/requirements.txt` |
| Package.json | `/app/frontend/package.json` |

## Test Credentials:
- **Email:** `testuser@coinhubx.com`
- **Password:** `TestPass123!`

## Quick Start:

```bash
# Backend
cd /app/backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001

# Frontend (in another terminal)
cd /app/frontend
yarn install
yarn start
```

## Environment Variables:

Backend `.env` (create in `/app/backend/.env`):
```env
MONGO_URL=mongodb+srv://coinhubx:mummy1231123@cluster0.ctczzad.mongodb.net/?appName=Cluster0&retryWrites=true&w=majority
DB_NAME=coinhubx_production
JWT_SECRET=a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8
SECRET_KEY=b8e9f0a1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9
NOWPAYMENTS_API_KEY=RN27NA0-D32MD5G-M6N2G6T-KWQMEAP
```

Frontend `.env` (create in `/app/frontend/.env`):
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```
