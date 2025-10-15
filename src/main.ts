/// <reference path="../typings/naimo.d.ts" />

import './style.css';
import imageCompression from 'browser-image-compression';

// ==================== 类型定义 ====================

interface FileInfo {
  id: string;
  name: string;
  path: string;
  size: number;
  format: string;
  base64?: string;
}

interface CompressOptions {
  quality: number;
  format: 'original' | 'jpeg' | 'png' | 'webp';
  targetSize?: number;
}

interface CompressResult {
  success: boolean;
  originalSize: number;
  compressedSize: number;
  savedSize: number;
  savedPercent: number;
  error?: string;
}

interface Stats {
  totalFiles: number;
  compressed: number;
  originalTotalSize: number;
  compressedTotalSize: number;
  savedTotalSize: number;
  savedPercent: number;
}

// ==================== 热重载 ====================
if (import.meta.hot) {
  import.meta.hot.on('preload-changed', async (data) => {
    console.log('📝 检测到 preload 变化:', data);
    console.log('🔨 正在触发 preload 构建...');
    try {
      const response = await fetch('/__preload_build');
      const result = await response.json();
      if (result.success) {
        console.log('✅ Preload 构建完成');
        await window.naimo.hot();
        console.log('🔄 Preload 热重载完成');
        location.reload();
      } else {
        console.error('❌ Preload 构建失败');
      }
    } catch (error) {
      console.error('❌ 触发 preload 构建失败:', error);
    }
  });
}

// ==================== 通知系统 ====================

type NotificationType = 'success' | 'error' | 'warning' | 'info';

function showNotification(message: string, type: NotificationType = 'info', duration: number = 3000) {
  const container = document.getElementById('notificationContainer');
  if (!container) return;

  const notification = document.createElement('div');

  // 样式映射
  const styles = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  notification.className = `${styles[type]} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in relative`;
  notification.innerHTML = `
    <span class="text-lg">${icons[type]}</span>
    <span class="text-sm flex-1">${message}</span>
    <button class="ml-2 text-white hover:text-gray-200 transition-colors text-lg leading-none font-bold px-1">×</button>
  `;

  container.appendChild(notification);

  // 移除通知的函数
  const removeNotification = () => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    notification.style.transition = 'all 0.3s ease-out';
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 300);
  };

  // 自动移除
  const autoRemoveTimer = setTimeout(removeNotification, duration);

  // 点击关闭按钮时，清除自动移除计时器并立即移除
  const closeButton = notification.querySelector('button');
  if (closeButton) {
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      clearTimeout(autoRemoveTimer);
      removeNotification();
    });
  }
}

// ==================== 全局状态 ====================

let selectedFiles: FileInfo[] = [];
let compressOptions: CompressOptions = {
  quality: 80,
  format: 'original',
  targetSize: undefined
};
let outputDirectory: string = ''; // 输出目录，默认为空（使用下载目录）

let stats: Stats = {
  totalFiles: 0,
  compressed: 0,
  originalTotalSize: 0,
  compressedTotalSize: 0,
  savedTotalSize: 0,
  savedPercent: 0
};

// ==================== DOM 元素 ====================

const uploadArea = document.getElementById('uploadArea') as HTMLDivElement;
const selectFilesBtn = document.getElementById('selectFiles') as HTMLButtonElement;
const selectFolderBtn = document.getElementById('selectFolder') as HTMLButtonElement;
const pasteBtn = document.getElementById('pasteBtn') as HTMLButtonElement;
const fileList = document.getElementById('fileList') as HTMLDivElement;
const qualitySlider = document.getElementById('quality') as HTMLInputElement;
const qualityValue = document.getElementById('qualityValue') as HTMLSpanElement;
const formatSelect = document.getElementById('format') as HTMLSelectElement;
const targetSizeInput = document.getElementById('targetSize') as HTMLInputElement;
const outputDirInput = document.getElementById('outputDir') as HTMLInputElement;
const selectOutputDirBtn = document.getElementById('selectOutputDirBtn') as HTMLButtonElement;
const compressBtn = document.getElementById('compressBtn') as HTMLButtonElement;
const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
const progressBar = document.getElementById('progressBar') as HTMLDivElement;
const totalFilesSpan = document.getElementById('totalFiles') as HTMLSpanElement;
const compressedFilesSpan = document.getElementById('compressedFiles') as HTMLSpanElement;
const originalSizeSpan = document.getElementById('originalSize') as HTMLSpanElement;
const compressedSizeSpan = document.getElementById('compressedSize') as HTMLSpanElement;
const savedSizeSpan = document.getElementById('savedSize') as HTMLSpanElement;

