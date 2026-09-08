export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:8080'
).replace(/\/+$/, '');

function isTask(value) {
  return value && typeof value.id === 'string' && typeof value.title === 'string'
    && typeof value.completed === 'boolean';
}

async function request(options = {}, path = '/tasks') {
  const controller = new AbortController();
  const externalSignal = options.signal;
  const abort = () => controller.abort();
  externalSignal?.addEventListener('abort', abort, { once: true });
  if (externalSignal?.aborted) controller.abort();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 12000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...options.headers },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = typeof data?.detail === 'string' ? data.detail
        : Array.isArray(data?.detail) ? data.detail.map(item => item.msg).join(', ') : '';
      throw new Error(detail || `Сервер вернул ошибку ${response.status}. Попробуйте ещё раз.`);
    }
    return data;
  } catch (error) {
    if (timedOut) throw new Error('Сервер не ответил вовремя. Проверьте соединение.');
    if (error.name === 'AbortError') throw error;
    if (error instanceof TypeError) {
      throw new Error('Не удалось подключиться к серверу. Проверьте, что он запущен и разрешает запросы с адреса этого приложения (CORS).');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', abort);
  }
}

export async function getTasks(signal) {
  const data = await request({ signal });
  if (!Array.isArray(data) || !data.every(isTask)) {
    throw new Error('Сервер вернул некорректный список задач.');
  }
  return data;
}

export async function createTask(title) {
  const data = await request({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!isTask(data)) throw new Error('Не удалось подтвердить создание задачи. Обновите список перед повторной отправкой.');
  return data;
}

export async function updateTask(id, { title, completed }) {
  const data = await request({
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    // The backend's TaskSchema requires id in the body as well as in the URL.
    body: JSON.stringify({ id, title, completed }),
  }, `/tasks/${encodeURIComponent(id)}`);
  if (!isTask(data) || data.id !== id) {
    throw new Error('Не удалось подтвердить изменение задачи. Обновите список перед повторной отправкой.');
  }
  return data;
}

export async function deleteTask(id) {
  await request({ method: 'DELETE' }, `/tasks/${encodeURIComponent(id)}`);
}

function isCategory(value) {
  return value && typeof value.id === 'string' && typeof value.name === 'string';
}

export async function getCategories(signal) {
  const data = await request({ signal }, '/categories');
  if (!Array.isArray(data) || !data.every(isCategory)) {
    throw new Error('Сервер вернул некорректный список категорий: ожидаются id и name.');
  }
  return data;
}

export async function createCategory(name) {
  const data = await request({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }, '/categories');
  if (!isCategory(data)) throw new Error('Не удалось подтвердить создание категории. Обновите список перед повторной отправкой.');
  return data;
}

export async function updateCategory(id, { name }) {
  const data = await request({
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }, `/categories/${encodeURIComponent(id)}`);
  if (!isCategory(data) || data.id !== id) {
    throw new Error('Не удалось подтвердить изменение категории. Обновите список перед повторной отправкой.');
  }
  return data;
}

export async function deleteCategory(id) {
  await request({ method: 'DELETE' }, `/categories/${encodeURIComponent(id)}`);
}
