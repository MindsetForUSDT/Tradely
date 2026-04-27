
## Деплой

```bash
# Линковка проекта
supabase link --project-ref YOUR_PROJECT_ID

# Деплой отдельных функций
supabase functions deploy payment-webhook
supabase functions deploy fetch-trade-history

# Деплой всех функций
supabase functions deploy

# Просмотр логов
supabase functions logs payment-webhook