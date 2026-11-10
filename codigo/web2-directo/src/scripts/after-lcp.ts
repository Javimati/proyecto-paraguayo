/** Resuelve cuando el LCP ya se ha pintado (o, como mucho, a los 2,5 s), en un momento ocioso. */
export function afterLCP(maxWait = 2500): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: object) => number }).requestIdleCallback;
      if (ric) ric(() => resolve(), { timeout: 800 });
      else setTimeout(resolve, 50);
    };
    try {
      const po = new PerformanceObserver((list) => {
        if (list.getEntries().length) {
          po.disconnect();
          setTimeout(finish, 300);
        }
      });
      po.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      /* sin soporte: espera al timeout */
    }
    setTimeout(finish, maxWait);
  });
}