// ==================== 图片压缩核心功能 ====================

/**
 * 使用 browser-image-compression 压缩图片并保存
 */
async function compressAndSaveImage(fileInfo: FileInfo, options: CompressOptions): Promise<CompressResult> {
  try {
    // 从 base64 创建 Blob
    const base64Response = await fetch(fileInfo.base64 || '');
    const blob = await base64Response.blob();

    // 转换为 File 对象
    const file = new File([blob], fileInfo.name, { type: blob.type });

    // 确定输出格式
    let format = options.format === 'original' ? fileInfo.format : options.format;
    if (format === 'png' && options.format === 'original') {
      format = 'jpeg';
    }

    // 配置压缩选项
    const compressionOptions = {
      maxSizeMB: options.targetSize ? options.targetSize / 1024 : 100,
      maxWidthOrHeight: undefined,
      useWebWorker: true,
      fileType: `image/${format}`,
      initialQuality: options.quality / 100
    };

    // 执行压缩
    const compressedFile = await imageCompression(file, compressionOptions);

    // 转换为 base64
    const reader = new FileReader();
    const compressedBase64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(compressedFile);
    });

    // 保存文件（如果有输出目录，使用输出目录；否则保存到原文件所在目录）
    const saveResult = await imageCompressorAPI.saveImage(
      fileInfo.path,
      compressedBase64,
      format,
      outputDirectory || undefined
    );

    if (!saveResult.success) {
      return {
        success: false,
        originalSize: fileInfo.size,
        compressedSize: 0,
        savedSize: 0,
        savedPercent: 0,
        error: saveResult.error || '保存失败'
      };
    }

    const compressedSize = compressedFile.size;
    const savedSize = fileInfo.size - compressedSize;
    const savedPercent = Math.round((savedSize / fileInfo.size) * 100);

    return {
      success: true,
      originalSize: fileInfo.size,
      compressedSize,
      savedSize,
      savedPercent
    };
  } catch (error: any) {
    return {
      success: false,
      originalSize: fileInfo.size,
      compressedSize: 0,
      savedSize: 0,
      savedPercent: 0,
      error: error.message || '压缩失败'
    };
  }
}

// ==================== UI 更新函数 ====================

/**
 * 更新文件列表
 */
function updateFileList() {
  if (selectedFiles.length === 0) {
    fileList.innerHTML = `
      <div class="text-center text-gray-400 py-8">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p>暂无文件，请选择或拖拽图片</p>
      </div>
    `;
    return;
  }

  fileList.innerHTML = selectedFiles.map(file => `
    <div class="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors">
      <div class="flex items-center flex-1 min-w-0">
        <img src="${file.base64}" alt="${file.name}" class="w-12 h-12 object-cover rounded mr-3" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">${file.name}</p>
          <p class="text-xs text-gray-500">${imageCompressorAPI.formatFileSize(file.size)} • ${file.format.toUpperCase()}</p>
        </div>
      </div>
      <button 
        onclick="window.removeFile('${file.id}')"
        class="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  `).join('');
}

/**
 * 更新统计信息
 */
function updateStats() {
  totalFilesSpan.textContent = stats.totalFiles.toString();
  compressedFilesSpan.textContent = stats.compressed.toString();
  originalSizeSpan.textContent = imageCompressorAPI.formatFileSize(stats.originalTotalSize || 0);
  compressedSizeSpan.textContent = imageCompressorAPI.formatFileSize(stats.compressedTotalSize || 0);

  // 安全处理节省空间显示
  const savedSize = Math.max(0, stats.savedTotalSize || 0);
  const savedPercent = Math.max(0, stats.savedPercent || 0);

  if (savedSize > 0) {
    savedSizeSpan.textContent = `${imageCompressorAPI.formatFileSize(savedSize)} (${savedPercent}%)`;
  } else if (stats.compressedTotalSize > stats.originalTotalSize) {
    // 压缩后反而变大的情况
    const increased = stats.compressedTotalSize - stats.originalTotalSize;
    const increasePercent = stats.originalTotalSize > 0
      ? Math.round((increased / stats.originalTotalSize) * 100)
      : 0;
    savedSizeSpan.textContent = `+${imageCompressorAPI.formatFileSize(increased)} (+${increasePercent}%)`;
  } else {
    savedSizeSpan.textContent = '0 B (0%)';
  }

  // 更新进度条
  const progress = stats.totalFiles > 0 ? (stats.compressed / stats.totalFiles) * 100 : 0;
  progressBar.style.width = `${progress}%`;
}

/**
 * 添加文件
 */
