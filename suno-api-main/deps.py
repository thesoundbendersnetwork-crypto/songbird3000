import os

from fastapi import HTTPException, status


def get_token() -> str:
    token = os.getenv("TOKEN", "").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="TOKEN is not configured",
        )
    return token
