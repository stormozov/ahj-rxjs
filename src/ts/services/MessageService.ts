import { Observable, from } from 'rxjs';
import { IMessage, IUnreadMessagesResponse } from '../shared/interfaces';

/**
 * Класс MessageService реализует работу с API для получения непрочитанных сообщений
 *
 * @class
 * @description
 * 1. Использует переменную окружения `SERVER_URL` для формирования URL-адресов API
 * 2. Оборачивает HTTP-запросы в Observables RxJS для асинхронной работы
 * 3. Реализует обработку ошибок и преобразование данных
 *
 * @see IMessage - Интерфейс модели сообщения
 * @see IUnreadMessagesResponse - Интерфейс ответа сервера
 */
export class MessageService {
  /**
   * Базовый URL сервера, полученный из переменной окружения
   *
   * @private
   * @readonly
   */
  private readonly _apiUrl = process.env.SERVER_URL;

  /**
   * Конфигурация endpoints API
   *
   * @private
   * @readonly
   * @property {string} messages.unread - Путь к endpoint получения непрочитанных сообщений
   */
  private readonly _apiMethods = {
    messages: {
      unread: `${this._apiUrl}/messages/unread`,
    },
  };

  /**
   * Получает список непрочитанных сообщений
   *
   * @returns {Observable<IMessage[]>} Observable, эмитирующий массив сообщений
   * @throws {Error} При ошибке HTTP-запроса
   *
   * @description
   * 1. Выполняет GET-запрос к endpoint `/messages/unread`
   * 2. Обрабатывает ответ:
   *    - Проверяет статус HTTP-ответа
   *    - Парсит JSON-данные
   *    - Извлекает массив сообщений из ответа
   * 3. Оборачивает Promise в Observable
   * 4. Реализует обработку ошибок через оператор catchError
   *
   * @example
   * const service = new MessageService();
   * service.getUnreadMessages().subscribe({
   *   next: (messages) => console.log('Непрочитанные сообщения:', messages),
   *   error: (err) => console.error('Ошибка получения сообщений:', err)
   * });
   */
  getUnreadMessages(): Observable<IMessage[]> {
    const promise = fetch(this._apiMethods.messages.unread)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json() as Promise<IUnreadMessagesResponse>;
      })
      .then((data) => data.messages)
      .catch((error) => {
        throw new Error(error);
      });

    return from(promise);
  }
}
