# TypeScript patterns

Code examples for each rule in `SKILL.md`. The underlying principles are language-agnostic. See `../pstack/references/principles.md#type-system-discipline` and `../pstack/references/principles.md#boundary-discipline`.

## Branded types

Brand primitives so they cannot be mixed up. Validate once at the boundary. Downstream code trusts the type.

```ts
type AgentId = string & { readonly __brand: "AgentId" };

function parseAgentId(input: string): AgentId {
  if (!isUUID(input)) throw new Error(`Invalid agent id: ${input}`);
  return input as AgentId;
}

function focusAgent(id: AgentId): void {
  /* input is trusted */
}
```

Match the `readonly __brand: "X"` shape. Do not invent a new convention.

## Discriminated unions

Model variants with a literal discriminant. Every variant shares the field name and each value is unique, so impossible combinations cannot be represented.

```ts
// Don't. A boolean plus optionals lets contradictory states exist.
type DiffState = { loading: boolean; diff?: GitDiff; error?: string };

// Do. Only valid states exist.
type DiffState =
  | { kind: "loading" }
  | { kind: "ready"; diff: GitDiff }
  | { kind: "error"; error: string };
```

Pick one discriminant name (`kind`, `type`, `tag`) and stick to it.

## Constructive modeling

Build the type from parts that are all legal, instead of restricting a loose type with runtime checks.

Non-empty, via a variadic tuple:

```ts
type NonEmpty<T> = [T, ...T[]];

// Don't. T[] plus a length check every caller must repeat.
function pickWinner(entries: string[]): string {
  if (entries.length === 0) throw new Error("no entries");
  return entries[Math.floor(Math.random() * entries.length)];
}

// Do. An empty value of the type cannot exist.
function pickWinner(entries: NonEmpty<string>): string {
  return entries[Math.floor(Math.random() * entries.length)];
}
```

Even-length, via a pairwise tuple:

```ts
type Pairs<T> = [T, T][];
```

A range as start plus duration, not two timestamps you must keep ordered:

```ts
// Don't. Nothing prevents end < start.
type Range = { start: number; end: number };

// Do. Duration cannot be negative if you parse it at the boundary.
type Range = { start: number; duration: number };
```

## Simplest total type

Do not strengthen everything. Keep `T[]` when every operation on it is total.

```ts
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0); // [] is 0, fine
```

Strengthen when the loose type forces a lie at a use site. The tells are `!`, `arr[0] as T`, and a "should never happen" throw.

```ts
// Don't. Partiality smuggled past the compiler.
function newestSession(sessions: Session[]): Session {
  return sessions.at(0)!;
}

// Do. Strengthen the input; the assertion disappears.
function newestSession(sessions: NonEmpty<Session>): Session {
  return sessions[0];
}
```

Weakening the result to `Session | undefined` is the other total signature.

## `unknown` over `any`

External data is always `unknown`. Narrow before use.

```ts
// Don't
function handle(input: any) {
  return input.foo.bar;
}

// Do
function handle(input: unknown) {
  if (typeof input === "object" && input !== null && "foo" in input) {
    // narrowed; the compiler verifies access
  }
}
```

External sources: RPC payloads, `JSON.parse`, `postMessage`, IPC, file contents, environment variables, database results.

## Schemas before hand-rolled guards

Before writing a property-by-property type guard for external data, look for the repository's runtime schema library and existing schemas. Let one schema own validation and derive the type from it. Do not maintain a schema, a duplicate interface, and a guard that drift apart.

```ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["admin", "member"]),
});

type User = z.infer<typeof UserSchema>;

function parseUser(input: unknown): User {
  return UserSchema.parse(input);
}
```

Use `safeParse` when failure is an expected branch. Use the equivalent inference helper when the repository uses another schema library. Do not add a new schema dependency for one guard: prefer the system the codebase already trusts.

## No `as` casts

Every cast is a potential runtime crash. Cast only after the type system has verified the claim.

