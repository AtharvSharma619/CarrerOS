# CareerOS

CareerOS gives early-career job seekers one place to prepare an application and keep the search moving. Save the role and job description, choose a resume, draft role-specific materials, set a follow-up, and track the outcome.

## Features

- Personal accounts with password hashing, rate-limited authentication, and HttpOnly session cookies.
- Password reset by expiring, single-use emailed token; password changes revoke old sessions.
- Resume editor with repeatable work and education entries, classic and modern print styles, browser print-to-PDF, and AI feedback.
- Application workspace with status, source link, saved job description, notes, linked resume, editable cover-letter/tailoring drafts, and follow-up date.
- Dashboard with application progress, profile completeness, and an actionable upcoming follow-up list.
- Public interactive sample workspace with fictional data; its preview controls do not write to the API or call AI.
- Public pricing preview for a free plan and a proposed CareerOS Plus plan. Checkout is not active and paid limits are not implemented.
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
3. Optional: add `OPENAI_API_KEY` to enable AI feedback and writing. Add `RESEND_API_KEY` and a sender in `EMAIL_FROM` to enable email verification and password recovery locally. Set `SUPPORT_EMAIL` to a monitored inbox before production. The core account, resume, and application features work without either provider.
4. Run `npm install` from the repository root, then `npm run dev`.
5. Open `http://localhost:5173`. Express listens on `http://localhost:4000`.

To preview the product as a visitor, open the local site and choose **Explore the demo**. The demo works without signing up and uses fictional sample data. Use **Create account** to switch from the demo to your own saved workspace.

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

GitHub Actions automatically runs the client production build and checks server JavaScript syntax on pushes and pull requests to `main`. The `/api/v1/health` endpoint returns an error status when the database cannot be reached so container hosts can detect a broken deployment.

## Deploying a private beta

The Docker image builds the React client and serves it with Express from one HTTPS origin, which keeps session cookies same-site. Render can build the Dockerfile directly from the GitHub repository and redeploy when new commits arrive. See Render's [Docker deployment guide](https://render.com/docs/docker).

### Render setup

1. In Render, choose **New → Web Service**, connect GitHub, and select this repository.
2. Set the runtime to **Docker** and use the repository-root `Dockerfile`.
3. Set the health check path to `/api/v1/health`.
4. Add the environment variables below in Render's service settings. Keep API keys and database credentials in Render's environment settings, never in this repository.
5. In the Render service dashboard, open **Connect → Outbound** and copy the IP ranges for the service's region. Add those ranges to MongoDB Atlas **Network Access**. Render documents that its regular outbound ranges are shared by services in the same region; dedicated outbound IPs are a separate paid option. Avoid opening Atlas to every IP address. See [Render outbound IP addresses](https://render.com/docs/outbound-ip-addresses).
6. Choose the compute plan after checking current billing. Render describes free instances as suitable for previews and hobby use, and says not to use them for production. See [Render's free-instance limits](https://render.com/docs/free) and [compute plans](https://render.com/docs/compute-plans).
7. Create the service and wait for the first deploy. The health check should report both the API and database as available. Then verify signup, email verification, sign-in, resume save, and account deletion on the deployed URL.

The same environment variables apply on other container hosts:

- `MONGODB_URI`: Atlas connection string with the `careeros` database name.
- `JWT_SECRET`: unique random value of at least 32 characters.
- `NODE_ENV=production`, `PORT` (when provided by the host), `CLIENT_ORIGIN=https://your-domain`, and `APP_BASE_URL=https://your-domain`.
- `RESEND_API_KEY`, `REQUIRE_EMAIL_VERIFICATION=true`, and `EMAIL_FROM` on a domain verified with Resend; set `SUPPORT_EMAIL` to an inbox someone monitors. Production startup requires these account email settings; the app sends signup verification and password reset links through Resend's [email API](https://resend.com/docs/api-reference/emails/send-email).
- `TRUST_PROXY_HOPS=1` when the container host sits behind one trusted reverse proxy; adjust to the host's documented proxy chain.
- Optional `OPENAI_API_KEY` and `OPENAI_MODEL` for AI features. `AI_MONTHLY_REQUEST_LIMIT` sets the per-account monthly request cap (default: 25).

Configure Atlas network access for the container host, not a developer laptop. Keep the origin restricted to the deployed site. The API rate-limits sign-in, password recovery, and AI requests; AI usage is also capped per account each month and shown in the workspace. The cap defaults to 25 requests per UTC calendar month and can be changed with `AI_MONTHLY_REQUEST_LIMIT`. The account model supports user data export and deletion.

Before a wider public launch, configure and verify email delivery, add production monitoring/alerts, review the in-app privacy notice for the operating jurisdiction, and confirm account isolation, reset-email delivery, and cookie behavior on the deployed domain.

## GitHub portfolio setup

This folder is initialized as a local Git repository on the `main` branch. `.gitignore` excludes dependency folders, build output, and all `.env` secrets. Before pushing, confirm `server/.env` is not staged. Add a short product demo or screenshots to this README when available; never commit API keys, MongoDB credentials, or real users' resume data.

## Product direction

The first audience is students and recent graduates. The core loop is: save a role → connect a resume → draft truthful role-specific materials → track the follow-up → record the outcome. Next improvements should come from watching a small group use that loop and noting where they get stuck.

Billing is deliberately deferred until the free workflow is useful and demand is validated.

The landing page currently shows a proposed Plus price of $6/month or $39/year as a pricing hypothesis for an early-career audience. Checkout, paid-plan entitlements, and payment-provider integration are not active. The current AI usage cap applies to all accounts; do not advertise a higher paid quota until plan-aware enforcement and cost limits are implemented.
