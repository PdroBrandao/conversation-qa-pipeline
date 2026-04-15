import { Module } from '@nestjs/common';
import { QaModule } from './qa/qa.module';

@Module({
  imports: [QaModule],
})
export class AppModule {}
