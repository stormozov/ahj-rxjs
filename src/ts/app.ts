import { UnreadMessages } from './widgets/UnreadMessages/UnreadMessages';

/**
 * Инициализация всех виджетов проекта
 */
const init = (): void => {
  new UnreadMessages('.widget-email__unread');
};

document.addEventListener('DOMContentLoaded', init);
