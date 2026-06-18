import { parseSync } from 'oxc-parser';

/** A call site the codemod refused to convert, with the reason for manual review. */
export interface SkippedSite {
  readonly file: string;
  readonly line: number;
  readonly reason: 'result-async' | 'safe-try' | 'unsupported' | 'namespace-import';
  readonly text: string;
}

export interface MigrateFileResult {
  readonly output: string;
  readonly changed: boolean;
  readonly converted: number;
  readonly skipped: SkippedSite[];
}

interface Node {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

/** neverthrow instance method -> nalloc Result function. Ambiguous names (shared with Array/other types) convert only with provenance. */
const INSTANCE_METHODS: ReadonlyMap<string, { readonly fn: string; readonly ambiguous?: boolean }> = new Map([
  ['map', { fn: 'map', ambiguous: true }],
  ['mapErr', { fn: 'mapErr' }],
  ['andThen', { fn: 'flatMap' }],
  ['orElse', { fn: 'orElse' }],
  ['match', { fn: 'match' }],
  ['unwrapOr', { fn: 'unwrapOr' }],
  ['isOk', { fn: 'isOk' }],
  ['isErr', { fn: 'isErr' }],
  ['andTee', { fn: 'tap' }],
  ['orTee', { fn: 'tapErr' }],
  ['_unsafeUnwrap', { fn: 'unwrap' }],
  ['_unsafeUnwrapErr', { fn: 'unwrapErr' }],
]);

const ASYNC_INSTANCE_METHODS: ReadonlySet<string> = new Set(['asyncMap', 'asyncAndThen', 'asyncAndThrough']);
const UNSUPPORTED_INSTANCE_METHODS: ReadonlySet<string> = new Set(['andThrough', 'safeUnwrap']);

/** neverthrow module-level names that produce ResultAsync - left on neverthrow, reported for manual genAsync migration. */
const ASYNC_IMPORTS: ReadonlySet<string> = new Set(['ResultAsync', 'okAsync', 'errAsync', 'fromSafePromise', 'fromAsyncThrowable']);

const STATIC_METHODS: ReadonlyMap<string, string> = new Map([
  ['fromThrowable', 'wrap'],
  ['combine', 'all'],
  ['combineWithAllErrors', 'collectAll'],
]);

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && typeof (value as Node).type === 'string';
}

function eachChild(node: Node, visit: (child: Node) => void): void {
  for (const key of Object.keys(node)) {
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isNode(item)) visit(item);
      }
    } else if (isNode(value)) {
      visit(value);
    }
  }
}

function annotationTypeName(id: Node): string | undefined {
  const annotation = id.typeAnnotation as Node | null;
  const ref = annotation?.typeAnnotation as Node | undefined;
  if (ref?.type !== 'TSTypeReference') return undefined;
  const typeName = ref.typeName as Node;
  return typeName.type === 'Identifier' ? (typeName.name as string) : undefined;
}

interface ImportedNames {
  /** local name -> imported name, for every value imported from neverthrow */
  readonly locals: Map<string, string>;
  /** import declarations to replace */
  readonly declarations: Node[];
  readonly hasNamespace: boolean;
}

function collectImports(program: Node): ImportedNames {
  const locals = new Map<string, string>();
  const declarations: Node[] = [];
  let hasNamespace = false;
  for (const stmt of program.body as Node[]) {
    if (stmt.type !== 'ImportDeclaration' || (stmt.source as Node & { value: string }).value !== 'neverthrow') continue;
    declarations.push(stmt);
    for (const spec of stmt.specifiers as Node[]) {
      if (spec.type === 'ImportNamespaceSpecifier') {
        hasNamespace = true;
      } else if (spec.type === 'ImportSpecifier') {
        const imported = spec.imported as Node;
        if (imported.type === 'Identifier') {
          locals.set((spec.local as Node).name as string, imported.name as string);
        }
      }
    }
  }
  return { locals, declarations, hasNamespace };
}

