"""pytest 公共夹具：使用内存 SQLite 数据库，避免依赖外部服务。"""

import os

os.environ["DB_TYPE"] = "sqlite"
os.environ["DB_PATH"] = ":memory:"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.auth.digest import derive_password_digest  # noqa: E402
from app.db.database import Database  # noqa: E402
from app.dependencies import get_database  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture
def database() -> Database:
    """创建内存数据库并写入测试数据。

    Returns:
        数据库实例。
    """
    db = Database(":memory:", dialect="sqlite")
    db.create_user("admin", derive_password_digest("admin", "888888"), role="admin")
    _seed_draws(db)
    return db


@pytest.fixture
def client(database: Database) -> TestClient:
    """创建已覆盖数据库依赖的测试客户端。

    Args:
        database: 测试数据库。

    Returns:
        测试客户端。
    """
    app.dependency_overrides[get_database] = lambda: database
    return TestClient(app)


def _seed_draws(db: Database) -> None:
    """写入构造的开奖记录（保证统计与推荐可运行）。

    Args:
        db: 数据库。
    """
    from app.db.database import DrawRow

    records = []
    for index in range(1, 121):
        main = [((index * step) % 33) + 1 for step in (1, 5, 7, 11, 13, 17)]
        extra = [(index % 16) + 1]
        records.append(
            DrawRow(
                game="redblue",
                issue=f"2026{index:04d}",
                draw_date=f"2026-01-{(index % 28) + 1:02d}",
                main_numbers=sorted(set(main)),
                extra_numbers=extra,
                sales=100000,
                pool=1000000,
                source="test",
                fetched_at="2026-11-24T00:00:00+00:00",
            )
        )
    db.upsert_draws(records)
