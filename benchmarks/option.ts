import 'overtake';

const suite = benchmark('value', () => 42).feed('null', () => null);

const published = suite.target('published', async () => {
  const { Option } = await import('nalloc');
  return { Option };
});

published.measure('fromNullable', ({ Option }, input) => {
  Option.fromNullable(input);
});
published.measure('isSome', ({ Option }, input) => {
  Option.isSome(input);
});
published.measure('isNone', ({ Option }, input) => {
  Option.isNone(input);
});
published.measure('map', ({ Option }, input) => {
  Option.map(input, (x) => x * 2);
});
published.measure('flatMap', ({ Option }, input) => {
  Option.flatMap(input, (x) => x * 2);
});
published.measure('unwrapOr', ({ Option }, input) => {
  Option.unwrapOr(input, 0);
});
published.measure('match', ({ Option }, input) => {
  Option.match(
    input,
    (x) => x * 2,
    () => 0,
  );
});

const local = suite.target('local', async () => {
  const { Option } = await import('../build/index.js');
  return { Option };
});

local.measure('fromNullable', ({ Option }, input) => {
  Option.fromNullable(input);
});
local.measure('isSome', ({ Option }, input) => {
  Option.isSome(input);
});
local.measure('isNone', ({ Option }, input) => {
  Option.isNone(input);
});
local.measure('map', ({ Option }, input) => {
  Option.map(input, (x) => x * 2);
});
local.measure('flatMap', ({ Option }, input) => {
  Option.flatMap(input, (x) => x * 2);
});
local.measure('unwrapOr', ({ Option }, input) => {
  Option.unwrapOr(input, 0);
});
local.measure('match', ({ Option }, input) => {
  Option.match(
    input,
    (x) => x * 2,
    () => 0,
  );
});
