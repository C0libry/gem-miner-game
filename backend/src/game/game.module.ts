import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameController } from './game.controller';
import { GamesManager } from './entities/game.entity';
import { AuthModule } from '@/auth/auth.module';
import { DrizzleModule } from '@/db/drizzle.module';

@Module({
  imports: [AuthModule, DrizzleModule],
  controllers: [GameController],
  providers: [GameGateway, GamesManager],
})
export class GameModule {}
