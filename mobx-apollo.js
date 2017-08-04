import { computed, extendObservable } from 'mobx';
import { fromResource } from 'mobx-utils';

const queryToObservable = (query, { onError, onFetch, prop }) => {
  let subscription;

  return fromResource(
    sink =>
      (subscription = query.subscribe({
        next: ({ data }) => {
          sink(Object.keys(data).length === 1 ? data[prop] : data);
          onFetch && onFetch(data);
        },
        error: error => onError && onError(error)
      })),
    () => subscription.unsubscribe()
  );
};

export const query = (obj, prop, descriptor) => {
  const decorated = descriptor.initializer;

  const { client, onError, onFetch, ...options } = decorated
    ? descriptor.initializer()
    : descriptor;

  const privateName = `_${prop}Subscription`;

  Object.defineProperty(obj, privateName, {
    value: queryToObservable(client.watchQuery(options), {
      onError,
      onFetch,
      prop
    })
  });

  if (decorated)
    return computed(obj, prop, {
      get() {
        return this[privateName].current();
      }
    });

  extendObservable(obj, {
    [prop]: computed(() => obj[privateName].current())
  });
};