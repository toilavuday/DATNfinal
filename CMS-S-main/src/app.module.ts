import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaService } from './prisma/prisma.service';
import { UserController } from './modules/user/user.controller';
import { UserService } from './modules/user/user.service';
import { ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ProductModule } from './modules/product/product.module';
import { OrderService } from './modules/order/order.service';
import { OrderModule } from './modules/order/order.module';
import { FileUploadService } from './shared/utils/file-upload.service';
import { PaymentController } from './modules/payment/payment.controller';
import { PaymentModule } from './modules/payment/payment.module';
import { PaymentService } from './modules/payment/payment.service';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { ScheduleService } from './modules/schedule/schedule.service';
import { IncomeModule } from './modules/income/income.module';
import { IncomeService } from './modules/income/income.service';
import { EmailModule } from './modules/email/email.module';
import { MailService } from './modules/email/email.service';
import { SystemSettingService } from './modules/system-setting/system-setting.service';
import { SystemSettingController } from './modules/system-setting/system-setting.controller';
import { SystemSettingModule } from './modules/system-setting/system-setting.module';
import { StockModule } from './modules/stock/stock.module';
import { StockService } from './modules/stock/stock.service';
import { ProfitModule } from './modules/profit/profit.module';
@Module({
  imports: [
    UserModule,
    PrismaModule,
    AuthModule,
    ProductModule,
    OrderModule,
    PaymentModule,
    ScheduleModule,
    IncomeModule,
    EmailModule,
    SystemSettingModule,
    StockModule,
    ProfitModule,
  ],
  controllers: [
    AppController,
    UserController,
    PaymentController,
    SystemSettingController,
  ],
  providers: [
    AppService,
    PrismaService,
    PaymentService,
    UserService,
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    ScheduleService,
    IncomeService,
    OrderService,
    MailService,
    FileUploadService,
    SystemSettingService,
    StockService
  ],
})
export class AppModule {}
