/** Compatibility bridge for the pinned page-flip 2.0.7 renderer.
 * Its destroy() removes DOM/listeners but leaves Render.start() scheduling
 * frames. Intercept the instance's renderer assignment before loadFromHTML,
 * replace only its scheduler, and retain the library's own frame calculation.
 * No globals or prototypes are changed. Keep this test when upgrading. */
interface ManagedRenderer {
  start: () => void;
  update: () => void;
  render: (time: number) => void;
}

export function installManagedRenderLoop(
  engine: object,
  schedule: (callback: FrameRequestCallback) => number = requestAnimationFrame,
  cancel: (id: number) => void = cancelAnimationFrame,
) {
  let renderer: ManagedRenderer | undefined;
  let frame: number | undefined;
  let disposed = false;
  Object.defineProperty(engine, 'render', {
    configurable: true,
    get: () => renderer,
    set(value: ManagedRenderer) {
      renderer = value;
      if (typeof value.render !== 'function' || typeof value.update !== 'function') {
        throw new Error('El motor de páginas cambió. Usá la lectura continua.');
      }
      const update = value.update.bind(value);
      value.update = () => { if (!disposed) update(); };
      value.start = () => {
        value.update();
        const loop: FrameRequestCallback = (time) => {
          if (disposed) return;
          value.render(time);
          if (!disposed) frame = schedule(loop);
        };
        frame = schedule(loop);
      };
    },
  });
  return () => {
    disposed = true;
    if (frame !== undefined) cancel(frame);
  };
}
