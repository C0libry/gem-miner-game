import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  private userSecrets: Map<string, string> = new Map();

  createSession(): { userId: string; userSecret: string } {
    const userId = randomUUID();
    const userSecret = randomUUID();
    this.userSecrets.set(userId, userSecret);
    return { userId, userSecret };
  }

  authenticate(userId: string, userSecret: string): boolean {
    if (!userId || !userSecret) {
      return false;
    }

    // A user must exist in our map to be valid.
    if (!this.userSecrets.has(userId)) {
      return false;
    }

    return this.userSecrets.get(userId) === userSecret;
  }
}
