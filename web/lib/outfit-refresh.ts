type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

export const outfitRefreshStore = {
  subscribe: (cb: Listener) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  getSnapshot: () => version,
  trigger: () => {
    version++;
    listeners.forEach((cb) => cb());
  },
};
