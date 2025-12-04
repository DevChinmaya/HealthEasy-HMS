// Simple in-memory mock DB for local development/testing
// Usage: set VITE_USE_MOCK_DB=true in .env to enable

const mock = {
  patients: [],
  doctors: [],
  appointments: [],
  invoices: [],
};

const listeners = {
  patients: new Set(),
  doctors: new Set(),
  appointments: new Set(),
  invoices: new Set(),
};

const genId = (prefix = '') => `${prefix}${Math.random().toString(36).slice(2, 9)}`;

function notify(collection) {
  for (const cb of listeners[collection]) cb([...mock[collection]]);
}

export function subscribe(collection, cb) {
  if (!mock[collection]) throw new Error('Unknown collection: ' + collection);
  cb([...mock[collection]]);
  listeners[collection].add(cb);
  return () => listeners[collection].delete(cb);
}

export function add(collection, data) {
  const id = genId();
  const doc = { id, ...data };
  mock[collection].unshift(doc);
  notify(collection);
  return { id, ...doc };
}

export function update(collection, id, patch) {
  const i = mock[collection].findIndex(d => d.id === id);
  if (i === -1) throw new Error('Not found');
  mock[collection][i] = { ...mock[collection][i], ...patch };
  notify(collection);
  return mock[collection][i];
}

export function find(collection, predicate) {
  return mock[collection].find(predicate);
}

export function seed(collection, items=[]) {
  mock[collection] = items.map((it) => ({ id: it.id || genId(), ...it }));
  notify(collection);
}

// Expose the raw mock for quick inspection in dev tools
export const _mock = mock;

export default { subscribe, add, update, find, seed, _mock };
