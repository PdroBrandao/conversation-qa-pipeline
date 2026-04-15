import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { QaService, ConversationInput } from './qa.service';

@Controller('qa')
export class QaController {
  constructor(private readonly qaService: QaService) {}

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  async evaluate(@Body() body: ConversationInput) {
    if (!body?.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      throw new BadRequestException(
        'Field "messages" is required and must be a non-empty array of strings.',
      );
    }

    if (body.messages.some((m) => typeof m !== 'string' || m.trim() === '')) {
      throw new BadRequestException(
        'All items in "messages" must be non-empty strings.',
      );
    }

    return this.qaService.evaluate(body);
  }
}
