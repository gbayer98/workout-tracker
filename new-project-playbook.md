# New Project Playbook — Lessons from Customer Delivery Portal

This is a complete reference for spinning up a new Next.js full-stack application and deploying it to Vercel. Written so a Claude Code agent can follow it without stopping to ask questions.

---

## Owner Info

- **GitHub username:** gbayer98
- **GitHub URL:** https://github.com/gbayer98
- **Vercel account:** Linked to the same GitHub account
- **Preferred dev port:** 3030 (avoids conflicts with other tools)

---

## Phase 1: Plan Before You Build

Before writing any code, create these documents in the project root:

### 1. `requirements.md`
- What the app does (elevator pitch)
- User roles and what each can do
- Core features as bullet points
- Data model outline (what entities exist, how they relate)
- Business rules and constraints
- Out of scope for v1

### 2. `CLAUDE.md` (Project Instructions)
- Brief project context
- Links to key documents
- Code quality standards
- Communication style preferences
- Any project-specific conventions

### 3. `development-process.md`
- Break the build into sequential modules
- Each module has **entry criteria** (what must be true before starting) and **exit criteria** (what must be true before moving on)
- Every module's exit criteria includes: `npm run build` still passes
- Follow this order:
  1. Project scaffold & dev environment
  2. Database & data model
  3. Authentication
  4. Core features (build incrementally)
  5. Polish & mobile testing
  6. GitHub setup
  7. Deploy to Vercel

---

## Phase 2: Project Setup

### Create Next.js Project
```bash
npx create-next-app@latest project-name --typescript --tailwind --eslint --app --src-dir
```

Choose these options:
- TypeScript: **Yes**
- ESLint: **Yes**
- Tailwind CSS: **Yes**
- `src/` directory: **Yes**
- App Router: **Yes**
- Turbopack: **Yes** (default in Next.js 16+)
- Import alias: `@/*`

### Set Dev Port
In `package.json`, change the dev script:
```json
"dev": "next dev --port 3030"
```

### Remove Boilerplate
- Clear out the default `page.tsx` content
- Clear `globals.css` except the Tailwind import and any custom theme
- Remove the default Next.js SVG assets

### Install Core Dependencies
```bash
# ORM
npm install prisma @prisma/client

# Auth (if needed)
npm install next-auth@beta bcrypt
npm install -D @types/bcrypt

# Script runner for seed files
npm install -D tsx
```

### Key `package.json` Scripts
```json
{
  "scripts": {
    "dev": "next dev --port 3030",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "eslint",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

**Critical:** The build script MUST run `prisma generate` before `next build`, otherwise Vercel deployments will fail because the Prisma client won't be generated.

---

## Phase 3: Database Setup (Neon PostgreSQL)

### Create Database
1. Go to https://neon.tech
2. Create a new project
3. Copy the connection string (it looks like: `postgresql://user:pass@host/dbname?sslmode=require`)

### Initialize Prisma
```bash
npx prisma init
```

This creates:
- `prisma/schema.prisma` — your data model
- `.env` — your environment variables

### `.env` File
```env
# Database
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"

# NextAuth (if using auth)
NEXTAUTH_URL=http://localhost:3030
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
```

### Prisma Singleton Pattern
**Always create this file** at `src/lib/prisma.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```
This prevents connection leaks during Next.js hot reload.

### Migrations Workflow
```bash
# After editing schema.prisma:
npx prisma migrate dev --name description-of-change

# To seed test data:
npm run db:seed

# To visually browse data:
npm run db:studio
```

---

## Phase 4: Styling with Tailwind v4

### `postcss.config.mjs`
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

### Custom Theme Colors in `globals.css`
```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
  /* Add your brand colors here */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* Map CSS vars to Tailwind color names */
  --font-sans: var(--font-your-body-font);
  --font-heading: var(--font-your-heading-font);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), Arial, Helvetica, sans-serif;
}
```

### Lesson Learned: Tailwind Classes vs Inline Styles
We discovered that certain Tailwind utility classes (particularly percentage-based heights inside flex containers) don't always render reliably across server/client hydration. For custom chart/graph components, **use inline styles with pixel values** for critical layout properties. Reserve Tailwind for standard layout and text styling.

---

## Phase 5: Authentication (NextAuth v5)

### `src/lib/auth.ts`
```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const user = await prisma.admin.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user) return null;
        const valid = await compare(credentials.password as string, user.password);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  pages: { signIn: "/login" },
});
```

