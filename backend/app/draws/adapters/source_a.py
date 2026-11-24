"""官方数据源 A 适配器：按分页抓取全部可获取期次。"""

import re
from datetime import datetime, timezone
from typing import Any, Dict, List

import httpx

from app.db.database import DrawRow
from app.draws.adapters.endpoints import (
    GAME_QUERY,
    MAX_PAGES,
    PAGE_SIZE,
    SOURCE_A_REFERER,
    SOURCE_A_URL,
)

# 日期字段形如 2026-11-22(日)，截取前 10 位。
DATE_PATTERN = re.compile(r"(\d{4}-\d{2}-\d{2})")


class SourceAAdapter:
    """数据源 A（红蓝玩法）适配器。"""

    game = "redblue"
    source_id = "source_a"

    def __init__(self, timeout: float = 15.0) -> None:
        """初始化适配器。

        Args:
            timeout: 单次请求超时时间（秒）。
        """
        self.timeout = timeout

    async def fetch_all(self) -> List[DrawRow]:
        """抓取全部期次。

        Returns:
            开奖记录列表。
        """
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; lucky-picks/2.0)",
            "Referer": SOURCE_A_REFERER,
        }
        parameter_name, parameter_value = GAME_QUERY[self.game]
        records: List[DrawRow] = []
        fetched_at = datetime.now(timezone.utc).isoformat()

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for page in range(1, MAX_PAGES + 1):
                params: Dict[str, Any] = {
                    parameter_name: parameter_value,
                    "issueCount": "",
                    "issueStart": "",
                    "issueEnd": "",
                    "dayStart": "",
                    "dayEnd": "",
                    "pageNo": page,
                    "pageSize": PAGE_SIZE,
                    "week": "",
                    "systemType": "PC",
                }
                response = await client.get(SOURCE_A_URL, params=params, headers=headers)
                response.raise_for_status()
                payload = response.json()
                items = payload.get("result") or []
                if not items:
                    break
                for item in items:
                    record = self._parse(item, fetched_at)
                    if record is not None:
                        records.append(record)
                if len(items) < PAGE_SIZE:
                    break
        records.sort(key=lambda item: item.issue)
        return records

    def _parse(self, item: Dict[str, Any], fetched_at: str) -> DrawRow | None:
        """解析单条接口数据。

        Args:
            item: 接口返回的单条数据。
            fetched_at: 抓取时间。

        Returns:
            开奖记录；数据不合法时返回 None。
        """
        issue = str(item.get("code") or "").strip()
        raw_date = str(item.get("date") or "")
        match = DATE_PATTERN.search(raw_date)
        if not issue or not match:
            return None
        try:
            main_numbers = sorted(int(value) for value in str(item["red"]).split(",") if value)
            extra_numbers = sorted(int(value) for value in str(item["blue"]).split(",") if value)
        except (KeyError, ValueError):
            return None
        sales = _to_int(item.get("sales"))
        pool = _to_int(item.get("poolmoney"))
        return DrawRow(
            game=self.game,
            issue=issue,
            draw_date=match.group(1),
            main_numbers=main_numbers,
            extra_numbers=extra_numbers,
            sales=sales,
            pool=pool,
            source=self.source_id,
            fetched_at=fetched_at,
        )


def _to_int(value: Any) -> int | None:
    """把接口中的数值字段转换为整数。

    Args:
        value: 原始值。

    Returns:
        整数；无法解析时返回 None。
    """
    if value is None:
        return None
    try:
        return int(str(value).replace(",", "").replace(".00", "").strip())
    except ValueError:
        return None
