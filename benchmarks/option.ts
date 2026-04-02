import 'overtake';
import { of } from '../src/option.ts';

const suite = benchmark('value', () => of(42))
                .feed('null', () => of(null));

const nalloc = suite.target('nalloc', async () => {
  const { Option } = await import('../build/index.js');
  return { Option };
});

nalloc.measure('fromNullable', ({ Option }, input) => {
  Option.fromNullable(input);
});
nalloc.measure('isSome', ({ Option }, input) => {
  Option.isSome(input);
});
nalloc.measure('isNone', ({ Option }, input) => {
  Option.isNone(input);
});
nalloc.measure('map', ({ Option }, input) => {
  Option.map(input, (x) => x * 2);
});
nalloc.measure('flatMap', ({ Option }, input) => {
  Option.flatMap(input, (x) => x * 2);
});
nalloc.measure('unwrapOr', ({ Option }, input) => {
  Option.unwrapOr(input, 0);
});
nalloc.measure('match', ({ Option }, input) => {
  Option.match(
    input,
    (x) => x * 2,
    () => 0,
  );
});
