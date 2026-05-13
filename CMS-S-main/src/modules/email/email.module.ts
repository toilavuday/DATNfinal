import { Module } from '@nestjs/common';
import { MailService } from './email.service';

@Module({
  providers: [MailService],
})
export class EmailModule {}
