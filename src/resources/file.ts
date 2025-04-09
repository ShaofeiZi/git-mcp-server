/**
 * File Resources
 * =============
 *
 * MCP resources for exposing Git file contents at specific references.
 * MCP 资源，用于在特定引用处暴露 Git 文件内容。
 */

import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { GitService } from "../services/git-service.js";
import { Schemas, PathValidation } from "../utils/validation.js";
import path from "path";

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
 * Registers file resources with the MCP server
 * 向 MCP 服务器注册文件资源
 *
 * @param server - MCP server instance
 * @param server - MCP 服务器实例
 * @param resourceDescriptors - Resource descriptors for metadata
 * @param resourceDescriptors - 用于元数据的资源描述符
 */
export function setupFileResources(
  server: McpServer,
  resourceDescriptors: any
): void {
  // File contents at a specific reference
  // 特定引用处的文件内容
  server.resource(
    "file-at-ref",
    new ResourceTemplate("git://repo/{repoPath}/file/{filePath}?ref={ref}", {
      list: undefined,
    }),
    {
      name: "File Content",
      description:
        "Returns the content of a specific file at a given Git reference",
      mimeType: "text/plain",
    },
    // Returns the content of a specific file at a given reference (branch, tag, or commit)
    // 返回给定引用（分支、标签或提交）处特定文件的内容
    async (uri, variables) => {
      try {
        // Handle variables which might be arrays
        // 处理可能是数组的变量
        const repoPathStr = ensureString(variables.repoPath);
        const filePathStr = ensureString(variables.filePath);
        const refStr = variables.ref ? ensureString(variables.ref) : "HEAD";

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
                    ref: refStr,
                  },
                  null,
                  2
                ),
                mimeType: "application/json",
              },
            ],
          };
        }

        // Get file content at reference
        // 获取引用处的文件内容
        const fileResult = await gitService.getFileAtRef(
          normalizedFilePath,
          refStr
        );

        if (!fileResult.resultSuccessful) {
          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(
                  {
                    error: fileResult.resultError.errorMessage,
                    repoPath: normalizedRepoPath,
                    filePath: normalizedFilePath,
                    ref: refStr,
                  },
                  null,
                  2
                ),
                mimeType: "application/json",
              },
            ],
          };
        }

        // Detect MIME type based on file extension
        // 根据文件扩展名检测 MIME 类型
        const fileExtension = path.extname(normalizedFilePath).toLowerCase();
        let mimeType = "text/plain";

        // Simple MIME type detection
        // 简单的 MIME 类型检测
        if ([".js", ".ts", ".jsx", ".tsx"].includes(fileExtension)) {
          mimeType = "application/javascript";
        } else if ([".html", ".htm"].includes(fileExtension)) {
          mimeType = "text/html";
        } else if (fileExtension === ".css") {
          mimeType = "text/css";
        } else if (fileExtension === ".json") {
          mimeType = "application/json";
        } else if ([".md", ".markdown"].includes(fileExtension)) {
          mimeType = "text/markdown";
        } else if ([".xml", ".svg"].includes(fileExtension)) {
          mimeType = "application/xml";
        } else if ([".yml", ".yaml"].includes(fileExtension)) {
          mimeType = "text/yaml";
        }

        // Return the file content directly
        // 直接返回文件内容
        return {
          contents: [
            {
              uri: uri.href,
              text: fileResult.resultData,
              mimeType,
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
                  ref: variables.ref ? ensureString(variables.ref) : "HEAD",
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

  // List files in a directory at a specific reference
  // 列出特定引用处目录中的文件
  server.resource(
    "directory-listing",
    new ResourceTemplate("git://repo/{repoPath}/ls/{dirPath}?ref={ref}", {
      list: undefined,
    }),
    {
      name: "Directory Listing",
      description:
        "Returns a list of files and directories at a specific path and reference",
      mimeType: "application/json",
    },
    // Returns a list of files and directories within a specific directory at a given reference
    // 返回给定引用处特定目录中的文件和目录列表
    async (uri, variables) => {
      try {
        // Handle variables which might be arrays
        // 处理可能是数组的变量
        const repoPathStr = ensureString(variables.repoPath);
        const dirPathStr = ensureString(variables.dirPath || "");
        const refStr = variables.ref ? ensureString(variables.ref) : "HEAD";

        // Normalize paths
        // 规范化路径
        const normalizedRepoPath = PathValidation.normalizePath(
          decodeURIComponent(repoPathStr)
        );
        const normalizedDirPath = PathValidation.normalizePath(
          decodeURIComponent(dirPathStr)
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
                    dirPath: normalizedDirPath,
                    ref: refStr,
                  },
                  null,
                  2
                ),
                mimeType: "application/json",
              },
            ],
          };
        }

        // Use Git command to get directory listing
        // 使用 Git 命令获取目录列表
        try {
          // Use the listFilesAtRef method from GitService
          // 使用 GitService 的 listFilesAtRef 方法
          const filesResult = await gitService.listFilesAtRef(
            normalizedDirPath,
            refStr
          );

          if (!filesResult.resultSuccessful) {
            return {
              contents: [
                {
                  uri: uri.href,
                  text: JSON.stringify(
                    {
                      error: filesResult.resultError.errorMessage,
                      repoPath: normalizedRepoPath,
                      dirPath: normalizedDirPath,
                      ref: refStr,
                    },
                    null,
                    2
                  ),
                  mimeType: "application/json",
                },
              ],
            };
          }

          // The listFilesAtRef method now returns only immediate children,
          // so no need to strip prefixes here.
          // listFilesAtRef 方法现在只返回直接子项，
          // 因此这里不需要去除前缀。
          const files = filesResult.resultData;

          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(
                  {
                    repoPath: normalizedRepoPath,
                    dirPath: normalizedDirPath,
                    ref: refStr,
                    files,
                  },
                  null,
                  2
                ),
                mimeType: "application/json",
              },
            ],
          };
        } catch (gitError) {
          return {
            contents: [
              {
                uri: uri.href,
                text: JSON.stringify(
                  {
                    error:
                      gitError instanceof Error
                        ? gitError.message
                        : String(gitError),
                    repoPath: normalizedRepoPath,
                    dirPath: normalizedDirPath,
                    ref: refStr,
                  },
                  null,
                  2
                ),
                mimeType: "application/json",
              },
            ],
          };
        }
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                {
                  error: error instanceof Error ? error.message : String(error),
                  repoPath: ensureString(variables.repoPath),
                  dirPath: variables.dirPath
                    ? ensureString(variables.dirPath)
                    : "",
                  ref: variables.ref ? ensureString(variables.ref) : "HEAD",
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
