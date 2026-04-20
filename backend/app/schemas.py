from datetime import datetime
from pydantic import BaseModel, EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class LoginRequest(BaseModel):
    username: str
    password: str
    mfa_code: str

class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    email: EmailStr
    role: str
    department: str

    class Config:
        from_attributes = True

class FileCreateResponse(BaseModel):
    id: int
    original_filename: str
    category: str
    sensitivity: str
    department: str
    created_at: datetime

class FileOut(BaseModel):
    id: int
    original_filename: str
    mime_type: str
    category: str
    sensitivity: str
    department: str
    file_size: int
    iv_b64: str
    upload_summary: str | None
    created_at: datetime
    owner_username: str

class AccessEvaluationRequest(BaseModel):
    file_id: int
    ip_address: str
    current_hour: int

class AccessEvaluationResponse(BaseModel):
    allowed: bool
    reason: str