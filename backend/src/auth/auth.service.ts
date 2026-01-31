import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  private userSecrets: Map<string, string> = new Map();

  authenticate(userId: string, userSecret: string): boolean {
    if (!userId || !userSecret) {
      return false;
    }

    if (this.userSecrets.has(userId)) {
      return this.userSecrets.get(userId) === userSecret;
    } else {
      this.userSecrets.set(userId, userSecret);
      return true;
    }
  }
}
