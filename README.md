# 🛡️ Port Security Radar v4.0

[English](#english) | [中文](#中文)

---

## English

### Overview

A lightweight web dashboard for auditing Linux server listening ports, identifying public network bindings, sensitive service exposure, Docker port direct connections, and other common risks. Provides actionable security hardening recommendations for operations teams.

> **v4.0 Major Update**: Vue 3 + Chart.js rewrite with cyberpunk UI, real-time data visualization, historical records, Docker awareness, firewall rules generation, Telegram alerts, PDF export, theme switching, and keyboard shortcuts!

### ✨ Features

- 🔎 **Port Scanning**: Uses `ss -tulnp` to get TCP/UDP listeners
- 🌐 **Address Classification**: Identifies `127.0.0.1`, `0.0.0.0`, `::`, private LAN, specific addresses
- ⚠️ **Risk Levels**: `critical` / `high` / `medium` / `low`
- 🧠 **Sensitive Port Detection**: Docker API, databases, Redis, Elasticsearch, RabbitMQ, Memcached
- 📊 **Data Visualization**: Risk distribution, protocol distribution, bind type charts
- 🐳 **Docker Awareness**: Detects Docker container port mappings
- 📈 **Historical Records**: SQLite-based scan history with change detection
- 🔔 **Telegram Alerts**: Notifications for critical port changes
- 🔥 **Firewall Rules**: Auto-generated iptables rules suggestions
- 📥 **Export**: CSV, JSON, and PDF export support
- 🔄 **Auto-refresh**: Updates every 60 seconds
- 🔍 **Smart Search**: Multi-dimensional search and filtering
- 📱 **Mobile Responsive**: Desktop table view, mobile card view
- 🎯 **Cyberpunk UI**: Dark theme with neon effects and radar animation
- 🌓 **Theme Switching**: Dark and light theme support
- 🔗 **Connection Tracking**: Active connection count per port
- 📋 **Process Details**: Click to view full command line and process info
- ⌨️ **Keyboard Shortcuts**: Quick actions with keyboard
- 🔊 **Sound Alerts**: Audio notification for critical findings
- 📈 **Trend Charts**: 7-day historical trend visualization

### 🖼️ Preview

The dashboard includes:

- Risk score gauge (animated)
- Total listening ports / sensitive public ports
- Critical / High / Medium / Low risk counts
- Docker container count
- Active connection count
- System info (hostname, uptime, load)
- Risk distribution pie chart
- Protocol distribution polar chart
- Bind type bar chart
- 7-day trend line chart
- Firewall rules suggestions
- Port details table (desktop) / cards (mobile)
- Historical scan records panel
- Process detail modal

### 🚀 Quick Start

#### Prerequisites

- Linux server
- Node.js 18+
- `ss` command available (usually from `iproute2`)
- Docker (optional, for container detection)

#### Installation

```bash
git clone https://github.com/mrz2333/port-security-radar.git
cd port-security-radar
npm install
npm run build
npm start
```

Default access: http://127.0.0.1:9188

#### Development Mode

```bash
npm run dev
```

#### Custom Host/Port

```bash
HOST=0.0.0.0 PORT=8080 npm start
```

#### Command Line Usage

```bash
# Table output
npm run scan

# JSON output
npm run scan -- --json

# Firewall rules
npm run firewall
```

### ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Rescan |
| `H` | Toggle history panel |
| `T` | Toggle theme |
| `C` | Export CSV |
| `J` | Export JSON |
| `P` | Generate PDF |
| `/` | Focus search |
| `?` | Show/hide shortcuts |
| `Esc` | Close panels |

### 🔐 Authentication

Set `API_KEY` environment variable to enable Bearer token authentication:

```bash
API_KEY=*** npm start
```

Then include the header in requests:
```
Authorization: Bearer your-s...n### 🔔 Telegram Alerts

Configure Telegram notifications for critical port changes:

```bash
TELEGRAM_BOT_TOKEN=your-b...nnpm start
```

Get your bot token from [@BotFather](https://t.me/botfather) and chat ID from [@userinfobot](https://t.me/userinfobot).

### 📊 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/scan` | Perform port scan |
| `GET /api/history` | Get scan history |
| `GET /api/changes` | Get port changes |
| `GET /api/stats` | Get statistics |
| `GET /api/firewall` | Get firewall rules |
| `GET /api/export/csv` | Export as CSV |
| `GET /health` | Health check |

### 📁 Project Structure

```
port-security-radar/
├── src/                    # Vue 3 source
│   ├── App.vue            # Main application
│   ├── main.js            # Entry point
│   └── components/        # Chart components
├── dist/                  # Build output
├── data/                  # SQLite database
├── server.js              # Fastify server
├── scanner.js             # Port scanning logic
├── history.js             # Historical records
├── alerts.js              # Telegram alerts
├── vite.config.js         # Vite configuration
└── package.json
```

### 🛡️ Security Recommendations

- Default listens on `127.0.0.1` only
- Use behind authenticated reverse proxy (Nginx/Caddy)
- Enable HTTPS in production
- Set `API_KEY` for authentication

### 📄 License

MIT License

---

## 中文

### 概述

一个轻量级 Web 端口安全面板，用于快速扫描 Linux 服务器本机监听端口，识别公网绑定、敏感服务暴露、Docker 端口直连等常见风险，并给出面向运维场景的加固建议。

> **v4.0 重大更新**：全新 Vue 3 + Chart.js 重构，赛博朋克风格 UI，实时数据可视化，历史记录，Docker 感知，防火墙规则生成，Telegram 告警，PDF 导出，主题切换，键盘快捷键！

### ✨ 功能特性

- 🔎 **端口扫描**：调用系统 `ss -tulnp` 获取 TCP/UDP 监听项
- 🌐 **地址识别**：区分 `127.0.0.1`、`0.0.0.0`、`::`、内网地址、指定公网地址等
- ⚠️ **风险分级**：`critical` / `high` / `medium` / `low`
- 🧠 **敏感端口提示**：识别 Docker API、数据库、Redis、Elasticsearch、RabbitMQ、Memcached 等
- 📊 **数据可视化**：风险分布、协议分布、绑定类型图表
- 🐳 **Docker 感知**：检测 Docker 容器端口映射
- 📈 **历史记录**：基于 SQLite 的扫描历史和变化检测
- 🔔 **Telegram 告警**：关键端口变化时发送通知
- 🔥 **防火墙规则**：自动生成 iptables 规则建议
- 📥 **数据导出**：支持 CSV、JSON 和 PDF 导出
- 🔄 **自动刷新**：每 60 秒自动更新
- 🔍 **智能搜索**：多维度搜索和过滤
- 📱 **移动端适配**：桌面端表格视图，手机端卡片视图
- 🎯 **赛博朋克 UI**：深色主题，霓虹光效，雷达动画
- 🌓 **主题切换**：深色/浅色主题支持
- 🔗 **连接追踪**：每个端口的活跃连接数
- 📋 **进程详情**：点击查看完整命令行和进程信息
- ⌨️ **键盘快捷键**：快速操作
- 🔊 **声音告警**：发现高危端口时声音提醒
- 📈 **趋势图表**：7天历史趋势可视化

### 🖼️ 界面预览

面板包含：

- 风险指数仪表盘（动态动画）
- 监听端口总数 / 敏感公网端口数量
- 高危 / 高 / 中 / 低风险统计
- Docker 容器数量
- 活跃连接数
- 系统信息（主机名、运行时间、负载）
- 风险分布饼图
- 协议分布极坐标图
- 绑定类型柱状图
- 7天趋势折线图
- 防火墙规则建议
- 端口详情表格（桌面端）/ 卡片（移动端）
- 扫描历史记录面板
- 进程详情弹窗

### 🚀 快速开始

#### 环境要求

- Linux 服务器
- Node.js 18+
- 系统可用 `ss` 命令（通常来自 `iproute2`）
- Docker（可选，用于容器检测）

#### 安装运行

```bash
git clone https://github.com/mrz2333/port-security-radar.git
cd port-security-radar
npm install
npm run build
npm start
```

默认访问：http://127.0.0.1:9188

#### 开发模式

```bash
npm run dev
```

#### 自定义监听地址和端口

```bash
HOST=0.0.0.0 PORT=8080 npm start
```

#### 命令行使用

```bash
# 表格输出
npm run scan

# JSON 输出
npm run scan -- --json

# 防火墙规则
npm run firewall
```

### ⌨️ 键盘快捷键

| 按键 | 功能 |
|------|------|
| `Space` | 重新扫描 |
| `H` | 切换历史面板 |
| `T` | 切换主题 |
| `C` | 导出 CSV |
| `J` | 导出 JSON |
| `P` | 生成 PDF |
| `/` | 聚焦搜索框 |
| `?` | 显示/隐藏快捷键 |
| `Esc` | 关闭面板 |

### 🔐 认证配置

设置 `API_KEY` 环境变量启用 Bearer token 认证：

```bash
API_KEY=*** npm start
```

请求时需要包含 Header：
```
Authorization: Bearer your-s...n### 🔔 Telegram 告警

配置 Telegram 通知以接收关键端口变化告警：

```bash
TELEGRAM_BOT_TOKEN=your-b...nnpm start
```

从 [@BotFather](https://t.me/botfather) 获取 Bot Token，从 [@userinfobot](https://t.me/userinfobot) 获取 Chat ID。

### 📊 API 接口

| 接口 | 说明 |
|------|------|
| `GET /api/scan` | 执行端口扫描 |
| `GET /api/history` | 获取扫描历史 |
| `GET /api/changes` | 获取端口变化 |
| `GET /api/stats` | 获取统计数据 |
| `GET /api/firewall` | 获取防火墙规则 |
| `GET /api/export/csv` | 导出 CSV |
| `GET /health` | 健康检查 |

### 📁 项目结构

```
port-security-radar/
├── src/                    # Vue 3 源码
│   ├── App.vue            # 主应用组件
│   ├── main.js            # 入口文件
│   └── components/        # 图表组件
├── dist/                  # 构建产物
├── data/                  # SQLite 数据库
├── server.js              # Fastify 服务器
├── scanner.js             # 端口扫描逻辑
├── history.js             # 历史记录模块
├── alerts.js              # Telegram 告警模块
├── vite.config.js         # Vite 配置
└── package.json
```

### 🛡️ 安全建议

- 默认只监听 `127.0.0.1`
- 建议放在反向代理（Nginx/Caddy）后面并启用认证
- 生产环境启用 HTTPS
- 设置 `API_KEY` 进行认证

### 📄 开源协议

MIT License

---

## 🤝 Contributing

欢迎提交 Issue 和 Pull Request！

## ⭐ Star History

如果这个项目对你有帮助，请给个 Star ⭐

---

**Made with ❤️ and Vue 3**