class FileMigration {
  readonly edits: Edit[] = [];
  readonly skipped: SkippedSite[] = [];
  /** identifiers proven to hold a (migrated) Result */
  readonly resultIds = new Set<string>();
  /** identifiers holding neverthrow ResultAsync values - never convert methods on these */
  readonly asyncIds = new Set<string>();
  /** identifiers bound to fromThrowable-wrapped functions - their call results are Results */
  readonly wrappedFns = new Set<string>();
  /** local functions declared to return Result */
  readonly resultFns = new Set<string>();
  /** identifiers also bound to something unclassifiable - provenance dropped */
  readonly conflicted = new Set<string>();
  readonly residualNames = new Set<string>();
  converted = 0;
  needsNamespace = false;
  needsPipe = false;
  needsResultType = false;
  readonly usedTypeNames = new Set<string>();

  constructor(
    readonly file: string,
    readonly source: string,
    readonly imports: ImportedNames,
  ) {}

  importedAs(local: string): string | undefined {
    return this.imports.locals.get(local);
  }

  isFromPromiseCall(node: Node): boolean {
    return (
      node.type === 'CallExpression' && (node.callee as Node).type === 'Identifier' && this.importedAs((node.callee as Node).name as string) === 'fromPromise'
    );
  }

  lineOf(offset: number): number {
    let line = 1;
    for (let i = 0; i < offset; i++) {
      if (this.source.charCodeAt(i) === 10) line++;
    }
    return line;
  }

  report(reason: SkippedSite['reason'], node: Node): void {
    this.skipped.push({
      file: this.file,
      line: this.lineOf(node.start),
      reason,
      text: this.source.slice(node.start, Math.min(node.end, node.start + 120)),
    });
  }

  /** Classifies an expression as a migrated Result ('result'), a neverthrow ResultAsync ('async'), or unknown. */
  classify(node: Node): 'result' | 'async' | undefined {
    if (node.type === 'Identifier') {
      const name = node.name as string;
      if (this.conflicted.has(name)) return undefined;
      if (this.asyncIds.has(name)) return 'async';
      if (this.resultIds.has(name)) return 'result';
      return undefined;
    }
    if (node.type === 'AwaitExpression') {
      // a directly-awaited fromPromise is converted to Result.fromPromise, so its result is a migrated Result;
      // awaiting any other ResultAsync yields a neverthrow Result instance, which must stay on neverthrow
      if (this.isFromPromiseCall(node.argument as Node)) return 'result';
      return this.classify(node.argument as Node) === 'async' ? 'async' : undefined;
    }
    if (node.type === 'CallExpression') {
      const callee = node.callee as Node;
      if (callee.type === 'Identifier') {
        const name = callee.name as string;
        const imported = this.importedAs(name);
        if (imported === 'ok' || imported === 'err' || imported === 'combine' || imported === 'combineWithAllErrors') return 'result';
        if (imported !== undefined && (ASYNC_IMPORTS.has(imported) || imported === 'fromPromise')) return 'async';
        if (this.wrappedFns.has(name) || this.resultFns.has(name)) return 'result';
        return undefined;
      }
      if (callee.type === 'MemberExpression' && !(callee.computed as boolean)) {
        const property = callee.property as Node;
        const object = callee.object as Node;
        if (property.type !== 'Identifier') return undefined;
        const method = property.name as string;
        if (object.type === 'Identifier') {
          const objImported = this.importedAs(object.name as string);
          if (objImported === 'Result' && STATIC_METHODS.has(method)) {
            return method === 'fromThrowable' ? undefined : 'result';
          }
          if (objImported === 'ResultAsync') return 'async';
        }
        const receiver = this.classify(object);
        if (receiver === 'async') return 'async';
        if (receiver === 'result') {
          if (ASYNC_INSTANCE_METHODS.has(method)) return 'async';
          if (INSTANCE_METHODS.has(method)) return 'result';
        }
        return undefined;
      }
    }
    return undefined;
  }

