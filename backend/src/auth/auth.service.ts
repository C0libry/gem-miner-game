import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DRIZZLE_PROVIDER_TOKEN } from '@/db/drizzle.provider';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_PROVIDER_TOKEN)
    private db: BetterSQLite3Database<typeof schema>,
  ) {}

  async createSession(): Promise<{ userId: string; userSecret: string }> {
    const userId = randomUUID();
    const userSecret = randomUUID();

    await this.db.insert(schema.users).values({
      id: userId,
      secret: userSecret,
    });

    return { userId, userSecret };
  }

  async authenticate(userId: string, userSecret: string): Promise<boolean> {
    if (!userId || !userSecret) {
      return false;
    }

    const user = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    if (user.length === 0) {
      return false;
    }

    return user[0].secret === userSecret;
  }
}
