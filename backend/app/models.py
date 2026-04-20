from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    full_name = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="Employee")
    department = Column(String(100), nullable=False, default="General")
    disabled = Column(Boolean, default=False)
    mfa_enabled = Column(Boolean, default=True)

    files = relationship("AssetFile", back_populates="owner")

class AssetFile(Base):
    __tablename__ = "asset_files"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False, unique=True)
    mime_type = Column(String(100), nullable=False)
    category = Column(String(100), nullable=False, default="Unclassified")
    sensitivity = Column(String(50), nullable=False, default="Medium")
    department = Column(String(100), nullable=False, default="General")
    encrypted_key_hint = Column(String(255), nullable=True)
    iv_b64 = Column(Text, nullable=False)
    upload_summary = Column(Text, nullable=True)
    file_size = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="files")