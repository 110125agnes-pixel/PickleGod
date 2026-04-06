import json
import os
from datetime import datetime
from typing import List, Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import (Column, Integer, String, Text, DateTime, create_engine, ForeignKey)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

DATABASE_URL = os.getenv('DATABASE_DSN')

engine = create_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class CourtModel(Base):
    __tablename__ = 'courts'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)


class BookingModel(Base):
    __tablename__ = 'bookings'
    id = Column(Integer, primary_key=True, index=True)
    court_id = Column(Integer, ForeignKey('courts.id'), nullable=False)
    date = Column(String(50), nullable=False)
    time = Column(String(50), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, nullable=False)


class PaymentGroupModel(Base):
    __tablename__ = 'payments'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True, default='')
    phone = Column(String(100), nullable=True, default='')
    payment_method = Column(String(100), nullable=False, default='GCASH')
    status = Column(String(50), nullable=False, default='PENDING')
    slots_json = Column(Text, nullable=False, default='[]')
    total_price = Column(Integer, nullable=False, default=0)
    price_per_slot = Column(Integer, nullable=False, default=0)
    txn_id = Column(String(100), nullable=True, default='')
    receipt = Column(Text, nullable=True, default='')
    created_at = Column(DateTime, nullable=False)


# ── Pydantic schemas ─────────────────────────────────────────────────────────

