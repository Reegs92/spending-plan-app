export default function PeopleSection({ people, onAdd, onUpdate, onRemove }) {
  return (
    <section className="card">
      <div className="card-header">
        <h2>People</h2>
        <button className="btn-primary" onClick={onAdd}>+ Add Person</button>
      </div>
      <div className="people-list">
        {people.map((p) => (
          <div key={p.id} className="person-row">
            <input
              className="input-text"
              value={p.name}
              onChange={(e) => onUpdate(p.id, e.target.value)}
              placeholder="Name"
            />
            <button
              className="btn-danger"
              onClick={() => onRemove(p.id)}
              disabled={people.length <= 1}
              title={people.length <= 1 ? 'Need at least one person' : 'Remove'}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