  classifyBinding(id: Node, init: Node | null): void {
    if (id.type !== 'Identifier') return;
    const name = id.name as string;
    const typeName = annotationTypeName(id);
    const annotated = typeName !== undefined ? this.importedAs(typeName) : undefined;
    const fromInit = ((): 'result' | 'async' | 'wrapped' | undefined => {
      if (init === null) return undefined;
      if (init.type === 'CallExpression') {
        const callee = init.callee as Node;
        const calleeImported = callee.type === 'Identifier' ? this.importedAs(callee.name as string) : undefined;
        if (calleeImported === 'fromThrowable') return 'wrapped';
        if (callee.type === 'MemberExpression') {
          const object = callee.object as Node;
          const property = callee.property as Node;
          if (
            object.type === 'Identifier' &&
            property.type === 'Identifier' &&
            this.importedAs(object.name as string) === 'Result' &&
            property.name === 'fromThrowable'
          ) {
            return 'wrapped';
          }
        }
      }
      return this.classify(init);
    })();
    const kind = annotated === 'Result' || annotated === 'Ok' || annotated === 'Err' ? 'result' : annotated === 'ResultAsync' ? 'async' : fromInit;
    if (kind === 'result') {
      this.addClassified(name, this.resultIds);
    } else if (kind === 'async') {
      this.addClassified(name, this.asyncIds);
    } else if (kind === 'wrapped') {
      this.addClassified(name, this.wrappedFns);
    } else {
      // a second, unclassifiable binding of a known name poisons its provenance
      if (this.resultIds.has(name) || this.asyncIds.has(name) || this.wrappedFns.has(name)) {
        this.conflicted.add(name);
      }
    }
  }

  addClassified(name: string, target: Set<string>): void {
    if ((this.resultIds.has(name) || this.asyncIds.has(name) || this.wrappedFns.has(name)) && !target.has(name)) {
      this.conflicted.add(name);
      return;
    }
    target.add(name);
  }

