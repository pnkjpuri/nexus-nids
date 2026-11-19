import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
import pyotp
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Request, HTTPException, Depends
from jose import jwt
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.enterprise import User, UserSession, AuditLog

ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)

SESSION_COOKIE_NAME = "nexus_session"
SESSION_TTL_HOURS = 12
SECRET_KEY = os.getenv("SECRET_KEY", "change_this_to_a_random_32_byte_string")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))


def hash_password(plain: str) -> str:
    return ph.hash(plain)


def verify_password(plain: str, hashed: Optional[str]) -> bool:
    if not hashed:
        return False
    try:
        return ph.verify(hashed, plain)
    except VerifyMismatchError:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def verify_totp_code(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


def create_session(db: Session, user: User, request: Request) -> UserSession:
    session_id = secrets.token_urlsafe(48)
    csrf_token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    sess = UserSession(
        id=session_id,
        user_id=user.id,
        csrf_token=csrf_token,
        user_agent=(request.headers.get("user-agent") or "Unknown")[:250],
        ip_address=request.client.host if request.client else "127.0.0.1",
        created_at=now,
        last_active=now,
        expires_at=now + timedelta(hours=SESSION_TTL_HOURS),
    )
    db.add(sess)
    db.commit()
    return sess


def record_audit(
    db: Session,
    actor_email: str,
    actor_role: str,
    action: str,
    resource: str,
    details: str = "",
    ip: str = "127.0.0.1",
):
    entry = AuditLog(
        actor_email=actor_email,
        actor_role=actor_role,
        action=action,
        resource=resource,
        details=details,
        ip_address=ip,
    )
    db.add(entry)
    db.commit()


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    now = datetime.now(timezone.utc)
    sess = (
        db.query(UserSession)
        .filter(
            UserSession.id == token,
            UserSession.revoked == False,  # noqa: E712
            UserSession.expires_at > now,
        )
        .first()
    )
    if not sess:
        raise HTTPException(status_code=401, detail="Session expired or revoked")

    # Enforce CSRF token on state-changing requests
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        header_csrf = request.headers.get("X-CSRF-Token")
        if not header_csrf or not secrets.compare_digest(header_csrf, sess.csrf_token):
            raise HTTPException(status_code=403, detail="Invalid CSRF token")

    user = db.query(User).filter(User.id == sess.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    sess.last_active = now
    db.commit()
    request.state.session = sess
    return user


def require_roles(*allowed_roles: str):
    def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Requires role: {', '.join(allowed_roles)}. Current role: {user.role}",
            )
        return user

    return role_checker