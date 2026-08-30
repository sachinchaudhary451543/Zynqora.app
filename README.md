# Zynqora

Zynqora is a social-first community platform for people, circles, and digital identity.
This project combines a social feed, profile experience, avatar uploads, AI-assisted profile imagery, and a modern community-first UI.

Status: Preview / Launch Soon

This repository is for the current preview build and local development. It is not a final production deployment and does not expose any secret keys, credentials, or private environment values.

## Project structure

```
familyapp/
├── backend/                # NestJS API, Prisma, auth, uploads
├── frontend/               # React + Vite app
├── docker-compose.yml      # Local infra setup (if used)
├── README.md               # Project overview
└── package.json            # Root package if needed
```

## Features currently included

- Authentication and user accounts
- Profile page with avatar upload / generate / edit flow
- Social feed and post cards
- Activity and following model support
- AI avatar generation flow with backend upload handling
- Local preview and development environment

## Preview note

This project is currently in preview mode and may include placeholder content, mock assets, styling refinements, and evolving UX details as the app moves toward launch.

## Running locally

### 1) Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2) Start the backend

```bash
cd backend
npm run start:dev
```

The API should be available at the local host configuration for the project.

### 3) Start the frontend

```bash
cd frontend
npm run dev -- --host 0.0.0.0
```

Then open the frontend URL shown in the terminal, usually:

```text
http://localhost:5173/
```

## Deployment note

The frontend is designed for deployment to static hosting services such as Netlify, Vercel, or similar.
The backend should be deployed to a managed Node environment with its own runtime configuration.

Do not include private tokens or credentials in source control.

## Sample media / visuals

The project uses safe placeholder/profile imagery and generated assets for preview purposes. Replace any sample assets with final brand assets before launch.

## Repository notes

- The codebase is cleaned up for public sharing.
- Private credentials and sensitive internal values were not included.
- Production deployment configuration should use environment variables managed by the host platform.

## Development / launch summary

- Local preview works through the configured frontend and backend dev servers.
- The app is intended to be launched publicly once branding, image assets, production configuration, and final deployment secrets are set.

## Contact / ownership

This project is a personal preview build for the Zynqora app and is shared for review and launch preparation.
