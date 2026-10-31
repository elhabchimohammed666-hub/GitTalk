## License
   © 2026 Elhabchi Mohammed. All Rights Reserved.

# DevHub

GitTalk is a developer-community starter with a React/Vite client and an Express,
MongoDB, and Socket.io API.

## Requirements

- Node.js 20 or newer
- MongoDB (local or hosted)
- A GitHub OAuth App for GitHub sign-in (optional)

## Run locally

1. Configure the API:

   ```powershell
   cd backend
   Copy-Item .env.example .env
   ```

   Set `MONGODB_URI` and a random `JWT_SECRET` of at least 32 characters in
   `backend/.env`. To enable GitHub sign-in, set `GITHUB_CLIENT_ID` and
   `GITHUB_CLIENT_SECRET`; the OAuth app callback URL must match
   `GITHUB_CALLBACK_URL`.

2. In a terminal, install and start the API:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

3. In another terminal, install and start the frontend:

   ```powershell
   cd frontend
   Copy-Item .env.example .env
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`. The frontend API origin defaults to
   `http://localhost:5000` and can be changed with `VITE_API_URL`.

## API overview

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/auth/me`, `GET /api/auth/github`
- `GET /api/posts` (search with `q`, filter with `tags`, sort with `sort`)
- `POST /api/posts`, `POST /api/posts/:postId/upvote`,
  `POST /api/posts/:postId/downvote`, `POST /api/posts/:postId/bookmark`
- `GET /api/posts/:postId/comments`,
  `POST /api/posts/:postId/comments` (optional `parentCommentId`)
- `GET /api/conversations`, `POST /api/conversations`,
  `GET /api/conversations/:conversationId/messages`

Authenticated API calls use the HTTP-only `devhub_token` cookie. Socket.io
authenticates with the same cookie. The client must send credentials; CORS is
restricted to `CLIENT_ORIGIN`.
