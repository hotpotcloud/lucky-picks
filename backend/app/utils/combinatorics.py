"""组合数学工具。"""

from typing import List, Sequence, TypeVar

T = TypeVar("T")


def combination_count(n: int, k: int) -> int:
    """计算组合数 C(n, k)。

    使用乘除交替计算避免阶乘溢出；非法输入返回 0。

    Args:
        n: 总个数。
        k: 选取个数。

    Returns:
        组合数。
    """
    if not isinstance(n, int) or not isinstance(k, int):
        return 0
    if n < 0 or k < 0 or k > n:
        return 0
    kk = min(k, n - k)
    result = 1
    for index in range(1, kk + 1):
        result = result * (n - kk + index) // index
    return result


def combinations_of(items: Sequence[T], k: int, limit: int) -> List[List[T]]:
    """枚举从 items 中取 k 个的全部组合（最多 limit 组）。

    Args:
        items: 候选元素（需已升序）。
        k: 每组个数。
        limit: 最多枚举多少组。

    Returns:
        组合列表。
    """
    if k < 0 or k > len(items) or limit <= 0:
        return []
    if k == 0:
        return [[]]
    result: List[List[T]] = []
    current: List[T] = []

    def backtrack(start: int) -> None:
        if len(result) >= limit:
            return
        if len(current) == k:
            result.append(list(current))
            return
        need = k - len(current)
        for index in range(start, len(items) - need + 1):
            current.append(items[index])
            backtrack(index + 1)
            current.pop()
            if len(result) >= limit:
                return

    backtrack(0)
    return result
