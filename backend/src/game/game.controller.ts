import { Body, Controller, Post } from '@nestjs/common';
import { CreateGameDto } from './dto/create-game.dto';
import { GamesManager } from './entities/game.entity';

@Controller('game')
export class GameController {
  constructor(private gamesManager: GamesManager) {}

  @Post()
  startGame(@Body() dto: CreateGameDto) {
    return this.gamesManager.createNewGame(dto);
  }
}