function addFiles(files: FileInfo[]) {
  selectedFiles = [...selectedFiles, ...files];
  stats.totalFiles = selectedFiles.length;
  stats.originalTotalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
  updateFileList();
  updateStats();
}

/**
 * 删除文件
 */
(window as any).removeFile = (fileId: string) => {
  selectedFiles = selectedFiles.filter(f => f.id !== fileId);
  stats.totalFiles = selectedFiles.length;
  stats.originalTotalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  // 重新计算压缩统计
  if (stats.compressed > stats.totalFiles) {
    stats.compressed = 0;
    stats.compressedTotalSize = 0;
    stats.savedTotalSize = 0;
    stats.savedPercent = 0;
  }

  updateFileList();
  updateStats();
};

// ==================== 事件处理 ====================

/**
 * 选择文件
 */
selectFilesBtn.addEventListener('click', async () => {
  const files = await imageCompressorAPI.selectFiles();
  if (files.length > 0) {
    addFiles(files);
  }
});

/**
 * 选择文件夹
 */
selectFolderBtn.addEventListener('click', async () => {
  const files = await imageCompressorAPI.selectFolder();
  if (files.length > 0) {
    addFiles(files);
  }
});

/**
 * 粘贴剪贴板图片
 */
async function pasteFromClipboard() {
  const file = await imageCompressorAPI.pasteFromClipboard();
  if (file) {
    addFiles([file]);
    showNotification('已从剪贴板添加图片', 'success');
  } else {
    showNotification('剪贴板中没有图片', 'warning');
  }
}

pasteBtn.addEventListener('click', pasteFromClipboard);

/**
 * 监听全局键盘事件 Ctrl+V
 */
document.addEventListener('keydown', async (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
    e.preventDefault();
    await pasteFromClipboard();
  }
});

/**
 * 点击上传区域触发文件选择
 */
uploadArea.addEventListener('click', async (e) => {
  // 避免点击按钮时重复触发
  if ((e.target as HTMLElement).tagName === 'BUTTON') {
    return;
  }

  const files = await imageCompressorAPI.selectFiles();
  if (files.length > 0) {
    addFiles(files);
  }
});

/**
 * 拖拽上传
 */
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('border-blue-500', 'bg-blue-50');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('border-blue-500', 'bg-blue-50');
});

