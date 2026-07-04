from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    nickname: str = Field(min_length=1, max_length=32)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    device_name: str = "Web"


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str = ""
    token_type: str = "bearer"
    user: dict


class CoupleJoinRequest(BaseModel):
    invite_code: str = Field(min_length=4, max_length=12)


class TransactionCreate(BaseModel):
    scope: Literal["personal", "couple"]
    amount: float = Field(gt=0)
    category: str
    type: Literal["income", "expense"]
    note: str = ""
    tx_date: str
    account_id: Optional[str] = None
    transfer_to_account_id: Optional[str] = None
    tx_kind: Literal["normal", "transfer"] = "normal"
    paid_by: Optional[str] = None
    split_type: Literal["none", "aa", "payer", "partner"] = "none"
    attributed_to: Optional[str] = None


class TransactionUpdate(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0)
    category: Optional[str] = None
    type: Optional[Literal["income", "expense"]] = None
    note: Optional[str] = None
    tx_date: Optional[str] = None
    account_id: Optional[str] = None
    transfer_to_account_id: Optional[str] = None
    paid_by: Optional[str] = None
    split_type: Optional[Literal["none", "aa", "payer", "partner"]] = None
    attributed_to: Optional[str] = None


class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    kind: Literal["cash", "debit_card", "credit_card", "alipay", "wechat", "other"] = "cash"
    balance: float = 0.0
    currency: str = Field(default="CNY", max_length=8)
    scope: Literal["personal", "couple"] = "personal"


class AccountUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=40)
    kind: Optional[Literal["cash", "debit_card", "credit_card", "alipay", "wechat", "other"]] = None
    balance: Optional[float] = None
    currency: Optional[str] = Field(default=None, max_length=8)
    is_archived: Optional[bool] = None


class TransferCreate(BaseModel):
    scope: Literal["personal", "couple"] = "personal"
    from_account_id: str
    to_account_id: str
    amount: float = Field(gt=0)
    note: str = ""
    tx_date: str


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=24)
    icon: str = Field(default="circle", max_length=40)
    type: Literal["income", "expense"]


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=24)
    icon: Optional[str] = Field(default=None, max_length=40)
    type: Optional[Literal["income", "expense"]] = None
    sort_order: Optional[int] = None


class CategorySortItem(BaseModel):
    id: str
    sort_order: int


class RecurringBillCreate(BaseModel):
    scope: Literal["personal", "couple"] = "personal"
    title: str = Field(min_length=1, max_length=40)
    account_id: Optional[str] = None
    amount: float = Field(gt=0)
    category: str
    type: Literal["income", "expense"] = "expense"
    note: str = ""
    frequency: Literal["daily", "weekly", "monthly", "yearly"] = "monthly"
    next_due_date: str
    paid_by: Optional[str] = None
    split_type: Literal["none", "aa", "payer", "partner"] = "none"
    attributed_to: Optional[str] = None


class RecurringBillUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=40)
    account_id: Optional[str] = None
    amount: Optional[float] = Field(default=None, gt=0)
    category: Optional[str] = None
    type: Optional[Literal["income", "expense"]] = None
    note: Optional[str] = None
    frequency: Optional[Literal["daily", "weekly", "monthly", "yearly"]] = None
    next_due_date: Optional[str] = None
    is_active: Optional[bool] = None
    paused_until: Optional[str] = None
    paid_by: Optional[str] = None
    split_type: Optional[Literal["none", "aa", "payer", "partner"]] = None
    attributed_to: Optional[str] = None


class ChatMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    message_type: Literal["text", "image", "emoji"] = "text"
    scope: Literal["personal", "couple"] = "couple"
    reply_to_id: Optional[str] = None


class ChatReaction(BaseModel):
    emoji: str = Field(min_length=1, max_length=8)


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=500)


class AnniversaryCreate(BaseModel):
    title: str = Field(min_length=1, max_length=40)
    anniversary_date: str
    note: str = ""


class AnniversaryUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=40)
    anniversary_date: Optional[str] = None
    note: Optional[str] = None


