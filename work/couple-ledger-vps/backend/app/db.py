from __future__ import annotations

import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterator

from app.config import settings

DEFAULT_CATEGORIES = [
    ("餐饮", "utensils", "expense"),
    ("交通", "car", "expense"),
    ("购物", "shopping-bag", "expense"),
    ("娱乐", "gamepad-2", "expense"),
    ("居住", "home", "expense"),
    ("医疗", "heart-pulse", "expense"),
    ("教育", "graduation-cap", "expense"),
    ("礼物", "gift", "expense"),
    ("旅行", "plane", "expense"),
    ("其他支出", "more-horizontal", "expense"),
    ("工资", "wallet", "income"),
    ("奖金", "trophy", "income"),
    ("理财", "trending-up", "income"),
    ("兼职", "briefcase", "income"),
    ("其他收入", "plus-circle", "income"),
]


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def local_now() -> datetime:
    """Current time in the configured local timezone (default CST +8)."""
    return datetime.now(timezone(timedelta(hours=settings.tz_offset_hours)))


def local_today() -> str:
    """Today's date (YYYY-MM-DD) in the configured local timezone."""
    return local_now().strftime("%Y-%m-%d")


def new_id() -> str:
    return str(uuid.uuid4())


@contextmanager
def get_db() -> Iterator[sqlite3.Connection]:
    db_path = Path(settings.db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), check_same_thread=False, timeout=5.0)
    conn.row_factory = sqlite3.Row
    # WAL improves read/write concurrency for the two-person workload; busy_timeout
    # avoids immediate "database is locked" errors when both partners write at once.
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA busy_timeout = 5000")
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return dict(row)


def _column_exists(conn: sqlite3.Connection, table: str, column: str) -> bool:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return any(r["name"] == column for r in rows)


