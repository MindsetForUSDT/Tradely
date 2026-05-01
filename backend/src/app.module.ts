import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';      // Работа с .env
import { AuthModule } from './auth/auth.module';      // Вход/регистрация
import { PrismaModule } from './prisma/prisma.module'; // База данных
import { TradesModule } from './trades/trades.module'; // Сделки CRUD
import { TagsModule } from './tags/tags.module';       // Теги
import { ExportModule } from './export/export.module'; // Экспорт CSV
import { AnalyticsModule } from './analytics/analytics.module'; // Pro-аналитика
import { TaxModule } from './tax/tax.module';          // Налоги РФ

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),  // Доступ к .env везде
    PrismaModule,   // Подключение к PostgreSQL
    AuthModule,     // JWT аутентификация
    TradesModule,   // API для сделок
    TagsModule,     // API для тегов
    ExportModule,   // API для экспорта
    AnalyticsModule, // Kelly, Sharpe, Drawdown
    TaxModule,      // Налоговые отчёты
  ],
})
export class AppModule {}