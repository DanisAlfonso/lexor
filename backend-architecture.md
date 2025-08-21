# Lexor Backend Architecture Design

## Project Structure
```
lexor-backend/
├── src/
│   ├── routes/
│   │   ├── auth.ts              # Authentication endpoints
│   │   ├── users.ts             # User management
│   │   ├── documents.ts         # Document CRUD & file upload
│   │   ├── flashcards.ts        # Flashcard management
│   │   ├── annotations.ts       # Bookmarks, highlights, notes
│   │   ├── progress.ts          # Reading sessions & progress
│   │   ├── sync.ts              # Data synchronization
│   │   └── ai.ts                # AI-powered features
│   ├── services/
│   │   ├── auth/
│   │   │   ├── jwt.ts           # JWT token management
│   │   │   └── password.ts      # Password hashing
│   │   ├── database/
│   │   │   ├── client.ts        # PostgreSQL connection
│   │   │   └── migrations.ts    # Database migrations
│   │   ├── storage/
│   │   │   ├── s3.ts            # File storage (S3/MinIO)
│   │   │   └── local.ts         # Local file storage
│   │   ├── ai/
│   │   │   ├── openai.ts        # OpenAI integration
│   │   │   └── flashcard-generator.ts
│   │   └── sync/
│   │       ├── conflict-resolver.ts
│   │       └── sync-manager.ts
│   ├── middleware/
│   │   ├── auth.ts              # Authentication middleware
│   │   ├── cors.ts              # CORS configuration
│   │   ├── validation.ts        # Request validation
│   │   └── rate-limit.ts        # Rate limiting
│   ├── models/
│   │   ├── user.ts              # User model
│   │   ├── document.ts          # Document model
│   │   ├── flashcard.ts         # Flashcard model
│   │   └── index.ts             # Schema exports
│   ├── utils/
│   │   ├── config.ts            # Configuration management
│   │   ├── logger.ts            # Logging utilities
│   │   └── validation.ts        # Validation schemas
│   └── app.ts                   # Express app setup
├── database/
│   ├── migrations/              # SQL migration files
│   └── seeds/                   # Database seeds
├── uploads/                     # Local file storage (dev)
├── tests/
├── package.json
├── Dockerfile
└── docker-compose.yml
```

## Database Schema (PostgreSQL)

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  language_preference VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);
```

### Documents Table
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_type VARCHAR(10) CHECK (file_type IN ('epub', 'md', 'pdf')),
  file_size BIGINT,
  language VARCHAR(10),
  reading_progress DECIMAL(5,4) DEFAULT 0,
  total_pages INTEGER,
  current_page INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_opened TIMESTAMP,
  version INTEGER DEFAULT 1
);
```

### Flashcards Table
```sql
CREATE TABLE flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  front_text TEXT NOT NULL,
  back_text TEXT NOT NULL,
  context TEXT,
  source_location TEXT,
  difficulty INTEGER DEFAULT 0,
  next_review TIMESTAMP,
  review_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 1
);
```

### Reading Sessions Table
```sql
CREATE TABLE reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  pages_read INTEGER DEFAULT 0,
  words_learned INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 1
);
```

### Annotations Table
```sql
CREATE TABLE annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  type VARCHAR(20) CHECK (type IN ('bookmark', 'highlight', 'note')),
  content TEXT,
  location TEXT NOT NULL,
  color VARCHAR(7),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 1
);
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout (invalidate token)
- `GET /api/auth/me` - Get current user info

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/account` - Delete user account

### Documents
- `GET /api/documents` - List user documents
- `POST /api/documents` - Upload new document
- `GET /api/documents/:id` - Get document details
- `PUT /api/documents/:id` - Update document metadata
- `DELETE /api/documents/:id` - Delete document
- `GET /api/documents/:id/download` - Download document file

### Flashcards
- `GET /api/flashcards` - List user flashcards
- `POST /api/flashcards` - Create flashcard
- `GET /api/flashcards/:id` - Get flashcard
- `PUT /api/flashcards/:id` - Update flashcard
- `DELETE /api/flashcards/:id` - Delete flashcard
- `GET /api/flashcards/due` - Get due flashcards for review
- `POST /api/flashcards/:id/review` - Record flashcard review

### Annotations
- `GET /api/annotations` - List annotations for document
- `POST /api/annotations` - Create annotation
- `PUT /api/annotations/:id` - Update annotation
- `DELETE /api/annotations/:id` - Delete annotation

### Progress
- `GET /api/progress/sessions` - Get reading sessions
- `POST /api/progress/sessions` - Start reading session
- `PUT /api/progress/sessions/:id` - Update/end session
- `GET /api/progress/stats` - Get learning statistics

### Sync
- `GET /api/sync/changes` - Get changes since timestamp
- `POST /api/sync/push` - Push local changes
- `POST /api/sync/resolve-conflict` - Resolve sync conflict

### AI
- `POST /api/ai/generate-flashcard` - Generate flashcard from text
- `POST /api/ai/explain-word` - Get word explanation
- `POST /api/ai/translate` - Translate text

## Technology Stack

### Backend Framework
- **Fastify** with TypeScript for high performance
- **Drizzle ORM** for type-safe database operations
- **PostgreSQL** for production database
- **Redis** for session storage and caching

### Authentication & Security
- **JWT** tokens for stateless authentication
- **bcrypt** for password hashing
- **helmet** for security headers
- **cors** for cross-origin requests
- **rate-limiting** for API protection

### File Storage
- **AWS S3** or **MinIO** for production
- **Local filesystem** for development
- **Multer** for file upload handling

### AI Integration
- **OpenAI API** for text processing
- **LangChain** for AI workflow orchestration

### Deployment
- **Docker** containers
- **Docker Compose** for local development
- **Railway/Render** for production hosting

## Sync Strategy

### Conflict Resolution
1. **Last Write Wins** - Simple timestamp-based resolution
2. **Version Vectors** - Track version history per device
3. **Manual Resolution** - Flag conflicts for user review

### Sync Flow
1. Client requests changes since last sync timestamp
2. Server returns modified records with version numbers
3. Client applies changes and resolves conflicts
4. Client pushes local changes to server
5. Server validates and applies changes

## Security Considerations

### Data Protection
- All endpoints require authentication except login/register
- User data isolation - users can only access their own data
- File access through signed URLs with expiration
- Input validation and sanitization

### Rate Limiting
- Auth endpoints: 5 requests/minute
- File upload: 10 files/hour
- AI endpoints: 100 requests/hour
- Sync endpoints: 1000 requests/hour

## Performance Optimizations

### Database
- Indexes on frequently queried columns
- Connection pooling
- Query optimization
- Database read replicas for scaling

### Caching
- Redis for session storage
- CDN for static file delivery
- In-memory caching for frequently accessed data

### File Handling
- Streaming uploads for large files
- Background processing for file analysis
- Compression for text files