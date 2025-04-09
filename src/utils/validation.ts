/**
 * Validation Utilities
 * 验证工具
 * ===================
 *
 * Utilities for validating input parameters using Zod.
 * 使用 Zod 验证输入参数的实用工具。
 */

import { z } from "zod";
import path from "path";
import { getGlobalSettings } from "./global-settings.js";

/**
 * Common validation schemas used throughout the server
 * 服务器中使用的通用验证模式
 */
export const Schemas = {
  /**
   * Repository path validation
   * 仓库路径验证
   */
  repoPath: z
    .string()
    .min(1, "Repository path is required")
    .transform((val) => path.normalize(val)),

  /**
   * Commit validation
   * 提交验证
   */
  commit: {
    hash: z.string().regex(/^[0-9a-f]{4,40}$/, "Invalid commit hash format"),
    message: z.string().min(1, "Commit message is required"),
    author: z
      .object({
        name: z.string().optional(),
        email: z.string().email("Invalid email format").optional(),
      })
      .optional(),
    date: z.date().optional(),
    allowEmpty: z.boolean().optional().default(false),
    amend: z.boolean().optional().default(false),
  },

  /**
   * Branch validation
   * 分支验证
   */
  branch: {
    name: z
      .string()
      .min(1, "Branch name is required")
      .regex(/^[^\s]+$/, "Branch name cannot contain spaces"),
    checkout: z.boolean().optional().default(false),
    startPoint: z.string().optional(),
  },

  /**
   * Remote validation
   * 远程验证
   */
  remote: {
    name: z.string().min(1, "Remote name is required"),
    url: z.string().url("Invalid URL format"),
    branch: z.string().optional(),
  },

  /**
   * File validation
   * 文件验证
   */
  file: {
    path: z.string().min(1, "File path is required"),
    ref: z.string().optional().default("HEAD"),
  },

  /**
   * Diff validation
   * 差异验证
   */
  diff: {
    fromRef: z.string().min(1, "Source reference is required"),
    toRef: z.string().optional().default("HEAD"),
    path: z.string().optional(),
  },

  /**
   * Tag validation
   * 标签验证
   */
  tag: {
    name: z.string().min(1, "Tag name is required"),
    message: z.string().optional(),
    ref: z.string().optional(),
  },
};

/**
 * Path validation helper functions
 * 路径验证辅助函数
 */
export const PathValidation = {
  /**
   * Normalizes a path to ensure consistent format
   * 规范化路径以确保一致的格式
   * If path is "." and a global working directory is set, uses the global directory instead
   * 如果路径是"."并且设置了全局工作目录，则使用全局目录
   */
  normalizePath(inputPath: string): string {
    // Check if this is a relative path (like ".") and we have a global working dir set
    // 检查这是否是相对路径（如"."）并且我们设置了全局工作目录
    if (inputPath === ".") {
      const globalWorkingDir = getGlobalSettings().globalWorkingDir;
      if (globalWorkingDir) {
        return path.normalize(globalWorkingDir);
      }
    }
    return path.normalize(inputPath);
  },

  /**
   * Validates if a path is within the allowed directory
   * 验证路径是否在允许的目录内
   */
  isWithinDirectory(targetPath: string, basePath: string): boolean {
    const normalizedTarget = path.normalize(targetPath);
    const normalizedBase = path.normalize(basePath);

    return (
      normalizedTarget.startsWith(normalizedBase) &&
      normalizedTarget.length >= normalizedBase.length
    );
  },

  /**
   * Joins and normalizes path components
   * 连接并规范化路径组件
   */
  joinPaths(...pathComponents: string[]): string {
    return path.normalize(path.join(...pathComponents));
  },
};
