// Reactive local storage helper using Svelte 5 Runes

export function createPersistedState<T>(key: string, initialValue: T) {
  let stored: T;
  try {
    const raw = localStorage.getItem(key);
    stored = raw !== null ? JSON.parse(raw) : initialValue;
  } catch {
    stored = initialValue;
  }

  let value = $state<T>(stored);

  $effect.root(() => {
    $effect(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        console.warn(`Failed to persist key "${key}" to localStorage:`, err);
      }
    });
  });

  return {
    get value() {
      return value;
    },
    set value(v: T) {
      value = v;
    },
  };
}
