import { Observable } from 'rxjs/internal/Observable';

/**
 * Создает Observable для работы с Server-Sent Events (SSE)
 *
 * @param {string} url - URL endpoint для SSE
 * @param {string} event - Имя события, на которое нужно подписаться
 * (по умолчанию 'unread_update')
 *
 * @returns {Observable<Event>} - Наблюдаемый поток событий
 *
 * @description
 * 1. Устанавливает соединение с сервером через EventSource
 * 2. Подписывается на указанное событие
 * 3. Эмитирует события в Observable
 * 4. Обрабатывает ошибки соединения
 * 5. Закрывает соединение при отписке
 *
 * @example
 * import { createSseObservable } from './sse';
 *
 * const sse$ = createSseObservable('https://api.example.com/sse');
 *
 * sse$.subscribe({
 *   next: (event) => console.log('Получено событие:', event),
 *   error: (err) => console.error('Ошибка SSE:', err),
 *   complete: () => console.log('Соединение закрыто')
 * });
 *
 * @see https://developer.mozilla.org/ru/docs/Web/API/EventSource - Документация по EventSource
 * @see https://rxjs.dev/guide/observable - Документация RxJS Observable
 */
export const createSseObservable = (
  url: string,
  event: string = 'unread_update'
): Observable<Event> => {
  return new Observable((observer) => {
    const eventSource = new EventSource(url);

    eventSource.addEventListener(event, (e: MessageEvent) => {
      observer.next(e);
    });

    eventSource.onerror = (): void => {
      console.warn('SSE connection error');
    };

    return () => eventSource.close();
  });
};
