# 图片压缩工具 📸

本地图片压缩工具，无需上传，支持批量处理、格式转换、实时预览对比。

## ✨ 功能特性

- 🚀 **本地极速压缩** - 所有处理在本地完成，无需上传，保护隐私
- 📊 **实时预览对比** - 压缩前后效果实时对比
- 📂 **批量处理** - 支持批量选择文件和整个文件夹
- 🎯 **目标大小压缩** - 可设置目标文件大小，自动调整压缩质量
- 📈 **压缩率统计** - 实时显示压缩前后大小对比和节省空间
- 🔄 **格式转换** - 支持转换为 JPEG、PNG、WebP 等格式
- 📝 **纯浏览器处理** - 使用 Canvas API，无需额外依赖

## 🔧 技术栈

- **TypeScript** - 类型安全的开发体验
- **Canvas API** - 浏览器原生图片处理
- **Tailwind CSS** - 现代化 UI 设计
- **Electron** - 跨平台桌面应用

## 📦 支持格式

### 输入格式

- JPEG/JPG
- PNG
- WebP
- GIF
- BMP

### 输出格式

- JPEG (有损压缩，适合照片)
- PNG (适合图标、截图)
- WebP (现代格式，体积更小)
- 保持原格式

## 🚀 使用方法

### 1. 选择图片

四种方式选择图片：

- 点击「选择文件」按钮，选择单个或多个文件
- 点击「选择文件夹」按钮，选择整个文件夹（会递归扫描所有子文件夹）
- 直接拖拽图片文件到上传区域
- **📋 粘贴剪贴板图片**：点击粘贴按钮或按 Ctrl+V (Mac: Cmd+V)

### 2. 配置压缩选项

- **压缩质量**：1-100，数值越高质量越好，文件越大
- **输出格式**：选择目标格式（JPEG/PNG/WebP）或保持原格式
- **目标大小限制**：设置最大文件大小（KB），自动调整质量以满足要求

### 3. 开始压缩

点击「开始压缩」按钮，工具会自动：

1. 依次处理每张图片
2. 显示实时进度
3. 更新压缩统计
4. 完成后自动打开输出文件夹

### 4. 查看结果

- 压缩后的图片保存在原文件同目录
- 文件名格式：`原文件名_compressed.格式`
- 查看压缩统计了解节省的空间

## 📊 压缩建议

### 照片类图片

- 推荐格式：JPEG 或 WebP
- 质量设置：70-85

### 图标/截图

- 推荐格式：PNG 或 WebP
- 质量设置：80-95

### 网页图片

- 推荐格式：WebP
- 质量设置：70-80

## 🛠️ 开发

### 安装依赖

```bash
pnpm install
pnpm run add-electron-types
```

### 开发模式

```bash
pnpm run dev
```

### 构建

```bash
pnpm run build
```

构建产物会输出到 `dist/` 目录。

### 类型检查

```bash
pnpm run type-check
```

## 📝 配置文件

### manifest.json

```json
{
  "id": "image-compressor",
  "name": "图片压缩工具",
  "version": "1.0.0",
  "category": "image_tool",
  "enabled": true
}
```

## 🔌 API 接口

### imageCompressorAPI

```typescript
// 选择文件
const files = await imageCompressorAPI.selectFiles();

// 选择文件夹
const files = await imageCompressorAPI.selectFolder();

// 压缩图片
const result = await imageCompressorAPI.compressImage(filePath, options);

// 格式化文件大小
const size = imageCompressorAPI.formatFileSize(bytes);

// 打开文件夹
await imageCompressorAPI.openFolder(filePath);
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 反馈

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件
- 在线反馈

---

**享受高效的图片压缩体验！** 🎉
