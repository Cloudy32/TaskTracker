import { useCallback, useEffect, useRef, useState } from 'react';
import { createTask, deleteTask, getTasks, updateTask } from './api.js';
import Categories from './Categories.jsx';
import Icon from './Icon.jsx';
import TaskItem from './TaskItem.jsx';

const filters = [
  { id: 'all', label: 'Все' },
  { id: 'active', label: 'В работе' },
  { id: 'completed', label: 'Выполненные' },
];

export default function App() {
  const [view, setView] = useState('tasks');
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const mutationPending = useRef(false);
  const busy = saving || pendingTaskId !== null;

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const result = await getTasks(signal);
      if (signal?.aborted) return;
      setTasks(result);
      setLoaded(true);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function submit(event) {
    event.preventDefault();
    if (!title.trim() || mutationPending.current || loading) return;
    mutationPending.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const task = await createTask(title.trim());
      setTasks(previous => [...previous.filter(item => item.id !== task.id), task]);
      setTitle('');
      setFilter('all');
      setSearch('');
      setNotice('Задача добавлена.');
      if (!loaded) await load();
    } catch (err) {
      setError(`${err.message} Если запрос дошёл до сервера, обновите страницу перед повторной отправкой.`);
    } finally {
      mutationPending.current = false;
      setSaving(false);
    }
  }

  async function mutateTask(id, changes) {
    if (mutationPending.current || loading) return false;
    mutationPending.current = true;
    setPendingTaskId(id);
    setError('');
    setNotice('');
    try {
      if (changes) {
        const updated = await updateTask(id, changes);
        setTasks(previous => previous.map(task => task.id === id ? updated : task));
        setNotice('Задача обновлена.');
      } else {
        await deleteTask(id);
        setTasks(previous => previous.filter(task => task.id !== id));
        setNotice('Задача удалена.');
      }
      return true;
    } catch (err) {
      setError(`${err.message} Обновите страницу, чтобы проверить состояние задачи.`);
      return false;
    } finally {
      mutationPending.current = false;
      setPendingTaskId(null);
    }
  }

  const completedCount = tasks.filter(task => task.completed).length;
  const activeCount = tasks.length - completedCount;
  const counts = { all: tasks.length, active: activeCount, completed: completedCount };
  const query = search.trim().toLocaleLowerCase('ru');
  const visibleTasks = tasks.filter(task => (
    (filter === 'all' || (filter === 'completed' ? task.completed : !task.completed))
    && task.title.toLocaleLowerCase('ru').includes(query)
  ));

  function selectView(nextView) {
    if (busy || categoryBusy) return;
    setView(nextView);
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Перейти к содержимому</a>
      <aside className="sidebar">
        <a className="brand" href="#main" onClick={() => selectView('tasks')}>
          <span className="brand-mark"><Icon name="check" /></span><span>TaskTracker</span>
        </a>
        <nav className="main-nav" aria-label="Разделы">
          <button className={view === 'tasks' ? 'nav-item selected' : 'nav-item'} disabled={categoryBusy} aria-current={view === 'tasks' ? 'page' : undefined} onClick={() => selectView('tasks')}>
            <Icon name="list" /><span>Задачи</span><span className="nav-count">{loaded ? tasks.length : '—'}</span>
          </button>
          <button className={view === 'categories' ? 'nav-item selected' : 'nav-item'} disabled={busy} aria-current={view === 'categories' ? 'page' : undefined} onClick={() => selectView('categories')}>
            <Icon name="folder" /><span>Категории</span>
          </button>
        </nav>
        <div className="sidebar-note"><span className={`connection-dot ${error ? 'error-dot' : ''}`} />{error ? 'Есть проблема с API' : 'Данные синхронизированы'}</div>
      </aside>

      <div className="workspace-shell">
        <header className="mobile-header">
          <a className="brand compact" href="#main"><span className="brand-mark"><Icon name="check" /></span><span>TaskTracker</span></a>
          <nav aria-label="Разделы"><button className={view === 'tasks' ? 'active' : ''} onClick={() => selectView('tasks')}>Задачи</button><button className={view === 'categories' ? 'active' : ''} onClick={() => selectView('categories')}>Категории</button></nav>
        </header>

        <main id="main" className="content">
          {view === 'categories' ? <Categories onBusyChange={setCategoryBusy} /> : (
            <section aria-labelledby="tasks-title">
              <header className="page-header">
                <div><p className="eyebrow">ЗАДАЧИ</p><h1 id="tasks-title">Мои задачи</h1><p>Добавляйте дела и отмечайте выполненное.</p></div>
                <div className="summary" aria-label="Статистика задач"><span><strong>{loaded ? activeCount : '—'}</strong> в работе</span><span><strong>{loaded ? completedCount : '—'}</strong> выполнено</span></div>
              </header>

              <section className="create-card" aria-labelledby="create-task-title">
                <div className="create-copy"><span className="section-icon"><Icon name="plus" /></span><div><h2 id="create-task-title">Новая задача</h2><p>Что нужно сделать?</p></div></div>
                <form className="create-form" onSubmit={submit}><label className="sr-only" htmlFor="task-title">Название задачи</label><input id="task-title" value={title} readOnly={busy} onChange={event => setTitle(event.target.value)} placeholder="Введите название задачи" autoComplete="off" required /><button className="primary" disabled={!title.trim() || busy || loading} type="submit"><Icon name="plus" />{saving ? 'Добавляем…' : 'Добавить'}</button></form>
              </section>

              <div aria-live="polite" role="status" className={notice ? 'notice' : 'sr-only'}>{notice}</div>
              {error && <div role="alert" className="error-banner"><div><strong>Не удалось синхронизировать задачи</strong><p>{error}</p></div><button className="secondary" onClick={() => load()} disabled={loading || busy}>Повторить</button></div>}

              <section className="list-section" aria-labelledby="task-list-title" aria-busy={loading}>
                <div className="list-header"><h2 id="task-list-title">Список задач <span>{loaded ? tasks.length : '—'}</span></h2><label className="search-box"><Icon name="search" /><span className="sr-only">Поиск задач</span><input id="search" type="search" placeholder="Поиск" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
                <div className="filters" role="group" aria-label="Фильтр по статусу">{filters.map(item => <button key={item.id} aria-pressed={filter === item.id} className={filter === item.id ? 'active' : ''} onClick={() => setFilter(item.id)}>{item.label}<span>{loaded ? counts[item.id] : '—'}</span></button>)}</div>
                <div className="task-list">
                  {loading && !loaded ? <div className="empty-state"><Icon name="refresh" className="spinning" /><h3>Загружаем задачи</h3></div> : visibleTasks.length ? <ul>{visibleTasks.map(task => <TaskItem key={task.id} task={task} disabled={loading || busy} pending={pendingTaskId === task.id} onSave={mutateTask} onDelete={id => mutateTask(id)} />)}</ul> : <div className="empty-state"><span className="empty-icon"><Icon name={error && !loaded ? 'refresh' : query ? 'search' : 'list'} /></span><h3>{error && !loaded ? 'Нет связи с сервером' : query ? 'Задачи не найдены' : filter === 'completed' ? 'Нет выполненных задач' : filter === 'active' ? 'Нет активных задач' : 'Задач пока нет'}</h3><p>{error && !loaded ? 'Проверьте API и повторите запрос.' : query ? 'Измените запрос или выберите другой фильтр.' : 'Добавьте первую задачу через форму выше.'}</p>{query && <button className="link-button" onClick={() => { setSearch(''); setFilter('all'); }}>Сбросить поиск</button>}</div>}
                </div>
              </section>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
