# Lexor Backend API

Backend service for the Lexor language learning application, providing RESTful APIs for mobile and desktop clients.

## Features

- **Authentication**: JWT-based user authentication and authorization
- **Document Management**: Upload, store, and manage ebooks (EPUB, PDF) and markdown files
- **Flashcard System**: AI-powered flashcard generation and spaced repetition
- **Progress Tracking**: Reading sessions and learning analytics
- **Sync Support**: Cross-device data synchronization
- **File Storage**: Local and S3-compatible storage options
- **AI Integration**: OpenAI integration for vocabulary and content analysis

## Tech Stack

- **Framework**: Fastify with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT tokens
- **File Storage**: Local filesystem or AWS S3
- **AI**: OpenAI API
- **Caching**: Redis (optional)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd lexor-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start development services:
```bash
npm run docker:dev
```

5. Run database migrations:
```bash
npm run db:generate
npm run db:migrate
```

6. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Documents

- `GET /api/documents` - List user documents
- `POST /api/documents` - Upload new document
- `GET /api/documents/:id` - Get document details
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document

### Flashcards

- `GET /api/flashcards` - List flashcards
- `POST /api/flashcards` - Create flashcard
- `GET /api/flashcards/due` - Get due flashcards
- `POST /api/flashcards/:id/review` - Record review

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Run migrations

### Database Management

Generate new migration:
```bash
npm run db:generate
```

Run migrations:
```bash
npm run db:migrate
```

### Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Deployment

### Docker

Build and run with Docker:
```bash
docker build -t lexor-backend .
docker run -p 3000:3000 lexor-backend
```

### Environment Variables

Key environment variables for production:

- `NODE_ENV=production`
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Strong JWT secret key
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `AWS_*` - AWS credentials for S3 storage

## Architecture

The backend follows a clean architecture pattern:

- **Routes**: HTTP endpoint definitions
- **Services**: Business logic and external integrations
- **Models**: Database schema and validation
- **Middleware**: Authentication, validation, and request processing
- **Utils**: Shared utilities and configuration

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Input validation with Zod
- Rate limiting
- CORS protection
- Security headers with Helmet

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request