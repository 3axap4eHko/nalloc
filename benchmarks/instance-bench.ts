import 'overtake';

const suite = benchmark('ops', () => null);

// Tagged (plain object)
const taggedTarget = suite.target('tagged', () => {
  const $tag = Symbol.for('@@tag');
  const OR = 1;
  const orTagged = (...schemas: unknown[]) => ({ [$tag]: OR, schemas });
  const instance = orTagged(1, 2);
  const isTagged = (v: unknown): boolean => (v as { [$tag]?: number })?.[$tag] === OR;
  return { orTagged, instance, isTagged };
});

taggedTarget.measure('create', ({ orTagged }) => {
  orTagged(1, 2);
});

taggedTarget.measure('check', ({ instance, isTagged }) => {
  if (isTagged(instance)) return 1;
});

// Branded (function constructor)
const brandedTarget = suite.target('branded-fn', () => {
  const OP_BRAND = Symbol.for('@@op');
  const OR = 1;
  function OrCtor(this: { schemas: unknown[] }, schemas: unknown[]) {
    this.schemas = schemas;
  }
  OrCtor.prototype[OP_BRAND] = OR;
  const orBranded = (...schemas: unknown[]) => new (OrCtor as unknown as new (s: unknown[]) => { schemas: unknown[] })(schemas);
  const instance = orBranded(1, 2);
  const isOr = (v: unknown): boolean => (v as { [OP_BRAND]?: number })?.[OP_BRAND] === OR;
  return { orBranded, instance, isOr };
});

brandedTarget.measure('create', ({ orBranded }) => {
  orBranded(1, 2);
});

brandedTarget.measure('check', ({ instance, isOr }) => {
  if (isOr(instance)) return 1;
});

// Branded (class with instance property)
const classTarget = suite.target('class-instance', () => {
  const OP_BRAND = Symbol.for('@@op');
  const OR = 1;

  class OrClass {
    readonly [OP_BRAND] = OR;
    constructor(public schemas: unknown[]) {}
  }

  const orClass = (...schemas: unknown[]) => new OrClass(schemas);
  const instance = orClass(1, 2);
  const isOr = (v: unknown): boolean => (v as { [OP_BRAND]?: number })?.[OP_BRAND] === OR;
  return { orClass, instance, isOr };
});

classTarget.measure('create', ({ orClass }) => {
  orClass(1, 2);
});

classTarget.measure('check', ({ instance, isOr }) => {
  if (isOr(instance)) return 1;
});

// Branded (class with prototype-only brand)
const classProtoTarget = suite.target('class-proto', () => {
  const OP_BRAND = Symbol.for('@@op');
  const OR = 1;

  class OrClass {
    constructor(public schemas: unknown[]) {}
  }
  (OrClass.prototype as { [OP_BRAND]: number })[OP_BRAND] = OR;

  const orClass = (...schemas: unknown[]) => new OrClass(schemas);
  const instance = orClass(1, 2);
  const isOr = (v: unknown): boolean => (v as { [OP_BRAND]?: number })?.[OP_BRAND] === OR;
  return { orClass, instance, isOr };
});

classProtoTarget.measure('create', ({ orClass }) => {
  orClass(1, 2);
});

classProtoTarget.measure('check', ({ instance, isOr }) => {
  if (isOr(instance)) return 1;
});
