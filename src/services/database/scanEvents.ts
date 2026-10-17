type Listener = () => void;

const listeners = new Set<Listener>();

/** Tiny change bus so all screens reflect scan mutations instantly. */
export function emitScansChanged(): void {
  for (const listener of listeners) listener();
}

export function onScansChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
