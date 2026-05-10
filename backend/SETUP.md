# Setup Instructions for ULITMS Backend

## Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v10 or higher)
- npm

## Installation Steps

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Setup PostgreSQL Database

#### Create Database
```bash
createdb ulitms_db
```

#### Create Tables
```bash
psql -U postgres -d ulitms_db -f database/schema.sql
```

Or manually run the SQL queries in `database/schema.sql` in your PostgreSQL client.

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update values:
```bash
cp .env.example .env
```

Edit `.env` file with your database credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ulitms_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password

PORT=5000
NODE_ENV=development

JWT_SECRET=your_secret_key_here_make_it_long_and_random

CORS_ORIGIN=http://localhost:3000
```

### 4. Start the Server

**Development Mode (with auto-reload)**
```bash
npm run dev
```

**Production Mode**
```bash
npm start
```

The server will run on: `http://localhost:5000`

### 5. Test Database Connection
Visit: `http://localhost:5000/api/health`

You should see:
```json
{
  "message": "✅ Server is healthy",
  "database": "Connected",
  "timestamp": "2024-05-05T10:30:00.000Z"
}
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Books
- `GET /api/books` - Get all books
- `GET /api/books/:id` - Get book by ID
- `POST /api/books` - Create book (Admin)
- `PUT /api/books/:id` - Update book (Admin)
- `DELETE /api/books/:id` - Delete book (Admin)
- `GET /api/books/search/query?query=search_term` - Search books

### Borrowings
- `GET /api/borrowings/user/:userId` - Get user's borrowings
- `GET /api/borrowings` - Get all borrowings (Admin)
- `POST /api/borrowings` - Borrow a book
- `PUT /api/borrowings/:id/return` - Return a book
- `GET /api/borrowings/overdue/list` - Get overdue books

### Users
- `GET /api/users` - Get all users (Admin)
- `GET /api/users/profile/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `PUT /api/users/:id/password` - Change password
- `DELETE /api/users/:id` - Delete user (Admin)

## Example API Requests

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "2024-12345",
    "email": "student@example.com",
    "password": "password123",
    "fullname": "John Doe",
    "course": "BS Information Technology",
    "year_level": "3rd Year",
    "contact_number": "09123456789"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "password123"
  }'
```

### Get All Books
```bash
curl -X GET http://localhost:5000/api/books
```

### Borrow a Book
```bash
curl -X POST http://localhost:5000/api/borrowings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "user_id": 1,
    "book_id": 1,
    "due_date": "2024-06-05"
  }'
```

## Troubleshooting

### Database Connection Error
- Check if PostgreSQL is running
- Verify credentials in .env file
- Ensure database exists

### Port Already in Use
- Change PORT in .env file
- Or kill the process using the port

### JWT Errors
- Make sure JWT_SECRET is set in .env
- Check if token is expired

## Database Schema

### Users Table
- Stores user account information
- Supports both students and admins

### Books Table
- Stores book information
- Tracks available quantity

### Borrowings Table
- Records book borrowing transactions
- Tracks due dates and return status

### Library Sessions Table
- Tracks PC/e-library usage sessions
- Records time in/out and duration

## Next Steps

1. Connect frontend to these API endpoints
2. Update API URLs in frontend JavaScript files
3. Handle JWT tokens in frontend
4. Implement error handling and validation
