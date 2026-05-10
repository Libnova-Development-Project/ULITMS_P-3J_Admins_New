# Quick Start Guide - ULITMS Backend Enhancements

## 🚀 Setup (5 minutes)

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Environment Setup
```bash
# Copy .env.example to .env
cp .env.example .env

# Update .env with your database credentials:
DB_PASSWORD=123  # Your PostgreSQL password
JWT_SECRET=your_secret_key_here
```

### Step 3: Start Server
```bash
npm run dev
```

You should see:
```
🚀 ULITMS Server running on http://localhost:5000
✅ PostgreSQL connected to ULITMS database
✅ Schema "library_schema" is accessible
```

---

## 📚 Key Features

### 1. **Input Validation** ✅

All user inputs are now validated automatically:

```javascript
// Good - Will work
{
  "student_id": "2024-01018",
  "email": "user@university.edu",
  "password": "StrongPass123",
  "first_name": "John",
  "last_name": "Doe"
}

// Bad - Will be rejected
{
  "student_id": "invalid",        // Wrong format
  "email": "not-an-email",        // Invalid email
  "password": "weak",             // Too weak
  "first_name": ""                // Empty
}
```

### 2. **Rate Limiting** ⛔

**Prevents abuse:**
- Max 5 login attempts per 15 minutes
- Max 100 API calls per 15 minutes
- Max 20 borrow/return operations per hour
- Max 200 searches per 15 minutes

When limit is exceeded:
```json
{
  "success": false,
  "status": 429,
  "message": "Too many requests from this IP, please try again later."
}
```

### 3. **Standardized Responses** 📋

All responses now follow one format:

**Success Example:**
```bash
curl http://localhost:5000/api/books
```
```json
{
  "success": true,
  "status": 200,
  "message": "Operation successful",
  "data": [
    { "id": 1, "title": "Book 1", "author": "Author" },
    { "id": 2, "title": "Book 2", "author": "Author 2" }
  ],
  "timestamp": "2026-05-10T10:30:00.000Z"
}
```

**Error Example:**
```bash
curl http://localhost:5000/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"identifier":"","password":""}'
```
```json
{
  "success": false,
  "status": 422,
  "message": "Validation failed",
  "details": {
    "validationErrors": ["Missing required fields: identifier, password"]
  },
  "timestamp": "2026-05-10T10:30:00.000Z"
}
```

---

## 🔐 Security Features

### ✅ Already Implemented

1. **Password Hashing**: bcryptjs (10 rounds)
2. **JWT Tokens**: 24-hour expiry
3. **Rate Limiting**: Endpoint-specific limits
4. **Input Validation**: All user inputs checked
5. **SQL Injection Prevention**: Parameterized queries
6. **CORS Protection**: Whitelist enabled
7. **Security Headers**: helmet middleware
8. **Activity Logging**: Auth actions tracked

### 🛡️ Safe Operations

```javascript
// ✅ SAFE - Uses parameterized queries
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// ❌ NEVER do this
const result = await pool.query(
  `SELECT * FROM users WHERE email = '${email}'` // SQL Injection!
);
```

---

## 📝 API Examples

### 1. Register New Student

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "2024-01018",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@university.edu",
    "password": "SecurePass123",
    "contact_number": "+1234567890",
    "course": "Computer Science",
    "year_level": 2
  }'
```

**Success Response (201):**
```json
{
  "success": true,
  "status": 201,
  "message": "Resource created successfully",
  "data": {
    "user": {
      "id": 123,
      "student_id": "2024-01018",
      "email": "john@university.edu",
      "first_name": "John",
      "role": "student"
    }
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "john@university.edu",
    "password": "SecurePass123"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "status": 200,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 123,
      "email": "john@university.edu",
      "role": "student"
    }
  }
}
```

### 3. Get Books with Pagination

```bash
# Get 10 books starting from offset 0
curl "http://localhost:5000/api/books?limit=10&offset=0"

# Pagination validation:
# - limit: 1-100 (default: 10)
# - offset: >= 0 (default: 0)
```

### 4. Search Books

```bash
curl "http://localhost:5000/api/books/search?q=database"

# Rate limited to 200 searches per 15 minutes
```

---

## 🧪 Testing Enhancements

### Test 1: Rate Limiting
```bash
# Try logging in 6 times quickly (limit is 5)
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"identifier":"test@test.com","password":"Pass123"}'
  echo ""
done

# 6th request should return 429 (Too Many Requests)
```

### Test 2: Input Validation
```bash
# Weak password (< 8 chars)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "2024-01018",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@test.com",
    "password": "weak"
  }'

# Returns 422 with validation error
```

### Test 3: Check Response Format
```bash
# Any endpoint will show standardized response
curl http://localhost:5000/api/books

# Check JSON structure:
# - success: boolean
# - status: number
# - message: string
# - data: object|array
# - timestamp: ISO string
```

---

## 🐛 Troubleshooting

### Issue: "Too many requests"
- Wait 15 minutes or restart the server
- Rate limits are per IP address

### Issue: Validation error
- Check error message in response.details
- Ensure password has uppercase, lowercase, number
- Check email format

### Issue: Database connection failed
- Verify .env credentials
- Ensure PostgreSQL is running
- Check database exists

### Issue: JWT token invalid
- Generate new token by logging in again
- Check token expiry (24 hours)
- Token format should be: `Bearer <token>`

---

## 📊 File Changes Summary

### New Files (6)
✨ `backend/constants/statusCodes.js` - HTTP status codes
✨ `backend/utils/validators.js` - Input validators
✨ `backend/utils/errorHandler.js` - Standardized error responses
✨ `backend/middleware/rateLimiter.js` - Rate limiting
✨ `backend/controllers/authControllerEnhanced.js` - Reference implementation
✨ `backend/.env.example` - Environment template

### Updated Files (4)
✅ `backend/package.json` - Added dependencies
✅ `backend/server.js` - Added security middleware
✅ `backend/routes/auth.js` - Added validation & rate limiting
✅ `backend/routes/books.js` - Added validation & rate limiting

### Documentation (2)
📚 `backend/ENHANCEMENTS.md` - Complete enhancement guide
📚 `backend/QUICK_START.md` - This file

---

## 🎯 Next: Upgrade Existing Controllers

To use these enhancements in existing controllers:

```javascript
// OLD
exports.register = async (req, res) => {
    try {
        res.status(400).json({ message: 'Error' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// NEW
const { sendError, sendSuccess, asyncHandler } = require('../utils/errorHandler');
const { HTTP_STATUS } = require('../constants/statusCodes');

exports.register = asyncHandler(async (req, res) => {
    sendError(res, HTTP_STATUS.BAD_REQUEST, 'Error occurred');
});
```

---

## 📞 Support

1. Check [ENHANCEMENTS.md](./ENHANCEMENTS.md) for detailed docs
2. Review error messages in terminal
3. Check response in Network tab
4. Verify .env configuration

---

**Created**: May 10, 2026
**Version**: 2.0
**Status**: Production Ready ✅
