// Очередь сохранения отметок плана. Файл без React, поэтому его легко тестировать.
//
// Гарантии:
// 1) Для одного задания запросы идут по очереди, и в конце всегда уходит ПОСЛЕДНЕЕ выбранное значение.
//    Пример: три быстрых клика по одному пункту дают итог, совпадающий с последним кликом.
// 2) Разные задания сохраняются параллельно и не мешают друг другу.
// 3) Когда всё отправлено, вызывается onIdle(hadError). hadError = true, если хотя бы один запрос упал.

export type SendFn = (taskId: string, done: boolean) => Promise<void>;

export type SaveQueue = {
  // Запомнить желаемое значение и отправить (если для этого задания сейчас ничего не идёт)
  set(taskId: string, done: boolean): void;
  // Есть ли незавершённые сохранения
  isBusy(): boolean;
};

export function createSaveQueue(opts: { send: SendFn; onIdle: (hadError: boolean) => void }): SaveQueue {
  const want = new Map<string, boolean>(); // ждём отправки: taskId -> значение
  const active = new Set<string>(); // задания, которые сейчас отправляются
  let hadError = false;

  function finishIfIdle() {
    if (active.size === 0 && want.size === 0) {
      const err = hadError;
      hadError = false;
      opts.onIdle(err);
    }
  }

  async function run(taskId: string) {
    active.add(taskId);
    // Пока есть новое желаемое значение для этого задания, отправляем его
    while (want.has(taskId)) {
      const value = want.get(taskId) as boolean;
      want.delete(taskId);
      try {
        await opts.send(taskId, value);
      } catch {
        hadError = true;
        want.delete(taskId); // после ошибки не повторяем автоматически: интерфейс сам сверит данные с сервером
        break;
      }
    }
    active.delete(taskId);
    finishIfIdle();
  }

  return {
    set(taskId, done) {
      want.set(taskId, done);
      if (!active.has(taskId)) void run(taskId);
    },
    isBusy: () => active.size > 0 || want.size > 0,
  };
}
