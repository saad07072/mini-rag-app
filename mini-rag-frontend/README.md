# Mini RAG frontend

This Next.js app provides the interface for the Mini RAG document Q&A service.
It supports pasted text, PDF/TXT/DOCX uploads, and document questions.

## Run locally

Install dependencies and create `.env.local` in this directory:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8002
```

Then start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The API must be running
separately; see the [project setup](../readme.md#run-locally).

## Scripts

- `npm run dev` starts the development server.
- `npm run lint` checks the frontend with ESLint.
- `npm run build` creates a production build.

When deploying, set `NEXT_PUBLIC_BACKEND_URL` to the backend's public base URL.
