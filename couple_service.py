"""情侣空间初始化与绑定逻辑。"""
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Couple, CoupleBalance, User


async def get_user_couple(db: AsyncSession, user_id: int) -> Couple | None:
    result = await db.execute(
        select(Couple).where(
            or_(Couple.user_a_id == user_id, Couple.user_b_id == user_id)
        ).limit(1)
    )
    return result.scalar_one_or_none()


async def ensure_couple_for_user(db: AsyncSession, user: User) -> Couple:
    """确保用户拥有情侣空间（单人可先使用，伴侣后续加入）。"""
    couple = await get_user_couple(db, user.id)
    if couple is not None:
        return couple

    couple = Couple(user_a_id=user.id, user_b_id=None, display_name=f"{user.nickname}的空间")
    db.add(couple)
    await db.flush()

    balance = CoupleBalance(couple_id=couple.id, initial_balance=0, note="初始余额")
    db.add(balance)
    await db.flush()
    return couple
