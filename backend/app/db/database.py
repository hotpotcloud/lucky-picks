"""数据库管理：双驱动（MariaDB 生产 / SQLite 测试）连接、表结构与用户仓储。

包含三张表：
- draws：全部可获取的历史开奖期次（主键 game + issue，重复抓取使用 UPSERT）。
- users：登录账号（密码使用 PBKDF2 加盐哈希，不保存明文）。
- settings：键值配置（如令牌签名密钥，首次启动自动生成并持久化）。
"""

import hashlib
import json
import os
import secrets
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import pymysql
import pymysql.cursors

# PBKDF2 迭代次数（兼顾安全与启动耗时）。
PBKDF2_ITERATIONS = 120_000


@dataclass
class DrawRow:
    """一期开奖记录。

    Attributes:
        game: 玩法标识。
        issue: 期号。
        draw_date: 开奖日期。
        main_numbers: 主区号码。
        extra_numbers: 副区号码。
        sales: 销售额。
        pool: 奖池余额。
        source: 来源标识。
        fetched_at: 抓取时间。
    """

    game: str
    issue: str
    draw_date: str
    main_numbers: List[int]
    extra_numbers: List[int]
    sales: Optional[int] = None
    pool: Optional[int] = None
    source: str = ""
    fetched_at: str = ""

    def to_dict(self) -> Dict[str, object]:
        """转换为接口返回结构。

        Returns:
            可 JSON 序列化的字典。
        """
        return {
            "game": self.game,
            "issue": self.issue,
            "date": self.draw_date,
            "numbers": {
                ("red" if self.game == "redblue" else "front"): self.main_numbers,
                ("blue" if self.game == "redblue" else "back"): self.extra_numbers,
            },
            "sales": self.sales,
            "pool": self.pool,
        }


@dataclass
class User:
    """登录用户。

    Attributes:
        id: 用户主键。
        username: 登录名。
        password_hash: 密码哈希（格式 salt$hash）。
        role: 角色（admin/user）。
        token_version: 令牌版本号，递增即可使历史令牌失效。
        created_at: 创建时间。
    """

    id: int
    username: str
    password_hash: str
    role: str
    token_version: int
    created_at: str


def hash_password(password: str) -> str:
    """计算密码哈希。

    Args:
        password: 明文密码。

    Returns:
        形如 `salt$hash` 的哈希串。
    """
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERATIONS
    ).hex()
    return f"{salt}${digest}"


def verify_password(password: str, password_hash: str) -> bool:
    """校验密码。

    Args:
        password: 明文密码。
        password_hash: 数据库中的哈希串。

    Returns:
        是否匹配。
    """
    try:
        salt, digest = password_hash.split("$", 1)
    except ValueError:
        return False
    computed = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERATIONS
    ).hex()
    return secrets.compare_digest(computed, digest)


class _ConnectionWrapper:
    """统一连接封装：兼容 sqlite3 与 pymysql。

    sqlite3 使用 `?` 占位符与 Row；pymysql 使用 `%s` 占位符与 DictCursor。
    该封装把差异收敛在此处，使上层仓储代码保持不变。
    """

    def __init__(self, raw: Any, dialect: str) -> None:
        """初始化封装。

        Args:
            raw: 原生连接对象。
            dialect: 驱动类型（sqlite / mariadb）。
        """
        self.raw = raw
        self.dialect = dialect

    def _sql(self, sql: str) -> str:
        """按驱动转换占位符。

        Args:
            sql: 原始 SQL（使用 `?` 占位符）。

        Returns:
            转换后的 SQL。
        """
        return sql.replace("?", "%s") if self.dialect == "mariadb" else sql

    def execute(self, sql: str, params: Any = ()) -> Any:
        """执行单条 SQL。

        Args:
            sql: SQL 语句。
            params: 参数。

        Returns:
            游标对象。
        """
        cursor = self.raw.cursor()
        cursor.execute(self._sql(sql), params)
        return cursor

    def executemany(self, sql: str, params: Any) -> Any:
        """批量执行 SQL。

        Args:
            sql: SQL 语句。
            params: 参数序列。

        Returns:
            游标对象。
        """
        cursor = self.raw.cursor()
        cursor.executemany(self._sql(sql), params)
        return cursor

    def executescript(self, script: str) -> None:
        """执行多段建表语句。

        Args:
            script: 分号分隔的 SQL 脚本。
        """
        if self.dialect == "sqlite":
            self.raw.executescript(script)
            return
        cursor = self.raw.cursor()
        for statement in script.split(";"):
            text = statement.strip()
            if text:
                cursor.execute(text)

    def commit(self) -> None:
        """提交事务。"""
        self.raw.commit()

    def close(self) -> None:
        """关闭连接。"""
        self.raw.close()

    def __enter__(self) -> "_ConnectionWrapper":
        """进入事务上下文。

        Returns:
            自身。
        """
        return self

    def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        """退出事务上下文，成功提交、异常回滚。

        Args:
            exc_type: 异常类型。
            exc: 异常对象。
            tb: 异常堆栈。
        """
        if exc_type is None:
            self.raw.commit()
        else:
            self.raw.rollback()


