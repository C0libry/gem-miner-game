import { CreateGameScheme } from '@/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateGameDto extends createZodDto(CreateGameScheme) {}
