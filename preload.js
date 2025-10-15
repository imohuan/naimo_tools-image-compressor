"use strict";
const electron = require("electron");
const fs = require("fs");
const path = require("path");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
async function selectFiles() {
  try {
    const result = await naimo.dialog.showOpen({
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "图片", extensions: ["jpg", "jpeg", "png", "webp", "gif", "bmp"] }
      ]
    });
    if (!result || result.length === 0) {
      return [];
    }
    return result.map((filePath, index) => {
      const stats = fs__namespace.statSync(filePath);
      const ext = path__namespace.extname(filePath).slice(1).toLowerCase();
      const buffer = fs__namespace.readFileSync(filePath);
      const base64 = buffer.toString("base64");
      const mimeType = getMimeType(ext);
      return {
        id: `${Date.now()}_${index}`,
        name: path__namespace.basename(filePath),
        path: filePath,
        size: stats.size,
        format: ext,
        base64: `data:${mimeType};base64,${base64}`
      };
    });
  } catch (error) {
    console.error("选择文件失败:", error);
    return [];
  }
}
async function selectFolder() {
  try {
    let scanDir2 = function(dirPath) {
      const items = fs__namespace.readdirSync(dirPath);
      for (const item of items) {
        const fullPath = path__namespace.join(dirPath, item);
        const stats = fs__namespace.statSync(fullPath);
        if (stats.isDirectory()) {
          scanDir2(fullPath);
        } else {
          const ext = path__namespace.extname(fullPath).slice(1).toLowerCase();
          if (imageExts.includes(ext)) {
            const buffer = fs__namespace.readFileSync(fullPath);
            const base64 = buffer.toString("base64");
            const mimeType = getMimeType(ext);
            files.push({
              id: `${Date.now()}_${files.length}`,
              name: path__namespace.basename(fullPath),
              path: fullPath,
              size: stats.size,
              format: ext,
              base64: `data:${mimeType};base64,${base64}`
            });
          }
        }
      }
    };
    var scanDir = scanDir2;
    const result = await naimo.dialog.showOpen({
      properties: ["openDirectory"]
    });
    if (!result || result.length === 0) {
      return [];
    }
    const folderPath = result[0];
    const files = [];
    const imageExts = ["jpg", "jpeg", "png", "webp", "gif", "bmp"];
    scanDir2(folderPath);
    return files;
  } catch (error) {
    console.error("选择文件夹失败:", error);
    return [];
  }
}
async function saveImage(originalPath, base64Data, format, outputDir) {
  try {
    const base64Match = base64Data.match(/^data:image\/\w+;base64,(.+)$/);
    if (!base64Match) {
      throw new Error("无效的 base64 数据");
    }
    const base64 = base64Match[1];
    const buffer = Buffer.from(base64, "base64");
    const name = path__namespace.basename(originalPath, path__namespace.extname(originalPath));
    let targetDir = outputDir;
    if (!targetDir) {
      targetDir = path__namespace.dirname(originalPath);
    }
    if (!fs__namespace.existsSync(targetDir)) {
      fs__namespace.mkdirSync(targetDir, { recursive: true });
    }
    const now = /* @__PURE__ */ new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const outputPath = path__namespace.join(targetDir, `${name}_compressed_${timestamp}.${format}`);
    fs__namespace.writeFileSync(outputPath, buffer);
    return {
      success: true,
      path: outputPath
    };
  } catch (error) {
    console.error("保存文件失败:", error);
    return {
      success: false,
      error: error.message || "未知错误"
    };
  }
}
async function selectOutputDirectory() {
  try {
    const result = await naimo.dialog.showOpen({
      properties: ["openDirectory", "createDirectory"]
    });
    if (!result || result.length === 0) {
      return null;
    }
    return result[0];
  } catch (error) {
    console.error("选择输出目录失败:", error);
    return null;
  }
}
async function getDownloadDirectory() {
  try {
    return await naimo.system.getPath("downloads");
  } catch (error) {
    console.error("获取下载目录失败:", error);
    return "";
  }
}
function getMimeType(ext) {
  const mimeTypes = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "gif": "image/gif",
    "bmp": "image/bmp"
  };
  return mimeTypes[ext.toLowerCase()] || "image/jpeg";
}
function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}
async function openFolder(filePath) {
  try {
    await naimo.shell.showInFolder(filePath);
  } catch (error) {
    console.error("打开文件夹失败:", error);
  }
}
async function pasteFromClipboard() {
  try {
    const hasImage = await naimo.clipboard.hasImage();
    if (!hasImage) {
      return null;
    }
    const base64 = await naimo.clipboard.readImage();
    if (!base64) {
      return null;
    }
    const estimatedSize = Math.round((base64.length - 22) * 0.75);
    return {
      id: `clipboard_${Date.now()}`,
      name: `clipboard_${Date.now()}.png`,
      path: "clipboard",
      size: estimatedSize,
      format: "png",
      base64
    };
  } catch (error) {
    console.error("粘贴剪贴板图片失败:", error);
    return null;
  }
}
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
electron.contextBridge.exposeInMainWorld("imageCompressorAPI", imageCompressorAPI);
const handlers = {
  compress: {
    onEnter: async (params) => {
      console.log("图片压缩功能被触发");
      console.log("参数:", params);
      if (typeof window !== "undefined" && window.naimo) {
        window.naimo.log.info("图片压缩工具已加载", { params });
      }
    }
  }
};
if (typeof module !== "undefined" && module.exports) {
  module.exports = handlers;
}
window.addEventListener("DOMContentLoaded", () => {
  console.log("图片压缩工具 Preload 脚本已初始化");
});
