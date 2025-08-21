import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '@/services/database/client';
import { users, loginSchema, registerSchema, User } from '@/models/user';
import { jwtService } from '@/services/auth/jwt';
import { passwordService } from '@/services/auth/password';
import { validateBody } from '@/middleware/validation';
import { authenticateToken } from '@/middleware/auth';

export async function authRoutes(fastify: FastifyInstance) {
  // Register new user
  fastify.post('/register', {
    preHandler: validateBody(registerSchema),
  }, async (request, reply) => {
    const { email, password, name, languagePreference } = request.body as any;

    try {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'User with this email already exists',
        });
      }

      // Validate password strength
      const passwordValidation = passwordService.validate(password);
      if (!passwordValidation.valid) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Password does not meet requirements',
          details: passwordValidation.errors,
        });
      }

      // Hash password and create user
      const passwordHash = await passwordService.hash(password);
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          passwordHash,
          name,
          languagePreference,
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          languagePreference: users.languagePreference,
          createdAt: users.createdAt,
        });

      // Generate tokens
      const tokens = jwtService.generateTokens({
        userId: newUser.id,
        email: newUser.email,
      });

      reply.status(201).send({
        user: newUser,
        ...tokens,
      });
    } catch (error) {
      fastify.log.error('Registration error:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create user account',
      });
    }
  });

  // Login user
  fastify.post('/login', {
    preHandler: validateBody(loginSchema),
  }, async (request, reply) => {
    const { email, password } = request.body as any;

    try {
      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      // Verify password
      const isValidPassword = await passwordService.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      // Update last login
      await db
        .update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, user.id));

      // Generate tokens
      const tokens = jwtService.generateTokens({
        userId: user.id,
        email: user.email,
      });

      reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          languagePreference: user.languagePreference,
          createdAt: user.createdAt,
        },
        ...tokens,
      });
    } catch (error) {
      fastify.log.error('Login error:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Login failed',
      });
    }
  });

  // Refresh token
  fastify.post('/refresh', async (request, reply) => {
    try {
      const { refreshToken } = request.body as any;

      if (!refreshToken) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Refresh token required',
        });
      }

      const payload = jwtService.verify(refreshToken);
      
      // Verify user still exists
      const [user] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'User not found',
        });
      }

      // Generate new tokens
      const tokens = jwtService.generateTokens({
        userId: user.id,
        email: user.email,
      });

      reply.send(tokens);
    } catch (error) {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid refresh token',
      });
    }
  });

  // Get current user info
  fastify.get('/me', {
    preHandler: authenticateToken,
  }, async (request, reply) => {
    try {
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          languagePreference: users.languagePreference,
          createdAt: users.createdAt,
          lastLogin: users.lastLogin,
        })
        .from(users)
        .where(eq(users.id, request.user!.userId))
        .limit(1);

      if (!user) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      reply.send({ user });
    } catch (error) {
      fastify.log.error('Get user error:', error);
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch user information',
      });
    }
  });

  // Logout (client-side token invalidation)
  fastify.post('/logout', {
    preHandler: authenticateToken,
  }, async (request, reply) => {
    reply.send({
      message: 'Logged out successfully',
    });
  });
}