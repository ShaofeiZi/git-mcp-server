/**
 * History Resources
 * 历史资源
 * ================
 *
 * MCP resources for exposing Git commit history and related information.
 * 用于公开 Git 提交历史和相关信息的 MCP 资源。
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
 *               - 要转换为字符串的值
 * @returns A string representation of the value
 *          值的字符串表示
 */
function ensureString(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Registers history resources with the MCP server
 * 向 MCP 服务器注册历史资源
 *
 * @param server - MCP server instance
 *                - MCP 服务器实例
 * @param resourceDescriptors - Resource descriptors for metadata
 *                            - 用于元数据的资源描述符
 */
export function setupHistoryResources(
  server: McpServer,
  resourceDescriptors: any
): void {
  // Commit log resource
  // 提交日志资源
  server.resource(
    "commit-log",
    new ResourceTemplate(
      "git://repo/{repoPath}/log?maxCount={maxCount}&file={file}",
      { list: undefined }
    ),
    {
      name: "Commit History",
      description:
        "Returns the commit history log with author, date, and message details",
      mimeType: "application/json",
    },
    // Returns the commit history for a repository with optional file path filter and commit count limit
    // 返回仓库的提交历史，可选择文件路径过滤器和提交计数限制
    async (uri, variables) => {
      try {
        // Handle variables which might be arrays
        // 处理可能是数组的变量
        const repoPathStr = ensureString(variables.repoPath);
        const maxCountStr = variables.maxCount
          ? ensureString(variables.maxCount)
          : "50";
        const fileStr = variables.file
          ? ensureString(variables.file)
          : undefined;

        // Normalize paths
        // 规范化路径
        const normalizedRepoPath = PathValidation.normalizePath(
          decodeURIComponent(repoPathStr)
        );

        // Parse max count
        // 解析最大计数
        const maxCount = parseInt(maxCountStr, 10);

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
                    maxCount: isNaN(maxCount) ? undefined : maxCount,
                    file: fileStr,
                  },
                  null,
                  2
                ),
                mimeType: "application/json",
              },
            ],
          };
        }

        // Get commit log
        // 获取提交日志
        const logResult = await gitService.getLog({
          maxCount: isNaN(maxCount) ? 50 : maxCount,
          file: fileStr,
        });

        if (!logResult.resultSuccessful) {
          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(
                  {
                    error: logResult.resultError.errorMessage,
                    repoPath: normalizedRepoPath,
                    maxCount: isNaN(maxCount) ? undefined : maxCount,
                    file: fileStr,
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
                  maxCount: isNaN(maxCount) ? 50 : maxCount,
                  file: fileStr,
                  commits: logResult.resultData,
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
                  maxCount: variables.maxCount
                    ? parseInt(ensureString(variables.maxCount), 10)
                    : 50,
                  file: variables.file
                    ? ensureString(variables.file)
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

  // File blame resource
  // 文件责备资源
  server.resource(
    "file-blame",
    new ResourceTemplate("git://repo/{repoPath}/blame/{filePath}", {
      list: undefined,
    }),
    {
      name: "File Blame",
      description:
        "Returns line-by-line attribution showing which commit last modified each line",
      mimeType: "text/plain",
    },
    // Returns the blame information showing which commit last modified each line of a file
    // 返回显示哪个提交最后修改文件每行的责备信息
    async (uri, variables) => {
      try {
        // Handle variables which might be arrays
        // 处理可能是数组的变量
        const repoPathStr = ensureString(variables.repoPath);
        const filePathStr = ensureString(variables.filePath);

        // Normalize paths
        // 规范化路径
        const normalizedRepoPath = PathValidation.normalizePath(
          decodeURIComponent(repoPathStr)
        );
        const normalizedFilePath = PathValidation.normalizePath(
          decodeURIComponent(filePathStr)
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
                    filePath: normalizedFilePath,
                  },
                  null,
                  2
                ),
                mimeType: "application/json",
              },
            ],
          };
        }

        // Get blame information
        // 获取责备信息
        const blameResult = await gitService.getBlame(normalizedFilePath);

        if (!blameResult.resultSuccessful) {
          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(
                  {
                    error: blameResult.resultError.errorMessage,
                    repoPath: normalizedRepoPath,
                    filePath: normalizedFilePath,
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
              text: blameResult.resultData,
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
                  filePath: ensureString(variables.filePath),
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

  // Commit show resource
  // 提交显示资源
  server.resource(
    "commit-show",
    new ResourceTemplate("git://repo/{repoPath}/commit/{commitHash}", {
      list: undefined,
    }),
    {
      name: "Commit Details",
      description:
        "Returns detailed information about a specific commit including diff changes",
      mimeType: "text/plain",
    },
    // Returns detailed information about a specific commit
    // 返回关于特定提交的详细信息
    async (uri, variables) => {
      try {
        // Handle variables which might be arrays
        // 处理可能是数组的变量
        const repoPathStr = ensureString(variables.repoPath);
        const commitHashStr = ensureString(variables.commitHash);

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
                    commitHash: commitHashStr,
                  },
                  null,
                  2
                ),
                mimeType: "application/json",
              },
            ],
          };
        }

        // Get commit information
        // 获取提交信息
        const commitResult = await gitService.showCommit(commitHashStr);

        if (!commitResult.resultSuccessful) {
          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(
                  {
                    error: commitResult.resultError.errorMessage,
                    repoPath: normalizedRepoPath,
                    commitHash: commitHashStr,
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
              text: commitResult.resultData,
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
                  commitHash: ensureString(variables.commitHash),
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
