import { z } from 'zod';

export const CreateGameScheme = z
  .object({
    height: z.number().int().min(1).max(6),
    width: z.number().int().min(1).max(6),
    gemQuantity: z
      .number()
      .int()
      .min(1)
      .refine((value) => value % 2 !== 0, {
        message: 'Gem quantity number must be odd.',
      }),
  })
  .refine((data) => data.gemQuantity < data.height * data.width, {
    message: 'Gems quantity must be less than height * width',
    path: ['gemQuantity'],
  });

export type CreateGame = z.infer<typeof CreateGameScheme>;
