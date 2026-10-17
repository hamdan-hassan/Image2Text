import { openAppDatabase } from './db';
import { createScansRepository, type ScansRepository } from './scansRepository';
import { emitScansChanged } from './scanEvents';

let repositoryPromise: Promise<ScansRepository> | null = null;

function withChangeNotifications(repository: ScansRepository): ScansRepository {
  return {
    create: async (input) => {
      const record = await repository.create(input);
      emitScansChanged();
      return record;
    },
    get: (id) => repository.get(id),
    list: () => repository.list(),
    recent: (limit) => repository.recent(limit),
    search: (query) => repository.search(query),
    updateEditedText: async (...args) => {
      await repository.updateEditedText(...args);
      emitScansChanged();
    },
    rename: async (...args) => {
      await repository.rename(...args);
      emitScansChanged();
    },
    remove: async (id) => {
      const removed = await repository.remove(id);
      if (removed) emitScansChanged();
      return removed;
    },
    removeMany: async (ids) => {
      const removed = await repository.removeMany(ids);
      if (removed.length > 0) emitScansChanged();
      return removed;
    },
    clear: async () => {
      const all = await repository.clear();
      if (all.length > 0) emitScansChanged();
      return all;
    },
  };
}

export function getScansRepository(): Promise<ScansRepository> {
  if (!repositoryPromise) {
    repositoryPromise = openAppDatabase().then((db) => withChangeNotifications(createScansRepository(db)));
  }
  return repositoryPromise;
}
