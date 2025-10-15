/// <reference path="../typings/naimo.d.ts" />

import { contextBridge } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

// ==================== 类型定义 ====================

interface FileInfo {
  id: string;
  name: string;
  path: string;
  size: number;
  format: string;
  base64?: string;
}

interface SaveResult {
  success: boolean;
  path?: string;
  error?: string;
}


// ==================== 文件处理函数 ====================

/**
 * 选择文件
 */
async function selectFiles(): Promise<FileInfo[]> {
  try {
    const result = await naimo.dialog.showOpen({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'] }
      ]
    });

    if (!result || result.length === 0) {
      return [];
    }

    return result.map((filePath, index) => {
      const stats = fs.statSync(filePath);
      const ext = path.extname(filePath).slice(1).toLowerCase();

      // 读取文件为 Base64
      const buffer = fs.readFileSync(filePath);
      const base64 = buffer.toString('base64');
      const mimeType = getMimeType(ext);

      return {
        id: `${Date.now()}_${index}`,
        name: path.basename(filePath),
        path: filePath,
        size: stats.size,
        format: ext,
        base64: `data:${mimeType};base64,${base64}`
      };
    });
  } catch (error) {
    console.error('选择文件失败:', error);
    return [];
  }
}

/**
 * 选择文件夹
 */
async function selectFolder(): Promise<FileInfo[]> {
  try {
    const result = await naimo.dialog.showOpen({
      properties: ['openDirectory']
    });

    if (!result || result.length === 0) {
      return [];
    }

    const folderPath = result[0];
    const files: FileInfo[] = [];
    const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'];

    function scanDir(dirPath: string) {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          scanDir(fullPath);
        } else {
          const ext = path.extname(fullPath).slice(1).toLowerCase();
          if (imageExts.includes(ext)) {
            // 读取文件为 Base64
            const buffer = fs.readFileSync(fullPath);
            const base64 = buffer.toString('base64');
            const mimeType = getMimeType(ext);

            files.push({
              id: `${Date.now()}_${files.length}`,
              name: path.basename(fullPath),
              path: fullPath,
              size: stats.size,
              format: ext,
              base64: `data:${mimeType};base64,${base64}`
            });
          }
        }
      }
    }

    scanDir(folderPath);
    return files;
  } catch (error) {
    console.error('选择文件夹失败:', error);
    return [];
  }
}

/**
 * 保存压缩后的图片
 */
async function saveImage(originalPath: string, base64Data: string, format: string, outputDir?: string): Promise<SaveResult> {
  try {
    // 从 base64 数据中提取实际的 base64 字符串
    const base64Match = base64Data.match(/^data:image\/\w+;base64,(.+)$/);
    if (!base64Match) {
      throw new Error('无效的 base64 数据');
    }

    const base64 = base64Match[1];
    const buffer = Buffer.from(base64, 'base64');

    // 生成输出路径
    const name = path.basename(originalPath, path.extname(originalPath));
    let targetDir = outputDir;

    // 如果没有指定输出目录，使用原文件所在目录
    if (!targetDir) {
      targetDir = path.dirname(originalPath);
    }

    // 确保输出目录存在
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 生成时间戳（格式：年月日时分秒）
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

    const outputPath = path.join(targetDir, `${name}_compressed_${timestamp}.${format}`);

    // 保存文件
    fs.writeFileSync(outputPath, buffer);

    return {
      success: true,
      path: outputPath
    };
  } catch (error: any) {
    console.error('保存文件失败:', error);
    return {
      success: false,
      error: error.message || '未知错误'
    };
  }
}

/**
 * 选择输出目录
 */
async function selectOutputDirectory(): Promise<string | null> {
  try {
    const result = await naimo.dialog.showOpen({
      properties: ['openDirectory', 'createDirectory']
    });

    if (!result || result.length === 0) {
      return null;
    }

    return result[0];
  } catch (error) {
    console.error('选择输出目录失败:', error);
    return null;
  }
}

/**
 * 获取默认下载目录
 */
async function getDownloadDirectory(): Promise<string> {
  try {
    return await naimo.system.getPath('downloads');
  } catch (error) {
    console.error('获取下载目录失败:', error);
    return '';
  }
}

/**
 * 获取 MIME 类型
 */
function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'bmp': 'image/bmp'
  };
  return mimeTypes[ext.toLowerCase()] || 'image/jpeg';
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 打开文件所在文件夹
 */
async function openFolder(filePath: string): Promise<void> {
  try {
    await naimo.shell.showInFolder(filePath);
  } catch (error) {
    console.error('打开文件夹失败:', error);
  }
}

/**
 * 从剪贴板粘贴图片
 */
async function pasteFromClipboard(): Promise<FileInfo | null> {
  try {
    const hasImage = await naimo.clipboard.hasImage();
    if (!hasImage) {
      return null;
    }

    const base64 = await naimo.clipboard.readImage();
    if (!base64) {
      return null;
    }

    // 估算文件大小（base64 转字节）
    const estimatedSize = Math.round((base64.length - 22) * 0.75);

    return {
      id: `clipboard_${Date.now()}`,
      name: `clipboard_${Date.now()}.png`,
      path: 'clipboard',
      size: estimatedSize,
      format: 'png',
      base64: base64
    };
  } catch (error) {
    console.error('粘贴剪贴板图片失败:', error);
    return null;
  }
}


// ==================== 暴露插件 API ====================

const imageCompressorAPI = {
  selectFiles,
  selectFolder,
  pasteFromClipboard,
  saveImage,
  formatFileSize,
  openFolder,
  getMimeType,
  selectOutputDirectory,
  getDownloadDirectory
};

contextBridge.exposeInMainWorld('imageCompressorAPI', imageCompressorAPI);

// ==================== 功能处理器导出 ====================

/**
 * 导出功能处理器
 */
const handlers = {
  compress: {
    onEnter: async (params: any) => {
      console.log('图片压缩功能被触发');
      console.log('参数:', params);

      if (typeof window !== 'undefined' && (window as any).naimo) {
        (window as any).naimo.log.info('图片压缩工具已加载', { params });
      }
    }
  }
};

// 使用 CommonJS 导出（Electron 环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = handlers;
}

// ==================== 初始化 ====================

window.addEventListener('DOMContentLoaded', () => {
  console.log('图片压缩工具 Preload 脚本已初始化');
});

// ==================== 类型扩展 ====================

declare global {
  const imageCompressorAPI: typeof imageCompressorAPI;
}
