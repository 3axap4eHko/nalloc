import 'overtake';

const suite = benchmark('value', () => 42)
  .feed('json valid', () => '{"foo":"bar"}')
  .feed('json invalid', () => 'not json');

const published = suite.target('published', async () => {
  const { Result, ok, err } = await import('nalloc');
  return { Result, ok, err };
});

published.measure('ok', ({ ok }, input) => {
  ok(input);
});
published.measure('err', ({ err }, input) => {
  err(input);
});
published.measure('tryCatch', ({ Result }, input) => {
  Result.tryCatch(() => JSON.parse(String(input)));
});
published.measure('map', ({ Result, ok }, input) => {
  Result.map(ok(input), (x) => x);
});
published.measure('flatMap', ({ Result, ok }, input) => {
  Result.flatMap(ok(input), (x) => ok(x));
});
published.measure('unwrapOr', ({ Result, ok }, input) => {
  Result.unwrapOr(ok(input), 0);
});
published.measure('match', ({ Result, ok }, input) => {
  Result.match(
    ok(input),
    (x) => x,
    () => 0,
  );
});
published.measure('isOk', ({ Result, ok }, input) => {
  Result.isOk(ok(input));
});
published.measure('isErr', ({ Result, err }, input) => {
  Result.isErr(err(input));
});

const local = suite.target('local', async () => {
  const { Result, ok, err } = await import('../build/index.js');
  return { Result, ok, err };
});

local.measure('ok', ({ ok }, input) => {
  ok(input);
});
local.measure('err', ({ err }, input) => {
  err(input);
});
local.measure('tryCatch', ({ Result }, input) => {
  Result.tryCatch(() => JSON.parse(String(input)));
});
local.measure('map', ({ Result, ok }, input) => {
  Result.map(ok(input), (x) => x);
});
local.measure('flatMap', ({ Result, ok }, input) => {
  Result.flatMap(ok(input), (x) => ok(x));
});
local.measure('unwrapOr', ({ Result, ok }, input) => {
  Result.unwrapOr(ok(input), 0);
});
local.measure('match', ({ Result, ok }, input) => {
  Result.match(
    ok(input),
    (x) => x,
    () => 0,
  );
});
local.measure('isOk', ({ Result, ok }, input) => {
  Result.isOk(ok(input));
});
local.measure('isErr', ({ Result, err }, input) => {
  Result.isErr(err(input));
});
