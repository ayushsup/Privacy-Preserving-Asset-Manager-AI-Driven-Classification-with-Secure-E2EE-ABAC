import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..config import settings
from .. import models
from ..core.security import get_current_user
from ..core.access_control import evaluate_abac, evaluate_rbac
from ..services.ai_classifier import categorize_text

router = APIRouter(prefix="/files", tags=["files"])

os.makedirs(settings.STORAGE_DIR, exist_ok=True)

@router.post("/upload")
async def upload_file(
    encrypted_file: UploadFile = File(...),
    iv_b64: str = Form(...),
    department: str = Form(...),
    upload_summary: str = Form(""),
    mode: str = Form("abac"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    contents = await encrypted_file.read()
    classification = categorize_text(upload_summary)

    stored_filename = f"{uuid.uuid4().hex}_{encrypted_file.filename}"
    file_path = os.path.join(settings.STORAGE_DIR, stored_filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    asset = models.AssetFile(
        owner_id=current_user.id,
        original_filename=encrypted_file.filename,
        stored_filename=stored_filename,
        mime_type=encrypted_file.content_type or "application/octet-stream",
        category=classification["category"],
        sensitivity=classification["sensitivity"],
        department=department,
        iv_b64=iv_b64,
        upload_summary=upload_summary,
        file_size=len(contents),
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    return {
        "id": asset.id,
        "original_filename": asset.original_filename,
        "category": asset.category,
        "sensitivity": asset.sensitivity,
        "department": asset.department,
        "created_at": asset.created_at,
        "policy_mode": mode
    }

@router.get("/")
def list_files(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    files = db.query(models.AssetFile).all()
    visible = []
    for f in files:
        allowed, _ = evaluate_rbac(current_user, f)
        if allowed or f.owner_id == current_user.id or current_user.role == "Admin":
            visible.append({
                "id": f.id,
                "original_filename": f.original_filename,
                "mime_type": f.mime_type,
                "category": f.category,
                "sensitivity": f.sensitivity,
                "department": f.department,
                "file_size": f.file_size,
                "iv_b64": f.iv_b64,
                "upload_summary": f.upload_summary,
                "created_at": f.created_at,
                "owner_username": f.owner.username
            })
    return visible

@router.post("/{file_id}/evaluate-access")
def evaluate_access(
    file_id: int,
    request: Request,
    current_hour: int = Form(...),
    mode: str = Form("abac"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    asset = db.query(models.AssetFile).filter(models.AssetFile.id == file_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="File not found")

    client_ip = request.client.host if request.client else "127.0.0.1"
    env = {"ip_address": client_ip, "current_hour": current_hour}

    if mode == "rbac":
        allowed, reason = evaluate_rbac(current_user, asset)
    else:
        allowed, reason = evaluate_abac(current_user, asset, env)

    return {"allowed": allowed, "reason": reason}

@router.get("/{file_id}/download")
def download_file(
    file_id: int,
    request: Request,
    mode: str = "abac",
    current_hour: int = 12,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    asset = db.query(models.AssetFile).filter(models.AssetFile.id == file_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="File not found")

    client_ip = request.client.host if request.client else "127.0.0.1"
    env = {"ip_address": client_ip, "current_hour": current_hour}

    if mode == "rbac":
        allowed, reason = evaluate_rbac(current_user, asset)
    else:
        allowed, reason = evaluate_abac(current_user, asset, env)

    if not allowed and asset.owner_id != current_user.id and current_user.role != "Admin":
        raise HTTPException(status_code=403, detail=reason)

    file_path = os.path.join(settings.STORAGE_DIR, asset.stored_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Stored file missing")

    return FileResponse(
        path=file_path,
        filename=asset.original_filename + ".enc",
        media_type="application/octet-stream"
    )