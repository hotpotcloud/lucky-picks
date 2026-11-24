"""接口请求/响应模型（Pydantic v2）。"""

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class LoginRequest(BaseModel):
    """登录请求。

    Attributes:
        username: 登录名。
        passwordDigest: 客户端计算的 SHA-256 密码摘要，网络上不传输明文密码。
    """

    model_config = {"extra": "forbid"}
    username: str = Field(min_length=1, max_length=64)
    passwordDigest: str = Field(min_length=64, max_length=64, pattern=r"^[0-9a-f]{64}$")

    @field_validator("username", mode="before")
    @classmethod
    def normalize_username(cls, value: object) -> object:
        """统一去除账号首尾空白，与前端摘要计算保持一致。

        Args:
            value: 原始账号输入。

        Returns:
            去除首尾空白后的账号。
        """
        return value.strip() if isinstance(value, str) else value


class RegisterRequest(BaseModel):
    """邀请注册请求：限制账号格式，禁止由客户端指定权限。"""

    model_config = {"extra": "forbid"}
    username: str = Field(min_length=3, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    passwordDigest: str = Field(min_length=64, max_length=64, pattern=r"^[0-9a-f]{64}$")
    passwordLength: int = Field(ge=8, le=128)
    inviteCode: str = Field(min_length=1, max_length=128)


class ResetPasswordRequest(BaseModel):
    """管理员重置密码请求：只接收摘要，不接收明文。"""

    model_config = {"extra": "forbid"}
    passwordDigest: str = Field(min_length=64, max_length=64, pattern=r"^[0-9a-f]{64}$")


class UserOut(BaseModel):
    """用户信息。

    Attributes:
        id: 用户主键。
        username: 登录名。
        role: 角色。
    """

    id: int
    username: str
    role: str


class LoginResponse(BaseModel):
    """登录响应。

    Attributes:
        token: 登录令牌。
        expiredAt: 过期时间戳（秒）。
        user: 用户信息。
    """

    token: str
    expiredAt: int
    user: UserOut


class AreaSelectionIn(BaseModel):
    """区域选号输入。

    Attributes:
        key: 区域标识。
        numbers: 普通选号或拖码。
        banker: 胆码。
    """

    key: str
    numbers: List[int] = Field(default_factory=list)
    banker: List[int] = Field(default_factory=list)


class BetSelectionIn(BaseModel):
    """投注方案输入。

    Attributes:
        game: 玩法标识。
        mode: 模式。
        multiplier: 倍数。
        additional: 是否追加。
        areas: 各区域选号。
    """

    game: str
    mode: str
    multiplier: int = 1
    additional: bool = False
    areas: List[AreaSelectionIn] = Field(default_factory=list)


class ConstraintsIn(BaseModel):
    """推荐约束。

    Attributes:
        oddEven: 奇数个数区间。
        bigSmall: 大号个数区间。
        sumRange: 和值区间。
        spanRange: 跨度区间。
        maxConsecutive: 连号个数上限。
        zones: 单区个数区间。
    """

    oddEven: Optional[List[int]] = None
    bigSmall: Optional[List[int]] = None
    sumRange: Optional[List[int]] = None
    spanRange: Optional[List[int]] = None
    maxConsecutive: Optional[int] = None
    zones: Optional[List[int]] = None
    zoneCounts: Optional[List[int]] = Field(default=None, min_length=3, max_length=3)

    @field_validator("oddEven", "bigSmall", "sumRange", "spanRange", "zones")
    @classmethod
    def validate_bounds(cls, value: Optional[List[int]]) -> Optional[List[int]]:
        """拒绝不完整或倒置区间，避免生成服务索引越界。"""
        if value is not None and (len(value) != 2 or value[0] < 0 or value[0] > value[1]):
            raise ValueError("约束区间需为两个非负整数，且下限不大于上限")
        return value

    @field_validator("zoneCounts")
    @classmethod
    def validate_zone_counts(cls, value: Optional[List[int]]) -> Optional[List[int]]:
        """三区精确数量不得为负数。"""
        if value is not None and any(count < 0 for count in value):
            raise ValueError("三区数量必须为非负整数")
        return value


class RecommendationIn(BaseModel):
    """推荐请求。

    Attributes:
        game: 玩法标识。
        mode: 模式。
        strategy: 策略。
        window: 统计窗口。
        count: 单式注数。
        multiplier: 倍数。
        additional: 是否追加。
        seed: 随机种子。
        constraints: 约束条件。
    """

    game: str
    mode: str = "single"
    strategy: str = "balanced"
    window: int = Field(default=100, ge=10, le=300)
    count: int = Field(default=5, ge=1, le=10)
    multiplier: int = Field(default=1, ge=1, le=99)
    additional: bool = False
    seed: Optional[int] = None
    constraints: Optional[ConstraintsIn] = None