  collectProvenance(node: Node): void {
    if (node.type === 'VariableDeclarator') {
      this.classifyBinding(node.id as Node, node.init as Node | null);
    } else if (node.type === 'AssignmentExpression' && node.operator === '=') {
      this.classifyBinding(node.left as Node, node.right as Node);
    } else if (node.type === 'FunctionDeclaration' || node.type === 'TSDeclareFunction') {
      const id = node.id as Node | null;
      const returnType = node.returnType as Node | null;
      if (id?.type === 'Identifier' && returnType !== null) {
        const ref = returnType.typeAnnotation as Node;
        if (ref.type === 'TSTypeReference' && (ref.typeName as Node).type === 'Identifier') {
          const imported = this.importedAs((ref.typeName as Node).name as string);
          if (imported === 'Result') this.resultFns.add(id.name as string);
        }
      }
      for (const param of node.params as Node[]) {
        this.classifyBinding(param, null);
      }
    } else if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
      for (const param of node.params as Node[]) {
        this.classifyBinding(param, null);
      }
    }
    eachChild(node, (child) => this.collectProvenance(child));
  }

  /** Removes and returns collected edits falling inside a span. */
  takeEditsWithin(start: number, end: number): Edit[] {
    const inside: Edit[] = [];
    for (let i = this.edits.length - 1; i >= 0; i--) {
      const edit = this.edits[i];
      if (edit.start >= start && edit.end <= end) {
        inside.push(edit);
        this.edits.splice(i, 1);
      }
    }
    return inside;
  }

  /** Renders a source span with any already-collected nested edits applied. */
  render(start: number, end: number): string {
    const inside = this.takeEditsWithin(start, end).sort((a, b) => b.start - a.start);
    let text = this.source.slice(start, end);
    for (const edit of inside) {
      text = text.slice(0, edit.start - start) + edit.text + text.slice(edit.end - start);
    }
    return text;
  }

  renderArgs(args: Node[]): string {
    if (args.length === 0) return '';
    return this.render(args[0].start, args[args.length - 1].end);
  }

  convert(node: Node, parent: Node | undefined, grandparent: Node | undefined): void {
    if (node.type === 'TSTypeReference') {
      const typeName = node.typeName as Node;
      if (typeName.type === 'Identifier') {
        const imported = this.importedAs(typeName.name as string);
        if (imported === 'Result') {
          this.edits.push({ start: typeName.start, end: typeName.end, text: 'ResultType' });
          this.needsResultType = true;
        } else if (imported === 'Ok' || imported === 'Err') {
          this.usedTypeNames.add(imported);
        }
      }
    }

    if (node.type === 'CallExpression') {
      // an outer convertible chain link processes this node itself; skip to avoid double conversion
      const consumedByOuterChain =
        parent?.type === 'MemberExpression' &&
        parent.object === node &&
        !(parent.computed as boolean) &&
        (parent.property as Node).type === 'Identifier' &&
        grandparent?.type === 'CallExpression' &&
        grandparent.callee === parent &&
        (INSTANCE_METHODS.has((parent.property as Node).name as string) ||
          ASYNC_INSTANCE_METHODS.has((parent.property as Node).name as string) ||
          UNSUPPORTED_INSTANCE_METHODS.has((parent.property as Node).name as string));
      if (!consumedByOuterChain && this.convertCall(node)) return;
    }

    eachChild(node, (child) => this.convert(child, node, parent));
  }

  /** Returns true when the node was fully handled (children already converted as needed). */
  convertCall(node: Node): boolean {
    const callee = node.callee as Node;

    if (callee.type === 'Identifier') {
      const imported = this.importedAs(callee.name as string);
      if (imported === undefined) return false;
      if (imported === 'fromThrowable' || imported === 'combine' || imported === 'combineWithAllErrors') {
        this.edits.push({ start: callee.start, end: callee.end, text: `Result.${STATIC_METHODS.get(imported)}` });
        this.needsNamespace = true;
        this.converted++;
        return false;
      }
      if (imported === 'safeTry') {
        this.report('safe-try', node);
        this.residualNames.add(callee.name as string);
        return false;
      }
      if (ASYNC_IMPORTS.has(imported)) {
        this.report('result-async', node);
        this.residualNames.add(callee.name as string);
        return false;
      }
      return false;
    }

    if (callee.type !== 'MemberExpression' || (callee.computed as boolean) || (callee.property as Node).type !== 'Identifier') {
      return false;
    }
    const object = callee.object as Node;
    const method = (callee.property as Node).name as string;

    if (object.type === 'Identifier') {
      const objImported = this.importedAs(object.name as string);
      if (objImported === 'Result' && STATIC_METHODS.has(method)) {
        this.edits.push({ start: callee.start, end: callee.end, text: `Result.${STATIC_METHODS.get(method)}` });
        this.needsNamespace = true;
        this.converted++;
        return false;
      }
      if (objImported === 'ResultAsync') {
        this.report('result-async', node);
        this.residualNames.add(object.name as string);
        return false;
      }
    }

    if (!INSTANCE_METHODS.has(method) && !ASYNC_INSTANCE_METHODS.has(method) && !UNSUPPORTED_INSTANCE_METHODS.has(method)) {
      return false;
    }

    // collect the full chain from this outermost call down to its base receiver
    const links: { call: Node; method: string }[] = [];
    let current: Node = node;
    let blocked: SkippedSite['reason'] | undefined;
    while (true) {
      const currentCallee = current.callee as Node;
      const currentMethod = (currentCallee.property as Node).name as string;
      if (ASYNC_INSTANCE_METHODS.has(currentMethod)) {
        blocked = 'result-async';
        break;
      }
      if (UNSUPPORTED_INSTANCE_METHODS.has(currentMethod)) {
        blocked = 'unsupported';
        break;
      }
      links.unshift({ call: current, method: currentMethod });
      const receiver = currentCallee.object as Node;
      if (
        receiver.type === 'CallExpression' &&
        (receiver.callee as Node).type === 'MemberExpression' &&
        !((receiver.callee as Node).computed as boolean) &&
        ((receiver.callee as Node).property as Node).type === 'Identifier' &&
        (INSTANCE_METHODS.has(((receiver.callee as Node).property as Node).name as string) ||
          ASYNC_INSTANCE_METHODS.has(((receiver.callee as Node).property as Node).name as string) ||
          UNSUPPORTED_INSTANCE_METHODS.has(((receiver.callee as Node).property as Node).name as string))
      ) {
        current = receiver;
        continue;
      }
      break;
    }

    if (blocked !== undefined) {
      // converting inner links would leave a neverthrow method called on a nalloc value
      this.report(blocked, node);
      const blockedCall = current;
      eachChild(node, (child) => {
        if (child !== blockedCall) this.convert(child, node, undefined);
      });
      return true;
    }

    const base = (links[0].call.callee as Node).object as Node;
    const baseKind = this.classify(base);
    if (baseKind === 'async') {
      this.report('result-async', node);
      return true;
    }
    const hasExclusive = links.some((link) => !INSTANCE_METHODS.get(link.method)!.ambiguous);
    if (baseKind !== 'result' && !hasExclusive) {
      // unprovable receiver and only ambiguous methods (e.g. bare .map) - almost certainly not a Result
      return false;
    }

    // convert nested code inside the base and every argument first, so render() picks the edits up
    this.convert(base, undefined, undefined);
    for (const link of links) {
      for (const arg of link.call.arguments as Node[]) {
        this.convert(arg, link.call, undefined);
      }
    }

    const baseText = this.render(base.start, base.end);
    this.needsNamespace = true;
    this.converted += links.length;
    const replacement = ((): string => {
      if (links.length === 1) {
        const { fn } = INSTANCE_METHODS.get(links[0].method)!;
        const args = this.renderArgs(links[0].call.arguments as Node[]);
        return `Result.${fn}(${baseText}${args.length > 0 ? `, ${args}` : ''})`;
      }
      this.needsPipe = true;
      const steps = links.map((link) => {
        const { fn } = INSTANCE_METHODS.get(link.method)!;
        const args = this.renderArgs(link.call.arguments as Node[]);
        return `($r) => Result.${fn}($r${args.length > 0 ? `, ${args}` : ''})`;
      });
      return `pipe(${baseText}, ${steps.join(', ')})`;
    })();
    this.edits.push({ start: node.start, end: node.end, text: replacement });
    return true;
  }

  readonly awaitedFromPromise = new Set<Node>();

  /** Direct `await fromPromise(...)` resolves to a plain Result and maps 1:1 to nalloc. */
  convertAwaitedFromPromise(node: Node): void {
    if (node.type === 'AwaitExpression' && this.isFromPromiseCall(node.argument as Node)) {
      const call = node.argument as Node;
      this.edits.push({ start: (call.callee as Node).start, end: (call.callee as Node).end, text: 'Result.fromPromise' });
      this.awaitedFromPromise.add(call);
      this.needsNamespace = true;
      this.converted++;
    }
    eachChild(node, (child) => this.convertAwaitedFromPromise(child));
  }

  reportUnconvertedFromPromise(node: Node): void {
    if (this.isFromPromiseCall(node) && !this.awaitedFromPromise.has(node)) {
      this.report('result-async', node);
      this.residualNames.add((node.callee as Node).name as string);
    }
    eachChild(node, (child) => this.reportUnconvertedFromPromise(child));
  }

  rewriteImports(): void {
    const valueNames: string[] = [];
    const typeNames: string[] = [];
    for (const [local, imported] of this.imports.locals) {
      if (imported === 'ok' || imported === 'err') {
        valueNames.push(imported === local ? imported : `${imported} as ${local}`);
      }
    }
    if (this.needsNamespace) valueNames.push('Result');
    if (this.needsPipe) valueNames.push('pipe');
    if (this.needsResultType) typeNames.push('type ResultType');
    for (const name of this.usedTypeNames) typeNames.push(`type ${name}`);

    const statements: string[] = [];
    const names = [...valueNames, ...typeNames];
    if (names.length > 0) {
      statements.push(`import { ${names.join(', ')} } from 'nalloc';`);
    }
    const residual = [...this.residualNames].map((local) => {
      const imported = this.importedAs(local)!;
      return imported === local ? imported : `${imported} as ${local}`;
    });
    if (residual.length > 0) {
      statements.push(`import { ${residual.join(', ')} } from 'neverthrow';`);
    }

    const [first, ...rest] = this.imports.declarations;
    this.edits.push({ start: first.start, end: first.end, text: statements.join('\n') });
    for (const decl of rest) {
      const end = this.source.charCodeAt(decl.end) === 10 ? decl.end + 1 : decl.end;
      this.edits.push({ start: decl.start, end, text: '' });
    }
  }

  apply(): string {
    const sorted = [...this.edits].sort((a, b) => b.start - a.start);
    let output = this.source;
    for (const edit of sorted) {
      output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
    }
    return output;
  }
}

