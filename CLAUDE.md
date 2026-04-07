# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development (Turbopack hot reload)
npm run dev

# Run tests
npm test
npm test -- --watch        # watch mode
npm test -- path/to/test   # single test file

# Lint
npm run lint

# Database
npx prisma migrate dev     # create and apply new migration
npm run db:reset           # force reset database
npx prisma generate        # regenerate Prisma client after schema changes

# Production
npm run build
npm run start
```

The dev server requires a Node compatibility shim via `NODE_OPTIONS` (set automatically by the npm script via `node-compat.cjs`).

## Architecture

**UIGen** is a Next.js 15 (App Router) application that lets users generate React components via natural language chat with an AI (Claude). Generated code lives in an in-memory virtual file system and is rendered in a live preview.

### Core Data Flow

```
User message → ChatContext → /api/chat (streaming) → Claude (Anthropic or Mock)
    → AI tool calls (str_replace_editor, file_manager) → VirtualFileSystem updated
    → FileSystemContext notifies → Editor + Preview re-render
    → If authenticated: persist project (messages + serialized FS) to SQLite
```

### Key Architectural Concepts

**Virtual File System (`src/lib/file-system.ts`)** — All generated code lives in memory. The `VirtualFileSystem` class manages an in-tree of nodes (files and directories), with serialization to/from JSON for DB persistence. AI tools operate on this FS.

**AI Integration (`src/app/api/chat/route.ts`)** — Uses Vercel AI SDK (`streamText`). The route deserializes the virtual FS from the request body, runs Claude with two tools:
- `str_replace_editor` — create/edit files via string replacement
- `file_manager` — rename/delete files

Max tokens: 10,000; max steps: 40. The model must always produce `/App.jsx` as the entry point (enforced via system prompt).

**LLM Provider (`src/lib/provider.ts`)** — Auto-detects `ANTHROPIC_API_KEY`. Falls back to a `MockLanguageModel` (returns deterministic dummy code) when the key is absent. Real model: `claude-haiku-4-5`.

**System Prompt (`src/lib/prompts/generation.tsx`)** — Instructs Claude to generate self-contained React components using Tailwind CSS, with `@/` import aliases, and `/App.jsx` as the required entry point.

**React Contexts** — Two global providers wrap the app:
- `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) — holds VirtualFileSystem state, exposes file operations
- `ChatContext` (`src/lib/contexts/chat-context.tsx`) — manages message history and AI streaming state

**Authentication (`src/lib/auth.ts`, `src/actions/index.ts`)** — JWT-based sessions (7-day, HTTP-only cookies) using `jose`. Bcrypt for password hashing. Anonymous users get a session-scoped ID; their work is not persisted to DB.

**Database** — Prisma + SQLite (`prisma/dev.db`). Two tables: `User` and `Project`. Projects store messages as JSON and the serialized virtual FS in a `data` column. Generated Prisma client is in `src/generated/prisma/`.

### Project Layout

```
src/
  app/
    api/chat/route.ts     # AI streaming endpoint
    [projectId]/          # Dynamic project page (loads saved project)
    page.tsx              # Home / landing
    main-content.tsx      # Root layout with resizable panels
  components/
    chat/                 # ChatInterface, MessageList, MessageInput
    editor/               # CodeEditor (Monaco), FileTree
    preview/              # Live preview iframe with Babel JSX transpilation
    auth/                 # Sign-in/sign-up dialogs
    ui/                   # shadcn/ui primitives
  actions/                # Next.js Server Actions (auth + project CRUD)
  lib/
    file-system.ts        # VirtualFileSystem implementation
    provider.ts           # Anthropic / Mock LLM factory
    auth.ts               # JWT helpers
    prisma.ts             # Prisma singleton
    prompts/              # System prompt for code generation
    tools/                # Zod-validated AI tool definitions
    contexts/             # FileSystemContext, ChatContext
    transform/            # JSX/code transformation utilities
prisma/
  schema.prisma           # DB schema (User, Project)
```

## Environment Variables

| Variable | Required | Notes |
|----------|----------|-------|
| `ANTHROPIC_API_KEY` | No | If absent, MockLanguageModel is used |
| `JWT_SECRET` | No | Defaults to `"development-secret-key"` in dev |

## Testing

Tests use **Vitest** + **React Testing Library** + **jsdom**. Test files live in `__tests__/` subdirectories throughout `src/`. The vitest config (`vitest.config.mts`) uses `vite-tsconfig-paths` so `@/` aliases resolve correctly in tests.
