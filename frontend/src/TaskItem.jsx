import { useState } from 'react';
import Icon from './Icon.jsx';

export default function TaskItem({ task, disabled, pending, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [completed, setCompleted] = useState(task.completed);

  function startEditing() {
    setTitle(task.title);
    setCompleted(task.completed);
    setEditing(true);
  }

  async function save(event) {
    event.preventDefault();
    if (disabled || !title.trim()) return;
    if (await onSave(task.id, { title: title.trim(), completed })) setEditing(false);
  }

  return (
    <li className={editing ? 'task-row editing' : 'task-row'} aria-busy={pending}>
      {editing ? (
        <form className="task-editor" onSubmit={save} aria-label={`Изменить задачу: ${task.title}`}>
          <label htmlFor={`edit-title-${task.id}`}>Название задачи</label>
          <input id={`edit-title-${task.id}`} autoFocus value={title} onChange={event => setTitle(event.target.value)} readOnly={disabled} required />
          <label className="completion-field">
            <input type="checkbox" checked={completed} onChange={event => setCompleted(event.target.checked)} disabled={disabled} />
            Задача выполнена
          </label>
          <div className="task-actions">
            <button className="primary" type="submit" disabled={disabled || !title.trim()}>{pending ? 'Сохраняем…' : 'Сохранить'}</button>
            <button className="task-action" type="button" onClick={() => setEditing(false)} disabled={disabled}>Отмена</button>
          </div>
        </form>
      ) : (
        <>
          <span className={`task-symbol ${task.completed ? 'done' : ''}`} aria-hidden="true"><Icon name={task.completed ? 'check' : 'circle'} /></span>
          <span className={`task-title ${task.completed ? 'done' : ''}`}>{task.title}</span>
          <span className={`status-tag ${task.completed ? 'done' : ''}`}><span />{task.completed ? 'Выполнена' : 'В работе'}</span>
          <div className="task-actions">
            <button className="icon-button" type="button" onClick={startEditing} disabled={disabled} aria-label={`Изменить задачу: ${task.title}`} title="Изменить"><Icon name="edit" /></button>
            <button className="icon-button danger" type="button" onClick={() => onDelete(task.id)} disabled={disabled} aria-label={`Удалить задачу: ${task.title}`} title="Удалить">{pending ? <Icon name="refresh" className="spinning" /> : <Icon name="trash" />}</button>
          </div>
        </>
      )}
    </li>
  );
}
