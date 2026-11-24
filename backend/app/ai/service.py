"""AI 分析服务：调用 OpenCode Go 订阅的 deepseek-v4.1-flash 模型。

约束：
- 只允许使用 deepseek-v4.1-flash（唯一模型，禁止其它模型）；
- API Key 从环境变量 PWKEY 读取，不写入代码与响应；
- 使用 Go 订阅端点，必须携带 x-opencode-session 会话标识；
- 分析的是号码分布统计摘要，输出可解释的中文分析；明确不承诺预测中奖。
"""

import os
import uuid
from typing import Any, Dict, Optional

import httpx
from loguru import logger

# 唯一允许的 AI 模型（硬编码，不允许请求方覆盖）。
ALLOWED_MODEL = "deepseek-v4.1-flash"

# Go 订阅端点。
GO_CHAT_URL = "https://opencode.ai/inference/go/v1/chat/completions"

# 请求超时（秒）。
REQUEST_TIMEOUT = 60.0

# 系统提示词：约束模型只做统计解读，不做中奖预测。
SYSTEM_PROMPT = (
    "你是一个数字选号工具的统计分析师。你会收到最近若干期开奖号码的频率、遗漏与分布统计摘要。\n"
    "要求：\n"
    "1. 只用中文输出，简洁、客观，不超过 300 字。\n"
    "2. 只解读历史统计现象（冷热号、遗漏、奇偶/大小/和值/三区分布），"
    "不推荐下一期具体号码，不承诺中奖，不使用‘必中/稳赚/提高中奖率’等表述。\n"
    "3. 明确说明：开奖为独立随机事件，历史统计不改变下一期概率。\n"
    "4. 输出纯文本，不要 Markdown 标题。\n"
)


class AiAnalysisUnavailable(Exception):
    """AI 分析不可用。"""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def ai_configured() -> bool:
    """是否已配置 AI Key。

    Returns:
        是否配置了 PWKEY。
    """
    return bool(os.getenv("PWKEY", "").strip())


def _build_summary(stats: Dict[str, Any]) -> str:
    """把统计结果压缩成给模型的简短摘要。

    Args:
        stats: 统计服务返回的结果。

    Returns:
        摘要文本。
    """
    numbers = stats.get("numbers") or []
    sorted_by_z = sorted(numbers, key=lambda item: item.get("zScore", 0), reverse=True)
    hot = [int(item["number"]) for item in sorted_by_z[:5]]
    cold = [int(item["number"]) for item in sorted_by_z[-5:]]
    omission = sorted(numbers, key=lambda item: item.get("currentOmission", 0), reverse=True)[:5]
    uniformity = stats.get("uniformity") or {}
    metrics = stats.get("drawMetrics") or []
    sum_values = [int(item.get("sum", 0)) for item in metrics] or [0]

    lines = [
        f"玩法：{stats.get('game', '')}，窗口：{stats.get('window', 0)} 期",
        f"近期高频号码（按 z 分数）：{', '.join(f'{n:02d}' for n in hot) if hot else '无'}",
        f"近期低频号码：{', '.join(f'{n:02d}' for n in cold) if cold else '无'}",
        "当前遗漏最高号码："
        + (
            ", ".join(
                f"{int(item['number']):02d}({int(item['currentOmission'])}期)" for item in omission
            )
            if omission
            else "无"
        ),
        f"和值范围：{min(sum_values)}–{max(sum_values)}，平均：{round(sum(sum_values) / len(sum_values), 1)}",
        f"均匀性检验：卡方={round(float(uniformity.get('chiSquare', 0)), 2)}，"
        f"p值={round(float(uniformity.get('pValue', 0)), 4)}",
    ]
    return "\n".join(lines)


def analyze(stats: Dict[str, Any], session_id: Optional[str] = None) -> Dict[str, Any]:
    """生成 AI 统计分析。

    Args:
        stats: 统计服务结果。
        session_id: 会话标识（同一个用户会话保持稳定，便于路由与缓存）。

    Returns:
        分析结果字典。

    Raises:
        AiAnalysisUnavailable: Key 未配置、请求失败或返回内容为空。
    """
    key = os.getenv("PWKEY", "").strip()
    if not key:
        raise AiAnalysisUnavailable("AI 分析未配置（PWKEY 缺失）")

    payload = {
        "model": ALLOWED_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": _build_summary(stats)},
        ],
        "max_tokens": 600,
        "temperature": 0.4,
    }
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "x-opencode-session": session_id or f"lucky-picks-{uuid.uuid4().hex[:12]}",
        "User-Agent": "lucky-picks/2.0",
    }

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
            response = client.post(GO_CHAT_URL, headers=headers, json=payload)
    except httpx.HTTPError as error:
        logger.exception("AI 分析请求失败")
        raise AiAnalysisUnavailable("AI 服务暂时不可用，请稍后重试") from error

    if response.status_code != 200:
        logger.error(
            "AI 分析返回错误：status={} body={}", response.status_code, response.text[:300]
        )
        raise AiAnalysisUnavailable(f"AI 服务返回错误（{response.status_code}）")

    try:
        body = response.json()
        content = body["choices"][0]["message"].get("content") or ""
        reasoning = body["choices"][0]["message"].get("reasoning_content") or ""
        # 部分模型把结论放在 reasoning_content，content 为空时兜底
        text = (content or reasoning).strip()
    except (ValueError, KeyError, IndexError, TypeError) as error:
        logger.exception("AI 分析响应格式异常")
        raise AiAnalysisUnavailable("AI 分析结果格式异常") from error

    if not text:
        raise AiAnalysisUnavailable("AI 分析未返回内容")

    return {
        "model": ALLOWED_MODEL,
        "content": text,
        "disclaimer": "开奖为独立随机事件，历史统计不改变下一期概率；本分析仅供娱乐参考。",
    }
