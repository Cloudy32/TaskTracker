import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../App.jsx';
import { API_BASE_URL, getTasks, createTask } from '../api.js';

const initialTasks = [
  { id: '1', title: 'Подготовить презентацию', completed: false },
  { id: '2', title: 'Проверить макет', completed: true },
];
const response = data => new Response(JSON.stringify(data), { status: 200 });

describe('TaskTracker', () => {
  it('loads real tasks directly from the configured backend and filters locally', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(initialTasks));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Подготовить презентацию');
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}/tasks`);
    await user.type(screen.getByLabelText('Поиск задач'), 'МАКЕТ');
    expect(screen.getByText('Проверить макет')).toBeInTheDocument();
    expect(screen.queryByText('Подготовить презентацию')).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('Поиск задач'));
    await user.click(within(screen.getByRole('group', { name: 'Фильтр по статусу' })).getByRole('button', { name: /^В работе/ }));
    expect(screen.getByText('Подготовить презентацию')).toBeInTheDocument();
    expect(screen.queryByText('Проверить макет')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('creates on Enter using only a trimmed title and the task returned by the server', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response([])).mockResolvedValueOnce(response({ id: 'server-id', title: 'Новое дело', completed: false }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Задач пока нет');
    await user.type(screen.getByLabelText('Название задачи'), '  Новое дело  {Enter}');
    await screen.findByText('Новое дело');
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_BASE_URL}/tasks`);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ title: 'Новое дело' }) });
    expect(screen.getByLabelText('Название задачи')).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('Задача добавлена');
  });

  it('rejects whitespace and blocks duplicate submission while saving', async () => {
    let resolveCreate;
    const fetchMock = vi.fn().mockResolvedValueOnce(response([])).mockImplementationOnce(() => new Promise(resolve => { resolveCreate = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Задач пока нет');
    const input = screen.getByLabelText('Название задачи');
    await user.type(input, '   {Enter}');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.type(input, 'Дело{Enter}{Enter}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Добавляем…' })).toBeDisabled();
    resolveCreate(response({ id: 'new', title: 'Дело', completed: false }));
    await screen.findByText('Дело');
  });

  it('preserves draft after a failed POST and does not show an unsaved task', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response([])).mockRejectedValueOnce(new TypeError('Failed to fetch')));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Задач пока нет');
    await user.type(screen.getByLabelText('Название задачи'), 'Сохранить черновик{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('CORS');
    expect(screen.getByLabelText('Название задачи')).toHaveValue('Сохранить черновик');
    expect(screen.queryByText('Сохранить черновик')).not.toBeInTheDocument();
  });

  it('shows initial network failure and supports retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(response(initialTasks)));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('alert');
    expect(screen.getByText('Нет связи с сервером')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Повторить' }));
    await screen.findByText('Подготовить презентацию');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([false, true])('edits title and sends a boolean when completed was %s', async (wasCompleted) => {
    const task = { ...initialTasks[0], completed: wasCompleted };
    const updated = { ...task, title: 'Новое название', completed: !wasCompleted };
    const fetchMock = vi.fn().mockResolvedValueOnce(response([task])).mockResolvedValueOnce(response(updated));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Подготовить презентацию');
    await user.click(screen.getByRole('button', { name: 'Изменить задачу: Подготовить презентацию' }));
    const editor = within(screen.getByRole('form', { name: 'Изменить задачу: Подготовить презентацию' }));
    await user.clear(editor.getByLabelText('Название задачи'));
    await user.type(editor.getByLabelText('Название задачи'), '  Новое название  ');
    await user.click(editor.getByRole('checkbox', { name: 'Задача выполнена' }));
    await user.click(editor.getByRole('button', { name: 'Сохранить' }));
    await screen.findByText('Новое название');
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_BASE_URL}/tasks/1`);
    expect(fetchMock.mock.calls[1][1].method).toBe('PATCH');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual(updated);
    expect(screen.getByRole('status')).toHaveTextContent('Задача обновлена');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('cancels edits without a request and restores the original draft when reopened', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(initialTasks));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Подготовить презентацию');
    const edit = screen.getByRole('button', { name: 'Изменить задачу: Подготовить презентацию' });
    await user.click(edit);
    const editor = within(screen.getByRole('form', { name: 'Изменить задачу: Подготовить презентацию' }));
    await user.clear(editor.getByLabelText('Название задачи'));
    await user.type(editor.getByLabelText('Название задачи'), '   ');
    expect(editor.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
    await user.click(editor.getByRole('button', { name: 'Отмена' }));
    await user.click(screen.getByRole('button', { name: 'Изменить задачу: Подготовить презентацию' }));
    expect(within(screen.getByRole('form')).getByLabelText('Название задачи')).toHaveValue('Подготовить презентацию');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the editor draft and original task on PATCH failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(initialTasks)).mockResolvedValueOnce(new Response('', { status: 500 })));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Подготовить презентацию');
    await user.click(screen.getByRole('button', { name: 'Изменить задачу: Подготовить презентацию' }));
    const editor = within(screen.getByRole('form'));
    await user.clear(editor.getByLabelText('Название задачи'));
    await user.type(editor.getByLabelText('Название задачи'), 'Черновик изменения');
    await user.click(editor.getByRole('button', { name: 'Сохранить' }));
    await screen.findByRole('alert');
    expect(editor.getByLabelText('Название задачи')).toHaveValue('Черновик изменения');
    await user.click(editor.getByRole('button', { name: 'Отмена' }));
    expect(screen.getByText('Подготовить презентацию')).toBeInTheDocument();
  });

  it('removes a task only after DELETE succeeds with an empty 204 response', async () => {
    let finishDelete;
    const fetchMock = vi.fn().mockResolvedValueOnce(response(initialTasks)).mockImplementationOnce(() => new Promise(resolve => { finishDelete = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Подготовить презентацию');
    await user.click(screen.getByRole('button', { name: 'Удалить задачу: Подготовить презентацию' }));
    expect(screen.getByText('Подготовить презентацию')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Удалить задачу: Подготовить презентацию' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Добавить' })).toBeDisabled();
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_BASE_URL}/tasks/1`);
    expect(fetchMock.mock.calls[1][1].method).toBe('DELETE');
    finishDelete(new Response(null, { status: 204 }));
    await waitFor(() => expect(screen.queryByText('Подготовить презентацию')).not.toBeInTheDocument());
    expect(screen.getByText('Проверить макет')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Список задач 1' })).toBeInTheDocument();
  });

  it('keeps the task visible when DELETE fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(initialTasks)).mockResolvedValueOnce(new Response('', { status: 405 })));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Подготовить презентацию');
    await user.click(screen.getByRole('button', { name: 'Удалить задачу: Подготовить презентацию' }));
    await screen.findByRole('alert');
    expect(screen.getByText('Подготовить презентацию')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Удалить задачу: Подготовить презентацию' })).toBeEnabled();
  });
});

describe('API responses', () => {
  it('rejects malformed data instead of showing an empty successful list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ tasks: [] })));
    await expect(getTasks()).rejects.toThrow('некорректный список');
  });

  it('shows FastAPI validation messages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: [{ msg: 'Field required' }] }), { status: 422 })));
    await expect(createTask('')).rejects.toThrow('Field required');
  });

  it('aborts a request when its caller cancels it', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    vi.stubGlobal('fetch', fetchMock);
    const pending = getTasks(controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await waitFor(() => expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true));
  });
});
