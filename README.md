# 🛡️ Port Security Radar v2.0

一个轻量级 Web 端口安全面板，用于快速扫描 Linux 服务器本机监听端口，识别公网绑定、敏感服务暴露、Docker 端口直连等常见风险，并给出面向运维场景的加固建议。

> 🎨 **v2.0 重大更新**：全新 Vue 3 + Chart.js 重构，赛博朋克风格 UI，实时数据可视化！

## ✨ 功能特性

- 🔎 **本机端口扫描**：调用系统 `ss -tulnp` 获取 TCP/UDP 监听项
- 🌐 **绑定地址识别**：区分 `127.0.0.1`、`0.0.0.0`、`::`、内网地址、指定公网地址等
- ⚠️ **风险分级**：`critical` / `high` / `medium` / `low`
- 🧠 **敏感端口提示**：识别 Docker API、数据库、Redis、Elasticsearch、RabbitMQ、Memcached 等常见敏感端口
- 📊 **数据可视化**：风险分布、协议分布、绑定类型图表
- 🔄 **自动刷新**：每 60 秒自动扫描更新
- 🔍 **智能搜索**：支持端口、进程、地址等多维度搜索
- 📱 **移动端适配**：桌面端表格视图，手机端自动切换卡片视图
- 🎯 **赛博朋克 UI**：深色主题，霓虹光效，雷达动画

## 🖼️ 界面预览

面板包含：

- 综合风险指数（动态仪表盘）
- 监听项总数 / 敏感公网端口数量
- 高 / 中 / 低风险统计
- 风险分布饼图
- 协议分布极坐标图
- 绑定类型柱状图
- 端口详情表格（桌面端）/ 卡片（移动端）

## 🚀 快速开始

### 1. 环境要求

- Linux 服务器
- Node.js 18+
- 系统可用 `ss` 命令（通常来自 `iproute2`）

### 2. 安装运行

```bash
git clone https://github.com/mrz2333/port-security-radar.git
cd port-security-radar
npm install
npm run build
npm start
```

默认访问：

```text
http://127.0.0.1:9188
```

### 3. 开发模式

```bash
npm run dev
```

访问 http://localhost:9188 查看实时开发环境。

### 4. 自定义监听地址和端口

```bash
# 修改监听地址和端口
HOST=0.0.0.0 PORT=8080 npm start

# 或使用环境变量文件
cp .env.example .env
# 编辑 .env 文件
```

### 5. 命令行扫描

```bash
# 直接输出表格
npm run scan

# 输出 JSON
npm run scan -- --json
```

## 📁 项目结构

```
port-security-radar/
├── src/                    # Vue 3 源码
│   ├── App.vue            # 主应用组件
│   ├── main.js            # 入口文件
│   └── components/        # 图表组件
│       ├── RiskChart.vue
│       ├── ProtocolChart.vue
│       └── BindChart.vue
├── public/                # 静态资源
├── dist/                  # 构建产物
├── server.js              # Fastify 服务器
├── scanner.js             # 端口扫描逻辑
├── vite.config.js         # Vite 配置
└── package.json
```

## 🔧 技术栈

- **前端**：Vue 3 + Vite + Chart.js
- **后端**：Fastify + Node.js
- **样式**：CSS3 + 赛博朋克主题
- **图表**：Chart.js (Doughnut, Polar Area, Bar)

## 🛡️ 安全建议

- 默认只监听 `127.0.0.1`，建议放在服务器本机或通过带认证的反向代理访问
- 不要裸露到公网
- 建议配合 Nginx/Caddy 反代 + HTTPS

## 📄 License

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**Made with ❤️ and Vue 3**