class GoalCreate(BaseModel):
    scope: Literal["personal", "couple"] = "couple"
    title: str = Field(min_length=1, max_length=60)
    target_value: Optional[float] = None
    unit: str = ""
    deadline: Optional[str] = None
    goal_type: Literal["savings", "habit", "custom"] = "custom"
    note: str = ""


class GoalUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=60)
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    unit: Optional[str] = None
    deadline: Optional[str] = None
    goal_type: Optional[Literal["savings", "habit", "custom"]] = None
    note: Optional[str] = None


class CheckInCreate(BaseModel):
    value: float = Field(default=1, ge=0)
    note: str = ""
    check_in_date: Optional[str] = None


class IntimacyLogCreate(BaseModel):
    score: int = Field(ge=1, le=10)
    note: str = ""
    log_date: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=6, max_length=128)


class ProfileUpdate(BaseModel):
    nickname: Optional[str] = Field(default=None, min_length=1, max_length=32)
    avatar_url: Optional[str] = Field(default=None, max_length=500)


class DeleteAccountRequest(BaseModel):
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class AiParseRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    scope: Literal["personal", "couple"] = "personal"


class AiQuickTransactionRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    scope: Literal["personal", "couple"] = "personal"
    ai_enabled: bool = True


class AiQuickTransactionBatchRequest(BaseModel):
    text: str = Field(default="", max_length=4000)
    lines: list[str] = Field(default_factory=list)
    scope: Literal["personal", "couple"] = "personal"
    ai_enabled: bool = True


class AiChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    scope: Literal["personal", "couple"] = "personal"


class AiMoneyActionRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    scope: Literal["personal", "couple"] = "personal"
    month: Optional[str] = None
    apply: bool = False


class BudgetUpsert(BaseModel):
    scope: Literal["personal", "couple"]
    month: str
    amount: float = Field(ge=0)


class CategoryBudgetUpsert(BaseModel):
    scope: Literal["personal", "couple"]
    month: str
    category: str
    amount: float = Field(ge=0)


class SavingsPlanUpsert(BaseModel):
    scope: Literal["personal", "couple"]
    enabled: bool = True
    fixed_amount: float = Field(default=0, ge=0)
    monthly_amount: float = Field(default=0, ge=0)
    reserve_floor: float = Field(default=0, ge=0)
    goal_name: str = Field(default="", max_length=60)
    target_date: Optional[str] = None


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    content: str = Field(min_length=1, max_length=4000)
    is_active: bool = True
    priority: int = 0
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None
    display_mode: Literal["once", "always"] = "once"
    closable: bool = True


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=120)
    content: Optional[str] = Field(default=None, min_length=1, max_length=4000)
    is_active: Optional[bool] = None
    priority: Optional[int] = None
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None
    display_mode: Optional[Literal["once", "always"]] = None
    closable: Optional[bool] = None


class AnnouncementAiDraftRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=200)
    tone: Literal["warm", "formal", "playful"] = "warm"
    include_html: bool = True


class GrowthInteractRequest(BaseModel):
    action: Literal["feed", "pet", "play", "care"]
    note: str = Field(default="", max_length=100)


class FeedbackCreate(BaseModel):
    category: str = Field(default="general", max_length=40)
    content: str = Field(min_length=1, max_length=2000)


class FeedbackReply(BaseModel):
    status: Literal["open", "in_progress", "resolved", "closed"] = "resolved"
    admin_reply: str = Field(min_length=1, max_length=2000)


class FeedbackBulkStatus(BaseModel):
    ids: list[str] = Field(min_length=1, max_length=50)
    status: Literal["open", "in_progress", "resolved", "closed"]


class FeatureFlagUpdate(BaseModel):
    enabled: bool
    description: Optional[str] = Field(default=None, max_length=200)


class WishlistCreate(BaseModel):
    text: str = Field(min_length=1, max_length=80)


class WishlistUpdate(BaseModel):
    text: Optional[str] = Field(default=None, min_length=1, max_length=80)
    done: Optional[bool] = None


class WishlistSortItem(BaseModel):
    id: str
    sort_order: int


class SharedNoteUpdate(BaseModel):
    note: str = Field(default="", max_length=500)
