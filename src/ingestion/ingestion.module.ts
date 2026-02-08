import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';

@Module({
  imports: [DatabaseModule],
  controllers: [IngestionController],
  providers: [IngestionService],
})
export class IngestionModule {}
