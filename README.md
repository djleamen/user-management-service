# User Management Service

A robust and scalable User Management Service built with Node.js, Express, and MongoDB for a personalized online learning platform. This microservice handles user authentication, authorization, and profile management with enterprise-grade security features.

## Features

- **User Authentication**: Secure registration and login using JWT tokens
- **Role-Based Access Control (RBAC)**: Support for multiple user roles (student, instructor, admin)
- **Profile Management**: Complete user profile CRUD operations
- **Token Management**: Access and refresh token mechanism
- **Security**: Password hashing with bcrypt, rate limiting, helmet protection, NoSQL injection prevention
- **Scalable Architecture**: Follows microservices best practices
- **Comprehensive Logging**: Winston-based logging for monitoring and debugging
- **Error Handling**: Centralized error handling with consistent error responses
- **Input Validation**: MongoDB schema validation and sanitization

## Prerequisites

Before running this service, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **MongoDB** (v5.0 or higher)
- **npm** (v9.0.0 or higher)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd user-management-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory (use `.env` as template) and configure the following:
   
   ```env
   NODE_ENV=development
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/learning-platform
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRATION=24h
   JWT_REFRESH_EXPIRATION=7d
   BCRYPT_SALT_ROUNDS=12
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   CORS_ORIGIN=*
   LOG_LEVEL=info
   ```

4. **Start MongoDB**
   
   Make sure MongoDB is running on your system:
   ```bash
   # macOS (using homebrew)
   brew services start mongodb-community
   
   # Linux (systemd)
   sudo systemctl start mongod
   
   # Or run directly
   mongod
   ```

## Running the Service

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The service will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Endpoints

### Public Routes

#### Register User
```http
POST /api/users/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student"
}
```

#### Login
```http
POST /api/users/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### Refresh Token
```http
POST /api/users/refresh-token
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### Protected Routes (Require Authentication)

Include the access token in the Authorization header:
```
Authorization: Bearer <access-token>
```

#### Get Profile
```http
GET /api/users/profile
```

#### Update Profile
```http
PUT /api/users/profile
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Software developer"
}
```

#### Change Password
```http
PUT /api/users/change-password
Content-Type: application/json

{
  "currentPassword": "OldPass123",
  "newPassword": "NewPass123"
}
```

#### Logout
```http
POST /api/users/logout
```

#### Delete Account
```http
DELETE /api/users/profile
```

### Admin Routes

#### Get All Users
```http
GET /api/users?page=1&limit=10&role=student&isActive=true
```

#### Get User By ID
```http
GET /api/users/:id
```

## Project Structure

```
user-management-service/
│
├── src/
│   ├── config/
│   │   ├── db.js                # Database connection
│   │   ├── server.js            # Server configuration
│   │   └── jwt.js               # JWT utilities
│   │
│   ├── controllers/
│   │   └── userController.js    # Request handlers
│   │
│   ├── middlewares/
│   │   ├── authMiddleware.js    # Authentication & authorization
│   │   └── errorHandler.js      # Error handling
│   │
│   ├── models/
│   │   └── userModel.js         # User schema
│   │
│   ├── routes/
│   │   └── userRoutes.js        # API routes
│   │
│   ├── services/
│   │   └── userService.js       # Business logic
│   │
│   ├── utils/
│   │   ├── logger.js            # Logging utility
│   │   └── responseFormatter.js # Response formatting
│   │
│   └── app.js                   # Express app setup
│
├── tests/                       # Test files
├── .env                         # Environment variables
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies
└── README.md                    # Documentation
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test
```

## Security Features

- **Password Hashing**: Bcrypt with configurable salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevents brute-force attacks
- **Helmet**: Sets various HTTP headers for security
- **CORS**: Configurable cross-origin resource sharing
- **NoSQL Injection Prevention**: Input sanitization
- **Data Validation**: Mongoose schema validation

## Best Practices Implemented

1. **Separation of Concerns**: Clear separation between routes, controllers, services, and models
2. **Error Handling**: Centralized error handling with consistent error responses
3. **Logging**: Comprehensive logging for debugging and monitoring
4. **Security**: Multiple security layers and best practices
5. **Scalability**: Modular architecture ready for microservices deployment
6. **Code Quality**: Clean, maintainable, and well-documented code
7. **Environment Configuration**: Externalized configuration via environment variables

## Configuration

Key configuration options in `.env`:

- `NODE_ENV`: Application environment (development/production)
- `PORT`: Server port
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT signing (change in production!)
- `JWT_EXPIRATION`: Access token expiration time
- `JWT_REFRESH_EXPIRATION`: Refresh token expiration time
- `BCRYPT_SALT_ROUNDS`: Number of salt rounds for password hashing
- `RATE_LIMIT_WINDOW_MS`: Rate limiting time window
- `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per window
- `CORS_ORIGIN`: Allowed CORS origins
- `LOG_LEVEL`: Logging level (debug/info/warn/error)

## Deployment

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t user-management-service .
docker run -p 3000:3000 --env-file .env user-management-service
```

### Environment Variables for Production

Ensure you set proper production values:
- Use a strong `JWT_SECRET`
- Set `NODE_ENV=production`
- Configure proper `CORS_ORIGIN`
- Use production MongoDB URI
- Adjust rate limiting based on expected traffic

## Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [JWT Best Practices](https://jwt.io/introduction)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.

---

**Note**: This service is part of a larger microservices architecture for a learning platform. Ensure proper integration with other services like Course Management, Recommendation Service, and Interactive Coding Exercises Service.
