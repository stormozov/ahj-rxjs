import {
  catchError,
  interval,
  merge,
  of,
  startWith,
  Subscription,
  switchMap,
} from 'rxjs';
import { IMessage } from '../../shared/interfaces';
import createElement from '../../utils/createElementFunction';
import { formatTimestamp, truncateText } from '../../utils/formatters';
import { createSseObservable } from '../../utils/sseObservable';
import { MessageService } from './../../services/MessageService';
import './UnreadMessages.scss';

/**
 * Класс UnreadMessages представляет виджет для отображения списка
 * непрочитанных сообщений.
 */
export class UnreadMessages {
  private _container!: HTMLElement;
  private _messageList!: HTMLElement;
  private _subscription: Subscription | null = null;
  private _messageCounter!: HTMLElement;
  private _isInitialLoad = true;
  private _existingMessageIds = new Set<string>();

  constructor(
    private readonly _containerSelector: string,
    private readonly _messageService: MessageService = new MessageService()
  ) {
    this._addContainer(this._containerSelector);
    this._init();
  }

  /**
   * Метод удаляет подписку на обновления списка непрочитанных сообщений.
   */
  public destroy(): void {
    if (this._subscription) {
      this._subscription.unsubscribe();
      this._subscription = null;
    }
  }

  /**
   * Метод инициализирует виджет UnreadMessages.
   *
   * @see _render - Метод для создания заголовка и списка сообщений
   * @see _loadMessages - Метод для загрузки списка непрочитанных сообщений
   */
  private _init(): void {
    if (!this._container) return;

    this._render();
    this._loadMessages();
  }

  /**
   * Метод добавляет контейнер для виджета UnreadMessages.
   *
   * @param {string} selector - Селектор контейнера
   *
   * @description
   * Этот метод используется для добавления контейнера для виджета UnreadMessages.
   * Если контейнер существует, он сохраняется в свойстве _container.
   */
  private _addContainer(selector: string): void {
    const container = document.querySelector(selector);
    if (container instanceof HTMLElement) this._container = container;
  }

  /**
   * Метод создает заголовок и список сообщений.
   *
   * @see _createMessageTitle - Метод для создания заголовка
   * @see _createMessageList - Метод для создания списка сообщений
   */
  private _render(): void {
    this._createMessageTitle();
    this._createMessageList();
  }

  /**
   * Метод создает заголовок списка сообщений, и добавляет его в контейнер.
   *
   * @see {@link createElement} - Функция для создания DOM-элементов
   */
  private _createMessageTitle(): void {
    const messageTitle = createElement({
      tag: 'h2',
      className: 'widget-email__unread-title',
      text: 'Новые сообщения',
      children: [
        {
          tag: 'sup',
          className: 'widget-email__unread-title-count',
          text: '0',
        },
      ],
    });

    const messageCounter = messageTitle.querySelector('sup');
    if (messageCounter instanceof HTMLElement) {
      this._messageCounter = messageCounter;
    }

    this._container.append(messageTitle);
  }

  /**
   * Метод создает список сообщений, и добавляет его в контейнер.
   *
   * @see {@link createElement} - Функция для создания DOM-элементов
   */
  private _createMessageList(): void {
    this._messageList = createElement({
      tag: 'ul',
      className: 'widget-email__unread-list',
    });

    this._container.append(this._messageList);
  }

  /**
   * Инициализирует загрузку и обновление непрочитанных сообщений через SSE
   * и резервный опрос
   *
   * @private
   * @description
   * 1. Отменяет предыдущую подписку (если есть)
   * 2. Создает поток событий Server-Sent Events (SSE) для реального времени
   * 3. Настройка резервного опроса каждые 30 секунд
   * 4. Объединяет источники событий и обрабатывает ошибки
   * 5. При получении данных:
   *    - Отрисовывает сообщения
   *    - Обновляет счетчик непрочитанных
   *
   * @see {@link createSseObservable} - Создание потока SSE
   * @see {@link MessageService.getUnreadMessages} - Получение списка сообщений
   * @see _renderMessages - Отрисовка сообщений
   * @see _updateMessageCounter - Обновление счетчика
   * @see _showError - Отображение ошибок
   */
  private _loadMessages(): void {
    if (this._subscription) this._subscription.unsubscribe();

    // Показываем лоадер при старте (если ещё нет данных)
    if (this._messageList.children.length === 0) this._showLoader();

    const sseUrl = `${process.env.SERVER_URL}/events/unread-updates`;

    // 1. Основной триггер — SSE (реактивные обновления)
    const sse$ = createSseObservable(sseUrl);

    // 2. Резервный триггер — опрос каждые 30 секунд (на случай, если SSE
    // не работает). Первый запрос происходит сразу
    const fallbackPolling$ = interval(30_000).pipe(startWith(0));

    // 3. Объединяем: если пришло SSE — обновляем, иначе — ждём polling
    const trigger$ = merge(sse$, fallbackPolling$);

    this._subscription = trigger$
      .pipe(
        switchMap(() =>
          this._messageService.getUnreadMessages().pipe(
            catchError((error) => {
              console.warn('Не удалось загрузить сообщения:', error);
              this._showError(
                'Не удалось загрузить сообщения. Повторная попытка...'
              );
              return of([]); // продолжаем работу с пустым списком
            })
          )
        ),
        // Защита от полного падения потока
        catchError((error) => {
          console.error('Критическая ошибка в потоке обновлений:', error);
          this._showError('Сервис временно недоступен');
          return of([]);
        })
      )
      .subscribe({
        next: (messages) => {
          this._renderMessages(messages);
          this._updateMessageCounter(messages.length);
        },
      });
  }

