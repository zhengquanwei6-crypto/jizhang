# 发布到 GitHub

本项目已经准备好开源发布：`.gitignore` 会排除本地配置、密钥、构建缓存和数据库文件，`LICENSE` 使用 Apache-2.0，`.github/workflows/deploy-couple-ledger-vps.yml` 提供手动一键部署。

## 方式一：已有 GitHub 空仓库

在 GitHub 新建一个公开空仓库后，把仓库地址替换到下面命令：

```powershell
git remote add origin https://github.com/<your-name>/CoupleSpaceAI.git
git push -u origin main
```

如果远程已经存在，用：

```powershell
git remote set-url origin https://github.com/<your-name>/CoupleSpaceAI.git
git push -u origin main
```

## 方式二：使用 GitHub CLI

如果本机安装并登录了 `gh`：

```powershell
gh repo create CoupleSpaceAI --public --source . --remote origin --push
```

## 推送后必须配置的 Secrets

进入 GitHub 仓库：

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

配置：

```text
VPS_HOST=162.243.80.127
VPS_USER=root
VPS_SSH_KEY=能登录 VPS 的私钥完整内容
VPS_PORT=22
VPS_APP_DIR=/opt/couple-ledger
VPS_WEB_DIR=/var/www/couple-ledger
PUBLIC_HEALTH_URL=http://162.243.80.127:8080/api/health
```

之后在：

```text
Actions -> Deploy Couple Ledger to VPS -> Run workflow
```

点一次就会自动测试、构建、同步到 VPS、重启服务并检查健康接口。
