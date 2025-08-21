import jwt from 'jsonwebtoken';
import { config } from '@/utils/config';

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export class JwtService {
  private secret: string;
  private expiresIn: string;

  constructor() {
    this.secret = config.auth.jwtSecret;
    this.expiresIn = config.auth.jwtExpiresIn;
  }

  sign(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
    });
  }

  verify(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.secret) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw new Error('Token verification failed');
    }
  }

  decode(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }

  generateTokens(payload: Omit<JwtPayload, 'iat' | 'exp'>) {
    const accessToken = this.sign(payload);
    
    // Generate refresh token with longer expiry
    const refreshToken = jwt.sign(payload, this.secret, {
      expiresIn: '30d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}

export const jwtService = new JwtService();