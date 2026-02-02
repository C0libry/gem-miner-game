import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateGameDto } from './dto/create-game.dto';
import { GamesManager } from './games-manager';

@Controller('game')
export class GameController {
  constructor(private gamesManager: GamesManager) {}

  @Post()
  async startGame(@Body() dto: CreateGameDto) {
    return await this.gamesManager.createNewGame(dto);
  }

  @Get('/find')
  async findGame() {
    const waitingGameId = await this.gamesManager.findWaitingGame();
    if (waitingGameId) {
      return waitingGameId;
    }

    const min = 5;
    const max = 10;

    const value = Math.floor(Math.random() * (max - min + 1)) + min;

    const defaultGameDto: CreateGameDto = {
      height: value,
      width: value,
      gemQuantity: value % 2 === 0 ? value + 1 : value,
      isPublic: true,
    };
    return await this.gamesManager.createNewGame(defaultGameDto);
  }
}
