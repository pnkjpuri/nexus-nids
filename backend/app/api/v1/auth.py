import os
import secrets
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    SESSION_COOKIE_NAME,
    SESSION_TTL_HOURS,
    create_session,
    get_current_user,
    hash_password,
    record_audit,
    verify_password,
)
from app.models.enterprise import User, UserSession

router = APIRouter()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")


class RegisterPayload(BaseModel):
    email: str
    password: str
    full_name: str
    role: Optional[str] = "analyst"


class LoginPayload(BaseModel):
    email: str
    password: str


def _attach_session_cookie(response: Response, session_id: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_id,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=SESSION_TTL_HOURS * 3600,
        path="/",
    )


def _upsert_oauth_user(
    db: Session,
    email: str,
    full_name: str,
    provider: str,
    oauth_sub: str,
    avatar_url: Optional[str] = None,
) -> User:
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    if not user:
        user = User(
            email=email.lower().strip(),
            full_name=full_name or email.split("@")[0],
            role="analyst",
            oauth_provider=provider,
            oauth_sub=str(oauth_sub),
            avatar_url=avatar_url,
            is_active=True,
        )
        db.add(user)
    else:
        user.oauth_provider = provider
        user.oauth_sub = str(oauth_sub)
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
    db.commit()
    db.refresh(user)
    return user


@router.post("/register")
def register(payload: RegisterPayload, request: Request, response: Response, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        role="analyst",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    sess = create_session(db, user, request)
    _attach_session_cookie(response, sess.id)
    record_audit(
        db,
        user.email,
        user.role,
        "USER_REGISTERED",
        f"user:{user.id}",
        "Account created via standard registration",
        request.client.host if request.client else "127.0.0.1",
    )
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "username": user.username,
            "role": user.role,
            "avatar_url": user.avatar_url,
            "mfa_enabled": user.mfa_enabled,
        },
        "csrf_token": sess.csrf_token,
    }


@router.post("/login")
def login(payload: LoginPayload, request: Request, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    sess = create_session(db, user, request)
    _attach_session_cookie(response, sess.id)
    record_audit(
        db,
        user.email,
        user.role,
        "LOGIN_SUCCESS",
        "auth:password",
        "Authenticated via password",
        request.client.host if request.client else "127.0.0.1",
    )
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "username": user.username,
            "role": user.role,
            "avatar_url": user.avatar_url,
            "mfa_enabled": user.mfa_enabled,
        },
        "csrf_token": sess.csrf_token,
    }


@router.get("/me")
def get_me(request: Request, current_user: User = Depends(get_current_user)):
    sess = getattr(request.state, "session", None)
    return {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "username": current_user.username,
            "role": current_user.role,
            "department": current_user.department,
            "avatar_url": current_user.avatar_url,
            "mfa_enabled": current_user.mfa_enabled,
        },
        "csrf_token": sess.csrf_token if sess else "",
    }


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        sess = db.query(UserSession).filter(UserSession.id == token).first()
        if sess:
            sess.revoked = True
            db.commit()
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"status": "logged_out"}


# ---------------------------------------------------------------------------
# GOOGLE OAUTH 2.0
# ---------------------------------------------------------------------------
@router.get("/oauth/google")
def oauth_google_login(request: Request):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not configured in .env",
        )
    state = secrets.token_urlsafe(24)
    request.session["oauth_state"] = state
    redirect_uri = f"{BACKEND_URL}/api/v1/auth/oauth/google/callback"
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    }
    return RedirectResponse(url=f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}")


@router.get("/oauth/google/callback")
async def oauth_google_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db),
):
    if error or not code:
        return RedirectResponse(url=f"{FRONTEND_URL}/?oauth_error={error or 'missing_code'}")

    saved_state = request.session.pop("oauth_state", None)
    if not saved_state or saved_state != state:
        return RedirectResponse(url=f"{FRONTEND_URL}/?oauth_error=invalid_state")

    redirect_uri = f"{BACKEND_URL}/api/v1/auth/oauth/google/callback"
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        if not access_token:
            return RedirectResponse(url=f"{FRONTEND_URL}/?oauth_error=token_exchange_failed")

        profile_res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        profile = profile_res.json()

    email = profile.get("email")
    if not email:
        return RedirectResponse(url=f"{FRONTEND_URL}/?oauth_error=no_email")

    user = _upsert_oauth_user(
        db=db,
        email=email,
        full_name=profile.get("name", email.split("@")[0]),
        provider="google",
        oauth_sub=profile.get("sub", email),
        avatar_url=profile.get("picture"),
    )
    sess = create_session(db, user, request)
    record_audit(
        db,
        user.email,
        user.role,
        "OAUTH_LOGIN",
        "auth:google",
        "Signed in via Google OAuth 2.0",
        request.client.host if request.client else "127.0.0.1",
    )

    redirect = RedirectResponse(url=f"{FRONTEND_URL}/#dashboard", status_code=302)
    _attach_session_cookie(redirect, sess.id)
    return redirect


# ---------------------------------------------------------------------------
# GITHUB OAUTH 2.0
# ---------------------------------------------------------------------------
@router.get("/oauth/github")
def oauth_github_login(request: Request):
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are not configured in .env",
        )
    state = secrets.token_urlsafe(24)
    request.session["oauth_state"] = state
    redirect_uri = f"{BACKEND_URL}/api/v1/auth/oauth/github/callback"
    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": "read:user user:email",
        "state": state,
    }
    return RedirectResponse(url=f"https://github.com/login/oauth/authorize?{urlencode(params)}")


@router.get("/oauth/github/callback")
async def oauth_github_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db),
):
    if error or not code:
        return RedirectResponse(url=f"{FRONTEND_URL}/?oauth_error={error or 'missing_code'}")

    saved_state = request.session.pop("oauth_state", None)
    if not saved_state or saved_state != state:
        return RedirectResponse(url=f"{FRONTEND_URL}/?oauth_error=invalid_state")

    redirect_uri = f"{BACKEND_URL}/api/v1/auth/oauth/github/callback"
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": redirect_uri,
            },
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        if not access_token:
            return RedirectResponse(url=f"{FRONTEND_URL}/?oauth_error=token_exchange_failed")

        gh_headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        }
        profile_res = await client.get("https://api.github.com/user", headers=gh_headers)
        profile = profile_res.json()

        email = profile.get("email")
        if not email:
            emails_res = await client.get("https://api.github.com/user/emails", headers=gh_headers)
            if emails_res.status_code == 200:
                for item in emails_res.json():
                    if item.get("primary") and item.get("verified"):
                        email = item.get("email")
                        break

    if not email:
        return RedirectResponse(url=f"{FRONTEND_URL}/?oauth_error=no_verified_email")

    user = _upsert_oauth_user(
        db=db,
        email=email,
        full_name=profile.get("name") or profile.get("login") or email.split("@")[0],
        provider="github",
        oauth_sub=str(profile.get("id", email)),
        avatar_url=profile.get("avatar_url"),
    )
    sess = create_session(db, user, request)
    record_audit(
        db,
        user.email,
        user.role,
        "OAUTH_LOGIN",
        "auth:github",
        "Signed in via GitHub OAuth 2.0",
        request.client.host if request.client else "127.0.0.1",
    )

    redirect = RedirectResponse(url=f"{FRONTEND_URL}/#dashboard", status_code=302)
    _attach_session_cookie(redirect, sess.id)
    return redirect
