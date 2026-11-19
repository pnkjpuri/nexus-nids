from typing import Optional
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

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
    full_name: Optional[str] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None


@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
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
    if payload.full_name is not None and payload.full_name.strip():
        current_user.full_name = payload.full_name.strip()
    if payload.department is not None:
        current_user.department = payload.department.strip()
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url

    db.commit()
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
        "full_name": current_user.full_name,
        "role": current_user.role,
        "department": current_user.department,
        "avatar_url": current_user.avatar_url,
        "mfa_enabled": current_user.mfa_enabled,
    }