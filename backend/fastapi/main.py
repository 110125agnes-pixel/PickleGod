import os
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import (Column, Integer, String, Text, DateTime, create_engine, ForeignKey)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

DATABASE_URL = os.getenv('DATABASE_DSN', 'mysql+pymysql://root:root@127.0.0.1:3306/booking_system')

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

    court = relationship('CourtModel')


class Court(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True


class Booking(BaseModel):
    id: Optional[int]
    courtId: int
    date: str
    time: str
    description: Optional[str] = ''
    createdAt: Optional[datetime] = None

    class Config:
        orm_mode = True


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


def ensure_schema_and_defaults():
    Base.metadata.create_all(bind=engine)
    # ensure at least 6 courts named Court 1..Court 6
    desired = [f'Court {i}' for i in range(1, 7)]
    session = SessionLocal()
    try:
        total = session.query(CourtModel).count()
        for i in range(total, len(desired)):
            c = CourtModel(name=desired[i])
            session.add(c)
        session.commit()
        # rename first 6 courts to desired names (ordered by id)
        courts = session.query(CourtModel).order_by(CourtModel.id).limit(6).all()
        for idx, c in enumerate(courts):
            c.name = desired[idx]
        session.commit()
    finally:
        session.close()


@app.on_event('startup')
def startup():
    ensure_schema_and_defaults()


@app.get('/courts', response_model=List[Court])
def get_courts():
    session = SessionLocal()
    try:
        courts = session.query(CourtModel).order_by(CourtModel.id).all()
        return courts
    finally:
        session.close()


@app.get('/bookings', response_model=List[Booking])
def get_bookings():
    session = SessionLocal()
    try:
        bs = session.query(BookingModel).order_by(BookingModel.id.desc()).all()
        # convert fields to match previous API naming
        out = []
        for b in bs:
            out.append(Booking(
                id=b.id,
                courtId=b.court_id,
                date=b.date,
                time=b.time,
                description=b.description or '',
                createdAt=b.created_at
            ))
        return out
    finally:
        session.close()


@app.post('/bookings', status_code=201, response_model=Booking)
def create_booking(payload: Booking):
    # basic validation
    if payload.courtId <= 0:
        raise HTTPException(status_code=400, detail={'error': 'courtId is required'})
    if not payload.date or not payload.time:
        raise HTTPException(status_code=400, detail={'error': 'date and time are required'})
    session = SessionLocal()
    try:
        court_exists = session.query(CourtModel).filter(CourtModel.id == payload.courtId).count()
        if court_exists == 0:
            raise HTTPException(status_code=400, detail={'error': 'court not found'})
        now = datetime.utcnow()
        b = BookingModel(court_id=payload.courtId, date=payload.date, time=payload.time, description=payload.description or '', created_at=now)
        session.add(b)
        session.commit()
        session.refresh(b)
        return Booking(id=b.id, courtId=b.court_id, date=b.date, time=b.time, description=b.description or '', createdAt=b.created_at)
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
