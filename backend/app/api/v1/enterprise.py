import os
import csv
import io
import re
from datetime import datetime, timedelta, timezone
from typing import Optional
import psutil
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse, RedirectResponse, PlainTextResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.alert import Alert
from app.models.enterprise import User, UserSession, DetectionRule, Notification, AuditLog, BlockedIP
from app.core.security import (
    hash_password,
    verify_password,
    generate_totp_secret,
    verify_totp_code,
    create_session,
    record_audit,
    get_current_user,
    require_roles,
    SESSION_COOKIE_NAME,
    SESSION_TTL_HOURS,
)

router = APIRouter()

oauth = OAuth()
if os.getenv("GOOGLE_CLIENT_ID"):
    oauth.register(
        name="google",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )
if os.getenv("GITHUB_CLIENT_ID"):
    oauth.register(
        name="github",
        client_id=os.getenv("GITHUB_CLIENT_ID"),
        client_secret=os.getenv("GITHUB_CLIENT_SECRET"),
        access_token_url="https://github.com/login/oauth/access_token",
        authorize_url="https://github.com/login/oauth/authorize",
        api_base_url="https://api.github.com/",
        client_kwargs={"scope": "user:email"},
    )
if os.getenv("APPLE_CLIENT_ID"):
    oauth.register(
        name="apple",
        client_id=os.getenv("APPLE_CLIENT_ID"),
        client_secret=os.getenv("APPLE_CLIENT_SECRET"),
        server_metadata_url="https://appleid.apple.com/.well-known/openid-configuration",
        client_kwargs={"scope": "name email"},
    )


def _set_auth_cookie(response: Response, session_id: str):
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_id,
        httponly=True,
        samesite="lax",
        secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
        max_age=SESSION_TTL_HOURS * 3600,
        path="/",
    )


# -------------------- AUTHENTICATION --------------------

