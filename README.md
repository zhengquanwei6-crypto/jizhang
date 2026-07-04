# CoupleSpaceAI / Couple Ledger

情侣共同生活与记账项目，包含 Android 客户端工程，以及部署在 VPS 上的情侣记账 Web / API 服务。

当前重点维护的是 `work/couple-ledger-vps` 下的 Couple Ledger：

- FastAPI 后端：账号、账本、账户、预算、统计、导入导出、AI 快速记账等接口
- Vue 前端源码：`work/couple-ledger-vps/frontend`
- 线上静态前端快照：`work/couple-ledger-vps/www`
- 部署与检查脚本：`work/couple-ledger-vps/tools`

## 目录结构

```text
.
├── app/                         # Android 应用入口
├── core/                        # Android 通用能力与设计系统
├── data/                        # Android 数据层
├── feature/                     # Android 功能模块
├── work/couple-ledger-vps/
│   ├── backend/                 # FastAPI 后端源码、测试和依赖
│   ├── frontend/                # Vue 前端源码
│   ├── www/                     # 当前线上静态前端快照
│   └── tools/                   # 本地部署和静态检查脚本
└── .github/workflows/           # GitHub Actions 一键部署
```

## 本地开发

### 后端

```bash
cd work/couple-ledger-vps/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest
uvicorn app.main:app --reload --host 127.0.0.1 --port 8788
```

### 前端源码

```bash
cd work/couple-ledger-vps/frontend
npm ci
npm run dev
npm run build
```

### 静态快照检查

Windows / PowerShell：

```powershell
cd work/couple-ledger-vps
powershell -ExecutionPolicy Bypass -File .\tools\check-static.ps1
```

## 一键部署

本仓库内置 GitHub Actions 工作流：

- 文件：`.github/workflows/deploy-couple-ledger-vps.yml`
- 触发方式：GitHub 仓库页面 `Actions` -> `Deploy Couple Ledger to VPS` -> `Run workflow`

需要先在 GitHub 仓库 `Settings` -> `Secrets and variables` -> `Actions` 中配置：

| Secret | 说明 |
| --- | --- |
| `VPS_HOST` | VPS IP 或域名，例如 `162.243.80.127` |
| `VPS_USER` | SSH 用户，例如 `root` |
| `VPS_SSH_KEY` | 可登录 VPS 的私钥内容 |
| `VPS_PORT` | SSH 端口，默认可填 `22` |
| `VPS_APP_DIR` | 后端目录，默认建议 `/opt/couple-ledger` |
| `VPS_WEB_DIR` | 静态前端目录，默认建议 `/var/www/couple-ledger` |
| `PUBLIC_HEALTH_URL` | 线上健康检查地址，例如 `http://162.243.80.127:8080/api/health` |

工作流会执行：

1. 检出代码
2. 检查后端 Python 测试
3. 检查静态前端脚本语法
4. 通过 SSH 备份线上 `index.html`
5. 同步后端源码到 VPS
6. 同步 `www/` 静态前端到 VPS
7. 安装后端依赖并重启 `couple-ledger.service`
8. 调用健康接口确认部署成功

## 开源安全说明

仓库已通过 `.gitignore` 排除：

- `.env`、本机配置、数据库文件
- SSH 私钥、证书、keystore
- `node_modules`、Gradle / Android 构建产物
- 日志、缓存和临时文件

公开前仍建议检查 `git status` 和 GitHub Secrets，确认没有把真实密钥写进源码。

## License

Apache License 2.0. See [LICENSE](LICENSE).
