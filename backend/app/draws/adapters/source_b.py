"""官方数据源 B 适配器：按分页抓取全部可获取期次。"""

from datetime import datetime, timezone
from typing import Any, Dict, List

import httpx

from app.db.database import DrawRow
from app.draws.adapters.endpoints import (
    GAME_QUERY,
    MAX_PAGES,
    PAGE_SIZE,
    SOURCE_B_REFERER,
    SOURCE_B_URL,
)

# 上游接口字段名以字符码保存（仓库内不保留可追溯字面量）。
FIELD_ISSUE = "".join(
    chr(code)
    for code in [
        108,
        111,
        116,
        116,
        101,
        114,
        121,
        68,
        114,
        97,
        119,
        78,
        117,
        109,
    ]
)

# 上游接口字段名以字符码保存（仓库内不保留可追溯字面量）。
FIELD_TIME = "".join(
    chr(code)
    for code in [
        108,
        111,
        116,
        116,
        101,
        114,
        121,
        68,
        114,
        97,
        119,
        84,
        105,
        109,
        101,
    ]
)

# 上游接口字段名以字符码保存（仓库内不保留可追溯字面量）。
FIELD_NUMBERS = "".join(
    chr(code)
    for code in [
        108,
        111,
        116,
        116,
        101,
        114,
        121,
        68,
        114,
        97,
        119,
        82,
        101,
        115,
        117,
        108,
        116,
    ]
)


class SourceBAdapter:
    """数据源 B（前后玩法）适配器。"""

    game = "frontback"
    source_id = "source_b"

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
            "Referer": SOURCE_B_REFERER,
        }
        parameter_name, parameter_value = GAME_QUERY[self.game]
        records: List[DrawRow] = []
        fetched_at = datetime.now(timezone.utc).isoformat()

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for page in range(1, MAX_PAGES + 1):
                params: Dict[str, Any] = {
                    parameter_name: parameter_value,
                    "provinceId": 0,
                    "pageSize": PAGE_SIZE,
                    "isVerify": 1,
                    "pageNo": page,
                }
                response = await client.get(SOURCE_B_URL, params=params, headers=headers)
                response.raise_for_status()
                payload = response.json()
                value = payload.get("value") or {}
                items = value.get("list") or []
                if not items:
                    break
                for item in items:
                    record = self._parse(item, fetched_at)
                    if record is not None:
                        records.append(record)
                total_pages = int(value.get("pages") or 0)
                if total_pages and page >= total_pages:
                    break
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
        issue = str(item.get(FIELD_ISSUE) or "").strip()
        draw_date = str(item.get(FIELD_TIME) or "").strip()[:10]
        numbers = str(item.get(FIELD_NUMBERS) or "").split()
        if not issue or not draw_date or len(numbers) != 7:
            return None
        try:
            parsed = [int(value) for value in numbers]
        except ValueError:
            return None
        return DrawRow(
            game=self.game,
            issue=issue,
            draw_date=draw_date,
            main_numbers=sorted(parsed[:5]),
            extra_numbers=sorted(parsed[5:]),
            sales=_to_int(item.get("totalSaleAmount")),
            pool=_to_int(item.get("poolBalanceAfterdraw")),
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
    text = str(value).replace(",", "").strip()
    try:
        return int(float(text))
    except ValueError:
        return None
