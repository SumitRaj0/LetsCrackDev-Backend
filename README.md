# DevHub Backend API

Production-ready Node.js backend API built with Express, TypeScript, Prisma, and PostgreSQL.

## Features

- ✅ TypeScript with strict mode
- ✅ Prisma ORM with PostgreSQL
- ✅ Auth0 JWT verification
- ✅ Centralized error handling
- ✅ Global response wrapper
- ✅ Rate limiting
- ✅ Security middleware (Helmet, CORS)
- ✅ Request logging
- ✅ Modular architecture
- ✅ Production-ready

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Mongoose
- **Database**: MongoDB Atlas
- **Authentication**: Auth0 JWT
- **AI**: Google Gemini API

## Getting Started

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up MongoDB

1. Create a MongoDB Atlas account (free tier available)
2. Create a cluster and database user
3. Get your connection string
4. See `MONGODB_SETUP.md` for detailed instructions

### 3. Configure Environment Variables

Create a `.env` file in the `backend` folder:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/devhub?retryWrites=true&w=majority

# Auth0 Configuration
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_AUDIENCE=your-api-audience
AUTH0_ISSUER=https://your-auth0-domain.auth0.com/

# Gemini AI Configuration
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash

# Server Configuration
NODE_ENV=development
PORT=3001
API_VERSION=v1
FRONTEND_URL=http://localhost:5173
```

Required variables:

- `DATABASE_URL` - PostgreSQL connection string
- `AUTH0_DOMAIN` - Your Auth0 domain
- `AUTH0_AUDIENCE` - Your Auth0 API audience
- `GEMINI_API_KEY` - Google Gemini API key (for chatbot)

### 4. Seed Database (Optional)

```bash
# Seed database with sample data
npm run seed
```

### 5. Run Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run prisma:seed` - Seed database with sample data
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript types

## API Endpoints

### Base URL

- Development: `http://localhost:3001/api/v1`
- Production: `https://your-domain.com/api/v1`

### Modules

#### Authentication (`/auth`)

- `POST /signup` - Register new user
- `POST /login` - Login user
- `POST /refresh-token` - Refresh access token
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token
- `GET /me` - Get current user profile
- `PUT /me` - Update current user profile
- `PATCH /me` - Update current user profile
- `DELETE /me` - Delete current user account

#### Users (`/user`)

- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `PATCH /profile` - Update user profile
- `PUT /change-password` - Change password
- `DELETE /account` - Delete account (soft delete)

#### Courses (`/courses`)

- `GET /` - Get all courses (with pagination, filters)
- `GET /:id` - Get course by ID
- `POST /` - Create course (Admin only)
- `PATCH /:id` - Update course (Admin only)
- `PUT /:id` - Update course (Admin only)
- `DELETE /:id` - Delete course (Admin only)
- `POST /:id/enroll` - Enroll in course (Authenticated)
- `PATCH /:id/progress` - Update course progress (Authenticated)

#### Resources (`/resources`)

- `GET /` - Get all resources (with pagination, filters)
- `GET /:id` - Get resource by ID
- `POST /` - Create resource (Admin only)
- `PATCH /:id` - Update resource (Admin only)
- `PUT /:id` - Update resource (Admin only)
- `DELETE /:id` - Delete resource (Admin only)
- `POST /:id/bookmark` - Bookmark/unbookmark resource (Authenticated)
- `GET /bookmarks/all` - Get all bookmarked resources (Authenticated)

#### Services (`/services`)

- `GET /` - Get all premium services (with pagination, filters)
- `GET /:idOrSlug` - Get service by ID or slug
- `POST /` - Create service (Admin only)
- `PATCH /:id` - Update service (Admin only)
- `PUT /:id` - Update service (Admin only)
- `DELETE /:id` - Delete service (Admin only)

#### Purchases (`/purchases`)

- `POST /checkout` - Create checkout session (Authenticated)
- `POST /verify` - Verify payment (Authenticated)
- `GET /status/:orderId` - Get purchase status by order ID (Authenticated)
- `GET /` - Get user's purchase history (Authenticated)
- `GET /:id` - Get purchase by ID (Authenticated)
- `POST /webhook` - Razorpay webhook endpoint (handled separately)

#### Chatbot (`/chatbot`)

- `POST /chat` - Send message to AI chatbot (Authenticated, rate limited)

#### Admin (`/admin`)

- `GET /analytics` - Get dashboard statistics (Admin only)
- `GET /analytics/monthly` - Get monthly statistics (Admin only)
- `GET /analytics/sales` - Get sales data (Admin only)
- `GET /analytics/users` - Get user statistics (Admin only)

## Authentication

All protected routes require an Auth0 JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Error message",
  "error": "Error details"
}
```

## Response Format

Successful responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Success message",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

## Database Schema

MongoDB collections and Mongoose models:

- **User** - User accounts with Auth0 integration
- **Course** - Course content with modules
- **Resource** - Learning resources and links
- **PremiumService** - Premium service offerings
- **Order** - User orders for premium services
- **ChatHistory** - AI chatbot conversation history

See `src/models/` for complete schema definitions.

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── db.ts          # MongoDB connection
│   ├── models/            # Mongoose schemas
│   │   ├── User.ts
│   │   ├── Course.ts
│   │   ├── Resource.ts
│   │   ├── PremiumService.ts
│   │   ├── Order.ts
│   │   └── ChatHistory.ts
│   ├── controllers/       # Route controllers
│   ├── services/          # Business logic layer
│   ├── routes/            # Express routes
│   ├── middleware/        # Express middleware
│   │   ├── auth.ts        # Auth0 JWT verification
│   │   ├── errorHandler.ts
│   │   └── rateLimiter.ts
│   ├── utils/             # Utilities (logger, errors, etc.)
│   ├── scripts/           # Utility scripts
│   │   └── seed.ts        # Database seed script
│   ├── types/             # TypeScript types
│   └── server.ts          # Main server file
├── .env.example           # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Run `npm run build`
3. Run `npm run prisma:migrate:prod` to apply migrations
4. Start with `npm run start`

## Security

- Helmet.js for security headers
- CORS configured
- Rate limiting enabled
- Input validation
- SQL injection protection (Prisma)
- JWT token verification