class Court(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True


class Booking(BaseModel):
    id: Optional[int] = None
    courtId: int
    date: str
    time: str
    description: Optional[str] = ''
    createdAt: Optional[datetime] = None

    class Config:
        orm_mode = True


class SlotSchema(BaseModel):
    courtId: int
    date: str
    time: str


class PaymentGroupIn(BaseModel):
    name: str
    email: Optional[str] = ''
    phone: Optional[str] = ''
    paymentMethod: Optional[str] = 'GCASH'
    status: Optional[str] = 'PENDING'
    slots: List[SlotSchema]
    totalPrice: int
    pricePerSlot: int
    txnId: Optional[str] = ''
    receipt: Optional[str] = ''


class PaymentGroupOut(BaseModel):
    id: int
    name: str
    email: Optional[str] = ''
    phone: Optional[str] = ''
    paymentMethod: str
    status: str
    slots: List[SlotSchema]
    totalPrice: int
    pricePerSlot: int
    txnId: Optional[str] = ''
    receipt: Optional[str] = ''
    createdAt: datetime


class StatusUpdate(BaseModel):
    status: str


# ── App setup ────────────────────────────────────────────────────────────────

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    # During development allow all origins; lock this down for production to specific origins
    allow_origins=["*"],
    allow_methods=["GET", "POST", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=True,
)

def ensure_schema_and_defaults():
    Base.metadata.create_all(bind=engine)
    desired = [f'Court {i}' for i in range(1, 7)]
    session = SessionLocal()
    try:
        total = session.query(CourtModel).count()
        for i in range(total, len(desired)):
            session.add(CourtModel(name=desired[i]))
        session.commit()
        courts = session.query(CourtModel).order_by(CourtModel.id).limit(6).all()
        for idx, c in enumerate(courts):
            c.name = desired[idx]
        session.commit()
    finally:
        session.close()


@app.on_event('startup')
def startup():
    ensure_schema_and_defaults()


# ── Courts ───────────────────────────────────────────────────────────────────

@app.get('/courts', response_model=List[Court])
def get_courts():
    session = SessionLocal()
    try:
        return session.query(CourtModel).order_by(CourtModel.id).all()
    finally:
        session.close()


# ── Bookings ─────────────────────────────────────────────────────────────────

@app.get('/bookings', response_model=List[Booking])
def get_bookings():
    session = SessionLocal()
    try:
        bs = session.query(BookingModel).order_by(BookingModel.id.desc()).all()
        return [Booking(id=b.id, courtId=b.court_id, date=b.date, time=b.time,
                        description=b.description or '', createdAt=b.created_at) for b in bs]
    finally:
        session.close()


@app.post('/bookings', status_code=201, response_model=Booking)
def create_booking(payload: Booking):
    if payload.courtId <= 0:
        raise HTTPException(status_code=400, detail={'error': 'courtId is required'})
    if not payload.date or not payload.time:
        raise HTTPException(status_code=400, detail={'error': 'date and time are required'})
    session = SessionLocal()
    try:
        if session.query(CourtModel).filter(CourtModel.id == payload.courtId).count() == 0:
            raise HTTPException(status_code=400, detail={'error': 'court not found'})
        now = datetime.utcnow()
        b = BookingModel(court_id=payload.courtId, date=payload.date, time=payload.time,
                         description=payload.description or '', created_at=now)
        session.add(b)
        session.commit()
        session.refresh(b)
        return Booking(id=b.id, courtId=b.court_id, date=b.date, time=b.time,
                       description=b.description or '', createdAt=b.created_at)
    finally:
        session.close()


@app.delete('/bookings/{booking_id}')
def delete_booking(booking_id: int):
    session = SessionLocal()
    try:
        b = session.query(BookingModel).filter(BookingModel.id == booking_id).first()
        if not b:
            raise HTTPException(status_code=404, detail={'error': 'not found'})
        session.delete(b)
        session.commit()
        return {'ok': 'deleted'}
    finally:
        session.close()


# ── Payments ─────────────────────────────────────────────────────────────────

def _pg_to_out(pg: PaymentGroupModel) -> PaymentGroupOut:
    try:
        slots = [SlotSchema(**s) for s in json.loads(pg.slots_json or '[]')]
    except Exception:
        slots = []
    return PaymentGroupOut(
        id=pg.id,
        name=pg.name,
        email=pg.email or '',
        phone=pg.phone or '',
        paymentMethod=pg.payment_method,
        status=pg.status,
        slots=slots,
        totalPrice=pg.total_price,
        pricePerSlot=pg.price_per_slot,
        txnId=pg.txn_id or '',
        receipt=pg.receipt or '',
        createdAt=pg.created_at,
    )


@app.get('/payments', response_model=List[PaymentGroupOut])
def get_payments():
    session = SessionLocal()
    try:
        pgs = session.query(PaymentGroupModel).order_by(PaymentGroupModel.id.desc()).all()
        return [_pg_to_out(pg) for pg in pgs]
    finally:
        session.close()


@app.post('/payments', status_code=201, response_model=PaymentGroupOut)
def create_payment(payload: PaymentGroupIn):
    if not payload.name:
        raise HTTPException(status_code=400, detail={'error': 'name is required'})
    if not payload.slots:
        raise HTTPException(status_code=400, detail={'error': 'slots are required'})
    session = SessionLocal()
    try:
        now = datetime.utcnow()
        pg = PaymentGroupModel(
            name=payload.name,
            email=payload.email or '',
            phone=payload.phone or '',
            payment_method=payload.paymentMethod or 'GCASH',
            status=payload.status or 'PENDING',
            slots_json=json.dumps([s.dict() for s in payload.slots]),
            total_price=payload.totalPrice,
            price_per_slot=payload.pricePerSlot,
            txn_id=payload.txnId or '',
            receipt=payload.receipt or '',
            created_at=now,
        )
        session.add(pg)
        session.flush()  # get pg.id before commit
        # also create individual booking rows so slot grid shows as Booked
        for slot in payload.slots:
            b = BookingModel(
                court_id=slot.courtId,
                date=slot.date,
                time=slot.time,
                description=f'pay:{pg.id}',
                created_at=now,
            )
            session.add(b)
        session.commit()
        session.refresh(pg)
        return _pg_to_out(pg)
    finally:
        session.close()


@app.patch('/payments/{payment_id}/status')
def update_payment_status(payment_id: int, body: StatusUpdate):
    if not body.status:
        raise HTTPException(status_code=400, detail={'error': 'status required'})
    session = SessionLocal()
    try:
        pg = session.query(PaymentGroupModel).filter(PaymentGroupModel.id == payment_id).first()
        if not pg:
            raise HTTPException(status_code=404, detail={'error': 'not found'})
        if pg.status in ('APPROVED', 'DENIED'):
            raise HTTPException(status_code=409, detail={'error': 'this payment has already been finalised and cannot be changed'})
        pg.status = body.status
        # if denied, free up the slots by removing the booking rows
        if body.status == 'DENIED':
            session.query(BookingModel).filter(BookingModel.description == f'pay:{payment_id}').delete()
        session.commit()
        return {'ok': 'updated'}
    finally:
        session.close()


@app.delete('/payments/{payment_id}')
def delete_payment(payment_id: int):
    session = SessionLocal()
    try:
        pg = session.query(PaymentGroupModel).filter(PaymentGroupModel.id == payment_id).first()
        if not pg:
            raise HTTPException(status_code=404, detail={'error': 'not found'})
        # remove associated booking rows
        desc = f'pay:{payment_id}'
        session.query(BookingModel).filter(BookingModel.description == desc).delete()
        session.delete(pg)
        session.commit()
        return {'ok': 'deleted'}
    finally:
        session.close()
