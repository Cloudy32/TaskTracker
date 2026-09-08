import { useCallback, useEffect, useRef, useState } from 'react';
import { createCategory, deleteCategory, getCategories, updateCategory } from './api.js';
import Icon from './Icon.jsx';

export default function Categories({ onBusyChange }) {
  const [categories, setCategories] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(null);
  const [name, setName] = useState('');
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const locked = useRef(false);
  const nameInput = useRef(null);
  const busy = pending !== null;

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const result = await getCategories(signal);
      if (signal?.aborted) return;
      setCategories(result);
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

  async function mutate(key, operation) {
    if (locked.current || loading) return;
    locked.current = true;
    setPending(key);
    onBusyChange(true);
    setError('');
    setNotice('');
    try {
      await operation();
    } catch (err) {
      setError(`${err.message} Обновите список перед повторной отправкой, чтобы проверить результат операции.`);
    } finally {
      locked.current = false;
      setPending(null);
      onBusyChange(false);
    }
  }

  function create(event) {
    event.preventDefault();
    if (!name.trim()) return;
    mutate('create', async () => {
      const category = await createCategory(name.trim());
      setCategories(previous => [...previous.filter(item => item.id !== category.id), category]);
      setName('');
      setNotice('Категория создана.');
      if (!loaded) await load();
      nameInput.current?.focus();
    });
  }

  function save(event) {
    event.preventDefault();
    if (!draft?.name.trim()) return;
    mutate(`update:${draft.id}`, async () => {
      const category = await updateCategory(draft.id, {
        name: draft.name.trim(),
      });
      setCategories(previous => previous.map(item => item.id === category.id ? category : item));
      setDraft(null);
      setNotice('Категория обновлена.');
    });
  }

  function remove(id) {
    mutate(`delete:${id}`, async () => {
      await deleteCategory(id);
      setCategories(previous => previous.filter(item => item.id !== id));
      if (draft?.id === id) setDraft(null);
      setNotice('Категория удалена.');
    });
  }

  return (
    <section className="categories" aria-labelledby="categories-title">
      <header className="page-header">
        <div><p className="eyebrow">КАТЕГОРИИ</p><h1 id="categories-title">Категории</h1><p>Создавайте и переименовывайте категории.</p></div>
        <div className="summary"><span><strong>{loaded ? categories.length : '—'}</strong> всего</span></div>
      </header>

      <section className="create-card" aria-labelledby="category-create-title">
        <div className="create-copy"><span className="section-icon"><Icon name="folder" /></span><div><h2 id="category-create-title">Новая категория</h2><p>Введите понятное название.</p></div></div>
        <form className="create-form" onSubmit={create}>
          <label className="sr-only" htmlFor="category-name">Название новой категории</label>
          <input ref={nameInput} id="category-name" placeholder="Например, Работа" value={name} readOnly={busy} onChange={event => setName(event.target.value)} required />
          <button className="primary" type="submit" disabled={!name.trim() || busy || loading}><Icon name="plus" />{pending === 'create' ? 'Создаём…' : 'Добавить'}</button>
        </form>
      </section>

      <div role="status" className={notice ? 'notice' : 'sr-only'}>{notice}</div>
      {error && <div role="alert" className="error-banner"><div><strong>Не удалось синхронизировать категории</strong><p>{error}</p></div><button className="secondary" disabled={busy || loading} onClick={() => load()}>Повторить</button></div>}

      <div className="list-header"><h2>Список категорий <span>{loaded ? categories.length : '—'}</span></h2></div>

      <div className="category-list" aria-busy={loading}>
        {loading && !loaded ? <div className="empty-state"><Icon name="refresh" className="spinning" /><h3>Загружаем категории</h3></div>
          : categories.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="folder" /></span><h3>{error && !loaded ? 'Нет связи с сервером' : 'Категорий пока нет'}</h3><p>{error && !loaded ? 'Проверьте API и повторите запрос.' : 'Добавьте первую категорию через форму выше.'}</p></div>
            : categories.map(category => (
              <article className="category-card" key={category.id}>
                {draft?.id === category.id ? (
                  <form className="task-editor" onSubmit={save} aria-label={`Изменить категорию: ${category.name}`}>
                    <label htmlFor={`category-edit-${category.id}`}>Название категории</label>
                    <input id={`category-edit-${category.id}`} autoFocus value={draft.name} readOnly={busy} onChange={event => setDraft(previous => ({ ...previous, name: event.target.value }))} required />
                    <div className="task-actions"><button className="primary" type="submit" disabled={busy || loading || !draft.name.trim()}>{pending === `update:${category.id}` ? 'Сохраняем…' : 'Сохранить'}</button><button className="task-action" type="button" disabled={busy} onClick={() => setDraft(null)}>Отмена</button></div>
                  </form>
                ) : (
                  <>
                    <div className="category-card-heading"><span className="category-icon"><Icon name="folder" /></span><h3>{category.name}</h3></div>
                    <div className="task-actions"><button className="icon-button" disabled={busy || loading} aria-label={`Изменить категорию: ${category.name}`} title="Изменить" onClick={() => setDraft({ id: category.id, name: category.name })}><Icon name="edit" /></button><button className="icon-button danger" disabled={busy || loading} aria-label={`Удалить категорию: ${category.name}`} title="Удалить" onClick={() => remove(category.id)}>{pending === `delete:${category.id}` ? <Icon name="refresh" className="spinning" /> : <Icon name="trash" />}</button></div>
                  </>
                )}
              </article>
            ))}
      </div>
    </section>
  );
}
