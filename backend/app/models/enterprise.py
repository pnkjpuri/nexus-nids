import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, JSON
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=True)
    role = Column(String, default="analyst")
    avatar_url = Column(String, nullable=True)
    is_verified = Column(Boolean, default=True)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String, nullable=True)
    oauth_provider = Column(String, default="local")
    oauth_sub = Column(String, nullable=True)
    failed_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    preferences = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    csrf_token = Column(String, nullable=True, default=lambda: str(uuid.uuid4()))
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    revoked = Column(Boolean, default=False)
    last_active = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_email = Column(String, nullable=False)
    actor_role = Column(String, nullable=False)
    action = Column(String, nullable=False)
    resource = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String, default="127.0.0.1")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    category = Column(String, default="system")
    severity = Column(String, default="info")
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    target_route = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class DetectionRule(Base):
    __tablename__ = "detection_rules"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    signature = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String, default="medium")
    category = Column(String, default="GENERAL")
    enabled = Column(Boolean, default=True)
    updated_by = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    history = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class BlockedIP(Base):
    __tablename__ = "blocked_ips"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    ip_address = Column(String(100), nullable=False, index=True)
    reason = Column(String(255), nullable=True)
    blocked_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))