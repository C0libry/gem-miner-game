import { EnvSchema } from '@/contracts';

export function validate(config: Record<string, unknown>) {
  try {
    return EnvSchema.parse(config);
  } catch (error) {
    console.error('Environment variable validation failed:', error);
    throw new Error('Environment variable validation failed');
  }
}
