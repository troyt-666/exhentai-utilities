# ExHentai 一键下载/批量下载按钮

**[EN](README.md)** | **[中文]**

![下载按钮截图](button-screenshot.png)

向 ExHentai/E-Hentai 画廊页面添加一键下载/批量下载按钮。

## 功能特性

### 单个下载
- **Download Original**: 下载原图压缩包
- **Download Resampled**: 下载压缩图片的压缩包
- **Download H@H**: 将下载任务排队到 Hentai@Home 客户端

### 批量下载
- **勾选复选框**: 先勾选复选框选择多个画廊
- **Batch H@H Download**: 一次将多个画廊排队到 H@H 客户端


## 安装

### 前置要求
- [Tampermonkey](https://www.tampermonkey.net/) 或兼容的用户脚本管理器
- 一个 ExHentai/E-Hentai 账户
- （可选）一个 Hentai@Home 客户端

### 安装步骤
1. 安装 Tampermonkey 浏览器扩展
2. 点击此链接：[下载按钮用户脚本](https://greasyfork.org/en/scripts/510654-exhentai-download-button-with-batch-support)
3. 在 Greasyfork 页面上点击"安装"确认并安装脚本

## 使用方法

### 单个下载
1. 导航到任意 ExHentai/E-Hentai 搜索页面
2. 每个画廊将显示三个新按钮：
   - **下载原版**: 直接下载原版压缩包
   - **下载重采样**: 直接下载重采样压缩包
   - **下载 H@H**: 排队到您的 H@H 客户端

### 批量下载
1. **访问面板**: 点击右上角的"📥 Batch H@H"按钮
2. **选择画廊**: 为所需画廊勾选"Batch H@H"复选框
3. **批量选择**: 使用"Select All"或"Select None"按钮便于操作
4. **开始下载**: 点击"Download Selected H@H"开始批量处理

### 进度监控
- **实时进度**: 模态框显示当前正在处理的画廊
- **完成统计**: 跟踪成功和失败的下载
- **错误详情**: 查看带时间戳的详细错误日志

## 工作原理

### 单个下载
1. **获取画廊页面**: 检索画廊页面 HTML
2. **提取压缩包链接**: 定位压缩包下载弹窗链接
3. **表单处理**: 提交相应的下载表单
4. **启动下载**: 触发浏览器下载或 H@H 队列

### 批量处理
1. **顺序处理**: 下载按顺序逐个处理
2. **速率限制**: 请求间有 800ms 延迟以避免速率限制
3. **错误处理**: 失败的下载会记录详细错误信息
4. **进度反馈**: 批量进度的实时更新

### H@H 集成
- 将下载提交到您配置的 Hentai@Home 客户端
- 默认使用原始分辨率（`hathdl_xres=org`）
- 为队列确认提供提示通知
- 处理 H@H 特定的错误信息

## 技术详情

### 下载类型
- **原版**: 全质量压缩包（消耗更多 GP）
- **重采样**: 压缩的压缩包（消耗较少 GP）
- **H@H**: 排队到 Hentai@Home 客户端（无 GP 成本）

### 速率限制
- 单个下载：无人工延迟
- 批量下载：请求间 800ms 延迟
- 遵守 ExHentai 的服务器负载建议

### 错误处理
- 网络超时和连接错误
- 画廊页面上缺少压缩包链接
- H@H 表单提交失败
- GP 不足错误
- 无效画廊页面

### 浏览器兼容性
- Chrome/Chromium（推荐）
- Firefox
- Edge
- Safari（使用 Tampermonkey）

## 故障排除

### 常见问题

**下载未开始**
- 检查是否已登录 ExHentai/E-Hentai
- 验证原版/重采样下载有足够的 GP
- 检查浏览器的弹窗阻止器设置

**H@H 下载失败**
- 确保您的 H@H 客户端正在运行且已配置
- 检查您的 H@H 客户端的 Web 界面设置
- 验证您有 H@H 下载权限

**批量下载停止**
- 检查批量面板中的错误日志
- 网络连接问题可能导致失败
- 某些画廊可能没有可用的压缩包下载

**按钮未出现**
- 刷新页面
- 检查 Tampermonkey 是否已启用
- 验证脚本已安装且处于活动状态

### 调试信息
脚本包含详细的控制台日志。打开浏览器开发者工具（F12）并查看控制台选项卡获取详细的调试信息。

## 配置

### 脚本设置
设置自动保存，包括：
- 批量面板展开/折叠状态
- 错误日志历史
- 选定的画廊偏好

### 自定义
脚本可以修改以：
- 更改默认 H@H 分辨率（`hathdl_xres` 参数）
- 调整速率限制延迟
- 修改提示通知持续时间
- 自定义按钮样式

## 与 ExHentai 实用工具集成

此用户脚本是综合性 [ExHentai 实用工具](https://github.com/troyt-666/exhentai-utilities) 工具包的一部分：

1. **下载按钮**（此脚本）→ 从 Web 界面下载画廊
2. **[H@H 监视器](../../tools/hath-watcher/)** → 监控和处理 H@H 下载
3. **[智能分类器](../../tools/smart-sorter/)** → 分类下载的压缩包
4. **[LANraragi 检查器](../lanraragi-check/)** → 检查本地库状态

### 工作流集成
```
浏览画廊 → 下载（此脚本）→ H@H 客户端 → 监控并压缩 → 分类压缩包 → LANraragi
```

## 贡献

欢迎错误报告和功能请求：
- [问题](https://github.com/troyt-666/exhentai-utilities/issues)
- [拉取请求](https://github.com/troyt-666/exhentai-utilities/pulls)

## 许可证

MIT 许可证 - 详见 [LICENSE](https://github.com/troyt-666/exhentai-utilities/blob/main/LICENSE)。

## 免责声明

- 此脚本与 ExHentai 或 E-Hentai 无关
- 用户有责任遵守网站服务条款
- 请尊重速率限制和服务器资源
- 原版和重采样下载需要消耗 GP