```ts
// Don't
const user = data as User;

// Do. Earn the cast at the boundary.
function parseUser(data: unknown): User {
  if (typeof data !== "object" || data === null) throw new Error("expected object");
  if (!("id" in data) || typeof (data as Record<string, unknown>).id !== "string") {
    throw new Error("expected id");
  }
  // ... validate the remaining fields
  return data as User; // OK: earned after full validation
}
```

When removing an `as` from existing code, identify why the compiler cannot infer it:

- Missing discriminant: add one and switch to a discriminated union.
- Overly wide source type such as `Record<string, unknown>`: narrow it.
- Untyped boundary: add a parse function or a schema.
- Genuinely inexpressible: use a branded type or `satisfies`.

## Narrowing hierarchy

Best to last resort:

1. **Discriminated union switch or if.** The compiler narrows automatically.
2. **`in` operator.** `"key" in obj` narrows to the variants containing that key.
3. **`typeof` and `instanceof`.** For primitives and class instances.
4. **A user-defined type guard.** When the above are not enough.
5. **An `as` cast.** Only after validation.

```ts
function area(s: Shape): number {
  if ("radius" in s) return Math.PI * s.radius ** 2; // narrowed to circle
  return s.width * s.height; // narrowed to rect
}
```

## Type guards

A guard must verify its claim. A lying guard is worse than a cast.

```ts
function isCircle(s: Shape): s is Shape & { kind: "circle" } {
  return s.kind === "circle";
}
```

Prefer discriminant narrowing where possible.

## Exhaustiveness

In the default arm, assign the discriminant to a `never`-typed local.

```ts
// Value-returning switch
function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.radius ** 2;
    case "rect":
      return s.width * s.height;
    default: {
      const _exhaustive: never = s;
      return _exhaustive;
    }
  }
}

// Statement switch
function handle(s: Shape): void {
  switch (s.kind) {
    case "circle":
      drawCircle(s);
      break;
    case "rect":
      drawRect(s);
      break;
    default: {
      const _exhaustive: never = s;
      void _exhaustive;
    }
  }
}
```

Return-style in a value-returning switch, void-style in a statement switch.

## `satisfies` over `as`

`satisfies` validates without widening literal types.

```ts
// Don't. Widens and loses the literal types.
const config = { theme: "dark", cols: 3 } as Config;

// Do. Validates and preserves the literals.
const config = { theme: "dark", cols: 3 } satisfies Config;
// config.theme is "dark", not string
```

## Boundary validation

Validate once where data crosses in, and trust types inside. See `../pstack/references/principles.md#boundary-discipline`.

- **Wire formats** (protobuf, JSON-RPC): parse tolerating unknown fields so a forward-compatible change does not break an older client.
- **Persisted JSON:** a versioned blob with a try/catch around the parse.
- **Do not re-validate** deep in call chains.

## Schema-derived types

When a `.proto`, an OpenAPI spec, a GraphQL schema, or a database migration already defines the shape, derive from the generated types instead of duplicating them.

```ts
// Don't. A duplicate shape that drifts when the schema changes.
type CheckSummary = {
  totalCount: number;
  checks: { name: string; status: string }[];
};

// Do. Derive from the generated schema type.
import type { ChecksMessage } from "<generated module>";
function renderChecks(s: Pick<ChecksMessage, "totalCount" | "checks">) {
  /* ... */
}
```

Reach for `Pick`, `Omit`, `Parameters`, `ReturnType`, `Awaited`, and `typeof` before writing a new interface.

## Object args

```ts
// Don't. Swap two arguments and it still compiles.
openFile(uri, { startLineNumber: 10, startColumn: 1, endLineNumber: 10, endColumn: 1 });

// Do. Order-independent and self-documenting.
openFile({
  uri,
  selection: { startLineNumber: 10, startColumn: 1, endLineNumber: 10, endColumn: 1 },
});
```

Skip on hot paths: per-frame render, tokenizers, parsers, anything in a tight loop where the allocation cost matters.
