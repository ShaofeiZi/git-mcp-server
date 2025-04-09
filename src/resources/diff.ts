/**
 * Diff Resources
 * =============
 *
 * MCP resources for exposing Git diff information.
 * MCP 资源，用于暴露 Git 差异信息。
 */

import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { GitService } from "../services/git-service.js";
import { Schemas, PathValidation } from "../utils/validation.js";

/**
 * Helper function to ensure a variable is treated as a string
 * 辅助函数，确保变量被视为字符串
 *
 * @param value - The value to convert to string
 * @param value - 要转换为字符串的值
 * @returns A string representation of the value
 * @returns 值的字符串表示
 */
function ensureString(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Registers diff resources with the MCP server
 * 向 MCP 服务器注册差异资源
 *
 * @param server - MCP server instance
 * @param server - MCP 服务器实例
 * @param resourceDescriptors - Resource descriptors for metadata
 * @param resourceDescriptors - 用于元数据的资源描述符
 */
export function setupDiffResources(
  server: McpServer,
  resourceDescriptors: any
): void {
  // Diff between two refs
  // 两个引用之间的差异
  server.resource(
    "diff-refs",
    new ResourceTemplate(
      "git://repo/{repoPath}/diff/{fromRef}/{toRef}?path={path}",
      { list: undefined }
    ),
    {
      name: "Reference Diff",
      description:
        "Returns a diff between two Git references (commits, branches, tags)",
      mimeType: "application/json", // Corrected MIME type
    },
    // Returns a diff between two references (branches, tags, or commits) with optional path filter
    // 返回两个引用（分支、标签或提交）之间的差异，可选择路径过滤
    async (uri, variables) => {
      try {
        // Handle variables which might be arrays
        // 处理可能是数组的变量
        const repoPathStr = ensureString(variables.repoPath);
        const fromRefStr = ensureString(variables.fromRef);
        const toRefStr = variables.toRef
          ? ensureString(variables.toRef)
          : "HEAD";
        const pathStr = variables.path
          ? ensureString(variables.path)
          : undefined;

        // Normalize paths
        // 规范化路径
        const normalizedRepoPath = PathValidation.normalizePath(
          decodeURIComponent(repoPathStr)
        );

        const gitService = new GitService(normalizedRepoPath);

        // Check if the path is a Git repository
        // 检查路径是否为 Git 仓库
        const isRepo = await gitService.isGitRepository();

        if (!isRepo) {
          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(
                  {
                    error: "Not a Git repository",
                    repoPath: normalizedRepoPath,
                    fromRef: fromRefStr,
                    toRef: toRefStr,
                    path: pathStr,
                  },
                  null,
                  2
                ),
                mimeType: "application/json",
              },
            ],
          };
        }

        // Get diff
        // 获取差异
        const diffResult = await gitService.getDiff(
          fromRefStr,
          toRefStr,
          pathStr
        );

        if (!diffResult.resultSuccessful) {
          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(
                  {
                    error: diffResult.resultError.errorMessage,
                    repoPath: normalizedRepoPath,
                    fromRef: fromRefStr,
                    toRef: toRefStr,
                    path: pathStr,
                  },
                  null,
                  2
                ),
                mimeType: "application/json",
              },
            ],
          };
        }

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  repoPath: normalizedRepoPath,
                  fromRef: fromRefStr,
                  toRef: toRefStr,
                  path: pathStr,
                  diff: diffResult.resultData,
                },
                null,
                2
              ),
              mimeType: "application/json",
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  error: error instanceof Error ? error.message : String(error),
                  repoPath: ensureString(variables.repoPath),
                  fromRef: ensureString(variables.fromRef),
                  toRef: variables.toRef
                    ? ensureString(variables.toRef)
                    : "HEAD",
                  path: variables.path
                    ? ensureString(variables.path)
                    : undefined,
                },
                null,
                2
              ),
              mimeType: "application/json",
            },
          ],
        };
      }
    }
  );

  // Diff in working directory (unstaged changes)
  // 工作目录中的差异（未暂存的更改）
  server.resource(
    "diff-unstaged",
    new ResourceTemplate("git://repo/{repoPath}/diff-unstaged?path={path}", {
      list: undefined,
    }),
    {
      name: "Unstaged Changes Diff",
      description:
        "Returns a diff of all unstaged changes in the working directory",
      mimeType: "text/plain",
    },
    // Returns a diff of all unstaged changes (between working directory and index) with optional path filter
    // 返回所有未暂存更改的差异（工作目录和索引之间），可选择路径过滤
    async (uri, variables) => {
      try {
        // Handle variables which might be arrays
        // 处理可能是数组的变量
        const repoPathStr = ensureString(variables.repoPath);
        const pathStr = variables.path
          ? ensureString(variables.path)
          : undefined;

        // Normalize paths
        // 规范化路径
        const normalizedRepoPath = PathValidation.normalizePath(
          decodeURIComponent(repoPathStr)
        );

        const gitService = new GitService(normalizedRepoPath);

        // Check if the path is a Git repository
        // 检查路径是否为 Git 仓库
        const isRepo = await gitService.isGitRepository();

        if (!isRepo) {
          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(
                  {
                    error: "Not a Git repository",
                    repoPath: normalizedRepoPath,
                    path: pathStr,
                  },
                  null,
                  2
                ),
                mimeType: "application/json",
              },
            ],
          };
        }

        // Get unstaged diff
        // 获取未暂存的差异
        const diffResult = await gitService.getUnstagedDiff(pathStr);

        if (!diffResult.resultSuccessful) {
          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(
                  {
                    error: diffResult.resultError.errorMessage,
                    repoPath: normalizedRepoPath,
                    path: pathStr,
                  },
                  null,
                  2
                ),
                mimeType: "application/json",
              },
            ],
          };
        }

        return {
          contents: [
            {
              uri: uri.href,
              text: diffResult.resultData,
              mimeType: "text/plain",
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  error: error instanceof Error ? error.message : String(error),
                  repoPath: ensureString(variables.repoPath),
                  path: variables.path
                    ? ensureString(variables.path)
                    : undefined,
                },
                null,
                2
              ),
              mimeType: "application/json",
            },
          ],
        };
      }
    }
  );

  // Diff staged changes
  // 已暂存更改的差异
  server.resource(
    "diff-staged",
    new ResourceTemplate("git://repo/{repoPath}/diff-staged?path={path}", {
      list: undefined,
    }),
    {
      name: "Staged Changes Diff",
      description: "Returns a diff of all staged changes in the index",
      mimeType: "text/plain",
    },
    // Returns a diff of all staged changes (between index and HEAD) with optional path filter
    // 返回所有已暂存更改的差异（索引和 HEAD 之间），可选择路径过滤
    async (uri, variables) => {
      try {
        // Handle variables which might be arrays
        // 处理可能是数组的变量
        const repoPathStr = ensureString(variables.repoPath);
        const pathStr = variables.path
          ? ensureString(variables.path)
          : undefined;

        // Normalize paths
        // 规范化路径
        const normalizedRepoPath = PathValidation.normalizePath(
          decodeURIComponent(repoPathStr)
        );

        const gitService = new GitService(normalizedRepoPath);

        // Check if the path is a Git repository
        // 检查路径是否为 Git 仓库
        const isRepo = await gitService.isGitRepository();

        if (!isRepo) {
          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(
                  {
                    error: "Not a Git repository",
                    repoPath: normalizedRepoPath,
                    path: pathStr,
                  },
                  null,
                  2
                ),
                mimeType: "application/json",
              },
            ],
          };
        }

        // Get staged diff
        // 获取已暂存的差异
        const diffResult = await gitService.getStagedDiff(pathStr);

        if (!diffResult.resultSuccessful) {
          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(
                  {
                    error: diffResult.resultError.errorMessage,
                    repoPath: normalizedRepoPath,
                    path: pathStr,
                  },
                  null,
                  2
                ),
                mimeType: "application/json",
              },
            ],
          };
        }

        return {
          contents: [
            {
              uri: uri.href,
              text: diffResult.resultData,
              mimeType: "text/plain",
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  error: error instanceof Error ? error.message : String(error),
                  repoPath: ensureString(variables.repoPath),
                  path: variables.path
                    ? ensureString(variables.path)
                    : undefined,
                },
                null,
                2
              ),
              mimeType: "application/json",
            },
          ],
        };
      }
    }
  );
}
