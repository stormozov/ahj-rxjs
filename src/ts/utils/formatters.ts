/**
 * Сокращает строку до указанной длины и добавляет многоточие, если она длиннее.
 *
 * @param {string} text — исходная строка
 * @param {number} maxLength — максимальная длина (по умолчанию 15)
 *
 * @returns {string}
 * - исходная строка, если она короче или равна максимальной длине
 * - сокращенная строка с многоточием на конце, если она длиннее макс. длины
 */
export const truncateText = (text: string, maxLength: number = 15): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '…';
};

/**
 * Преобразует Unix-timestamp (в секундах) в строку формата "ЧЧ:ММ ДД.ММ.ГГГГ"
 *
 * @param {number} timestamp — время в секундах с 1970 года
 * @returns {string} отформатированная дата
 */
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000); // преобразуем в миллисекунды

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // месяцы с 0
  const year = date.getFullYear();

  return `${hours}:${minutes} ${day}.${month}.${year}`;
};
