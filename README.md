# CloudGuard

CloudGuard is a comprehensive full-stack application designed for cloud infrastructure monitoring and management. It provides a robust backend API and a responsive frontend dashboard for visualizing metrics, managing resources, and ensuring system security.

## Project Structure

The project is divided into three main directories:
- **`frontend/`**: The React-based user interface, powered by Vite, TailwindCSS, and React Query.
- **`backend/`**: The Node.js and Express backend API, utilizing Prisma for database ORM and Zod for validation.
- **`design/`**: Contains project design assets and Figma tokens.

## Features

- **Real-time Monitoring**: Track cloud resources and system metrics in real time.
- **Secure Authentication**: JWT-based secure authentication.
- **Data Visualization**: Interactive charts using Recharts.
- **Responsive Dashboard**: A modern UI built with React, Lucide React, and TailwindCSS.
- **Scheduled Jobs**: Background tasks managed via node-cron.

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- A relational database (PostgreSQL/MySQL) for Prisma

### Backend Setup
1. Navigate to the `backend/` directory: `cd backend`
2. Install dependencies: `npm install`
3. Copy the example env file: `cp .env.example .env` and update the database credentials.
4. Run Prisma migrations: `npm run prisma:migrate`
5. Start the backend development server: `npm run dev`

### Frontend Setup
1. Navigate to the `frontend/` directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the Vite development server: `npm run dev`

## Technologies Used

### Frontend
- React 18
- Vite
- TailwindCSS
- Zustand
- React Query (@tanstack/react-query)
- React Router DOM
- Recharts
- Zod

### Backend
- Node.js & Express
- Prisma ORM
- JSON Web Tokens (JWT) & bcryptjs
- node-cron
- Pino (Logging)
- Vitest (Testing)

## License

This project is licensed under the MIT License.
