# ⚡ Quickstart & Vibe Coder Cheat Sheet

Keep this page open whenever you are developing, testing, or instructing the Antigravity agent.

---

## 🛠️ Daily Command Cheat Sheet

Open your terminal in the project root (`/Users/rajeshbhandari/SunNFun_CRM026`) and use these commands:

| What you want to do | Terminal Command | Why / What happens |
|---|---|---|
| **Start Local Dev Server** | `npm run dev` | Runs the Next.js dev server at `http://localhost:3000` with hot-reloading. |
| **Check for Code Errors** | `npm run lint` | Runs ESLint to catch syntax, import, or React lifecycle bugs. |
| **Type Check TypeScript** | `npx tsc --noEmit` | Checks all TypeScript types across the project without creating output files. |
| **Validate Database Schema** | `npx prisma validate` | Checks `prisma/schema.prisma` for syntax errors or invalid relations. |
| **Format All Files** | `npm run format` | Runs Prettier to auto-format code, sort Tailwind classes, and clean indentation. |
| **Add New Shadcn Component** | `npx shadcn@latest add <component>` | Installs a clean, copy-pasteable UI component (e.g. `badge`, `switch`, `calendar`). |
| **Test Production Build** | `npm run build` | Compiles an optimized production build to make sure nothing breaks before deploying. |
| **Push Changes to GitHub** | `git add . && git commit -m "your message" && git push` | Stages changes, creates a commit, and pushes to `main` branch. |

---

## 📂 Project Structure Map

Here is the simple mental model of the codebase:

```text
SunNFun_CRM026/
├── .agents/                 # 🤖 Antigravity rules & behaviors
│   └── rules/sunnfuncrm.md  # Core project stack & non-negotiable rules
├── .github/
│   └── workflows/deploy.yml # 🚀 CI/CD automation pipeline for GitHub Actions
├── app/                     # 🌐 Next.js App Router (All web pages live here)
│   ├── globals.css          # Color themes, CSS variables, Tailwind imports
│   ├── layout.tsx           # Global shell (fonts, HTML wrapper, metadata)
│   └── page.tsx             # Homepage / Dashboard entry point
├── components/              # 🎨 Shared React components
│   └── ui/                  # Shadcn UI primitives (Button, Card, Dialog, etc.)
├── docs/
│   └── tutorial/            # 📖 Step-by-step guides for vibe coders
├── lib/                     # ⚙️ Reusable backend utilities & helpers
│   ├── prisma.ts            # Database client singleton
│   └── utils.ts             # 'cn' styling helper function
├── prisma/
│   └── schema.prisma        # 🗄️ PostgreSQL database data models
├── .env.example             # 🔑 Template for required environment variables
├── .env                     # 🔒 Local environment secrets (ignored by Git)
├── package.json             # 📦 Project dependencies & scripts
└── tailwind.config.ts       # 🎨 Tailwind theme & styling configuration
```

---

## 💡 Pro-Tips for Vibe Coding with AI

1. **Never edit generated files blindly**: Look at `components/ui/` as building blocks. You don't need to rebuild buttons or cards; just compose them in `app/page.tsx` or new route folders like `app/trips/page.tsx`.
2. **Always check `.env`**: Make sure your local database and secrets are placed in `.env` and never pushed to GitHub (`.gitignore` takes care of this).
3. **Use the `cn()` helper**: When styling components conditionally:
   ```tsx
   import { cn } from "@/lib/utils";
   
   <button className={cn("px-4 py-2 rounded", isActive ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700")} />
   ```
4. **Use Zod for every form**: Always pair forms with Zod schemas to guarantee inputs are clean and safe before sending them to the database.
