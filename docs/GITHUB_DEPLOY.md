# GitHub 一键部署说明

本项目提供 GitHub Actions 手动部署工作流：

```text
.github/workflows/deploy-couple-ledger-vps.yml
```

## 1. 配置 Secrets

进入 GitHub 仓库：

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

添加以下 Secrets：

| Secret | 示例 | 必填 |
| --- | --- | --- |
| `VPS_HOST` | `162.243.80.127` | 是 |
| `VPS_USER` | `root` | 是 |
| `VPS_SSH_KEY` | 私钥完整内容 | 是 |
| `VPS_PORT` | `22` | 是 |
| `VPS_APP_DIR` | `/opt/couple-ledger` | 是 |
| `VPS_WEB_DIR` | `/var/www/couple-ledger` | 是 |
| `PUBLIC_HEALTH_URL` | `http://162.243.80.127:8080/api/health` | 是 |

`VPS_SSH_KEY` 必须是能登录 VPS 的私钥完整内容，直接从本机私钥文件复制全文到 Secret 即可。

```text
粘贴私钥文件的完整内容
```

不要把私钥提交到仓库。

## 2. 点一次部署

进入 GitHub 仓库：

```text
Actions -> Deploy Couple Ledger to VPS -> Run workflow
```

工作流会自动：

1. 跑后端测试
2. 检查静态前端脚本语法
3. 构建 Vue 前端源码
4. 同步后端源码到 VPS
5. 同步 `www/` 静态前端到 VPS
6. 重启 `couple-ledger.service`
7. 调用健康检查地址确认部署成功

## 3. VPS 端约定

VPS 上建议保持：

```text
/opt/couple-ledger              # 后端源码和 .env
/var/www/couple-ledger          # nginx 静态前端目录
/var/lib/couple-ledger/ledger.db
/var/lib/couple-ledger/.jwt_secret
```

后端 `.env` 可参考：

```text
work/couple-ledger-vps/backend/.env.example
```

## 4. 常见失败

- `Missing secret`：GitHub Secrets 没填完整。
- `Permission denied`：`VPS_SSH_KEY` 不对，或 VPS 没放对应公钥。
- `pytest` 失败：后端测试未通过，应先修代码。
- `systemctl restart` 失败：VPS 上服务名不是 `couple-ledger.service`，需要改 workflow。
- 健康检查失败：服务可能已重启但 nginx/API 地址不对，检查 `PUBLIC_HEALTH_URL`。