### API Route: `src/app/api/auth/[...nextauth]/route.ts`
```typescript
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

### Protecting Routes (in layout.tsx or page.tsx)
```typescript
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }) {
  const session = await auth();
  if (!session) redirect("/login");
  return <>{children}</>;
}
```

---

## Phase 6: GitHub Setup

### Initialize and Push
```bash
git init
git add .
git commit -m "feat: initial project scaffold"
git remote add origin https://github.com/gbayer98/YOUR-REPO-NAME.git
git branch -M main
git push -u origin main
```

### `.gitignore` Must Include
```
for authentication, just make a couple user accounts to start. Make one called Jake and one called Kate. Both of them can have temporary 123 as their password. We'll get into the nuts and bolts of v1 of the application next. Let's go to build that requirements doc node_modules/
.next/
.env*
.vercel
/src/generated/prisma
```

### Commit Convention
Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`

---

## Phase 7: Deploy to Vercel

### Connect to Vercel
1. Go to https://vercel.com/new
2. Import the GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Build command: `prisma generate && next build` (should match package.json)
5. Output directory: leave default (`.next`)

### Environment Variables in Vercel
Go to **Project Settings > Environment Variables** and add:

| Variable | Value | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Your Neon connection string | Same as local `.env` |
| `NEXTAUTH_SECRET` | Your generated secret | Same as local `.env` |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | **Must be the production URL, NOT localhost** |

**Critical gotcha:** `NEXTAUTH_URL` must be set to the Vercel deployment URL in production. Leaving it as `localhost:3030` will break auth on the live site.

### After First Deploy
- Verify the build succeeds in Vercel dashboard
- Test the live URL in a browser
- Test on a real phone (not just browser dev tools)
- Check all database operations work against the production Neon database

### Redeployment
Vercel auto-deploys on every push to `main`. Just `git push` and it deploys.

---

## Lessons Learned & Gotchas

### Things That Bit Us

1. **`prisma generate`**** must run before ****`next build`** — Without it, the Prisma client doesn't exist and the build fails. Always set your build script to `"prisma generate && next build"`.

2. **NEXTAUTH\_URL mismatch** — This was set to `localhost:3030` in `.env` but the server sometimes ran on port 3000. On Vercel, it must be the production URL. Always double-check this variable.

3. **Percentage heights in flex containers don't work reliably** — CSS `height: X%` inside flex children doesn't resolve when the parent height comes from flexbox. Use pixel-based heights or absolute positioning with an explicitly-sized parent instead.

4. **Hot module reload + database connections** — Without the Prisma singleton pattern, every hot reload creates a new database connection until you hit the limit. Always use the singleton.

5. **Dev server port conflicts** — Port 3000 can conflict with other tools. We used 3030. If the dev server becomes unresponsive, check for stale `.next/dev/lock` files and zombie processes.

6. **Tailwind v4 theming** — Colors are defined as CSS variables in `:root`, then mapped in the `@theme inline` block. This is different from Tailwind v3's `tailwind.config.js` approach.

7. **NextAuth v5 is beta** — The API is slightly different from v4 docs you'll find online. Use `next-auth@beta` and follow the v5 migration guide.

8. **Seed script password** — Always hash passwords with bcrypt in seed scripts. Don't store plaintext. Mark test passwords with comments like `// CHANGE THIS IN PRODUCTION`.

9. **Vercel auto-deploys on push to main** — Every `git push` triggers a deploy. This is great for iteration but means you should test locally before pushing (or accept that you'll iterate on the live site).

10. **Mobile-first matters** — Most end users will access on phones. Test at 375px width early and often.

### What Worked Well

- **Modular development process** — Building one module at a time with clear entry/exit criteria kept things organized and prevented half-finished features.
- **Session summaries** — Writing `docs/sessions/YYYY-MM-DD-summary.md` after each work session helped maintain context across sessions.
- **Inline styles for complex components** — When Tailwind classes had rendering issues (charts, custom layouts), switching to inline styles with explicit pixel values was the reliable fix.
- **Neon PostgreSQL** — Free tier is generous, fast, and works perfectly with Prisma + Vercel.
- **Conventional commits** — Made it easy to understand what changed and why.

---

## Quick-Start Checklist for New Project

- [ ] Create project folder
- [ ] Write `requirements.md` with features and data model
- [ ] Write `CLAUDE.md` with project instructions
- [ ] Write `development-process.md` with modules
- [ ] Run `create-next-app` with TypeScript + Tailwind + App Router
- [ ] Set dev port to 3030 in package.json
- [ ] Install Prisma, NextAuth, bcrypt, tsx
- [ ] Create Neon database, copy connection string
- [ ] Run `npx prisma init`, design schema
- [ ] Create `.env` with DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
- [ ] Set build script to `"prisma generate && next build"`
- [ ] Create `src/lib/prisma.ts` singleton
- [ ] Run first migration: `npx prisma migrate dev --name init`
- [ ] Create seed script, run `npm run db:seed`
- [ ] Build core features module by module
- [ ] Test on mobile (375px)
- [ ] Initialize git, push to GitHub (gbayer98)
- [ ] Connect to Vercel, set environment variables
- [ ] Verify production deploy works end-to-end
