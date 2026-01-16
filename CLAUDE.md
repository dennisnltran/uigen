# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in natural language, and Claude generates working React code with real-time preview. The application uses a virtual file system (no disk writes) and supports both anonymous and authenticated users.

## Development Commands

### Setup
```bash
npm run setup          # Install deps + generate Prisma client + run migrations
```

### Development
```bash
npm run dev            # Start dev server with Turbopack on localhost:3000
npm run dev:daemon     # Start dev server in background, logs to logs.txt
```

### Testing
```bash
npm test              # Run all tests with Vitest
npm test -- --watch   # Run tests in watch mode
npm test -- path/to/test.test.tsx  # Run specific test file
```

### Build & Lint
```bash
npm run build         # Production build
npm run lint          # Run ESLint
```

### Database
```bash
npx prisma generate          # Regenerate Prisma client (after schema changes)
npx prisma migrate dev       # Create and apply new migration
npm run db:reset             # Reset database (WARNING: deletes all data)
npx prisma studio            # Open Prisma Studio GUI
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **AI**: Anthropic Claude Haiku 4.5 via Vercel AI SDK
- **Database**: Prisma + SQLite
- **Auth**: JWT (jose) + bcrypt
- **UI**: React 19, Tailwind CSS v4, Radix UI, Monaco Editor
- **Transform**: Babel Standalone (browser-side JSX transformation)

### Core Data Flow

```
User Input → ChatInterface → ChatContext → /api/chat (streaming) →
Claude AI (with tool calls) → VirtualFileSystem (file operations) →
FileSystemContext → UI Components (Preview/Editor/FileTree)
                 ↓
           Database (on finish, auth users only)
```

### Key Architectural Patterns

1. **Virtual File System**: All file operations happen in-memory (no disk I/O)
   - Implementation: [src/lib/file-system.ts](src/lib/file-system.ts)
   - Supports create, read, update, delete, rename with auto-parent creation
   - Serializes to/from JSON for database storage
   - Path normalization handles `/`, `./`, `../` correctly

2. **AI Agentic Workflow**: Multi-step tool calling for iterative component generation
   - Entry: [src/app/api/chat/route.ts](src/app/api/chat/route.ts)
   - Tools: `str_replace_editor` (file CRUD), `file_manager` (rename/delete)
   - Max 40 steps for real AI, 4 steps for mock mode (no API key)
   - Streaming responses with `DataStreamResponse`

3. **Preview System**: Browser-side JSX transformation to live preview
   - Transformer: [src/lib/transform/jsx-transformer.ts](src/lib/transform/jsx-transformer.ts)
   - Uses Babel Standalone to transform JSX/TSX → JavaScript
   - Creates ES Module import map with Blob URLs
   - Third-party imports resolve to `esm.sh` CDN
   - Injects transformed code into sandboxed iframe

4. **State Management**: React Context API
   - `FileSystemContext`: Owns VirtualFileSystem, handles tool calls, triggers refreshes
   - `ChatContext`: Manages conversation, integrates with AI SDK
   - Both contexts coordinate to keep UI in sync

5. **Authentication**: JWT session management
   - Implementation: [src/lib/auth.ts](src/lib/auth.ts)
   - HTTP-only cookies (7-day expiration)
   - Middleware protection on `/api/projects`, `/api/filesystem`
   - Anonymous users can use app but data only persists in sessionStorage

### Database Schema

```prisma
User {
  id, email, password (bcrypt), projects[]
}

Project {
  id, name, userId?, messages (JSON), data (JSON), user?
}
```

- `messages`: Serialized conversation history (array of Message objects)
- `data`: Serialized VirtualFileSystem (key-value pairs of file paths → nodes)
- Prisma client generated to: `src/generated/prisma`

### AI Tool Integration

**Tools available to Claude:**
1. **str_replace_editor** ([src/lib/tools/str-replace.ts](src/lib/tools/str-replace.ts))
   - Commands: `view`, `create`, `str_replace`, `insert`
   - Operates on VirtualFileSystem paths
   - Supports line-based viewing with ranges
   - Text replacement and insertion at specific lines

2. **file_manager** ([src/lib/tools/file-manager.ts](src/lib/tools/file-manager.ts))
   - Commands: `rename_file`, `delete_file`
   - Handles recursive directory operations
   - Updates all child paths on rename

**Tool Call Flow:**
```
AI generates tool call → ChatContext receives event →
Executes tool function → Updates VirtualFileSystem →
Increments refreshTrigger → UI re-renders
```

### Import Resolution (Preview System)

The preview system resolves imports in this priority order:

1. **Absolute paths**: `/components/Button.jsx` → File in virtual FS
2. **Alias paths**: `@/components/Button` → `/components/Button.jsx` (tries .jsx, .tsx, .js, .ts)
3. **Relative paths**: `./Button.jsx`, `../utils/helper.js` → Resolved from current file's directory
4. **Third-party packages**: `lucide-react` → `https://esm.sh/lucide-react`
5. **Missing imports**: Create placeholder module to prevent errors

React and React-DOM always resolve to `esm.sh/react@19` and `esm.sh/react-dom@19`.

### Anonymous vs. Authenticated Users

