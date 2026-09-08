import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Categories from '../Categories.jsx';
import App from '../App.jsx';
import { API_BASE_URL } from '../api.js';

const tasks = [
  { id: 'task-1', title: 'Подготовить отчёт', completed: false },
  { id: 'task-2', title: 'Проверить макет', completed: true },
];
const category = { id: 'category-1', name: 'Работа' };
const response = (data, status = 200) => new Response(JSON.stringify(data), { status });

function mockApi(mutate, list = [category], taskList = tasks) {
  const mock = vi.fn((url, options = {}) => {
    if (options.method) return mutate(url, options);
    if (url === `${API_BASE_URL}/categories`) return Promise.resolve(response(list));
    if (url === `${API_BASE_URL}/tasks`) return Promise.resolve(response(taskList));
    throw new Error(`Unexpected URL: ${url}`);
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

async function openEditor(user) {
  await screen.findByText('Работа');
  await user.click(screen.getByRole('button', { name: 'Изменить категорию: Работа' }));
  return within(screen.getByRole('form', { name: 'Изменить категорию: Работа' }));
}

describe('Categories', () => {
  it('opens from navigation and loads categories without additional task requests', async () => {
    const mock = mockApi();
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Подготовить отчёт');
    const desktopNavigation = screen.getAllByRole('navigation', { name: 'Разделы' })[0];
    await user.click(within(desktopNavigation).getByRole('button', { name: 'Категории' }));
    await screen.findByText('Работа');
    expect(screen.queryByText('Подготовить отчёт')).not.toBeInTheDocument();
    expect(mock.mock.calls.filter(([url]) => url.endsWith('/categories'))).toHaveLength(1);
    expect(mock.mock.calls.filter(([url]) => url.endsWith('/tasks'))).toHaveLength(1);
  });

  it('creates a category with a trimmed name and displays the returned category', async () => {
    const mock = mockApi(async () => response({ id: 'new', name: 'Личное' }, 201), []);
    const user = userEvent.setup();
    render(<Categories onBusyChange={vi.fn()} />);
    await screen.findByText('Категорий пока нет');
    await user.type(screen.getByLabelText('Название новой категории'), '  Личное  {Enter}');
    await screen.findByText('Личное');
    const [url, options] = mock.mock.calls.find(([, options]) => options.method === 'POST');
    expect(url).toBe(`${API_BASE_URL}/categories`);
    expect(JSON.parse(options.body)).toEqual({ name: 'Личное' });
    expect(screen.getByLabelText('Название новой категории')).toHaveValue('');
  });

  it('updates only the category name and accepts a response containing id and name', async () => {
    const mock = mockApi(async (_url, options) => response({ id: category.id, ...JSON.parse(options.body) }));
    const user = userEvent.setup();
    render(<Categories onBusyChange={vi.fn()} />);
    const editor = await openEditor(user);
    await user.clear(editor.getByLabelText('Название категории'));
    await user.type(editor.getByLabelText('Название категории'), '  Проект  ');
    expect(editor.queryByRole('checkbox')).not.toBeInTheDocument();
    await user.click(editor.getByRole('button', { name: 'Сохранить' }));
    await screen.findByText('Проект');
    const [url, options] = mock.mock.calls.find(([, options]) => options.method === 'PATCH');
    expect(url).toBe(`${API_BASE_URL}/categories/category-1`);
    expect(JSON.parse(options.body)).toEqual({ name: 'Проект' });
    expect(screen.getByRole('status')).toHaveTextContent('Категория обновлена.');
    expect(mock.mock.calls.every(([url]) => url.startsWith(`${API_BASE_URL}/categories`))).toBe(true);
  });

  it('keeps failed edits and cancels them without altering the saved category', async () => {
    mockApi(async () => response({ detail: 'Ошибка сохранения' }, 500));
    const user = userEvent.setup();
    render(<Categories onBusyChange={vi.fn()} />);
    const editor = await openEditor(user);
    await user.clear(editor.getByLabelText('Название категории'));
    await user.type(editor.getByLabelText('Название категории'), 'Черновик');
    await user.click(editor.getByRole('button', { name: 'Сохранить' }));
    await screen.findByRole('alert');
    expect(editor.getByLabelText('Название категории')).toHaveValue('Черновик');
    await user.click(editor.getByRole('button', { name: 'Отмена' }));
    expect(screen.getByText('Работа')).toBeInTheDocument();
    expect(screen.queryByText('Черновик')).not.toBeInTheDocument();
  });

  it('waits for DELETE 204 and prevents duplicate actions', async () => {
    let finish;
    const mock = mockApi(() => new Promise(resolve => { finish = resolve; }));
    const onBusy = vi.fn();
    const user = userEvent.setup();
    render(<Categories onBusyChange={onBusy} />);
    await screen.findByText('Работа');
    await user.click(screen.getByRole('button', { name: 'Удалить категорию: Работа' }));
    expect(screen.getByText('Работа')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Удалить категорию: Работа' })).toBeDisabled();
    expect(onBusy).toHaveBeenLastCalledWith(true);
    finish(new Response(null, { status: 204 }));
    await screen.findByText('Категорий пока нет');
    expect(onBusy).toHaveBeenLastCalledWith(false);
    expect(mock.mock.calls.filter(([, options]) => options.method === 'DELETE')).toHaveLength(1);
    expect(mock.mock.calls.find(([, options]) => options.method === 'DELETE')[0]).toBe(`${API_BASE_URL}/categories/category-1`);
  });

  it('keeps the category when deletion fails', async () => {
    mockApi(async () => response({ detail: 'Not Found' }, 404));
    const user = userEvent.setup();
    render(<Categories onBusyChange={vi.fn()} />);
    await screen.findByText('Работа');
    await user.click(screen.getByRole('button', { name: 'Удалить категорию: Работа' }));
    await screen.findByRole('alert');
    expect(screen.getByText('Работа')).toBeInTheDocument();
  });

  it('prevents blank names and cancels without a mutation', async () => {
    const mock = mockApi();
    const user = userEvent.setup();
    render(<Categories onBusyChange={vi.fn()} />);
    const editor = await openEditor(user);
    await user.clear(editor.getByLabelText('Название категории'));
    await user.type(editor.getByLabelText('Название категории'), '   ');
    expect(editor.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
    await user.click(editor.getByRole('button', { name: 'Отмена' }));
    expect(screen.getByText('Работа')).toBeInTheDocument();
    expect(mock.mock.calls.some(([, options]) => options.method)).toBe(false);
  });

  it('reports missing category routes without pretending that the list is empty', async () => {
    vi.stubGlobal('fetch', vi.fn(async url => url.endsWith('/tasks') ? response(tasks) : response({ detail: 'Not Found' }, 404)));
    render(<Categories onBusyChange={vi.fn()} />);
    await screen.findByRole('alert');
    expect(screen.getByText('Не удалось синхронизировать категории')).toBeInTheDocument();
    expect(screen.queryByText('Категорий пока нет')).not.toBeInTheDocument();
  });
});
