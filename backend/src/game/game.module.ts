import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameController } from './game.controller';
import { GamesManager } from './entities/game.entity';

@Module({
  controllers: [GameController],
  providers: [GameGateway, GamesManager],
})
export class GameModule {}
