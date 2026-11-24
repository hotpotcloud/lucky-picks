"""开奖数据服务：抓取、入库、查询与快照导出。

入库策略：抓取到的每一期都写入 SQLite（主键 game + issue，重复抓取做 UPSERT），
因此数据库始终保存「能获取到的全部期次」。
"""

import json
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional

from app.db.database import Database, DrawRow
from app.draws.adapters.source_a import SourceAAdapter
from app.draws.adapters.source_b import SourceBAdapter

# 玩法 → 适配器。
ADAPTERS = {
    "redblue": SourceAAdapter,
    "frontback": SourceBAdapter,
}


async def fetch_and_store(database: Database, games: Optional[List[str]] = None) -> Dict[str, int]:
    """抓取全部期次并写入数据库。

    Args:
        database: 数据库。
        games: 需要抓取的玩法；默认全部。

    Returns:
        玩法 → 本次写入条数。
    """
    target_games = games or list(ADAPTERS.keys())
    written: Dict[str, int] = {}
    for game in target_games:
        adapter_cls = ADAPTERS.get(game)
        if adapter_cls is None:
            continue
        records = await adapter_cls().fetch_all()  # type: ignore[operator]
        written[game] = database.upsert_draws(records)
    return written


def list_draws(
    database: Database,
    game: str,
    limit: int = 30,
    offset: int = 0,
    issue: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> List[DrawRow]:
    """分页查询开奖记录（支持期号与日期筛选）。

    Args:
        database: 数据库。
        game: 玩法标识。
        limit: 条数（1–100）。
        offset: 偏移。
        issue: 期号（精确匹配）。
        date_from: 起始日期（含）。
        date_to: 结束日期（含）。

    Returns:
        记录列表。
    """
    if issue or date_from or date_to:
        records = database.all_draws(game)
        if issue:
            records = [item for item in records if item.issue == issue]
        if date_from:
            records = [item for item in records if item.draw_date >= date_from]
        if date_to:
            records = [item for item in records if item.draw_date <= date_to]
        records.sort(key=lambda item: (item.draw_date, item.issue), reverse=True)
        return records[offset : offset + limit]
    return database.list_draws(game, limit, offset)


def latest_draw(database: Database, game: str) -> Optional[DrawRow]:
    """查询最新一期。

    Args:
        database: 数据库。
        game: 玩法标识。

    Returns:
        最新记录；无数据时返回 None。
    """
    return database.latest_draw(game)


def data_meta(database: Database, game: str) -> Dict[str, object]:
    """构造数据版本信息。

    Args:
        database: 数据库。
        game: 玩法标识。

    Returns:
        数据版本字典。
    """
    count = database.count_draws(game)
    latest = database.latest_draw(game)
    return {
        "version": latest.fetched_at if latest else "",
        "updatedAt": latest.fetched_at if latest else "",
        "source": database.draw_source(game),
        "drawCount": count,
        "latestIssue": latest.issue if latest else "",
        "latestDate": latest.draw_date if latest else "",
    }


def export_snapshot(database: Database, game: str, target_path: str) -> str:
    """把某玩法的全部数据导出为规范化 JSON 快照。

    Args:
        database: 数据库。
        game: 玩法标识。
        target_path: 目标文件路径。

    Returns:
        写出的文件路径。
    """
    records = database.all_draws(game)
    payload = {
        "game": game,
        "version": datetime.now(timezone.utc).isoformat(),
        "source": database.draw_source(game),
        "count": len(records),
        "draws": [
            {
                "issue": record.issue,
                "date": record.draw_date,
                "main": record.main_numbers,
                "extra": record.extra_numbers,
                "sales": record.sales,
                "pool": record.pool,
            }
            for record in records
        ],
    }
    os.makedirs(os.path.dirname(os.path.abspath(target_path)), exist_ok=True)
    with open(target_path, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))
    return target_path