| Feature | Anonymous | Authenticated |
|---------|-----------|---------------|
| Chat & Generation | ✅ | ✅ |
| File System | ✅ In-memory only | ✅ Persisted to DB |
| Project Saving | ❌ | ✅ |
| Multiple Projects | ❌ | ✅ |
| History Persistence | ❌ Lost on refresh | ✅ Persistent |

Anonymous work tracked in `sessionStorage` ([src/lib/anon-work-tracker.ts](src/lib/anon-work-tracker.ts)) but not migrated on sign-up.

## Important Development Notes

### Path Aliases
- `@/*` maps to `src/*` (configured in [tsconfig.json](tsconfig.json))
- Use `@/` prefix for all imports from `src/`

### Prisma Workflow
1. Modify [prisma/schema.prisma](prisma/schema.prisma)
2. Run `npx prisma migrate dev --name description_of_change`
3. Prisma client auto-regenerates to `src/generated/prisma`
4. Import via `import { prisma } from '@/lib/prisma'`

### Mock Provider (No API Key)
- When `ANTHROPIC_API_KEY` is missing, app uses mock provider
- Implementation: [src/lib/provider.ts](src/lib/provider.ts)
- Pre-generates Counter/Form/Card components based on user prompt keywords
- Simulates tool calls for realistic UX

### Testing
- Test files: `**/__tests__/*.test.tsx` or `*.test.ts`
- Uses Vitest + React Testing Library + jsdom
- Config: [vitest.config.mts](vitest.config.mts)
- All test utilities imported from `@testing-library/react` and `@testing-library/user-event`

### Preview System Limitations
- Only supports ES Module syntax (no CommonJS)
- Third-party packages must be available on esm.sh
- CSS imports extracted and injected as `<style>` tags
- Sandbox restrictions: No localStorage/cookies from parent context

### File System Best Practices
- Always use normalized paths (start with `/`)
- Parent directories auto-create (no need to manually create `/components` before `/components/Button.jsx`)
- Use `fileSystem.exists(path)` before reading to avoid errors
- Serialize/deserialize for persistence: `fileSystem.serialize()` → JSON → `VirtualFileSystem.deserialize(json)`

### Authentication Flow
1. **Sign Up**: Validate → Hash password (bcrypt, 10 rounds) → Create user → Set JWT cookie
2. **Sign In**: Verify password → Set JWT cookie
3. **Middleware**: Validates JWT on protected routes, returns 401 if invalid
4. **Session**: Stored in HTTP-only cookie, expires in 7 days

## Component Organization

```
src/
├── app/
│   ├── page.tsx                    # Home (redirects to project or shows anon UI)
│   ├── [projectId]/page.tsx        # Project page (loads project, initializes contexts)
│   ├── main-content.tsx            # Main layout: chat + preview/editor tabs
│   ├── layout.tsx                  # Root layout with providers
│   └── api/chat/route.ts           # Streaming AI chat endpoint
│
├── components/
│   ├── chat/                       # ChatInterface, MessageList, MessageInput, MarkdownRenderer
│   ├── editor/                     # CodeEditor (Monaco), FileTree
│   ├── preview/                    # PreviewFrame (iframe with transformed code)
│   ├── auth/                       # AuthDialog, SignInForm, SignUpForm
│   └── ui/                         # shadcn/ui components
│
├── lib/
│   ├── contexts/
│   │   ├── chat-context.tsx        # Conversation state + AI SDK integration
│   │   └── file-system-context.tsx # VirtualFileSystem wrapper + tool execution
│   ├── tools/
│   │   ├── str-replace.ts          # File CRUD tool for AI
│   │   └── file-manager.ts         # Rename/delete tool for AI
│   ├── transform/
│   │   └── jsx-transformer.ts      # JSX → JS + import map generation
│   ├── prompts/
│   │   └── system-prompt.ts        # Claude system instructions
│   ├── file-system.ts              # VirtualFileSystem class
│   ├── auth.ts                     # JWT session management
│   ├── provider.ts                 # AI model provider (Claude/Mock)
│   ├── prisma.ts                   # Prisma client singleton
│   └── anon-work-tracker.ts        # sessionStorage for anonymous users
│
└── actions/                        # Server Actions (create-project, get-project, get-projects)
```

## Environment Variables

```bash
# Optional - app works without it (uses mock provider)
ANTHROPIC_API_KEY=your-api-key-here

# Optional - defaults to dev secret if not set
JWT_SECRET=your-jwt-secret
```

## Key Files to Understand

1. **[src/lib/file-system.ts](src/lib/file-system.ts)** - Virtual file system implementation
2. **[src/app/api/chat/route.ts](src/app/api/chat/route.ts)** - AI streaming endpoint with tool calls
3. **[src/lib/transform/jsx-transformer.ts](src/lib/transform/jsx-transformer.ts)** - Preview transformation logic
4. **[src/lib/contexts/file-system-context.tsx](src/lib/contexts/file-system-context.tsx)** - File system state management
5. **[src/lib/contexts/chat-context.tsx](src/lib/contexts/chat-context.tsx)** - Chat state + AI integration
6. **[src/components/preview/PreviewFrame.tsx](src/components/preview/PreviewFrame.tsx)** - Live preview renderer
7. **[src/lib/prompts/system-prompt.ts](src/lib/prompts/system-prompt.ts)** - Instructions given to Claude
