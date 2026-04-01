Booking website (Go backend + React frontend)

Quick start

1) Backend (Go)

- Ensure Go is installed (1.20+)
- From repository root run:

  go run ./backend/cmd/server

The server listens on port 8080 and exposes:
- GET /courts
- GET /bookings
- POST /bookings  (JSON body: {"courtId":1,"date":"2026-03-22","time":"18:00","description":"..."})

2) Frontend (React + Vite)

- Ensure Node.js and npm are installed
- cd frontend
- npm install
- npm run dev

Then open the dev URL shown by Vite (usually http://localhost:5173). The UI posts bookings to the backend (http://localhost:8080).

Next steps
- Persist bookings in a database (SQLite/Postgres)
- Add authentication and availability checks
- Add calendar view and booking confirmation emails
