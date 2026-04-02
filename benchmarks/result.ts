import 'overtake';

const suite = benchmark('value', () => 42)
  .feed('json valid', () => '{"foo":"bar"}')
  .feed('json invalid', () => 'not json');

const nalloc = suite.target('nalloc', async () => {
  const { Result, ok, err } = await import('../build/index.js');
  return { Result, ok, err };
});

nalloc.measure('ok', ({ ok }, input) => {
  ok(input);
});
nalloc.measure('err', ({ err }, input) => {
  err(input);
});
nalloc.measure('tryCatch', ({ Result }, input) => {
  Result.tryCatch(() => JSON.parse(String(input)));
});
nalloc.measure('map', ({ Result, ok }, input) => {
  Result.map(ok(input), (x) => x);
});
nalloc.measure('flatMap', ({ Result, ok }, input) => {
  Result.flatMap(ok(input), (x) => ok(x));
});
nalloc.measure('unwrapOr', ({ Result, ok }, input) => {
  Result.unwrapOr(ok(input), 0);
});
nalloc.measure('match', ({ Result, ok }, input) => {
  Result.match(
    ok(input),
    (x) => x,
    () => 0,
  );
});
nalloc.measure('isOk', ({ Result, ok }, input) => {
  Result.isOk(ok(input));
});
nalloc.measure('isErr', ({ Result, err }, input) => {
  Result.isErr(err(input));
});
