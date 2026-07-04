"""养成经验规则。"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import GrowthPet, GrowthEvent, Couple

EXP_RULES = {
    "ledger_add": 2,
    "chat_send": 1,
    "promise_checkin": 5,
    "promise_complete": 20,
    "budget_ok": 30,
    "location_memory_add": 3,
    "anniversary_checkin": 50,
    "feed": 10,
    "pet": 8,
    "play": 12,
}


async def add_exp(
    db: AsyncSession,
    couple_id: int,
    event_type: str,
    description: str | None = None,
) -> tuple[GrowthPet, GrowthEvent]:
    """增加经验并记录事件，自动升级。"""
    result = await db.execute(select(GrowthPet).where(GrowthPet.couple_id == couple_id))
    pet = result.scalar_one_or_none()
    if pet is None:
        pet = GrowthPet(couple_id=couple_id, name="蜜糖", level=1, exp=0, intimacy=0, mood=80, energy=100)
        db.add(pet)
        await db.flush()

    delta = EXP_RULES.get(event_type, 0)
    pet.exp += delta
    pet.intimacy = min(pet.intimacy + delta, 9999)
    if event_type == "feed":
        pet.energy = min(pet.energy + 15, 100)
        pet.mood = min(pet.mood + 5, 100)
    elif event_type == "pet":
        pet.mood = min(pet.mood + 10, 100)
    elif event_type == "play":
        pet.mood = min(pet.mood + 8, 100)
        pet.energy = max(pet.energy - 5, 0)

    # 升级规则：每 100 exp 一级
    while pet.exp >= pet.level * 100:
        pet.exp -= pet.level * 100
        pet.level += 1

    event = GrowthEvent(
        couple_id=couple_id,
        event_type=event_type,
        exp_delta=delta,
        description=description,
    )
    db.add(event)
    await db.flush()
    return pet, event