def _add_column_if_missing(conn: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    if not _column_exists(conn, table, column):
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def _run_migrations(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            scope TEXT NOT NULL CHECK (scope IN ('personal', 'couple')),
            user_id TEXT NOT NULL,
            couple_id TEXT,
            name TEXT NOT NULL,
            kind TEXT NOT NULL CHECK (kind IN ('cash', 'debit_card', 'credit_card', 'alipay', 'wechat', 'other')),
            balance REAL NOT NULL DEFAULT 0,
            currency TEXT NOT NULL DEFAULT 'CNY',
            is_archived INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS category_budgets (
            id TEXT PRIMARY KEY,
            scope TEXT NOT NULL CHECK (scope IN ('personal', 'couple')),
            owner_id TEXT NOT NULL,
            month TEXT NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(scope, owner_id, month, category)
        );

        CREATE TABLE IF NOT EXISTS recurring_bills (
            id TEXT PRIMARY KEY,
            scope TEXT NOT NULL CHECK (scope IN ('personal', 'couple')),
            user_id TEXT NOT NULL,
            couple_id TEXT,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
            account_id TEXT,
            frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
            next_due_date TEXT NOT NULL,
            note TEXT DEFAULT '',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS tx_comments (
            id TEXT PRIMARY KEY,
            transaction_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            mentions TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS anniversaries (
            id TEXT PRIMARY KEY,
            couple_id TEXT NOT NULL,
            title TEXT NOT NULL,
            anniversary_date TEXT NOT NULL,
            note TEXT DEFAULT '',
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS goals (
            id TEXT PRIMARY KEY,
            scope TEXT NOT NULL CHECK (scope IN ('personal', 'couple')),
            owner_id TEXT NOT NULL,
            title TEXT NOT NULL,
            target_value REAL,
            current_value REAL NOT NULL DEFAULT 0,
            unit TEXT DEFAULT '',
            deadline TEXT,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS check_ins (
            id TEXT PRIMARY KEY,
            goal_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            value REAL NOT NULL DEFAULT 1,
            note TEXT DEFAULT '',
            check_in_date TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS intimacy_logs (
            id TEXT PRIMARY KEY,
            couple_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 10),
            note TEXT DEFAULT '',
            log_date TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS announcements (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            priority INTEGER NOT NULL DEFAULT 0,
            starts_at TEXT,
            ends_at TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS feedback (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'general',
            content TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
            admin_reply TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token_hash TEXT NOT NULL,
            device_name TEXT,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_accounts_couple ON accounts(couple_id);
        CREATE INDEX IF NOT EXISTS idx_recurring_due ON recurring_bills(next_due_date, is_active);
        CREATE INDEX IF NOT EXISTS idx_category_budgets ON category_budgets(scope, owner_id, month);

        CREATE TABLE IF NOT EXISTS savings_plans (
            id TEXT PRIMARY KEY,
            scope TEXT NOT NULL CHECK (scope IN ('personal', 'couple')),
            owner_id TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 0,
            fixed_amount REAL NOT NULL DEFAULT 0,
            monthly_amount REAL NOT NULL DEFAULT 0,
            reserve_floor REAL NOT NULL DEFAULT 0,
            goal_name TEXT DEFAULT '',
            target_date TEXT,
            last_reserved_month TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(scope, owner_id)
        );
        CREATE INDEX IF NOT EXISTS idx_savings_plans_owner ON savings_plans(scope, owner_id);

        CREATE TABLE IF NOT EXISTS feature_flags (
            key TEXT PRIMARY KEY,
            enabled INTEGER NOT NULL DEFAULT 1,
            description TEXT DEFAULT '',
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS couple_memberships (
            user_id TEXT NOT NULL,
            couple_id TEXT NOT NULL,
            joined_at TEXT NOT NULL,
            left_at TEXT,
            PRIMARY KEY (user_id, couple_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_membership_couple ON couple_memberships(couple_id);
        """
    )

    defaults = [
        ("ai_enabled", 1, "AI 记账与助手"),
        ("chat_enabled", 1, "情侣聊天"),
        ("couple_pairing", 1, "情侣配对"),
        ("feedback_enabled", 1, "意见反馈入口"),
    ]
    now = utcnow()
    for key, enabled, desc in defaults:
        conn.execute(
            "INSERT OR IGNORE INTO feature_flags (key, enabled, description, updated_at) VALUES (?, ?, ?, ?)",
            (key, enabled, desc, now),
        )

    _add_column_if_missing(conn, "transactions", "account_id", "TEXT REFERENCES accounts(id) ON DELETE SET NULL")
    _add_column_if_missing(conn, "transactions", "transfer_to_account_id", "TEXT REFERENCES accounts(id) ON DELETE SET NULL")
    _add_column_if_missing(conn, "transactions", "tx_kind", "TEXT NOT NULL DEFAULT 'normal'")
    _add_column_if_missing(conn, "transactions", "paid_by", "TEXT REFERENCES users(id) ON DELETE SET NULL")
    _add_column_if_missing(conn, "transactions", "split_type", "TEXT NOT NULL DEFAULT 'none'")
    _add_column_if_missing(conn, "transactions", "attributed_to", "TEXT REFERENCES users(id) ON DELETE SET NULL")
    _add_column_if_missing(conn, "recurring_bills", "paid_by", "TEXT REFERENCES users(id) ON DELETE SET NULL")
    _add_column_if_missing(conn, "recurring_bills", "split_type", "TEXT NOT NULL DEFAULT 'none'")
    _add_column_if_missing(conn, "recurring_bills", "attributed_to", "TEXT REFERENCES users(id) ON DELETE SET NULL")
    _add_column_if_missing(conn, "categories", "sort_order", "INTEGER NOT NULL DEFAULT 0")
    _add_column_if_missing(conn, "announcements", "display_mode", "TEXT NOT NULL DEFAULT 'once'")
    _add_column_if_missing(conn, "announcements", "closable", "INTEGER NOT NULL DEFAULT 1")
    _add_column_if_missing(conn, "goals", "goal_type", "TEXT NOT NULL DEFAULT 'custom'")
    _add_column_if_missing(conn, "goals", "note", "TEXT DEFAULT ''")
    _add_column_if_missing(conn, "recurring_bills", "paused_until", "TEXT")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS growth_pets (
            id TEXT PRIMARY KEY,
            couple_id TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL DEFAULT '蜜糖',
            level INTEGER NOT NULL DEFAULT 1,
            exp INTEGER NOT NULL DEFAULT 0,
            mood INTEGER NOT NULL DEFAULT 80,
            energy INTEGER NOT NULL DEFAULT 100,
            created_at TEXT NOT NULL,
            FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS growth_events (
            id TEXT PRIMARY KEY,
            couple_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            exp_delta INTEGER NOT NULL DEFAULT 0,
            description TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS couple_wishlist (
            id TEXT PRIMARY KEY,
            couple_id TEXT NOT NULL,
            text TEXT NOT NULL,
            done INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_wishlist_couple ON couple_wishlist(couple_id, sort_order)"
    )

    _add_column_if_missing(conn, "couples", "shared_note", "TEXT DEFAULT ''")
    _add_column_if_missing(conn, "couples", "shared_note_updated_at", "TEXT")
    _add_column_if_missing(conn, "couples", "shared_note_updated_by", "TEXT")

    _add_column_if_missing(conn, "chat_messages", "read_by", "TEXT DEFAULT '[]'")
    _add_column_if_missing(conn, "chat_messages", "recalled_at", "TEXT")
    _add_column_if_missing(conn, "chat_messages", "image_url", "TEXT")
    _add_column_if_missing(conn, "chat_messages", "sender_kind", "TEXT NOT NULL DEFAULT 'user'")
    _add_column_if_missing(conn, "chat_messages", "sender_label", "TEXT")
    _add_column_if_missing(conn, "chat_messages", "extra_json", "TEXT")

    _add_column_if_missing(conn, "users", "password_reset_token", "TEXT")
    _add_column_if_missing(conn, "users", "password_reset_expires", "TEXT")
    _add_column_if_missing(conn, "feedback", "screenshot_url", "TEXT")

    conn.execute("CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_tx_transfer ON transactions(transfer_to_account_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category)")

    # opening_balance lets us recompute live balances from transactions without losing
    # the manually entered starting balance. Backfill existing rows assuming current
    # balances are correct at migration time: opening = balance - sum(tx deltas).
    if not _column_exists(conn, "accounts", "opening_balance"):
        conn.execute("ALTER TABLE accounts ADD COLUMN opening_balance REAL NOT NULL DEFAULT 0")
        for acc in conn.execute("SELECT id, balance FROM accounts").fetchall():
            opening = round(float(acc["balance"]) - _tx_total_for_account(conn, acc["id"]), 2)
            conn.execute("UPDATE accounts SET opening_balance = ? WHERE id = ?", (opening, acc["id"]))

    _record_migrations(conn)


# Ordered list of applied migrations. Append a new (name) entry whenever the schema
# changes so deployments have an auditable, idempotent record of what has run.
SCHEMA_MIGRATIONS = [
    "0001_initial_schema",
    "0002_accounts_and_transfers",
    "0003_chat_read_recall_image",
    "0004_password_reset",
    "0005_tx_indexes",
    "0006_accounts_opening_balance",
    "0007_couple_memberships",
    "0008_recurring_splits",
    "0009_announcement_display_growth_goals",
    "0010_feedback_screenshot",
    "0011_stats_note_ranking",
    "0012_couple_wishlist",
    "0013_couple_shared_note",
    "0014_recurring_paused_until",
    "0015_savings_plans",
]


def _record_migrations(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            name TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        )
        """
    )
    applied = {r["name"] for r in conn.execute("SELECT name FROM schema_migrations").fetchall()}
    for name in SCHEMA_MIGRATIONS:
        if name not in applied:
            conn.execute(
                "INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)",
                (name, utcnow()),
            )


def apply_balance_delta(conn: sqlite3.Connection, account_id: str | None, delta: float) -> None:
    if not account_id or delta == 0:
        return
    conn.execute("UPDATE accounts SET balance = balance + ? WHERE id = ?", (delta, account_id))


def balance_delta_for_tx(row: dict[str, Any], sign: int = 1) -> list[tuple[str, float]]:
    """Return list of (account_id, delta) for a transaction row. sign=1 apply, sign=-1 reverse."""
    amount = float(row["amount"])
    tx_kind = row.get("tx_kind") or "normal"
    account_id = row.get("account_id")
    transfer_to = row.get("transfer_to_account_id")

    if tx_kind == "transfer" and account_id and transfer_to:
        return [(account_id, -amount * sign), (transfer_to, amount * sign)]

    if not account_id:
        return []

    if row["type"] == "income":
        return [(account_id, amount * sign)]
    return [(account_id, -amount * sign)]


def _tx_total_for_account(conn: sqlite3.Connection, account_id: str) -> float:
    tx_rows = conn.execute(
        """
        SELECT amount, type, tx_kind, account_id, transfer_to_account_id
        FROM transactions
        WHERE account_id = ? OR transfer_to_account_id = ?
        """,
        (account_id, account_id),
    ).fetchall()
    tx_total = 0.0
    for r in tx_rows:
        for acc_id, delta in balance_delta_for_tx(row_to_dict(r)):
            if acc_id == account_id:
                tx_total += delta
    return tx_total


def recompute_account_balances(conn: sqlite3.Connection, account_ids: list[str]) -> dict[str, float]:
    """Recalculate balances from opening_balance + transaction deltas, fixing drift."""
    result: dict[str, float] = {}
    for account_id in account_ids:
        acc = row_to_dict(conn.execute("SELECT * FROM accounts WHERE id = ?", (account_id,)).fetchone())
        if acc is None:
            continue
        opening = float(acc.get("opening_balance") or 0.0)
        new_balance = round(opening + _tx_total_for_account(conn, account_id), 2)
        conn.execute("UPDATE accounts SET balance = ? WHERE id = ?", (new_balance, account_id))
        result[account_id] = new_balance
    return result


def init_db() -> None:
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                nickname TEXT NOT NULL,
                avatar_url TEXT,
                couple_id TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS couples (
                id TEXT PRIMARY KEY,
                invite_code TEXT UNIQUE NOT NULL,
                user_a_id TEXT NOT NULL,
                user_b_id TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                owner_user_id TEXT,
                name TEXT NOT NULL,
                icon TEXT NOT NULL DEFAULT 'circle',
                type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
                created_at TEXT NOT NULL,
                FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                scope TEXT NOT NULL CHECK (scope IN ('personal', 'couple')),
                user_id TEXT NOT NULL,
                couple_id TEXT,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
                note TEXT DEFAULT '',
                tx_date TEXT NOT NULL,
                created_by TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY,
                couple_id TEXT NOT NULL,
                sender_id TEXT NOT NULL,
                content TEXT NOT NULL,
                message_type TEXT NOT NULL DEFAULT 'text',
                created_at TEXT NOT NULL,
                FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS budgets (
                id TEXT PRIMARY KEY,
                scope TEXT NOT NULL CHECK (scope IN ('personal', 'couple')),
                owner_id TEXT NOT NULL,
                month TEXT NOT NULL,
                amount REAL NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(scope, owner_id, month)
            );

            CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, tx_date);
            CREATE INDEX IF NOT EXISTS idx_tx_couple_date ON transactions(couple_id, tx_date);
            CREATE INDEX IF NOT EXISTS idx_chat_couple_created ON chat_messages(couple_id, created_at);
            """
        )

        _run_migrations(conn)

        count = conn.execute("SELECT COUNT(*) AS c FROM categories WHERE owner_user_id IS NULL").fetchone()["c"]
        if count == 0:
            now = utcnow()
            for i, (name, icon, cat_type) in enumerate(DEFAULT_CATEGORIES):
                conn.execute(
                    "INSERT INTO categories (id, owner_user_id, name, icon, type, sort_order, created_at) VALUES (?, NULL, ?, ?, ?, ?, ?)",
                    (new_id(), name, icon, cat_type, i, now),
                )