  /**
   * Метод отображает список сообщений.
   *
   * @description
   * Если список сообщений пустой, отображается сообщение "Новых сообщений нет".
   *
   * @param {IMessage[]} messages - Список сообщений, которые нужно отобразить
   *
   * @see {@link createElement} - Функция для создания DOM-элементов
   */
  private _renderMessages(messages: IMessage[]): void {
    this._messageList.innerHTML = '';

    if (messages.length === 0) {
      const emptyItem = createElement({
        tag: 'li',
        className: [
          'widget-email__unread-item',
          'widget-email__unread-item--empty',
        ],
        children: [
          {
            tag: 'p',
            className: 'widget-email__unread-empty',
            text: 'Новых сообщений нет',
          },
        ],
      });
      this._messageList.append(emptyItem);
      return;
    }

    const currentIds = new Set<string>();
    const newItems: HTMLElement[] = [];

    messages.forEach((message) => {
      currentIds.add(message.id);
      const listItem = this._createMessageItem(message);

      // Анимируем ТОЛЬКО если:
      // 1. Это не первая загрузка И
      // 2. Сообщение новое (нет в предыдущем списке)
      const shouldAnimate =
        !this._isInitialLoad && !this._existingMessageIds.has(message.id);

      if (shouldAnimate) {
        listItem.classList.add('widget-email__unread-item--new');
        newItems.push(listItem);
      }

      this._messageList.prepend(listItem);
    });

    // Обновляем состояние
    this._existingMessageIds = currentIds;
    this._isInitialLoad = false;

    // Запускаем каскадную анимацию только для новых
    if (newItems.length > 0) {
      newItems.forEach((item, index) => {
        item.style.transitionDelay = `${index * 100}ms`;
        void item.offsetWidth; // force reflow
        item.classList.remove('widget-email__unread-item--new');
      });

      // Очистка inline-стилей
      setTimeout(
        () => {
          newItems.forEach((item) => (item.style.transitionDelay = ''));
        },
        newItems.length * 100 + 400
      );
    }
  }

  /**
   * Метод создает элемент списка сообщений.
   *
   * @param {IMessage} message - Объект сообщения
   *
   * @returns {HTMLElement} Элемент списка сообщений
   *
   * @see {@link createElement} - Функция для создания DOM-элементов
   */
  private _createMessageItem(message: IMessage): HTMLElement {
    const received = formatTimestamp(message.received);
    const listItem = createElement({
      tag: 'li',
      className: 'widget-email__unread-item',
      id: message.id,
      children: [
        {
          tag: 'a',
          className: 'widget-email__unread-link',
          attrs: {
            href: '#',
          },
          children: [
            {
              tag: 'img',
              className: 'widget-email__unread-avatar',
              attrs: {
                src: message.avatar,
                alt: message.from,
              },
            },

            {
              tag: 'span',
              className: 'widget-email__unread-from',
              text: message.from,
              attrs: {
                title: `Получено от: ${message.from}`,
              },
            },

            {
              tag: 'p',
              className: 'widget-email__unread-subject',
              text: truncateText(message.subject),
              attrs: {
                title: message.subject,
              },
            },

            {
              tag: 'time',
              className: 'widget-email__unread-received',
              text: received,
              attrs: {
                title: `Получено: ${received}`,
                datetime: new Date(message.received * 1000).toISOString(),
              },
            },
          ],
        },
      ],
    });

    return listItem;
  }

  /**
   * Метод обновляет количество непрочитанных сообщений.
   *
   * @param {number} count - Количество непрочитанных сообщений
   *
   * @description
   * - Если элемент счетчика не существует, метод ничего не делает.
   * - Если элемент счетчика существует, метод получает элемент с количеством
   *   непрочитанных сообщений и добавляет его в виде текста внутри тега
   *   `<sup></sup>`.
   */
  private _updateMessageCounter(count: number): void {
    if (this._messageCounter) this._messageCounter.textContent = String(count);
  }

  /**
   * Отображает индикатор загрузки в списке сообщений
   *
   * @private
   * @description
   * 1. Очищает текущий список сообщений
   * 2. Создает элемент-загрузчик (loader) с визуальным стилем
   * 3. Добавляет элемент загрузки в начало списка
   *
   * @see this._messageList - Ссылка на DOM-элемент списка сообщений
   * @see {@link createElement} - Функция для создания DOM-элементов
   */
  private _showLoader(): void {
    this._messageList.innerHTML = '';

    const loaderItem = createElement({
      tag: 'li',
      className: 'widget-email__unread-item--loader',
      children: [
        {
          tag: 'div',
          className: 'widget-email__loader',
        },
      ],
    });

    this._messageList.prepend(loaderItem);
  }

  /**
   * Метод отображает ошибку.
   *
   * @param {string} text - Текст ошибки
   *
   * @description
   * - Метод очищает список перед отображением ошибки.
   * - Метод создает элемент ошибки в виде тега `<li></li>`, и добавляет его в список.
   *
   * @see {@link createElement} - Функция для создания DOM-элементов
   */
  private _showError(text: string): void {
    this._messageList.innerHTML = '';

    const errorItem = createElement({
      tag: 'li',
      className: [
        'widget-email__unread-item',
        'widget-email__unread-item--error',
      ],
      children: [
        {
          tag: 'p',
          className: 'widget-email__unread-text-error',
          text,
        },
      ],
    });

    this._messageList.append(errorItem);
  }
}
