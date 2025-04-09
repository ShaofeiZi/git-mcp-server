/**
 * Working Directory Tools
 * =====================
 *
 * MCP tools for Git working directory operations.
 * MCP 工具，用于 Git 工作目录操作。
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitService } from "../services/git-service.js";
import { Schemas, PathValidation } from "../utils/validation.js";
import { getGlobalSettings } from "../utils/global-settings.js";
import { execSync } from "child_process";

/**
 * Registers working directory tools with the MCP server
 * 向 MCP 服务器注册工作目录工具
 *
 * @param server - MCP server instance
 * @param server - MCP 服务器实例
 */
export function setupWorkdirTools(server: McpServer): void {
  // Set global working directory
  // 设置全局工作目录
  server.tool(
    "git_set_working_dir",
    "设置所有 Git 操作的全局工作目录路径。未来的工具调用可以使用 '.' 作为文件路径，它将解析到这个全局路径。重要：始终使用完整的绝对路径以确保正确功能。",
    {
      path: z
        .string()
        .min(1, "需要提供工作目录路径")
        .describe("用作全局工作目录的完整绝对路径"),
      validateGitRepo: z
        .boolean()
        .optional()
        .default(true)
        .describe("是否验证该路径是一个 Git 仓库"),
    },
    async ({ path, validateGitRepo }) => {
      try {
        const normalizedPath = PathValidation.normalizePath(path);

        // Check if this is a git repository if validation is requested
        // 如果请求验证，检查这是否是一个 git 仓库
        if (validateGitRepo) {
          const gitService = new GitService(normalizedPath);
          const isRepo = await gitService.isGitRepository();
          if (!isRepo) {
            return {
              content: [
                {
                  type: "text",
                  text: `错误：不是一个 Git 仓库：${normalizedPath}`,
                },
              ],
              isError: true,
            };
          }
        }

        // Set the global working directory
        // 设置全局工作目录
        getGlobalSettings().setGlobalWorkingDir(normalizedPath);

        return {
          content: [
            {
              type: "text",
              text: `成功设置全局工作目录为：${normalizedPath}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `错误：${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Clear global working directory
  // 清除全局工作目录
  server.tool(
    "git_clear_working_dir",
    "清除全局工作目录设置。工具将使用其显式提供的路径参数。",
    {},
    async () => {
      try {
        const currentPath = getGlobalSettings().globalWorkingDir;
        getGlobalSettings().setGlobalWorkingDir(null);

        return {
          content: [
            {
              type: "text",
              text: currentPath
                ? `成功清除全局工作目录（原路径：${currentPath}）`
                : "未设置全局工作目录",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `错误：${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Stage files
  // 暂存文件
  server.tool(
    "git_add",
    "暂存文件以准备提交。将文件内容添加到索引（暂存区）以准备下一次提交。可以暂存特定文件或工作目录中的所有更改。重要：始终使用完整的绝对路径以确保正确功能。",
    {
      path: z
        .string()
        .min(1, "需要提供仓库路径")
        .describe("Git 仓库的完整绝对路径"),
      files: z
        .union([
          z.string().min(1, "需要提供文件路径").describe("要暂存的文件路径"),
          z
            .array(z.string().min(1, "需要提供文件路径"))
            .describe("要暂存的文件路径数组"),
        ])
        .optional()
        .default(".")
        .describe("要暂存的文件，默认为所有更改"),
    },
    async ({ path, files }) => {
      try {
        const normalizedPath = PathValidation.normalizePath(path);
        const gitService = new GitService(normalizedPath);

        // Check if this is a git repository
        // 检查这是否是一个 git 仓库
        const isRepo = await gitService.isGitRepository();
        if (!isRepo) {
          return {
            content: [
              {
                type: "text",
                text: `错误：不是一个 Git 仓库：${normalizedPath}`,
              },
            ],
            isError: true,
          };
        }

        const result = await gitService.stageFiles(files);

        if (!result.resultSuccessful) {
          return {
            content: [
              {
                type: "text",
                text: `错误：${result.resultError.errorMessage}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `成功暂存${
                typeof files === "string" && files === "."
                  ? "所有文件"
                  : Array.isArray(files)
                  ? `${files.length} 个文件`
                  : `'${files}'`
              }`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `错误：${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Unstage files
  // 取消暂存文件
  server.tool(
    "git_reset",
    "从索引中取消暂存文件。从暂存区移除文件内容，同时保留工作目录的更改。是 git_add 的反向操作。重要：始终使用完整的绝对路径以确保正确功能。",
    {
      path: z
        .string()
        .min(1, "需要提供仓库路径")
        .describe("Git 仓库的完整绝对路径"),
      files: z
        .union([
          z
            .string()
            .min(1, "需要提供文件路径")
            .describe("要取消暂存的文件路径"),
          z
            .array(z.string().min(1, "需要提供文件路径"))
            .describe("要取消暂存的文件路径数组"),
        ])
        .optional()
        .default(".")
        .describe("要取消暂存的文件，默认为所有已暂存的更改"),
    },
    async ({ path, files }) => {
      try {
        const normalizedPath = PathValidation.normalizePath(path);
        const gitService = new GitService(normalizedPath);

        // Check if this is a git repository
        // 检查这是否是一个 git 仓库
        const isRepo = await gitService.isGitRepository();
        if (!isRepo) {
          return {
            content: [
              {
                type: "text",
                text: `错误：不是一个 Git 仓库：${normalizedPath}`,
              },
            ],
            isError: true,
          };
        }

        const result = await gitService.unstageFiles(files);

        if (!result.resultSuccessful) {
          return {
            content: [
              {
                type: "text",
                text: `错误：${result.resultError.errorMessage}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `成功取消暂存${
                typeof files === "string" && files === "."
                  ? "所有文件"
                  : Array.isArray(files)
                  ? `${files.length} 个文件`
                  : `'${files}'`
              }`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `错误：${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Commit changes
  // 提交更改
  server.tool(
    "git_commit",
    "将暂存的更改提交到仓库。创建一个包含当前索引内容的新提交，使用提供的提交消息。支持可选的作者信息、修改前一个提交和创建空提交。重要：始终使用完整的绝对路径以确保正确功能。",
    {
      path: z
        .string()
        .min(1, "需要提供仓库路径")
        .describe("Git 仓库的完整绝对路径"),
      message: z.string().min(1, "需要提供提交消息").describe("提交的消息"),
      author: z
        .object({
          name: z.string().optional().describe("提交的作者名称"),
          email: z
            .string()
            .email("无效的邮箱地址")
            .optional()
            .describe("提交的作者邮箱"),
        })
        .optional()
        .describe("提交的作者信息"),
      allowEmpty: z
        .boolean()
        .optional()
        .default(false)
        .describe("是否允许创建空提交"),
      amend: z
        .boolean()
        .optional()
        .default(false)
        .describe("是否修改前一个提交而不是创建新提交"),
    },
    async ({ path, message, author, allowEmpty, amend }) => {
      try {
        const normalizedPath = PathValidation.normalizePath(path);
        const gitService = new GitService(normalizedPath);

        // Check if this is a git repository
        // 检查这是否是一个 git 仓库
        const isRepo = await gitService.isGitRepository();
        if (!isRepo) {
          return {
            content: [
              {
                type: "text",
                text: `错误：不是一个 Git 仓库：${normalizedPath}`,
              },
            ],
            isError: true,
          };
        }

        const result = await gitService.commit({
          message,
          author,
          allowEmpty,
          amend,
        });

        if (!result.resultSuccessful) {
          return {
            content: [
              {
                type: "text",
                text: `错误：${result.resultError.errorMessage}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `成功${
                amend ? "修改" : "创建"
              }提交，消息为："${message}"\n提交哈希：${result.resultData}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `错误：${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // View working directory diff
  // 查看工作目录差异
  server.tool(
    "git_diff_unstaged",
    "显示工作目录中未暂存的更改。显示工作目录和索引（暂存区）之间的差异。可以限制为特定文件或显示所有更改的文件。重要：始终使用完整的绝对路径以确保正确功能。",
    {
      path: z
        .string()
        .min(1, "需要提供仓库路径")
        .describe("Git 仓库的完整绝对路径"),
      file: z
        .string()
        .optional()
        .describe("要获取差异的特定文件，如果省略则显示所有文件"),
      showUntracked: z
        .boolean()
        .optional()
        .default(true)
        .describe("是否包含未跟踪文件的信息"),
    },
    async ({ path, file, showUntracked }) => {
      try {
        const normalizedPath = PathValidation.normalizePath(path);
        const gitService = new GitService(normalizedPath);

        // Check if this is a git repository
        // 检查这是否是一个 git 仓库
        const isRepo = await gitService.isGitRepository();
        if (!isRepo) {
          return {
            content: [
              {
                type: "text",
                text: `错误：不是一个 Git 仓库：${normalizedPath}`,
              },
            ],
            isError: true,
          };
        }

        const result = await gitService.getUnstagedDiff(file, showUntracked);

        if (!result.resultSuccessful) {
          return {
            content: [
              {
                type: "text",
                text: `错误：${result.resultError.errorMessage}`,
              },
            ],
            isError: true,
          };
        }

        if (result.resultData.trim() === "") {
          return {
            content: [
              {
                type: "text",
                text: `没有未暂存的更改或未跟踪的文件${
                  file ? ` 在 '${file}' 中` : ""
                }`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: result.resultData,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `错误：${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // View staged diff
  // 查看暂存差异
  server.tool(
    "git_diff_staged",
    "显示准备提交的已暂存更改。显示索引（暂存区）和最新提交之间的差异。可以限制为特定文件或显示所有已暂存的文件。重要：始终使用完整的绝对路径以确保正确功能。",
    {
      path: z
        .string()
        .min(1, "需要提供仓库路径")
        .describe("Git 仓库的完整绝对路径"),
      file: z
        .string()
        .optional()
        .describe("要获取差异的特定文件，如果省略则显示所有文件"),
    },
    async ({ path, file }) => {
      try {
        const normalizedPath = PathValidation.normalizePath(path);
        const gitService = new GitService(normalizedPath);

        // Check if this is a git repository
        // 检查这是否是一个 git 仓库
        const isRepo = await gitService.isGitRepository();
        if (!isRepo) {
          return {
            content: [
              {
                type: "text",
                text: `错误：不是一个 Git 仓库：${normalizedPath}`,
              },
            ],
            isError: true,
          };
        }

        const result = await gitService.getStagedDiff(file);

        if (!result.resultSuccessful) {
          return {
            content: [
              {
                type: "text",
                text: `错误：${result.resultError.errorMessage}`,
              },
            ],
            isError: true,
          };
        }

        if (result.resultData.trim() === "") {
          return {
            content: [
              {
                type: "text",
                text: `没有已暂存的更改${file ? ` 在 '${file}' 中` : ""}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: result.resultData,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `错误：${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Reset to a specific commit
  // 重置到特定提交
  server.tool(
    "git_reset_commit",
    "将当前分支重置到特定提交。这会改变分支 HEAD 指向的位置，不同模式会对工作目录和索引产生不同影响（hard：丢弃所有更改，soft：保留已暂存的更改，mixed：取消暂存但保留更改）。重要：始终使用完整的绝对路径以确保正确功能。",
    {
      path: z
        .string()
        .min(1, "需要提供仓库路径")
        .describe("Git 仓库的完整绝对路径"),
      ref: z
        .string()
        .default("HEAD")
        .describe(
          "要重置到的引用，默认为 HEAD（例如：提交哈希、分支名称或 HEAD~1）"
        ),
      mode: z
        .enum(["hard", "soft", "mixed"])
        .default("mixed")
        .describe(
          "重置模式：hard（丢弃更改），soft（保留已暂存），或 mixed（取消暂存但保留更改）"
        ),
    },
    async ({ path, ref, mode }) => {
      try {
        const normalizedPath = PathValidation.normalizePath(path);
        const gitService = new GitService(normalizedPath);

        // Check if this is a git repository
        // 检查这是否是一个 git 仓库
        const isRepo = await gitService.isGitRepository();
        if (!isRepo) {
          return {
            content: [
              {
                type: "text",
                text: `错误：不是一个 Git 仓库：${normalizedPath}`,
              },
            ],
            isError: true,
          };
        }

        const result = await gitService.reset(ref, mode);

        if (!result.resultSuccessful) {
          return {
            content: [
              {
                type: "text",
                text: `错误：${result.resultError.errorMessage}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `成功使用 ${mode} 模式重置到 ${ref}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `错误：${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Clean working directory
  // 清理工作目录
  server.tool(
    "git_clean",
    "从工作目录中移除未跟踪的文件。删除未被 Git 跟踪的文件，可选择包括目录。请谨慎使用，此操作无法撤消。重要：始终使用完整的绝对路径以确保正确功能。",
    {
      path: z
        .string()
        .min(1, "需要提供仓库路径")
        .describe("Git 仓库的完整绝对路径"),
      directories: z
        .boolean()
        .optional()
        .default(false)
        .describe("是否同时移除未跟踪的目录"),
      force: z
        .boolean()
        .optional()
        .default(false)
        .describe("是否强制清理文件，包括被忽略的文件"),
    },
    async ({ path, directories, force }) => {
      try {
        const normalizedPath = PathValidation.normalizePath(path);
        const gitService = new GitService(normalizedPath);

        // Check if this is a git repository
        // 检查这是否是一个 git 仓库
        const isRepo = await gitService.isGitRepository();
        if (!isRepo) {
          return {
            content: [
              {
                type: "text",
                text: `错误：不是一个 Git 仓库：${normalizedPath}`,
              },
            ],
            isError: true,
          };
        }

        const result = await gitService.clean(directories, force);

        if (!result.resultSuccessful) {
          return {
            content: [
              {
                type: "text",
                text: `错误：${result.resultError.errorMessage}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `成功清理工作目录${directories ? "（包括目录）" : ""}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `错误：${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
