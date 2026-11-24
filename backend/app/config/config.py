"""运行配置：全部来自环境变量，带安全默认值。"""

import os
from dataclasses import dataclass, field
from typing import List


def _env_int(name: str, default: int) -> int:
    """读取整型环境变量。

    Args:
        name: 变量名。
        default: 默认值。

    Returns:
        整型值。
    """
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


@dataclass
class Settings:
    """服务配置。

    Attributes:
        data_dir: 数据目录（存放数据库与规范化 JSON）。
        db_path: SQLite 数据库路径（开发/测试使用）。
        db_type: 驱动类型（mariadb / sqlite），生产使用 mariadb。
        db_host: MariaDB 主机。
        db_port: MariaDB 端口。
        db_user: MariaDB 用户。
        db_password: MariaDB 密码。
        db_name: MariaDB 数据库名。
        cors_origins: 允许的跨域来源。
        token_ttl_hours: 登录令牌有效期（小时）。
        admin_username: 初始管理员账号。
        admin_password: 初始管理员密码（仅首次初始化使用）。
        log_level: 日志级别。
        refresh_on_startup: 启动时是否尝试从上游刷新数据。
    """

    data_dir: str = field(default_factory=lambda: os.getenv("DATA_DIR", "backend/data"))
    db_path: str = field(default_factory=lambda: os.getenv("DB_PATH", "backend/data/draws.db"))
    db_type: str = field(default_factory=lambda: os.getenv("DB_TYPE", "mariadb").lower())
    db_host: str = field(default_factory=lambda: os.getenv("DB_HOST", "127.0.0.1"))
    db_port: int = field(default_factory=lambda: _env_int("DB_PORT", 3306))
    db_user: str = field(default_factory=lambda: os.getenv("DB_USER", "lucky"))
    db_password: str = field(default_factory=lambda: os.getenv("DB_PASSWORD", ""))
    db_name: str = field(default_factory=lambda: os.getenv("DB_NAME", "lucky_picks"))
    cors_origins: List[str] = field(
        default_factory=lambda: [
            origin.strip()
            for origin in os.getenv(
                "CORS_ORIGINS",
                "http://localhost:5173,https://hotpotcloud.github.io",
            ).split(",")
            if origin.strip()
        ]
    )
    token_ttl_hours: int = field(default_factory=lambda: _env_int("TOKEN_TTL_HOURS", 12))
    admin_username: str = field(default_factory=lambda: os.getenv("ADMIN_USERNAME", "admin"))
    admin_password: str = field(default_factory=lambda: os.getenv("ADMIN_PASSWORD", "888888"))
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))
    refresh_on_startup: bool = field(
        default_factory=lambda: os.getenv("REFRESH_ON_STARTUP", "0") == "1"
    )


# 全局配置实例。
settings = Settings()