@router.post("/auth/register")
def register_user(payload: dict, request: Request, response: Response, db: Session = Depends(get_db)):
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    full_name = (payload.get("full_name") or email.split("@")[0]).strip()

    if not email or len(password) < 8:
        raise HTTPException(status_code=400, detail="Valid email and minimum 8-character password required.")

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Account with this email already exists.")

    is_first = db.query(User).count() == 0
    role = "admin" if is_first else "analyst"

    user = User(
        email=email,
        full_name=full_name,
        password_hash=hash_password(password),
        role=role,
        is_verified=True,
        oauth_provider="local",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    sess = create_session(db, user, request)
    _set_auth_cookie(response, sess.id)
    record_audit(db, user.email, user.role, "USER_REGISTER", f"user:{user.id}", "Local Argon2id registration")
    return {"user": _serialize_user(user), "csrf_token": sess.csrf_token}


@router.post("/auth/login")
def login_user(payload: dict, request: Request, response: Response, db: Session = Depends(get_db)):
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    totp_code = (payload.get("totp_code") or "").strip()
    ip = request.client.host if request.client else "127.0.0.1"

    user = db.query(User).filter(User.email == email).first()
    now = datetime.now(timezone.utc)

    if user and user.locked_until and user.locked_until > now:
        raise HTTPException(status_code=429, detail="Account temporarily locked due to failed attempts. Try later.")

    if not user or not verify_password(password, user.password_hash):
        if user:
            user.failed_attempts += 1
            if user.failed_attempts >= 5:
                user.locked_until = now + timedelta(minutes=15)
            db.commit()
        db.add(Notification(
            category="auth",
            severity="high",
            title="Failed Login Attempt",
            message=f"Invalid authentication attempt for {email or 'unknown'} from {ip}",
            target_route="settings",
        ))
        record_audit(db, email or "anonymous", "guest", "LOGIN_FAILED", "auth", f"IP {ip}", ip)
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if user.mfa_enabled:
        if not totp_code:
            return {"mfa_required": True, "email": user.email}
        if not verify_totp_code(user.mfa_secret, totp_code):
            raise HTTPException(status_code=401, detail="Invalid MFA authenticator code.")

    user.failed_attempts = 0
    user.locked_until = None
    db.commit()

    sess = create_session(db, user, request)
    _set_auth_cookie(response, sess.id)
    record_audit(db, user.email, user.role, "LOGIN_SUCCESS", "auth", f"Session {sess.id[:8]}", ip)
    return {"user": _serialize_user(user), "csrf_token": sess.csrf_token}


@router.get("/auth/oauth/{provider}")
async def oauth_login(provider: str, request: Request):
    client = oauth.create_client(provider)
    if not client:
        raise HTTPException(
            status_code=501,
            detail=f"OAuth provider '{provider}' credentials ({provider.upper()}_CLIENT_ID) not configured on server.",
        )
    redirect_uri = str(request.url_for("oauth_callback", provider=provider))
    return await client.authorize_redirect(request, redirect_uri)


@router.get("/auth/oauth/{provider}/callback", name="oauth_callback")
async def oauth_callback(provider: str, request: Request, db: Session = Depends(get_db)):
    client = oauth.create_client(provider)
    if not client:
        raise HTTPException(status_code=501, detail="OAuth provider not configured.")

    token = await client.authorize_access_token(request)
    user_info = token.get("userinfo")
    if not user_info and provider == "github":
        resp = await client.get("user", token=token)
        profile = resp.json()
        email = profile.get("email") or f"{profile.get('login')}@users.noreply.github.com"
        user_info = {"email": email, "name": profile.get("name") or profile.get("login"), "sub": str(profile.get("id"))}

    email = (user_info.get("email") or "").lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            full_name=user_info.get("name") or email.split("@")[0],
            role="admin" if db.query(User).count() == 0 else "analyst",
            is_verified=True,
            oauth_provider=provider,
            oauth_sub=str(user_info.get("sub", "")),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    sess = create_session(db, user, request)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    redirect = RedirectResponse(url=frontend_url)
    _set_auth_cookie(redirect, sess.id)
    record_audit(db, user.email, user.role, "OAUTH_LOGIN", f"provider:{provider}", "Verified OIDC callback")
    return redirect


@router.get("/auth/me")
def get_me(request: Request, user: User = Depends(get_current_user)):
    sess: UserSession = request.state.session
    return {"user": _serialize_user(user), "csrf_token": sess.csrf_token, "session_id": sess.id}


@router.post("/auth/logout")
def logout_user(request: Request, response: Response, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sess: UserSession = request.state.session
    sess.revoked = True
    db.commit()
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    record_audit(db, user.email, user.role, "LOGOUT", f"session:{sess.id[:8]}", "User signed out")
    return {"status": "logged_out"}


@router.post("/auth/mfa/setup")
def setup_mfa(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    secret = generate_totp_secret()
    user.mfa_secret = secret
    db.commit()
    import pyotp
    uri = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name="NEXUS NIDS")
    return {"secret": secret, "provisioning_uri": uri}


@router.post("/auth/mfa/enable")
def enable_mfa(payload: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    code = payload.get("code") or ""
    if not user.mfa_secret or not verify_totp_code(user.mfa_secret, code):
        raise HTTPException(status_code=400, detail="Invalid verification code.")
    user.mfa_enabled = True
    db.commit()
    record_audit(db, user.email, user.role, "MFA_ENABLED", f"user:{user.id}", "TOTP 2FA activated")
    return {"mfa_enabled": True}


@router.get("/auth/sessions")
def list_sessions(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_id = request.state.session.id
    sessions = db.query(UserSession).filter(UserSession.user_id == user.id, UserSession.revoked == False).all()  # noqa: E712
    return [
        {
            "id": s.id,
            "current": s.id == current_id,
            "user_agent": s.user_agent,
            "ip_address": s.ip_address,
            "last_active": s.last_active.isoformat(),
        }
        for s in sessions
    ]


@router.post("/auth/sessions/revoke-others")
def revoke_other_sessions(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_id = request.state.session.id
    db.query(UserSession).filter(UserSession.user_id == user.id, UserSession.id != current_id).update({"revoked": True})
    db.commit()
    record_audit(db, user.email, user.role, "SESSIONS_REVOKED", f"user:{user.id}", "Terminated other active sessions")
    return {"status": "revoked"}


def _serialize_user(u: User) -> dict:
    return {
        "id": u.id,
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "avatar_url": u.avatar_url,
        "is_verified": u.is_verified,
        "mfa_enabled": u.mfa_enabled,
        "oauth_provider": u.oauth_provider,
        "preferences": u.preferences or {},
    }


# -------------------- ALERTS & ACTIVE MITIGATION --------------------

@router.get("/alerts")
def get_alerts(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    ip: Optional[str] = None,
    limit: int = 100,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Alert).filter(Alert.owner_id == user.id)
    if severity and severity.lower() != "all":
        q = q.filter(Alert.severity.ilike(severity))
    if status and status.lower() != "all":
        q = q.filter(Alert.status.ilike(status))
    if ip:
        q = q.filter((Alert.src_ip.contains(ip)) | (Alert.dest_ip.contains(ip)))

    rows = q.order_by(desc(Alert.id)).limit(limit).all()
    return [
        {
            "id": a.id,
            "timestamp": a.timestamp.isoformat() if getattr(a, "timestamp", None) else datetime.now(timezone.utc).isoformat(),
            "severity": (getattr(a, "severity", None) or "medium").lower(),
            "event_type": getattr(a, "event_type", None) or "Intrusion Event",
            "rule_id": getattr(a, "rule_id", None) or "NIDS-101",
            "src_ip": getattr(a, "src_ip", None) or getattr(a, "source_ip", None) or "0.0.0.0",
            "dest_ip": getattr(a, "dest_ip", None) or getattr(a, "destination_ip", None) or "0.0.0.0",
            "src_port": getattr(a, "src_port", None) or 0,
            "dest_port": getattr(a, "dest_port", None) or 0,
            "protocol": getattr(a, "protocol", None) or "TCP",
            "status": (getattr(a, "status", None) or "detected").lower(),
            "description": getattr(a, "description", None) or "",
            "source_mode": (getattr(a, "raw_event", None) or {}).get("source_mode", "telemetry"),
        }
        for a in rows
    ]


@router.patch("/alerts/{alert_id}/status")
def update_alert_status(
    alert_id: int,
    payload: dict,
    user: User = Depends(require_roles("admin", "analyst")),
    db: Session = Depends(get_db),
):
    new_status = (payload.get("status") or "").lower()
    allowed = {"detected", "investigating", "mitigated", "blocked", "resolved"}
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail=f"Status must be one of {allowed}")

    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.owner_id == user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = new_status
    src_ip = alert.src_ip or alert.source_ip

    if new_status in {"blocked", "mitigated"} and src_ip:
        alert.action = "BLOCK_IP"
        existing = (
            db.query(BlockedIP)
            .filter(BlockedIP.owner_id == user.id, BlockedIP.ip_address == src_ip)
            .first()
        )
        if not existing:
            db.add(BlockedIP(
                owner_id=user.id,
                ip_address=src_ip,
                reason=f"Blocked via alert #{alert_id} ({alert.event_type or 'Threat'})",
                blocked_by=user.email,
            ))
        db.query(Alert).filter(
            Alert.owner_id == user.id,
            (Alert.src_ip == src_ip) | (Alert.source_ip == src_ip),
            Alert.status == "detected",
        ).update({"status": new_status, "action": "BLOCK_IP"}, synchronize_session=False)
        record_audit(db, user.email, user.role, "IP_BLOCKED", f"ip:{src_ip}", f"Blocked {src_ip} via status update on alert #{alert_id}")
    else:
        record_audit(db, user.email, user.role, "ALERT_STATUS_UPDATE", f"alert:{alert_id}", f"Changed to {new_status}")

    db.commit()
    return {"id": alert_id, "status": new_status, "blocked_ip": src_ip if new_status in {"blocked", "mitigated"} else None}


@router.post("/alerts/{alert_id}/block-ip")
def block_alert_ip(
    alert_id: int,
    user: User = Depends(require_roles("admin", "analyst")),
    db: Session = Depends(get_db),
):
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.owner_id == user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    src_ip = alert.src_ip or alert.source_ip or "0.0.0.0"
    alert.status = "blocked"
    alert.action = "BLOCK_IP"

    existing = (
        db.query(BlockedIP)
        .filter(BlockedIP.owner_id == user.id, BlockedIP.ip_address == src_ip)
        .first()
    )
    if not existing:
        db.add(BlockedIP(
            owner_id=user.id,
            ip_address=src_ip,
            reason=f"Blocked from alert #{alert_id} ({alert.event_type or 'Threat'})",
            blocked_by=user.email,
        ))

    db.query(Alert).filter(
        Alert.owner_id == user.id,
        (Alert.src_ip == src_ip) | (Alert.source_ip == src_ip),
        Alert.status == "detected",
    ).update({"status": "blocked", "action": "BLOCK_IP"}, synchronize_session=False)

    db.commit()

    record_audit(
        db,
        user.email,
        user.role,
        "IP_BLOCKED",
        f"ip:{src_ip}",
        f"Persistent firewall drop rule applied to {src_ip} from alert #{alert_id}",
    )
    return {"status": "success", "blocked_ip": src_ip, "alert_id": alert_id}


@router.get("/firewall/blocked-ips")
def list_blocked_ips(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(BlockedIP).filter(BlockedIP.owner_id == user.id).order_by(desc(BlockedIP.id)).all()


@router.delete("/firewall/blocked-ips/{ip_id}")
def unblock_ip(ip_id: int, user: User = Depends(require_roles("admin", "analyst")), db: Session = Depends(get_db)):
    entry = db.query(BlockedIP).filter(BlockedIP.id == ip_id, BlockedIP.owner_id == user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Blocked IP entry not found")
    ip_addr = entry.ip_address
    db.delete(entry)
    db.commit()
    record_audit(db, user.email, user.role, "IP_UNBLOCKED", f"ip:{ip_addr}", f"Removed {ip_addr} from blocklist")
    return {"status": "unblocked", "ip_address": ip_addr}


@router.get("/firewall/export")
def export_blocked_ips(
    format: str = "suricata",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entries = db.query(BlockedIP).filter(BlockedIP.owner_id == user.id).order_by(desc(BlockedIP.id)).all()
    if format == "csv":
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["ID", "IP Address", "Reason", "Blocked By", "Created At"])
        for e in entries:
            writer.writerow([e.id, e.ip_address, e.reason, e.blocked_by, getattr(e, "created_at", "")])
        buf.seek(0)
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=nexus_blocked_ips.csv"},
        )
    rules_txt = "\n".join(
        f'drop ip {e.ip_address} any -> any any (msg:"NEXUS NIDS Block - {e.reason}"; sid:{9000000 + e.id}; rev:1;)'
        for e in entries
    )
    return PlainTextResponse(
        content=rules_txt or "# No active drop rules",
        headers={"Content-Disposition": "attachment; filename=nexus_firewall.rules"},
    )


# -------------------- DETECTION RULES --------------------

@router.get("/rules")
def list_rules(db: Session = Depends(get_db)):
    rules = db.query(DetectionRule).all()
    if not rules:
        defaults = [
            DetectionRule(id="OWASP-SQLI-942", name="SQL Injection Pattern", signature=r"(UNION\s+SELECT|OR\s+1=1|DROP\s+TABLE)", description="Detects SQLi payloads in HTTP URIs", severity="critical", category="WEB_ATTACK"),
            DetectionRule(id="NIDS-DOS-201", name="TCP SYN Flood Burst", signature="tcp.flags == 'S' and rate > 40/5s", description="Detects half-open SYN flood exhaustion", severity="critical", category="DOS"),
            DetectionRule(id="MITRE-T1110-022", name="SSH Brute Force", signature="dest_port == 22 and auth_failures > 5", description="Detects repeated SSH login failures", severity="high", category="CREDENTIAL_ACCESS"),
            DetectionRule(id="NIDS-SCAN-104", name="Stealth Port Scan", signature="unique_dest_ports > 12", description="Detects horizontal/vertical port enumeration", severity="high", category="RECONNAISSANCE"),
            DetectionRule(id="NIDS-DNS-302", name="DNS Tunneling Payload", signature="udp.port == 53 and len(payload) > 250", description="Flags high-entropy oversized DNS queries", severity="medium", category="EXFILTRATION"),
        ]
        db.add_all(defaults)
        db.commit()
        rules = db.query(DetectionRule).all()
    return rules


@router.post("/rules")
def create_rule(
    payload: dict,
    user: User = Depends(require_roles("admin", "analyst")),
    db: Session = Depends(get_db),
):
    rule_id = (payload.get("id") or "").strip().upper()
    name = (payload.get("name") or "").strip()
    signature = (payload.get("signature") or "").strip()
    severity = (payload.get("severity") or "high").lower()
    category = (payload.get("category") or "CUSTOM").upper()
    description = (payload.get("description") or "Custom SOC detection rule").strip()

    if not rule_id or not name or not signature:
        raise HTTPException(status_code=400, detail="Rule ID, name, and signature are required.")
    if db.query(DetectionRule).filter(DetectionRule.id == rule_id).first():
        raise HTTPException(status_code=409, detail="Rule ID already exists.")

    rule = DetectionRule(
        id=rule_id,
        name=name,
        signature=signature,
        description=description,
        severity=severity,
        category=category,
        enabled=True,
        updated_by=user.email,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    record_audit(db, user.email, user.role, "RULE_CREATED", f"rule:{rule_id}", f"Added custom rule '{name}'")
    return rule


@router.patch("/rules/{rule_id}/toggle")
def toggle_rule(rule_id: str, user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    rule = db.query(DetectionRule).filter(DetectionRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    rule.enabled = not rule.enabled
    rule.updated_by = user.email
    rule.updated_at = datetime.now(timezone.utc)
    hist = list(rule.history or [])
    hist.append({"action": "enabled" if rule.enabled else "disabled", "by": user.email, "at": rule.updated_at.isoformat()})
    rule.history = hist
    db.commit()
    record_audit(db, user.email, user.role, "RULE_TOGGLED", f"rule:{rule_id}", f"enabled={rule.enabled}")
    return rule


@router.post("/rules/test")
def test_rule_signature(payload: dict):
    pattern = payload.get("signature") or ""
    sample = payload.get("sample_packet") or ""
    try:
        matched = bool(re.search(pattern, sample, re.IGNORECASE))
        return {"matched": matched, "pattern": pattern}
    except re.error as e:
        return {"matched": False, "error": str(e)}


# -------------------- SYSTEM HEALTH & TELEMETRY --------------------

@router.get("/system/metrics")
def system_metrics(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cpu = psutil.cpu_percent(interval=0.1)
    mem = psutil.virtual_memory()
    net = psutil.net_io_counters()
    total_alerts = db.query(Alert).filter(Alert.owner_id == user.id).count()
    last_alert = db.query(Alert).filter(Alert.owner_id == user.id).order_by(desc(Alert.id)).first()
    last_ts = last_alert.timestamp.isoformat() if (last_alert and getattr(last_alert, "timestamp", None)) else None

    return {
        "cpu_percent": cpu,
        "memory_percent": mem.percent,
        "memory_used_gb": round(mem.used / (1024**3), 2),
        "memory_total_gb": round(mem.total / (1024**3), 2),
        "packets_sent": net.packets_sent,
        "packets_recv": net.packets_recv,
        "packets_dropped": net.dropin + net.dropout,
        "db_status": "CONNECTED",
        "backend_status": "HEALTHY",
        "total_events_stored": total_alerts,
        "last_ingestion_timestamp": last_ts,
    }


# -------------------- REPORTS & EXPORTS (PER-USER ISOLATED) --------------------

@router.get("/reports/export")
def export_report(format: str = "csv", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    alerts = db.query(Alert).filter(Alert.owner_id == user.id).order_by(desc(Alert.id)).limit(500).all()
    if format == "csv":
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["ID", "Timestamp", "Severity", "Event Type", "Rule ID", "Source IP", "Destination IP", "Protocol", "Status"])
        for a in alerts:
            writer.writerow([
                a.id,
                getattr(a, "timestamp", ""),
                getattr(a, "severity", ""),
                getattr(a, "event_type", ""),
                getattr(a, "rule_id", ""),
                getattr(a, "src_ip", ""),
                getattr(a, "dest_ip", ""),
                getattr(a, "protocol", ""),
                getattr(a, "status", "detected"),
            ])
        buf.seek(0)
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=nexus_nids_security_report.csv"},
        )
    return {"generated_at": datetime.now(timezone.utc).isoformat(), "total_records": len(alerts)}


# -------------------- NOTIFICATIONS & AUDIT LOGS --------------------

@router.get("/notifications")
def list_notifications(db: Session = Depends(get_db)):
    return db.query(Notification).order_by(desc(Notification.id)).limit(30).all()


@router.post("/notifications/read-all")
def mark_all_notifications_read(db: Session = Depends(get_db)):
    db.query(Notification).update({"is_read": True})
    db.commit()
    return {"status": "ok"}


@router.delete("/notifications/clear")
def clear_notifications(user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    db.query(Notification).delete()
    db.commit()
    record_audit(db, user.email, user.role, "NOTIFICATIONS_CLEARED", "notifications", "Cleared notification center")
    return {"status": "cleared"}


@router.get("/audit-logs")
def get_audit_logs(user: User = Depends(require_roles("admin", "analyst")), db: Session = Depends(get_db)):
    return db.query(AuditLog).order_by(desc(AuditLog.id)).limit(100).all()