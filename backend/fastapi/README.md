FastAPI backend replacement for the Go server

Quick start

1. Create a virtualenv and install dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

2. Set `DATABASE_DSN` if you need a custom MySQL DSN. Default:

```
mysql+pymysql://root:root@127.0.0.1:3306/booking_system
```

3. Run the server:

```bash
uvicorn main:app --reload --port 8080
```

The API provides the same endpoints as the original Go server:
- `GET /courts`
- `GET /bookings`
- `POST /bookings` (body: courtId, date, time, description)
- `DELETE /bookings/{id}`
