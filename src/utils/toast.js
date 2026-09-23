// Minimal pub-sub so any component can trigger a toast without prop drilling
// or a heavy context setup. ToastContainer (mounted once in App.jsx) subscribes.

let listeners = [];
let idCounter = 0;

export function subscribeToast(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function showToast(message, type = 'info', duration = 3200) {
  const id = ++idCounter;
  listeners.forEach((fn) => fn({ id, message, type, duration }));
  return id;
}
