from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.db import get_db
from app.feature_flags import require_feature
from app.pet_engine import build_pet_payload, perform_pet_action
from app.schemas import PetActionRequest, PetRenameRequest

router = APIRouter(prefix="/api/pet", tags=["pet"])


def _require_couple(user: dict) -> str:
    if not user.get("couple_id"):
        raise HTTPException(status_code=400, detail="Couple pairing required")
    return user["couple_id"]


@router.get("")
def get_pet(
    current_user: dict = Depends(get_current_user),
    _: None = require_feature("pet_enabled"),
) -> dict[str, Any]:
    couple_id = _require_couple(current_user)
    with get_db() as conn:
        return build_pet_payload(conn, couple_id, current_user["id"])


@router.post("/action")
async def pet_action(
    body: PetActionRequest,
    current_user: dict = Depends(get_current_user),
    _: None = require_feature("pet_enabled"),
) -> dict[str, Any]:
    couple_id = _require_couple(current_user)
    if body.action not in ("feed", "pet", "daily_check"):
        raise HTTPException(status_code=400, detail="Invalid action")
    try:
        from app.pet_engine import broadcast_pet_update_async

        snapshot = perform_pet_action(couple_id, current_user["id"], body.action)
        await broadcast_pet_update_async(couple_id, snapshot)
        return snapshot
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.patch("/name")
def rename_pet(
    body: PetRenameRequest,
    current_user: dict = Depends(get_current_user),
    _: None = require_feature("pet_enabled"),
) -> dict[str, Any]:
    couple_id = _require_couple(current_user)
    name = body.name.strip()
    if not name or len(name) > 12:
        raise HTTPException(status_code=400, detail="Name must be 1-12 characters")
    with get_db() as conn:
        from app.pet_engine import get_or_create_pet

        pet = get_or_create_pet(conn, couple_id)
        conn.execute("UPDATE pets SET name = ? WHERE id = ?", (name, pet["id"]))
        return build_pet_payload(conn, couple_id, current_user["id"])
