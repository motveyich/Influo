import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlacklistController } from './blacklist.controller';
import { BlacklistService } from './blacklist.service';
import { Blacklist, UserProfile } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Blacklist, UserProfile])],
  controllers: [BlacklistController],
  providers: [BlacklistService],
  exports: [BlacklistService],
})
export class BlacklistModule {}
