# ULITMS_P-3J_Admins_New

**University Library Inventory and Transaction Management System** – A comprehensive system for both administrators and users, supporting the management of physical library inventory and E-Library digital resources, including user accounts, borrowing/return transactions, and integrated access to digital content.

## 📋 Quick Overview

### Backend
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT with bcryptjs hashing
- **Security**: Rate limiting, input validation, helmet headers
- **Version**: 2.0 (Enhanced)

### Frontend
- **Architecture**: Vanilla JavaScript (No framework)
- **Styling**: Tailwind CSS + Custom CSS
- **Storage**: localStorage (JWT tokens, user data)
- **Pages**: Dashboard, Catalog, Borrowings, E-Library, Profile

---

## 🚀 Quick Start (5 minutes)

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```

Server runs on: `http://localhost:5000`

### 2. Frontend Setup
```bash
cd frontend
# Open in browser:
# http://localhost:8000 (or open index.html directly)
```

---

## ✨ Recent Enhancements (V2.0)

### Security & Validation
- ✅ Input validation on all user inputs
- ✅ Rate limiting (5 login attempts/15 min, 100 API calls/15 min)
- ✅ Password strength enforcement (8+ chars, uppercase, lowercase, number)
- ✅ Helmet security headers
- ✅ SQL injection prevention (parameterized queries)

### Error Handling & Responses
- ✅ Standardized response format (all endpoints)
- ✅ Centralized error messages and status codes
- ✅ Comprehensive error handling in controllers
- ✅ Activity logging for audit trails

### Code Organization
- ✅ Utility functions for validators, error handling
- ✅ Centralized constants for status codes
- ✅ Rate limiter middleware
- ✅ Async error wrapper for controllers

### Documentation
- ✅ [ENHANCEMENTS.md](backend/ENHANCEMENTS.md) - Complete guide
- ✅ [QUICK_START.md](backend/QUICK_START.md) - 5-minute setup
- ✅ [.env.example](backend/.env.example) - Environment template

---

## 📁 Project Structure

```
ULITMS_P-3J_Admins_New/
├── backend/                    (Node.js + PostgreSQL)
│   ├── src/
│   │   ├── app.js             (Express app configuration)
│   │   ├── config/             (Database connection)
│   │   ├── controllers/        (Request handling and business logic)
│   │   ├── models/             (Database queries)
│   │   ├── routes/             (API endpoints)
│   │   ├── middleware/         (Auth, uploads, rate limiting)
│   │   ├── database/           (Schema)
│   │   ├── utils/              (Validation and error handling)
│   │   └── constants/          (HTTP codes, messages)
│   ├── scripts/                (Seed, maintenance, and dev utilities)
│   ├── uploads/                (User uploaded files)
│   ├── ENHANCEMENTS.md         (New!)
│   ├── QUICK_START.md          (New!)
│   ├── .env.example            (New!)
│   ├── .env                    (Your config)
│   ├── package.json
│   └── server.js               (Application entry point)
│
└── frontend/                   (Vanilla JS + Tailwind)
    ├── css/                    (Styles)
    ├── js/                     (Client logic)
    ├── pages/                  (HTML pages)
    ├── dev-tools/              (Standalone debug helpers)
    ├── index.html              (Main dashboard)
    └── README.md
```

The backend follows MVC: routes map requests to controllers, controllers coordinate application behavior, and models handle database access. The HTML pages under `frontend/` are the view layer. Start the app with `cd backend && npm run dev`.

---

## 🔐 Security Features

| Feature | Status | Details |
|---------|--------|---------|
| Password Hashing | ✅ | bcryptjs, 10 salt rounds |
| JWT Auth | ✅ | 24-hour expiry |
| Rate Limiting | ✅ | Endpoint-specific limits |
| Input Validation | ✅ | Email, password, ISBN, etc. |
| SQL Injection | ✅ | Parameterized queries |
| CORS | ✅ | Whitelist enabled |
| Security Headers | ✅ | helmet middleware |
| Activity Logging | ✅ | Auth actions tracked |

---

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify-token` - Verify JWT token

### Books
- `GET /api/books` - List books with pagination
- `GET /api/books/:id` - Get book details
- `POST /api/books` - Create book (admin)
- `PUT /api/books/:id` - Update book (admin)
- `DELETE /api/books/:id` - Delete book (admin)
- `GET /api/books/search` - Search books

### Borrowings
- `GET /api/borrowings` - List borrowings
- `POST /api/borrowings` - Borrow book
- `PUT /api/borrowings/:id/return` - Return book
- `GET /api/borrowings/overdue` - Get overdue books

### Users
- `GET /api/users` - List users (admin)
- `GET /api/users/profile/:id` - Get profile
- `PUT /api/users/:id` - Update profile
- `PUT /api/users/:id/password` - Change password

### E-Library
- `GET /api/elibrary/units` - List e-library units
- `POST /api/elibrary/sessions/start` - Start session
- `PUT /api/elibrary/sessions/:id/end` - End session

---

## 📝 Configuration

### .env File
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Library_SYSTEM_DB
DB_USER=postgres
DB_PASSWORD=your_postgres_password

PORT=5000
JWT_SECRET=generate_a_unique_random_secret_at_least_32_characters
CORS_ORIGIN=http://localhost:5000
```

Copy `backend/.env.example` to `backend/.env`, then set real database credentials and a unique JWT secret before starting the server. `backend-node` is an older alternate implementation and is not used by the documented app.

---

## 🧪 Testing

### Test Login (with rate limiting)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@ulitms.com","password":"admin123"}'
```

### Test Input Validation
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"password":"weak","email":"invalid"}'
```

### See Response Format
```bash
curl http://localhost:5000/api/books

# Check:
# {
#   "success": true,
#   "status": 200,
#   "message": "...",
#   "data": [...],
#   "timestamp": "2026-05-10T..."
# }
```

---

## 📚 Documentation

### Backend
- [SETUP.md](backend/SETUP.md) - Installation guide
- [QUICK_START.md](backend/QUICK_START.md) - 5-minute setup (NEW!)
- [ENHANCEMENTS.md](backend/ENHANCEMENTS.md) - Feature guide (NEW!)

### Frontend
- [README.md](frontend/README.md) - Frontend docs

---

## 🎯 Roadmap

### ✅ Completed (V2.0)
- Input validation
- Error standardization
- Rate limiting
- Security headers
- Activity logging

### 🔄 In Progress
- API documentation (Swagger)
- Admin dashboard enhancement
- Performance optimization

### 📋 Planned (V3.0)
- Caching layer (Redis)
- Docker containerization
- CI/CD pipeline
- Full-text search
- Email notifications

---

## 🤝 Contributing

1. Follow the enhancement guidelines in [ENHANCEMENTS.md](backend/ENHANCEMENTS.md)
2. Use standardized error responses
3. Add input validation for new endpoints
4. Test with rate limiting in mind
5. Update documentation

---

## 📞 Support

- **Backend Issues**: Check `backend/QUICK_START.md`
- **Frontend Issues**: Check `frontend/README.md`
- **General Setup**: See `backend/SETUP.md`
- **New Features**: Review `backend/ENHANCEMENTS.md`

---

## 📄 License

This project is part of the University Library System initiative.

---

**Status**: Production Ready ✅  
**Last Updated**: May 10, 2026  
**Version**: 2.0 (Enhanced)
