/**
 * Repository Resources
 * ===================
 *
 * MCP resources for exposing Git repository information.
 * MCP 资源，用于暴露 Git 仓库信息。
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
 * Registers repository resources with the MCP server
 * 向 MCP 服务器注册仓库资源
 *
 * @param server - MCP server instance
 * @param server - MCP 服务器实例
 * @param resourceDescriptors - Resource descriptors for metadata
 * @param resourceDescriptors - 用于元数据的资源描述符
 */
export function setupRepositoryResources(
  server: McpServer,
  resourceDescriptors: any
): void {
  // Repository information resource
  // 仓库信息资源
  server.resource(
    "repository-info",
    new ResourceTemplate("git://repo/{repoPath}/info", { list: undefined }),
    {
      name: "Repository Information",
      description:
        "Basic Git repository information including current branch, status, and reference details",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      try {
        // Handle repoPath which might be an array
        // 处理可能是数组的 repoPath
        const repoPathStr = ensureString(variables.repoPath);
        const normalizedPath = PathValidation.normalizePath(
          decodeURIComponent(repoPathStr)
        );
        const gitService = new GitService(normalizedPath);

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
                    path: normalizedPath,
                    isGitRepository: false,
                  },
                  null,
                  2
                ),
                mimeType: "application/json",
              },
            ],
          };
        }

        // Get repository status
        // 获取仓库状态
        const statusResult = await gitService.getStatus();

        if (!statusResult.resultSuccessful) {
          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(
                  {
                    error: statusResult.resultError.errorMessage,
                    path: normalizedPath,
                    isGitRepository: true,
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
                  path: normalizedPath,
                  isGitRepository: true,
                  status: statusResult.resultData,
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
                  path: ensureString(variables.repoPath),
                  isGitRepository: false,
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

  // Repository branches resource
  // 仓库分支资源
  server.resource(
    "repository-branches",
    new ResourceTemplate("git://repo/{repoPath}/branches", { list: undefined }),
    {
      name: "Repository Branches",
      description:
        "List of all branches in the repository with current branch indicator",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      try {
        // Handle repoPath which might be an array
        // 处理可能是数组的 repoPath
        const repoPathStr = ensureString(variables.repoPath);
        const normalizedPath = PathValidation.normalizePath(
          decodeURIComponent(repoPathStr)
        );
        const gitService = new GitService(normalizedPath);

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
                    path: normalizedPath,
                  },
                  null,
                  2
                ),
                mimeType: "application/json",
              },
            ],
          };
        }

        // Get branches
        // 获取分支
        const branchesResult = await gitService.listBranches(true);

        if (!branchesResult.resultSuccessful) {
          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(
                  {
                    error: branchesResult.resultError.errorMessage,
                    path: normalizedPath,
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
                  path: normalizedPath,
                  branches: branchesResult.resultData,
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
                  path: ensureString(variables.repoPath),
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

  // Repository remotes resource
  // 仓库远程资源
  server.resource(
    "repository-remotes",
    new ResourceTemplate("git://repo/{repoPath}/remotes", { list: undefined }),
    {
      name: "Repository Remotes",
      description: "List of all configured remote repositories with their URLs",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      try {
        // Handle repoPath which might be an array
        // 处理可能是数组的 repoPath
        const repoPathStr = ensureString(variables.repoPath);
        const normalizedPath = PathValidation.normalizePath(
          decodeURIComponent(repoPathStr)
        );
        const gitService = new GitService(normalizedPath);

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
                    path: normalizedPath,
                  },
                  null,
                  2
                ),
                mimeType: "application/json",
              },
            ],
          };
        }

        // Get remotes
        // 获取远程
        const remotesResult = await gitService.listRemotes();

        if (!remotesResult.resultSuccessful) {
          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(
                  {
                    error: remotesResult.resultError.errorMessage,
                    path: normalizedPath,
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
                  path: normalizedPath,
                  remotes: remotesResult.resultData,
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
                  path: ensureString(variables.repoPath),
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

  // Repository tags resource
  // 仓库标签资源
  server.resource(
    "repository-tags",
    new ResourceTemplate("git://repo/{repoPath}/tags", { list: undefined }),
    {
      name: "Repository Tags",
      description: "List of all tags in the repository with their references",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      try {
        // Handle repoPath which might be an array
        // 处理可能是数组的 repoPath
        const repoPathStr = ensureString(variables.repoPath);
        const normalizedPath = PathValidation.normalizePath(
          decodeURIComponent(repoPathStr)
        );
        const gitService = new GitService(normalizedPath);

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
                    path: normalizedPath,
                  },
                  null,
                  2
                ),
                mimeType: "application/json",
              },
            ],
          };
        }

        // Get tags
        // 获取标签
        const tagsResult = await gitService.listTags();

        if (!tagsResult.resultSuccessful) {
          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(
                  {
                    error: tagsResult.resultError.errorMessage,
                    path: normalizedPath,
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
                  path: normalizedPath,
                  tags: tagsResult.resultData,
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
                  path: ensureString(variables.repoPath),
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
