import { Observable, throwError } from 'rxjs';
import { ajax, AjaxError } from 'rxjs/ajax';
import { catchError, map } from 'rxjs/operators';
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
   * 1. Выполняет GET-запрос к endpoint `/messages/unread` с помощью rxjs/ajax
   * 2. Автоматически парсит JSON-ответ
   * 3. Извлекает массив сообщений из ответа
   * 4. Обрабатывает ошибки (включая сетевые и HTTP-ошибки)
   *
   * @example
   * const service = new MessageService();
   * service.getUnreadMessages().subscribe({
   *   next: (messages) => console.log('Непрочитанные сообщения:', messages),
   *   error: (err) => console.error('Ошибка получения сообщений:', err)
   * });
   */
  getUnreadMessages(): Observable<IMessage[]> {
    return ajax
      .getJSON<IUnreadMessagesResponse>(this._apiMethods.messages.unread)
      .pipe(
        map((response) => response.messages),
        catchError((error: AjaxError) => {
          // Формируем понятное сообщение об ошибке
          const errorMessage = error.status
            ? `HTTP ${error.status}: ${error.response}`
            : 'Network or server error occurred';

          return throwError(() => new Error(errorMessage));
        })
      );
  }
}
