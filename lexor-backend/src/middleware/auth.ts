import { FastifyRequest, FastifyReply } from 'fastify';
import { jwtService, JwtPayload } from '@/services/auth/jwt';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

export async function authenticateToken(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Access token required',
      });
    }

    const payload = jwtService.verify(token);
    request.user = payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token verification failed';
    return reply.status(401).send({
      error: 'Unauthorized',
      message,
    });
  }
}

export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const payload = jwtService.verify(token);
      request.user = payload;
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
}