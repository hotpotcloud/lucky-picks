"""接口请求/响应模型（Pydantic v2）。"""

from typing import List, Optional

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """登录请求。

    Attributes:
        username: 登录名。
        password: 明文密码。
    """

    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


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
