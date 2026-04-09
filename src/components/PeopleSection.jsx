import { useState } from 'react';

export default function PeopleSection({ people, setPeople }) {
  const [newName, setNewName] = useState('');

  function addPerson() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setPeople(prev => [...prev, { id: crypto.randomUUID(), name: trimmed }]);
    setNewName('');
  }

  function removePerson(id) {
    setPeople(prev => prev.filter(p => p.id !== id));
  }

  function handleKey(e) {
    if (e.key === 'Enter') addPerson();
  }

  return (
    <section className="card" id="people-section">
      <h2>People</h2>
      <p className="section-hint">People listed here can own income sources and accounts.</p>
      <ul className="people-list">
        {people.map(p => (
          <li key={p.id} className="people-item">
            <span className="person-avatar">{p.name.charAt(0).toUpperCase()}</span>
            <span className="person-name">{p.name}</span>
            {people.length > 1 && (
              <button
                className="btn-icon btn-danger"
                onClick={() => removePerson(p.id)}
                title="Remove person"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="add-row">
        <input
          type="text"
          placeholder="Name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={handleKey}
          maxLength={50}
        />
        <button className="btn-primary" onClick={addPerson}>Add Person</button>
      </div>
    </section>
  );
}
