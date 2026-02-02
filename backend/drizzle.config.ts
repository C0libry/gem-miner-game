import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const fileName = process.env.DB_FILE_NAME!;

if (!fileName) {
  throw new Error('DB_FILE_NAME environment variable is not set');
}

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: `file:${fileName}`,
  },
});
