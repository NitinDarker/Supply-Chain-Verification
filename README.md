# Velen

Private blockchain-based digital wallet and supply chain verification system.

## Prerequisites

- Node.js 22+
- Docker (for MongoDB and Redis)

## Setup

### Option A: Run with Nginx (rate limiting + load balancing)

This starts:
- `nginx` in front of backend on `http://localhost:5000`
- `2` backend instances (`backend1`, `backend2`)
- `mongodb` and `redis`
- frontend stays local on your machine (`http://localhost:3000`)

```bash
docker compose up --build
```

Stop:
```bash
docker compose down
```

Run frontend locally in a separate terminal:
```bash
cd frontend
npm install
npm run dev
```

If needed, set:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Option B: Run services manually (without Nginx)

### 1. Start MongoDB and Redis

```bash
docker run -d --name velen-mongo -p 27017:27017 -v velen-mongo-data:/data/db mongo:7
docker run -d --name velen-redis -p 6379:6379 -v velen-redis-data:/data redis:7-alpine
```

Stop:
```bash
docker stop velen-mongo velen-redis
```

Restart:
```bash
docker start velen-mongo velen-redis
```

Remove containers (data is kept in volumes):
```bash
docker rm velen-mongo velen-redis
```

Delete volumes (removes all data permanently):
```bash
docker volume rm velen-mongo-data velen-redis-data
```

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:5000`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.
