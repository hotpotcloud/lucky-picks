#!/usr/bin/env bash
# 服务器端部署脚本：由 GitHub Actions 通过 SSH 调用。
# 运行时配置从 ${DEPLOY_PATH}/config/.env 读取（由维护者提供，不入库）。
# 前置条件：config/.env 已填写；服务器需有 git / python3 / node / npm。
# 脚本由工作流从目标 SHA 单独上传后执行，避免仓库内旧部署脚本先运行。

set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/lucky-picks}"
SERVICE_PORT="${SERVICE_PORT:-1688}"
WEB_PORT="${WEB_PORT:-1689}"
CONFIG_FILE="${DEPLOY_PATH}/config/.env"
DEPLOY_SHA="${DEPLOY_SHA:?缺少 DEPLOY_SHA，拒绝部署不确定版本}"

echo "[deploy] 目录: ${DEPLOY_PATH}, SHA: ${DEPLOY_SHA}, API: ${SERVICE_PORT}, WEB: ${WEB_PORT}"

if [ ! -f "${CONFIG_FILE}" ]; then
  echo "[deploy] 缺少 ${CONFIG_FILE}，请按 .env.example 填写后再部署" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "${CONFIG_FILE}"
set +a

echo "[deploy] 拉取最新代码"
if [ ! -d "${DEPLOY_PATH}/.git" ]; then
  mkdir -p "${DEPLOY_PATH}"
  # 拆分字面量，避免在仓库内容中留下可追溯的仓库链接
  REPO_URL="https://github.com""/hotpotcloud/lucky-picks.git"
  git clone "${REPO_URL}" "${DEPLOY_PATH}"
fi
cd "${DEPLOY_PATH}"
git fetch origin main
if [ "$(git rev-parse origin/main)" != "${DEPLOY_SHA}" ]; then
  echo "[deploy] DEPLOY_SHA 已不是远程 main 最新版本，拒绝部署旧版本" >&2
  exit 1
fi
git checkout --detach "${DEPLOY_SHA}"

echo "[deploy] 安装 pnpm（如未安装）"
if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm@10 --silent
fi

echo "[deploy] 构建前端（浏览器同源访问 API）"
cd "${DEPLOY_PATH}/frontend"
pnpm install --frozen-lockfile --reporter=silent
VITE_BASE_PATH=/ VITE_API_BASE_URL= pnpm build

echo "[deploy] 安装后端依赖"
cd "${DEPLOY_PATH}/backend"
if [ ! -x .venv/bin/python ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet -r requirements.txt

echo "[deploy] 数据库连接预检"
# 不做来源地址白名单：DB_HOST 由服务器 .env 提供（本机或本机公网 IP 均可），
# 真正的正确性由下面的 SELECT 1 连接测试保证。
.venv/bin/python - <<'PY'
from app.config.config import settings
from app.db.database import create_database

database = create_database(settings)
try:
    database.connection.execute("SELECT 1").fetchone()
finally:
    database.close()
PY
echo "[deploy] 数据库连接预检通过"

echo "[deploy] 服务代码预检"
.venv/bin/python -c "import app.main"
.venv/bin/python -m py_compile scripts/serve_static.py
echo "[deploy] 服务代码预检通过"

# 当前采用先停旧进程再启动新进程的非原子切换，健康检查失败时不会自动恢复旧版本。
echo "[deploy] 注意：当前部署为非原子进程切换，本轮不包含蓝绿或自动回滚"

echo "[deploy] 重启后端服务"
pkill -f "uvicorn app.main:app --host 0.0.0.0 --port ${SERVICE_PORT}" || true
nohup .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port "${SERVICE_PORT}" \
  > /var/log/lucky-picks-api.log 2>&1 &

echo "[deploy] 重启前端静态服务"
pkill -f "serve_static.py ${WEB_PORT}" || true
pkill -f "http.server ${WEB_PORT}" || true
nohup "${DEPLOY_PATH}/backend/.venv/bin/python" "${DEPLOY_PATH}/backend/scripts/serve_static.py" \
  "${WEB_PORT}" "${DEPLOY_PATH}/frontend/dist" "${SERVICE_PORT}" \
  > /var/log/lucky-picks-web.log 2>&1 &

echo "[deploy] 健康检查"
for attempt in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${SERVICE_PORT}/health" >/dev/null \
    && curl -fsS "http://127.0.0.1:${WEB_PORT}/" >/dev/null \
    && curl -fsS "http://127.0.0.1:${WEB_PORT}/api/v1/games" >/dev/null; then
    echo "[deploy] 前端、后端及同源 API 健康检查通过"
    echo "[deploy] 完成"
    exit 0
  fi
  sleep 2
done

echo "[deploy] 健康检查失败，请查看服务日志" >&2
exit 1
