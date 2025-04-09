/**
 * Global Settings Utility
 * 全局设置工具
 * ======================
 *
 * Provides global settings for the Git MCP server, including security configurations.
 * 为 Git MCP 服务器提供全局设置，包括安全配置。
 * These settings can be used across different tools and services.
 * 这些设置可以在不同的工具和服务之间使用。
 */

import path from "path";

/**
 * Global settings singleton for storing app-wide configuration
 * 全局设置单例，用于存储应用程序范围的配置
 */
export class GlobalSettings {
  private static instance: GlobalSettings;
  private _globalWorkingDir: string | null = null;
  private _allowedBaseDir: string;

  /**
   * Private constructor to enforce singleton pattern and validate required settings
   * 私有构造函数，强制使用单例模式并验证所需的设置
   */
  private constructor() {
    // Validate and set the allowed base directory from environment variable
    // 验证并设置来自环境变量的允许基本目录
    const baseDir = process.env.GIT_MCP_BASE_DIR;
    if (!baseDir) {
      throw new Error(
        "FATAL: GIT_MCP_BASE_DIR environment variable is not set. Server cannot operate securely without a defined base directory."
      );
    }
    // Normalize the base directory path
    // 规范化基本目录路径
    this._allowedBaseDir = path.resolve(baseDir);
    console.log(
      `[GlobalSettings] Allowed base directory set to: ${this._allowedBaseDir}`
    );
  }

  /**
   * Get the singleton instance
   * 获取单例实例
   */
  public static getInstance(): GlobalSettings {
    if (!GlobalSettings.instance) {
      GlobalSettings.instance = new GlobalSettings();
    }
    return GlobalSettings.instance;
  }

  /**
   * Get the global working directory if set
   * 获取全局工作目录（如果已设置）
   */
  public get globalWorkingDir(): string | null {
    return this._globalWorkingDir;
  }

  /**
   * Get the allowed base directory for sandboxing repository access
   * 获取用于沙箱仓库访问的允许基本目录
   */
  public get allowedBaseDir(): string {
    return this._allowedBaseDir;
  }

  /**
   * Set the global working directory
   * 设置全局工作目录
   *
   * @param path - Path to use as global working directory
   *             - 用作全局工作目录的路径
   */
  public setGlobalWorkingDir(path: string | null): void {
    this._globalWorkingDir = path;
  }
}

/**
 * Helper function to get global settings instance
 * 获取全局设置实例的辅助函数
 */
export function getGlobalSettings(): GlobalSettings {
  return GlobalSettings.getInstance();
}
