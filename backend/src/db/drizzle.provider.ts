import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database = require('better-sqlite3');
import * as schema from './schema';
import { ConfigService } from '@nestjs/config';

export const DRIZZLE_PROVIDER_TOKEN = 'DRIZZLE_PROVIDER';

export const drizzleProvider = [
  {
    provide: DRIZZLE_PROVIDER_TOKEN,
    useFactory: () => {
      const configService = new ConfigService();
      const fileName = configService.get<string>('DB_FILE_NAME');
      const sqlite = new Database(fileName);
      return drizzle(sqlite, { schema });
    },
  },
];
