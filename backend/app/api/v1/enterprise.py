from typing import Optional
from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import re

from app.core.database import get_db
from app.core.security import get_current_user, require_roles, record_audit
from app.models.enterprise import User, AuditLog

router = APIRouter()


@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles("admin")),  # Strict ADMIN-only enforcement
):
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": log.id,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "actor_email": log.actor_email,
            "actor_role": log.actor_role,
            "action": log.action,
            "resource": log.resource,
            "details": log.details,
            "ip_address": log.ip_address,
        }
        for log in logs
    ]


class ProfileUpdatePayload(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None


@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "department": current_user.department or "Security Operations Center",
        "avatar_url": current_user.avatar_url,
        "mfa_enabled": current_user.mfa_enabled,
    }


@router.put("/profile")
def update_profile(
    payload: ProfileUpdatePayload,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.username is not None:
        username = payload.username.strip().lower()
        if not re.fullmatch(r"[a-z][a-z0-9_]{2,31}", username):
            raise HTTPException(422, "Username must be 3–32 lowercase letters, numbers or underscores; start with a letter")
        current_user.username = username
    if payload.full_name is not None and payload.full_name.strip():
        current_user.full_name = payload.full_name.strip()
    if payload.department is not None:
        current_user.department = payload.department.strip()
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Username is already taken")
    db.refresh(current_user)

    record_audit(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="PROFILE_UPDATED",
        resource=f"user:{current_user.id}",
        details="Updated profile details / avatar photo",
        ip=request.client.host if request.client else "127.0.0.1",
    )

    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "department": current_user.department,
        "avatar_url": current_user.avatar_url,
        "mfa_enabled": current_user.mfa_enabled,
    }

@router.delete("/history")
def delete_my_history(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete only the authenticated user's alerts, retaining security audit records."""
    from app.models.alert import Alert
    deleted = db.query(Alert).filter(Alert.owner_id == user.id).delete(synchronize_session=False)
    db.commit()
    record_audit(db, user.email, user.role, "HISTORY_DELETED", f"user:{user.id}",
                 f"Deleted {deleted} owned alerts", request.client.host if request.client else "127.0.0.1")
    return {"deleted_alerts": deleted}


class RoleChange(BaseModel):
    role: str


@router.get("/users")
def list_users(db: Session = Depends(get_db), admin: User = Depends(require_roles("admin"))):
    return [{"id": u.id, "email": u.email, "username": u.username, "full_name": u.full_name,
             "role": u.role, "is_active": u.is_active} for u in db.query(User).order_by(User.id).all()]


@router.patch("/users/{user_id}/role")
def set_user_role(user_id: int, payload: RoleChange, request: Request,
                  db: Session = Depends(get_db), admin: User = Depends(require_roles("admin"))):
    if payload.role not in {"admin", "analyst", "viewer"}:
        raise HTTPException(422, "Invalid role")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    if target.id == admin.id and payload.role != "admin":
        raise HTTPException(400, "You cannot remove your own administrator role")
    old = target.role
    target.role = payload.role
    db.commit()
    record_audit(db, admin.email, admin.role, "ROLE_CHANGED", f"user:{target.id}",
                 f"{old} -> {payload.role}", request.client.host if request.client else "127.0.0.1")
    return {"id": target.id, "role": target.role}
