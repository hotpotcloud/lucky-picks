"""重置账号密码摘要。

适用于旧版密码哈希无法自动迁移，或忘记密码的场景。密码仅作为命令行参数
短暂存在，不写入日志；脚本只保存 PBKDF2 加盐摘要。

用法：
    python scripts/reset_password.py <username> <new-password>
"""

import sys

from loguru import logger

from app.auth.digest import derive_password_digest
from app.config.config import settings
from app.db.database import create_database


def main() -> int:
    """执行密码重置。

    Returns:
        进程退出码，成功为 0。
    """
    if len(sys.argv) != 3:
        print("用法：python scripts/reset_password.py <username> <new-password>")
        return 2
    username, password = sys.argv[1], sys.argv[2]
    if len(password) < 8:
        print("密码长度至少 8 位")
        return 2
    database = create_database(settings)
    try:
        user = database.get_user(username.strip())
        if user is None:
            print("账号不存在")
            return 1
        digest = derive_password_digest(user.username, password)
        if not database.set_password_digest(user.username, digest):
            print("账号更新失败")
            return 1
        logger.info("密码重置成功：username={} user_id={}", user.username, user.id)
        return 0
    finally:
        database.close()


if __name__ == "__main__":
    raise SystemExit(main())
