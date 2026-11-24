"""抓取全量历史开奖数据入库（支持 MariaDB / SQLite）。

用法：
    python backend/scripts/fetch_draws.py                       # 按 DB_TYPE 环境变量选择数据库
    DB_TYPE=sqlite python backend/scripts/fetch_draws.py        # 写入本地 SQLite
"""

import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config.config import Settings  # noqa: E402
from app.db.database import create_database  # noqa: E402
from app.draws.service import export_snapshot, fetch_and_store  # noqa: E402


def parse_args() -> argparse.Namespace:
    """解析命令行参数。

    Returns:
        参数对象。
    """
    parser = argparse.ArgumentParser(description="抓取全部历史开奖数据")
    parser.add_argument("--game", default="", help="仅抓取指定玩法")
    parser.add_argument("--export-dir", default="backend/data/draws")
    parser.add_argument("--frontend-export-dir", default="frontend/public/data")
    parser.add_argument("--no-export", action="store_true")
    return parser.parse_args()


def main() -> int:
    """脚本入口。

    Returns:
        退出码。
    """
    args = parse_args()
    settings = Settings()
    database = create_database(settings)
    try:
        games = [args.game] if args.game else None
        written = asyncio.run(fetch_and_store(database, games))
        for game, count in written.items():
            print(f"[fetch] {game}: 本次写入 {count} 条，库内累计 {database.count_draws(game)} 期")
            if not args.no_export:
                export_snapshot(database, game, os.path.join(args.export_dir, f"{game}.json"))
                export_snapshot(
                    database, game, os.path.join(args.frontend_export_dir, f"{game}.json")
                )
    finally:
        database.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
