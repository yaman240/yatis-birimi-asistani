export function createPriceListenerController({ subscribe, onSnapshot, onError, onClear }) {
  let unsubscribe = null;
  let generation = 0;

  const stop = () => {
    generation += 1;
    unsubscribe?.();
    unsubscribe = null;
    onClear();
  };

  const start = () => {
    stop();
    const currentGeneration = generation;
    unsubscribe = subscribe(
      snapshot => {
        if (currentGeneration === generation) onSnapshot(snapshot);
      },
      error => {
        if (currentGeneration === generation) onError(error);
      }
    );
  };

  return Object.freeze({ start, stop });
}
