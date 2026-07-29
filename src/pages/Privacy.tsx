export function Privacy() {
  return (
    <div className="legal-page min-h-screen pt-24 pb-16 px-4 bg-bg-default">
      <div className="legal-document max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Политика конфиденциальности</h1>

        <div className="legal-content prose prose-invert max-w-none">
          <p className="text-text-secondary mb-6">
            Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">1. Общие положения</h2>
            <div className="space-y-3 text-text-secondary">
              <p>
                1.1. Настоящая Политика конфиденциальности определяет порядок обработки и защиты
                персональных данных пользователей сервиса TradeumDiary (далее «Оператор»).
              </p>
              <p>
                1.2. Обработка персональных данных осуществляется в соответствии с Федеральным
                законом № 152-ФЗ «О персональных данных».
              </p>
              <p>
                1.3. Продолжая использовать Сервис, Пользователь соглашается с положениями настоящей
                Политики.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              2. Персональные данные, которые мы обрабатываем
            </h2>
            <div className="space-y-3 text-text-secondary">
              <p>
                2.1. При регистрации и использовании Сервиса мы обрабатываем следующие персональные
                данные:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Адрес электронной почты</li>
                <li>Пароль (в зашифрованном виде)</li>
                <li>Адреса криптокошельков (публичные)</li>
                <li>История торговых операций</li>
                <li>Настройки аккаунта и предпочтения</li>
              </ul>
              <p>2.2. Мы не собираем и не обрабатываем следующие категории данных:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Приватные ключи криптокошельков</li>
                <li>Пароли от бирж и кошельков</li>
                <li>Биометрические данные</li>
                <li>Специальные категории персональных данных</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              3. Цели обработки персональных данных
            </h2>
            <div className="space-y-3 text-text-secondary">
              <p>3.1. Обработка персональных данных осуществляется в следующих целях:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Предоставление доступа к функционалу Сервиса</li>
                <li>Аутентификация и авторизация Пользователя</li>
                <li>Импорт и анализ торговых операций</li>
                <li>Формирование аналитических отчётов</li>
                <li>Техническая поддержка и обслуживание</li>
                <li>Уведомления об изменениях в Сервисе</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              4. Правовые основания обработки
            </h2>
            <div className="space-y-3 text-text-secondary">
              <p>4.1. Обработка персональных данных осуществляется на основании:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Согласия Пользователя (ст. 6 ФЗ-152)</li>
                <li>Договора с Пользователем (Условия использования)</li>
                <li>Исполнения требований законодательства РФ</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              5. Способы обработки данных
            </h2>
            <div className="space-y-3 text-text-secondary">
              <p>5.1. Обработка персональных данных осуществляется следующими способами:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>С использованием средств автоматизации</li>
                <li>Без использования средств автоматизации</li>
              </ul>
              <p>
                5.2. Обработка включает: сбор, запись, хранение, уточнение, использование, передачу
                (в том числе трансграничную), обезличивание, блокирование, удаление, уничтожение.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              6. Передача персональных данных третьим лицам
            </h2>
            <div className="space-y-3 text-text-secondary">
              <p>
                6.1. Оператор может передавать персональные данные третьим лицам только в следующих
                случаях:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>С согласия Пользователя</li>
                <li>В целях исполнения законодательства РФ</li>
                <li>Поставщикам услуг (хостинг, базы данных) в рамках договора обработки</li>
              </ul>
              <p>
                6.2. Мы не продаём и не передаём персональные данные третьим лицам в коммерческих
                целях.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              7. Хранение и защита данных
            </h2>
            <div className="space-y-3 text-text-secondary">
              <p>
                7.1. Персональные данные хранятся в течение срока действия аккаунта и 3 года после
                его удаления в соответствии с законодательством РФ.
              </p>
              <p>
                7.2. Оператор принимает необходимые меры для защиты данных от несанкционированного
                доступа:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Шифрование данных при передаче (HTTPS)</li>
                <li>Хеширование паролей</li>
                <li>Регулярное обновление безопасности</li>
                <li>Ограничение доступа сотрудников к данным</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">8. Права Пользователя</h2>
            <div className="space-y-3 text-text-secondary">
              <p>8.1. Пользователь имеет право:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>На доступ к своим персональным данным</li>
                <li>На уточнение и обновление данных</li>
                <li>На блокирование или удаление данных</li>
                <li>На отзыв согласия на обработку</li>
                <li>На обжалование действий Оператора в Роскомнадзор</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              9. Изменения в Политике
            </h2>
            <div className="space-y-3 text-text-secondary">
              <p>9.1. Оператор оставляет за собой право вносить изменения в настоящую Политику.</p>
              <p>9.2. Новая версия вступает в силу с момента размещения на сайте.</p>
            </div>
          </section>

          <section className="mb-8 p-6 bg-surface-default rounded-lg border border-surface-border">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Контакты для связи</h3>
            <div className="space-y-2 text-text-secondary">
              <p>
                <strong>Наименование Оператора:</strong> TradeumDiary
              </p>
              <p>
                <strong>Страна:</strong> Российская Федерация
              </p>
              <p>
                <strong>Email:</strong>{' '}
                <a
                  href="mailto:privacy@tradeumdiary.com"
                  className="text-accent-indigo hover:underline"
                >
                  privacy@tradeumdiary.com
                </a>
              </p>
              <p>
                <strong>Для запросов о персональных данных:</strong>{' '}
                <a
                  href="mailto:data@tradeumdiary.com"
                  className="text-accent-indigo hover:underline"
                >
                  data@tradeumdiary.com
                </a>
              </p>
              <p className="text-sm mt-4">
                <strong>Роскомнадзор:</strong>
                <br />В случае нарушения прав на защиту персональных данных, Пользователь может
                обратиться в
                <a
                  href="https://rkn.gov.ru"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-indigo hover:underline ml-1"
                >
                  Роскомнадзор
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
