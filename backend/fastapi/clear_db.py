import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text


def main():
    load_dotenv()
    dsn = os.getenv('DATABASE_DSN')
    if not dsn:
        print('ERROR: DATABASE_DSN not set in environment')
        sys.exit(1)
    engine = create_engine(dsn, echo=False, future=True)
    with engine.begin() as conn:
        try:
            before_b = conn.execute(text('SELECT COUNT(*) FROM bookings')).scalar()
        except Exception:
            before_b = None
        try:
            before_p = conn.execute(text('SELECT COUNT(*) FROM payments')).scalar()
        except Exception:
            before_p = None
        # delete rows
        try:
            conn.execute(text('DELETE FROM bookings'))
        except Exception as e:
            print('WARNING: could not delete bookings:', e)
        try:
            conn.execute(text('DELETE FROM payments'))
        except Exception as e:
            print('WARNING: could not delete payments:', e)
        try:
            after_b = conn.execute(text('SELECT COUNT(*) FROM bookings')).scalar()
        except Exception:
            after_b = None
        try:
            after_p = conn.execute(text('SELECT COUNT(*) FROM payments')).scalar()
        except Exception:
            after_p = None

    print('RESULT:')
    print(f'  bookings: {before_b} -> {after_b}')
    print(f'  payments: {before_p} -> {after_p}')


if __name__ == '__main__':
    main()