/**
 * Migrates one source file from neverthrow to nalloc.
 * Pure function: parses, rewrites provable sites via text splices (formatting preserved),
 * and reports everything it refuses to convert.
 * @param source - The file's source text
 * @param file - File path used in the report
 * @returns The migrated source, whether it changed, and the skipped sites
 */
export function migrateSource(source: string, file: string): MigrateFileResult {
  const parsed = parseSync(file, source);
  if (parsed.errors.some((e) => e.severity === 'Error')) {
    return {
      output: source,
      changed: false,
      converted: 0,
      skipped: [{ file, line: 1, reason: 'unsupported', text: 'file has parse errors' }],
    };
  }
  const program = parsed.program as unknown as Node;
  const imports = collectImports(program);
  if (imports.declarations.length === 0) {
    return { output: source, changed: false, converted: 0, skipped: [] };
  }
  const migration = new FileMigration(file, source, imports);
  if (imports.hasNamespace) {
    migration.report('namespace-import', imports.declarations[0]);
    return { output: source, changed: false, converted: 0, skipped: migration.skipped };
  }
  migration.collectProvenance(program);
  migration.convertAwaitedFromPromise(program);
  migration.convert(program, undefined, undefined);
  migration.reportUnconvertedFromPromise(program);
  migration.rewriteImports();
  const output = migration.apply();
  return {
    output,
    changed: output !== source,
    converted: migration.converted,
    skipped: migration.skipped,
  };
}

export interface MigrationReport {
  readonly filesChanged: number;
  readonly converted: number;
  readonly skipped: readonly SkippedSite[];
}

/** Renders the skipped-site report as markdown for --report. */
export function renderReport(report: MigrationReport): string {
  const lines = [
    '# nalloc migration report',
    '',
    `Files changed: ${report.filesChanged}. Sites converted: ${report.converted}. Sites needing manual review: ${report.skipped.length}.`,
    '',
  ];
  const byFile = new Map<string, SkippedSite[]>();
  for (const site of report.skipped) {
    const sites = byFile.get(site.file);
    if (sites === undefined) {
      byFile.set(site.file, [site]);
    } else {
      sites.push(site);
    }
  }
  for (const [file, sites] of byFile) {
    lines.push(`## ${file}`, '');
    for (const site of sites) {
      lines.push(`- line ${site.line} [${site.reason}]: \`${site.text}\``);
    }
    lines.push('');
  }
  return lines.join('\n');
}
