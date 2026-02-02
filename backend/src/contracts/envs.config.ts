import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z
    .preprocess(
      (a) => parseInt(a as string, 10),
      z.number().positive().min(80).max(65535),
    )
    .default(3000),
  DB_FILE_NAME: z.string().nonempty(),
});
