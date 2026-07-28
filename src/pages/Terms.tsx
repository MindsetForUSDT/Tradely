export function Terms() {
  return (
    <div className="legal-page min-h-screen pt-24 pb-16 px-4 bg-bg-default">
      <div className="legal-document max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Условия использования</h1>

        <div className="legal-content prose prose-invert max-w-none">
          <p className="text-text-secondary mb-6">
            Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">1. Общие положения</h2>
            <div className="space-y-3 text-text-secondary">
              <p>
                1.1. Настоящие Условия использования регулируют отношения между сервисом
                TradeumDiary (далее «Сервис») и пользователем.
              </p>
              <p>
                1.2. Пользователь, регистрируясь на Сервисе, подтверждает своё согласие с настоящими
                Условиями.
              </p>
              <p>
                1.3. Сервис предоставляет возможности для ведения торгового журнала, аналитики
                сделок и управления портфелем криптовалютных активов.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              2. Регистрация и аккаунт
            </h2>
            <div className="space-y-3 text-text-secondary">
              <p>
                2.1. Пользователь обязан предоставлять точную и актуальную информацию при
                регистрации.
              </p>
              <p>2.2. Пользователь несёт ответственность за сохранность своих учётных данных.</p>
              <p>
                2.3. Сервис оставляет за собой право отказать в регистрации или заблокировать
                аккаунт при нарушении Условий.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              3. Использование Сервиса
            </h2>
            <div className="space-y-3 text-text-secondary">
              <p>3.1. Пользователь обязуется не использовать Сервис в незаконных целях.</p>
              <p>3.2. Запрещается:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Предоставление ложной информации</li>
                <li>Попытки несанкционированного доступа к данным других пользователей</li>
                <li>Использование Сервиса для мошеннических действий</li>
                <li>Распространение вредоносного кода</li>
              </ul>
              <p>
                3.3. Пользователь несёт полную ответственность за действия, совершённые под его
                аккаунтом.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              4. Работа с криптокошельками
            </h2>
            <div className="space-y-3 text-text-secondary">
              <p>4.1. Сервис работает исключительно с публичными данными блокчейна.</p>
              <p>
                4.2. Сервис не хранит приватные ключи и не имеет доступа к средствам пользователя.
              </p>
              <p>4.3. Пользователь самостоятельно отвечает за безопасность своих кошельков.</p>
              <p>
                4.4. Сервис не предоставляет финансовые консультации и не гарантирует прибыльность
                торговых стратегий.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              5. Интеллектуальная собственность
            </h2>
            <div className="space-y-3 text-text-secondary">
              <p>5.1. Все материалы Сервиса защищены законодательством РФ об авторском праве.</p>
              <p>5.2. Копирование и распространение материалов без разрешения запрещено.</p>
              <p>5.3. Данные пользователя остаются его собственностью.</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              6. Ограничение ответственности
            </h2>
            <div className="space-y-3 text-text-secondary">
              <p>6.1. Сервис предоставляется «как есть» без гарантий любого рода.</p>
              <p>
                6.2. Сервис не несёт ответственности за косвенные убытки, включая потерю прибыли.
              </p>
              <p>6.3. Оператор не гарантирует бесперебойную работу Сервиса.</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">7. Персональные данные</h2>
            <div className="space-y-3 text-text-secondary">
              <p>
                7.1. Обработка персональных данных осуществляется в соответствии с Политикой
                конфиденциальности.
              </p>
              <p>7.2. Пользователь даёт согласие на обработку своих персональных данных.</p>
              <p>
                7.3. Пользователь может отозвать согласие в любое время, обратившись к оператору.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              8. Заключительные положения
            </h2>
            <div className="space-y-3 text-text-secondary">
              <p>8.1. Оператор оставляет за собой право вносить изменения в настоящие Условия.</p>
              <p>8.2. Новая версия Условий вступает в силу с момента её размещения.</p>
              <p>
                8.3. Все споры разрешаются в соответствии с законодательством Российской Федерации.
              </p>
              <p>
                8.4. Недействительность одного из положений не влияет на действительность остальных.
              </p>
            </div>
          </section>

          <section className="mb-8 p-6 bg-surface-default rounded-lg border border-surface-border">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Контакты оператора</h3>
            <div className="space-y-2 text-text-secondary">
              <p>
                <strong>Наименование:</strong> TradeumDiary
              </p>
              <p>
                <strong>Страна:</strong> Российская Федерация
              </p>
              <p>
                <strong>Email:</strong>{' '}
                <a
                  href="mailto:support@tradeumdiary.com"
                  className="text-accent-indigo hover:underline"
                >
                  support@tradeumdiary.com
                </a>
              </p>
              <p>
                <strong>Регистрация:</strong> ИП / Самозанятый (указать при регистрации)
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
