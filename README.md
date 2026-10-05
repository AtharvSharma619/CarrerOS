# CareerOS

CareerOS gives early-career job seekers one place to prepare an application and keep the search moving. Save the role and job description, choose a resume, draft role-specific materials, set a follow-up, and track the outcome.

## Features

- Personal accounts with password hashing, rate-limited authentication, and HttpOnly session cookies.
- Resume editor with repeatable work and education entries, classic and modern print styles, browser print-to-PDF, and AI feedback.
- Application workspace with status, source link, saved job description, notes, linked resume, editable cover-letter/tailoring drafts, and follow-up date.
- Dashboard with application progress, profile completeness, and an actionable upcoming follow-up list.
- Optional AI cover letters and role-specific resume suggestions. Outputs are editable drafts; the prompts prohibit adding qualifications or facts that are not in the user's material.
- User-owned database queries, server-side validation, authentication/AI rate limits, account data export, and permanent account deletion.

## Stack

- **Client:** React 18, Vite, Lucide icons.
- **API:** Node.js, Express, Mongoose, MongoDB.
- **Authentication:** bcrypt password hashing, signed JWT in an HttpOnly cookie.
- **AI:** server-side OpenAI API adapter. The API key is never sent to the browser.

```text
client/  React application
server/  Express API, models, authentication, AI adapter
```

The client talks to the versioned REST API under `/api/v1`. For local development Vite proxies those requests to Express on port 4000. MongoDB stores users, resumes, and job applications. AI drafts generated in an application workspace are saved to that application. Resume and job description text is sent to the configured AI provider only when a user requests an AI action; disclose this clearly before inviting public users.

## Run locally

Requirements: Node.js 20 or newer and MongoDB. MongoDB Atlas is an easy hosted option; a local MongoDB URI also works.

1. Create a database user and add your current IP address to the Atlas project's IP access list. Copy the Node.js driver connection string.
2. Copy `server/.env.example` to `server/.env` and fill in `MONGODB_URI` and a random `JWT_SECRET` of at least 32 characters. Use the `careeros` database in the URI. Keep `.env` private; it is ignored by Git. Existing local `.env` files should be preserved.
3. Optional: add `OPENAI_API_KEY` to enable AI feedback and writing. The core account, resume, and application features work without it.
4. Run `npm install` from the repository root, then `npm run dev`.
5. Open `http://localhost:5173`. Express listens on `http://localhost:4000`.

To use local MongoDB through Docker, run `docker compose up -d mongodb` and keep the example local URI. Stop the app with Control+C.

## VS Code

Open this whole folder in VS Code using **File → Open Folder**. If the `code` command is installed, you can also run `code .` from the project root. The included workspace task **CareerOS: Run dev servers** starts both the UI and API.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start client and API together |
| `npm run dev:client` | Start only Vite |
| `npm run dev:server` | Start only Express |
| `npm run build` | Create the client production build in `client/dist` |
| `npm run start --workspace=server` | Start the API without file watching |

## Deploying a private beta

Host the client and API on HTTPS and MongoDB Atlas. Set production environment variables on the API host: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, `NODE_ENV=production`, and optionally `OPENAI_API_KEY` / `OPENAI_MODEL`. Set `VITE_API_URL` in the client build environment to the API origin when they are hosted separately. For a cross-site client/API setup, set `COOKIE_SAME_SITE=none`; the API cookie is then marked Secure. Configure Atlas network access for the API host, not a developer laptop. Keep CORS limited to the deployed client origin.

Before inviting the public, add password reset and account recovery, email verification or an equivalent abuse barrier, production monitoring, stronger per-account AI usage/cost limits, and a complete privacy notice explaining third-party AI processing. Verify account isolation and cookie behavior on the actual deployed domains.

## GitHub portfolio setup

This folder is initialized as a local Git repository on the `main` branch. `.gitignore` excludes dependency folders, build output, and all `.env` secrets. Before pushing, confirm `server/.env` is not staged. Add a short product demo or screenshots to this README when available; never commit API keys, MongoDB credentials, or real users' resume data.

## Product direction

The first audience is students and recent graduates. The core loop is: save a role → connect a resume → draft truthful role-specific materials → track the follow-up → record the outcome. Next improvements should come from watching a small group use that loop and noting where they get stuck.

Billing is deliberately deferred until the free workflow is useful and demand is validated.
