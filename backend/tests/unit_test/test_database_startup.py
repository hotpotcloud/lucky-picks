"""数据库启动回归：密码透传、配置缺失与认证失败提示。"""

from types import SimpleNamespace
from unittest.mock import patch

import pymysql
import pytest

from app.db.database import Database, create_database


def test_missing_database_password() -> None:
    """MariaDB 未配置密码时启动即明确失败，避免误判为驱动兼容问题。"""
    settings = SimpleNamespace(db_type="mariadb", db_password="")
    with pytest.raises(RuntimeError, match="DB_PASSWORD"):
        create_database(settings)


def test_database_password_is_not_url_encoded() -> None:
    """含特殊字符的密码原样交给驱动，认证失败时保留异常链且不泄漏密码。"""
    password = "test@password"
    with patch("app.db.database.pymysql.connect", side_effect=pymysql.OperationalError(1045, "Access denied")) as connect:
        with pytest.raises(RuntimeError, match="DB_PASSWORD") as failure:
            Database("test_db", dialect="mariadb", host="127.0.0.1", user="reader", password=password)
    assert connect.call_args.kwargs["password"] == password
    assert password not in str(failure.value)
    assert isinstance(failure.value.__cause__, pymysql.OperationalError)