uploadArea.addEventListener('drop', async (e) => {
  e.preventDefault();
  uploadArea.classList.remove('border-blue-500', 'bg-blue-50');

  const files = Array.from(e.dataTransfer?.files || []);
  const imageFiles: FileInfo[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const validExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'];

    if (validExts.includes(ext)) {
      const reader = new FileReader();

      await new Promise<void>((resolve) => {
        reader.onload = (event) => {
          imageFiles.push({
            id: `${Date.now()}_${i}`,
            name: file.name,
            path: (file as any).path || file.name,
            size: file.size,
            format: ext,
            base64: event.target?.result as string
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
  }

  if (imageFiles.length > 0) {
    addFiles(imageFiles);
  }
});

/**
 * 质量滑块
 */
qualitySlider.addEventListener('input', () => {
  const value = qualitySlider.value;
  qualityValue.textContent = value;
  compressOptions.quality = parseInt(value);
});

/**
 * 格式选择
 */
formatSelect.addEventListener('change', () => {
  compressOptions.format = formatSelect.value as any;
});

/**
 * 目标大小
 */
targetSizeInput.addEventListener('input', () => {
  const value = parseInt(targetSizeInput.value) || 0;
  compressOptions.targetSize = value > 0 ? value : undefined;
});

/**
 * 选择输出目录
 */
selectOutputDirBtn.addEventListener('click', async () => {
  const dir = await imageCompressorAPI.selectOutputDirectory();
  if (dir) {
    outputDirectory = dir;
    outputDirInput.value = dir;
    showNotification(`输出目录已设置: ${dir}`, 'success');
  }
});

/**
 * 开始压缩
 */
compressBtn.addEventListener('click', async () => {
  if (selectedFiles.length === 0) {
    showNotification('请先选择图片文件', 'warning');
    return;
  }

  compressBtn.disabled = true;
  compressBtn.textContent = '压缩中...';

  // 检查是否有 PNG 文件且格式为保持原格式
  const hasPNG = selectedFiles.some(f => f.format === 'png') && compressOptions.format === 'original';
  if (hasPNG) {
    showNotification('检测到 PNG 格式，将自动转换为 JPEG 以实现有效压缩', 'info', 4000);
  }

  // 重置统计
  stats.compressed = 0;
  stats.compressedTotalSize = 0;
  stats.savedTotalSize = 0;

  for (const file of selectedFiles) {
    // 压缩并保存图片
    const result = await compressAndSaveImage(file, compressOptions);

    if (result.success) {
      stats.compressed++;
      stats.compressedTotalSize += result.compressedSize;
      stats.savedTotalSize += result.savedSize;
    } else {
      console.error(`压缩失败: ${file.name}`, result.error);
      showNotification(`压缩失败: ${file.name}`, 'error');
    }

    updateStats();
  }

  // 重新计算节省百分比
  stats.savedPercent = stats.originalTotalSize > 0
    ? Math.round((stats.savedTotalSize / stats.originalTotalSize) * 100)
    : 0;

  updateStats();
  compressBtn.disabled = false;
  compressBtn.textContent = '开始压缩';

  // 压缩完成提示
  if (stats.compressed > 0) {
    const savedSize = imageCompressorAPI.formatFileSize(Math.max(0, stats.savedTotalSize));
    const percentText = stats.savedPercent >= 0 ? `${stats.savedPercent}%` : '0%';
    showNotification(
      `压缩完成！处理了 ${stats.compressed} 个文件，节省空间: ${savedSize} (${percentText})`,
      'success',
      5000
    );
  } else if (stats.compressed === 0 && selectedFiles.length > 0) {
    showNotification('所有文件压缩失败', 'error');
  }
});

/**
 * 清空列表
 */
clearBtn.addEventListener('click', () => {
  selectedFiles = [];
  stats = {
    totalFiles: 0,
    compressed: 0,
    originalTotalSize: 0,
    compressedTotalSize: 0,
    savedTotalSize: 0,
    savedPercent: 0
  };
  updateFileList();
  updateStats();
});

// ==================== 初始化 ====================

/**
 * 初始化应用
 */
async function initApp() {
  console.log('图片压缩工具初始化...');

  // 设置默认输出目录为下载目录
  try {
    const downloadDir = await imageCompressorAPI.getDownloadDirectory();
    if (downloadDir) {
      outputDirectory = downloadDir;
      outputDirInput.value = downloadDir;
      outputDirInput.placeholder = downloadDir;
    }
  } catch (error) {
    console.error('获取下载目录失败:', error);
  }

  updateFileList();
  updateStats();
  console.log('图片压缩工具初始化完成');
}

// 等待 DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}



// ==================== 外部触发处理 ====================

/**
 * 处理外部触发的图片压缩功能
 * 当用户通过拖拽或其他方式触发 compress-from-image 功能时
 */
naimo.onEnter(async (params) => {
  try {
    console.log('图片压缩功能被触发', params);

    // 1. 参数验证
    if (!params || !params.files || params.files.length === 0) {
      // showNotification('未检测到图片文件', 'warning');
      naimo.log.warn('onEnter: 参数无效或没有文件', params);
      return;
    }

    // 2. 过滤有效的图片文件
    const validExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'];
    const imageFiles: FileInfo[] = [];

    for (let i = 0; i < params.files.length; i++) {
      const file = params.files[i];

      // 获取文件扩展名
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      // 验证是否为图片格式
      if (!validExts.includes(ext)) {
        showNotification(`不支持的文件格式: ${file.name}`, 'warning');
        continue;
      }

      // 3. 读取图片为 base64
      try {
        const base64Data = await naimo.system.getLocalImage(file.path);

        // 确保 base64 数据有正确的 data URI 前缀
        let finalBase64 = base64Data;
        if (!base64Data.startsWith('data:image/')) {
          // 如果没有前缀，添加一个
          const mimeType = imageCompressorAPI.getMimeType(ext);
          finalBase64 = `data:${mimeType};base64,${base64Data}`;
        }

        imageFiles.push({
          id: `${Date.now()}_${i}`,
          name: file.name,
          path: file.path,
          size: file.size,
          format: ext,
          base64: finalBase64
        });
      } catch (error) {
        console.error(`读取图片失败: ${file.name}`, error);
        showNotification(`读取图片失败: ${file.name}`, 'error');
      }
    }

    // 4. 添加到文件列表
    if (imageFiles.length > 0) {
      addFiles(imageFiles);
      showNotification(
        `成功添加 ${imageFiles.length} 张图片`,
        'success'
      );
      naimo.log.info(`添加了 ${imageFiles.length} 张图片到压缩列表`);
    } else {
      showNotification('没有可用的图片文件', 'warning');
    }

  } catch (error: any) {
    console.error('处理图片失败:', error);
    showNotification('处理图片失败', 'error');
    naimo.log.error('onEnter 处理失败', error);
  }
});
