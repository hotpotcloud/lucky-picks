"""数据源适配器接口。"""

from typing import List, Protocol

from app.db.database import DrawRow


class DrawSource(Protocol):
    """开奖数据源协议。

    Attributes:
        game: 玩法标识。
        source_id: 来源标识（写入数据库用于追溯）。
    """

    game: str
    source_id: str

    async def fetch_all(self) -> List[DrawRow]:
        """抓取该玩法能够获取到的全部期次。

        Returns:
            开奖记录列表（按期号升序）。
        """
        ...  # pragma: no cover - 协议声明
