import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import type * as ts from 'typescript';

interface RuleDocs {
  description: string;
  requiresTypeChecking?: boolean;
}

const createRule = ESLintUtils.RuleCreator<RuleDocs>((name) => `https://github.com/3axap4eHko/nalloc#${name}`);

const UNWRAP_NAMES: ReadonlySet<string> = new Set(['unwrap', 'unwrapErr', 'expect', 'expectErr']);
const DEFAULT_MODULES: readonly string[] = ['nalloc', 'nalloc/safe', 'nalloc/unsafe', 'nalloc/result', 'nalloc/option'];
const DEFAULT_TYPE_NAMES: readonly string[] = ['Result', 'Ok', 'Err', 'Option', 'Some', 'None'];

function nallocTypeName(type: ts.Type, names: ReadonlySet<string>): string | undefined {
  const direct = type.aliasSymbol?.getName();
  if (direct !== undefined && names.has(direct)) {
    return direct;
  }
  if (type.isUnion()) {
    for (const member of type.types) {
      const name = member.aliasSymbol?.getName();
      if (name !== undefined && names.has(name)) {
        return name;
      }
    }
  }
  return undefined;
}

const mustUse = createRule<[{ typeNames?: string[] }], 'mustUse'>({
  name: 'must-use',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require Result and Option values to be handled instead of silently discarded',
      requiresTypeChecking: true,
    },
    messages: {
      mustUse: 'This {{name}} value is discarded. Handle it with match/unwrapOr/isErr/isNone, return it, or assign it.',
    },
    schema: [
      {
        type: 'object',
        properties: { typeNames: { type: 'array', items: { type: 'string' }, uniqueItems: true } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
  },
  create(context, [options]) {
    const names = new Set(options.typeNames ?? DEFAULT_TYPE_NAMES);
    const services = ESLintUtils.getParserServices(context);
    const check = (node: TSESTree.Expression): void => {
      const name = nallocTypeName(services.getTypeAtLocation(node), names);
      if (name !== undefined) {
        context.report({ node, messageId: 'mustUse', data: { name } });
      }
    };
    return {
      'ExpressionStatement > CallExpression'(node: TSESTree.CallExpression): void {
        check(node);
      },
      'ExpressionStatement > AwaitExpression'(node: TSESTree.AwaitExpression): void {
        check(node);
      },
    };
  },
});

const noUnwrap = createRule<[{ modules?: string[] }], 'noUnwrap'>({
  name: 'no-unwrap',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow unwrap and expect on Result and Option, which throw on failure',
    },
    messages: {
      noUnwrap: '{{name}} throws on failure. Handle the error with match/unwrapOr/isErr, or turn this rule off in test files.',
    },
    schema: [
      {
        type: 'object',
        properties: { modules: { type: 'array', items: { type: 'string' }, uniqueItems: true } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{}],
  },
  create(context, [options]) {
    const modules = new Set(options.modules ?? DEFAULT_MODULES);
    const namespaceLocals = new Set<string>();
    const directLocals = new Map<string, string>();
    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration): void {
        if (typeof node.source.value !== 'string' || !modules.has(node.source.value)) {
          return;
        }
        for (const spec of node.specifiers) {
          if (spec.type === 'ImportNamespaceSpecifier') {
            namespaceLocals.add(spec.local.name);
          } else if (spec.type === 'ImportSpecifier' && spec.imported.type === 'Identifier') {
            const imported = spec.imported.name;
            if (imported === 'Result' || imported === 'Option') {
              namespaceLocals.add(spec.local.name);
            } else if (UNWRAP_NAMES.has(imported)) {
              directLocals.set(spec.local.name, imported);
            }
          }
        }
      },
      CallExpression(node: TSESTree.CallExpression): void {
        const callee = node.callee;
        if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier' && callee.object.type === 'Identifier') {
          if (UNWRAP_NAMES.has(callee.property.name) && namespaceLocals.has(callee.object.name)) {
            context.report({ node: callee, messageId: 'noUnwrap', data: { name: callee.property.name } });
          }
          return;
        }
        if (callee.type === 'Identifier') {
          const imported = directLocals.get(callee.name);
          if (imported !== undefined) {
            context.report({ node: callee, messageId: 'noUnwrap', data: { name: imported } });
          }
        }
      },
    };
  },
});

export const rules = { 'must-use': mustUse, 'no-unwrap': noUnwrap };

const plugin: { meta: { name: string }; rules: typeof rules; configs: Record<string, unknown> } = {
  meta: { name: 'nalloc' },
  rules,
  configs: {},
};

plugin.configs.recommended = {
  plugins: { nalloc: plugin },
  rules: { 'nalloc/must-use': 'error', 'nalloc/no-unwrap': 'error' },
};

export { mustUse, noUnwrap };
export default plugin;
