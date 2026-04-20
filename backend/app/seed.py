from sqlalchemy.orm import Session
from app import models
from app.core.security import get_password_hash

def seed_users(db: Session):
    existing = db.query(models.User).count()
    if existing > 0:
        return

    users = [
        models.User(
            username="admin",
            full_name="Admin User",
            email="admin@example.com",
            hashed_password=get_password_hash("admin123"),
            role="Admin",
            department="Security",
            mfa_enabled=True,
        ),
        models.User(
            username="finance_emp",
            full_name="Finance Employee",
            email="finance@example.com",
            hashed_password=get_password_hash("finance123"),
            role="Employee",
            department="Finance",
            mfa_enabled=True,
        ),
        models.User(
            username="guest1",
            full_name="Guest User",
            email="guest@example.com",
            hashed_password=get_password_hash("guest123"),
            role="Guest",
            department="General",
            mfa_enabled=True,
        )
    ]
    db.add_all(users)
    db.commit()