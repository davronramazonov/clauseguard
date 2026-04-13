# Clauseg.ai - AI Document Analyzer

## Quick Start

### 1. Backend

```bash
cd clauseguard

# Install dependencies
npm install

# Setup environment
copy backend\.env.example .env
# Edit .env with your settings:
#   - GEMINI_API_KEY (get from Google AI Studio)
#   - JWT_SECRET (any random string)
#   - MongoDB connection string

# Start server
npm start
```

Server runs on http://localhost:5000

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development
npm run dev
```

Frontend runs on http://localhost:3000

## Environment Variables (.env)

```
DB_HOST=localhost
DB_PORT=27017
DB_NAME=clauseg
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES=7d
GEMINI_API_KEY=your-gemini-api-key-here
PORT=5000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Analysis
- `POST /api/analyze` - Analyze document
- `GET /api/analyze/history` - Get user history
- `GET /api/analyze/:id` - Get specific result

### User
- `GET /api/users/profile` - Get profile
- `GET /api/users/usage` - Get usage stats

### Admin
- `GET /api/admin/users` - List users
- `POST /api/admin/users/:id/premium` - Enable premium
- `POST /api/admin/users/:id/block` - Block user
- `GET /api/admin/stats` - Get stats

### Promo
- `POST /api/promo/apply` - Apply promo code

## Tech Stack

- **Frontend**: React + Vite + Framer Motion
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **AI**: Gemini API
- **Auth**: JWT + bcrypt