class Database:
    """数据库封装（MariaDB / SQLite）。"""

    def __init__(self, path: str, dialect: str = "sqlite", **options: Any) -> None:
        """初始化连接与表结构。

        Args:
            path: SQLite 文件路径或 MariaDB 数据库名。
            dialect: 驱动类型（sqlite / mariadb）。
            options: MariaDB 连接选项（host/port/user/password/charset）。
        """
        self.path = path
        self.dialect = dialect
        if dialect == "mariadb":
            raw = pymysql.connect(
                host=options.get("host", "127.0.0.1"),
                port=int(options.get("port", 3306)),
                user=options.get("user", "root"),
                password=options.get("password", ""),
                database=path,
                charset=options.get("charset", "utf8mb4"),
                cursorclass=pymysql.cursors.DictCursor,
                autocommit=False,
            )
        else:
            if path != ":memory:":
                os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
            raw = sqlite3.connect(path, check_same_thread=False)
            raw.row_factory = sqlite3.Row
        self.connection = _ConnectionWrapper(raw, dialect)
        self._init_schema()

    def _init_schema(self) -> None:
        """创建表结构。"""
        auto_increment = "AUTOINCREMENT" if self.dialect == "sqlite" else "AUTO_INCREMENT"
        # MariaDB 不允许 TEXT 列作为主键（无前缀长度），键列改用 VARCHAR。
        index_sql = "CREATE INDEX IF NOT EXISTS idx_draws_game_date ON draws(game, draw_date DESC);"
        if self.dialect == "mariadb":
            # MariaDB 不允许 TEXT 列作为主键（无前缀长度），键列改用 VARCHAR；金额用 BIGINT。
            key_type = "VARCHAR(32)"
            date_type = "VARCHAR(32)"
            text_type = "TEXT"
            money_type = "BIGINT"
        else:
            key_type = "TEXT"
            date_type = "TEXT"
            text_type = "TEXT"
            money_type = "INTEGER"
        self.connection.executescript(
            f"""
            CREATE TABLE IF NOT EXISTS draws (
                game {key_type} NOT NULL,
                issue {key_type} NOT NULL,
                draw_date {date_type} NOT NULL,
                main_numbers {text_type} NOT NULL,
                extra_numbers {text_type} NOT NULL,
                sales {money_type},
                pool {money_type},
                source {date_type},
                fetched_at {date_type},
                PRIMARY KEY (game, issue)
            );
            {index_sql}

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY {auto_increment},
                username VARCHAR(64) NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role VARCHAR(32) NOT NULL DEFAULT 'user',
                token_version INTEGER NOT NULL DEFAULT 1,
                created_at VARCHAR(64) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS settings (
                cfg_key VARCHAR(64) PRIMARY KEY,
                value TEXT NOT NULL
            );
            """
        )
        self.connection.commit()

    def db_version(self) -> str:
        """返回数据库版本信息。

        Returns:
            数据库版本字符串；查询失败时返回空串。
        """
        try:
            row = self.connection.execute("SELECT VERSION() AS version").fetchone()
            return str(row["version"]) if row else ""
        except Exception:
            return ""

    def close(self) -> None:
        """关闭连接。"""
        self.connection.close()

    # ---------- 用户 ----------

    def count_users(self) -> int:
        """统计用户数量。

        Returns:
            用户数量。
        """
        row = self.connection.execute("SELECT COUNT(*) AS total FROM users").fetchone()
        return int(row["total"]) if row else 0

    def create_user(self, username: str, password: str, role: str = "user") -> int:
        """创建用户。

        Args:
            username: 登录名。
            password: 明文密码。
            role: 角色。

        Returns:
            新用户主键。
        """

        with self.connection:
            cursor = self.connection.execute(
                """
                INSERT INTO users (username, password_hash, role, token_version, created_at)
                VALUES (?, ?, ?, 1, ?)
                """,
                (
                    username,
                    hash_password(password),
                    role,
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
        return int(cursor.lastrowid or 0)

    def get_user(self, username: str) -> Optional[User]:
        """按登录名查询用户。

        Args:
            username: 登录名。

        Returns:
            用户对象；不存在时返回 None。
        """
        row = self.connection.execute(
            "SELECT * FROM users WHERE username = ?", (username,)
        ).fetchone()
        if row is None:
            return None
        return User(
            id=int(row["id"]),
            username=str(row["username"]),
            password_hash=str(row["password_hash"]),
            role=str(row["role"]),
            token_version=int(row["token_version"]),
            created_at=str(row["created_at"]),
        )

    def bump_token_version(self, username: str) -> None:
        """递增用户的令牌版本，使历史令牌失效。

        Args:
            username: 登录名。
        """
        with self.connection:
            self.connection.execute(
                "UPDATE users SET token_version = token_version + 1 WHERE username = ?",
                (username,),
            )

    # ---------- 开奖记录 ----------

    def upsert_draws(self, records: List[DrawRow]) -> int:
        """批量写入或更新开奖记录（重复期次覆盖更新，保证全量入库）。

        Args:
            records: 记录列表。

        Returns:
            写入条数。
        """
        if not records:
            return 0
        payload = [
            (
                record.game,
                record.issue,
                record.draw_date,
                json.dumps(record.main_numbers),
                json.dumps(record.extra_numbers),
                record.sales,
                record.pool,
                record.source,
                record.fetched_at,
            )
            for record in records
        ]
        if self.dialect == "mariadb":
            conflict_sql = """
                INSERT INTO draws (game, issue, draw_date, main_numbers, extra_numbers,
                                   sales, pool, source, fetched_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    draw_date = VALUES(draw_date),
                    main_numbers = VALUES(main_numbers),
                    extra_numbers = VALUES(extra_numbers),
                    sales = VALUES(sales),
                    pool = VALUES(pool),
                    source = VALUES(source),
                    fetched_at = VALUES(fetched_at)
            """
        else:
            conflict_sql = """
                INSERT INTO draws (game, issue, draw_date, main_numbers, extra_numbers,
                                   sales, pool, source, fetched_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(game, issue) DO UPDATE SET
                    draw_date = excluded.draw_date,
                    main_numbers = excluded.main_numbers,
                    extra_numbers = excluded.extra_numbers,
                    sales = excluded.sales,
                    pool = excluded.pool,
                    source = excluded.source,
                    fetched_at = excluded.fetched_at
            """
        with self.connection:
            self.connection.executemany(conflict_sql, payload)
        return len(payload)

    def count_draws(self, game: str) -> int:
        """统计某玩法已存期数。

        Args:
            game: 玩法标识。

        Returns:
            期数。
        """
        row = self.connection.execute(
            "SELECT COUNT(*) AS total FROM draws WHERE game = ?", (game,)
        ).fetchone()
        return int(row["total"]) if row else 0

    def all_draws(self, game: str) -> List[DrawRow]:
        """按期号升序返回全部记录。

        Args:
            game: 玩法标识。

        Returns:
            记录列表。
        """
        rows = self.connection.execute(
            "SELECT * FROM draws WHERE game = ? ORDER BY issue ASC", (game,)
        ).fetchall()
        return [self._to_draw(row) for row in rows]

    def list_draws(self, game: str, limit: int, offset: int) -> List[DrawRow]:
        """按日期倒序分页返回记录。

        Args:
            game: 玩法标识。
            limit: 条数。
            offset: 偏移。

        Returns:
            记录列表。
        """
        rows = self.connection.execute(
            """
            SELECT * FROM draws WHERE game = ?
            ORDER BY draw_date DESC, issue DESC
            LIMIT ? OFFSET ?
            """,
            (game, limit, offset),
        ).fetchall()
        return [self._to_draw(row) for row in rows]

    def latest_draw(self, game: str) -> Optional[DrawRow]:
        """返回最新一期记录。

        Args:
            game: 玩法标识。

        Returns:
            记录；无数据时返回 None。
        """
        rows = self.list_draws(game, 1, 0)
        return rows[0] if rows else None

    def draw_source(self, game: str) -> str:
        """返回某玩法的数据来源标识。

        Args:
            game: 玩法标识。

        Returns:
            来源标识；无数据时返回空串。
        """
        row = self.connection.execute(
            "SELECT source FROM draws WHERE game = ? LIMIT 1", (game,)
        ).fetchone()
        return str(row["source"]) if row and row["source"] else ""

    @staticmethod
    def _to_draw(row: sqlite3.Row) -> DrawRow:
        """把数据库行转换为开奖记录。

        Args:
            row: 数据库行。

        Returns:
            开奖记录。
        """
        return DrawRow(
            game=str(row["game"]),
            issue=str(row["issue"]),
            draw_date=str(row["draw_date"]),
            main_numbers=json.loads(row["main_numbers"]),
            extra_numbers=json.loads(row["extra_numbers"]),
            sales=row["sales"],
            pool=row["pool"],
            source=str(row["source"] or ""),
            fetched_at=str(row["fetched_at"] or ""),
        )

    # ---------- 设置 ----------

    def get_setting(self, key: str) -> Optional[str]:
        """读取配置项。

        Args:
            key: 配置键。

        Returns:
            配置值；不存在时返回 None。
        """
        row = self.connection.execute(
            "SELECT value FROM settings WHERE cfg_key = ?", (key,)
        ).fetchone()
        return str(row["value"]) if row else None

    def set_setting(self, key: str, value: str) -> None:
        """写入配置项。

        Args:
            key: 配置键。
            value: 配置值。
        """
        with self.connection:
            if self.dialect == "mariadb":
                upsert = (
                    "INSERT INTO settings (cfg_key, value) VALUES (?, ?) "
                    "ON DUPLICATE KEY UPDATE value = VALUES(value)"
                )
            else:
                upsert = (
                    "INSERT INTO settings (cfg_key, value) VALUES (?, ?) "
                    "ON CONFLICT(cfg_key) DO UPDATE SET value = excluded.value"
                )
            self.connection.execute(upsert, (key, value))

    def ensure_secret(self) -> str:
        """获取令牌签名密钥，不存在时生成并持久化。

        Returns:
            十六进制密钥。
        """
        secret = self.get_setting("token_secret")
        if secret:
            return secret
        secret = secrets.token_hex(32)
        self.set_setting("token_secret", secret)
        return secret


def create_database(settings: Any) -> Database:
    """按配置创建数据库实例。

    Args:
        settings: 配置对象（含 db_type / db_host / db_name 等字段）。

    Returns:
        数据库实例。
    """
    if getattr(settings, "db_type", "sqlite") == "mariadb":
        return Database(
            settings.db_name,
            dialect="mariadb",
            host=settings.db_host,
            port=settings.db_port,
            user=settings.db_user,
            password=settings.db_password,
        )
    return Database(settings.db_path, dialect="sqlite")
