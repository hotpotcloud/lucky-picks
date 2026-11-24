#!/usr/bin/env bash
# 服务器端部署脚本：由 GitHub Actions 通过 SSH 调用。
# 运行时配置从 /opt/lucky-picks/backend/.env 读取（由服务器维护者提供，不入库）。

set -euo pipefail

APP_ROOT="/opt/lucky-picks"
BACKEND_DIR="${APP_ROOT}/backend"
VENV="${BACKEND_DIR}/.venv"
LOG_FILE="/var/log/lucky-picks-api.log"

echo "[deploy] 检查服务器本地配置"
if [ ! -f "${BACKEND_DIR}/.env" ]; then
  echo "[deploy] 缺少配置文件: ${BACKEND_DIR}/.env" >&2
  echo "[deploy] 请参照仓库 backend/.env.example 在服务器上创建并填写" >&2
  exit 1
fi

# 加载服务器本地配置（不打印内容，避免密码出现在日志中）
set -a
# shellcheck disable=SC1091
source "${BACKEND_DIR}/.env"
set +a

API_PORT="${API_PORT:-1688}"
echo "[deploy] API 端口: ${API_PORT}"

echo "[deploy] 拉取最新代码"
if [ ! -d "${APP_ROOT}/.git" ]; then
  mkdir -p "${APP_ROOT}"
  git clone https://github.com/hotpotcloud/lucky-picks.git "${APP_ROOT}"
fi
cd "${APP_ROOT}"
git pull --ff-only

echo "[deploy] 准备 Python 虚拟环境"
cd "${BACKEND_DIR}"
if [ ! -x "${VENV}/bin/python" ]; then
  python3 -m venv "${VENV}"
fi
"${VENV}/bin/pip" install --quiet --upgrade pip
"${VENV}/bin/pip" install --quiet -r requirements.txt

echo "[deploy] 重启服务"
pkill -f "uvicorn app.main:app --host 0.0.0.0 --port ${API_PORT}" || true
nohup "${VENV}/bin/uvicorn" app.main:app --host 0.0.0.0 --port "${API_PORT}" \
  > "${LOG_FILE}" 2>&1 &
sleep 8

echo "[deploy] 健康检查"
curl -fsS "http://127.0.0.1:${API_PORT}/health"
echo ""
echo "[deploy] 完成"
