/**
 * Advanced Git Tools
 * 高级 Git 工具
 * ================
 *
 * MCP tools for advanced Git operations like stashing, tagging, rebasing, etc.
 * MCP 工具，用于高级 Git 操作，如暂存、标记、变基等。
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitService } from "../services/git-service.js";
import { Schemas, PathValidation } from "../utils/validation.js";

/**
 * Registers advanced Git tools with the MCP server
 * 向 MCP 服务器注册高级 Git 工具
 *
 * @param server - MCP server instance
 * @param server - MCP 服务器实例
 */
export function setupAdvancedTools(server: McpServer): void {
    // Create tag
    // 创建标签
    server.tool(
        "git_tag_create",
        "在仓库中创建一个新标签。标签是指向特定提交的引用，用于标记发布点或重要提交。可以创建轻量级标签或带有消息的注释标签。",
        {
            path: z.string().min(1, "需要提供仓库路径").describe("Git 仓库的路径"),
            name: z.string().min(1, "需要提供标签名称").describe("新标签的名称"),
            message: z.string().optional().describe("注释标签的可选消息"),
            ref: z.string().optional().describe("创建标签的引用点（提交、分支）"),
        },
        async ({path, name, message, ref}) => {
            try {
                const normalizedPath = PathValidation.normalizePath(path);
                const gitService = new GitService(normalizedPath);

                // Check if this is a git repository
                const isRepo = await gitService.isGitRepository();
                if (!isRepo) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: Not a Git repository: ${normalizedPath}`,
                            },
                        ],
                        isError: true,
                    };
                }

                const result = await gitService.createTag({
                    name,
                    message,
                    ref,
                });

                if (!result.resultSuccessful) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: ${result.resultError.errorMessage}`,
                            },
                        ],
                        isError: true,
                    };
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: `Successfully created ${
                                message ? "annotated " : ""
                            }tag '${name}'${ref ? ` at ref '${ref}'` : ""}`,
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${
                                error instanceof Error ? error.message : String(error)
                            }`,
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    // List tags
    server.tool(
        "git_tag_list",
        "列出仓库中的所有标签。显示仓库中存在的所有标签名称，可用于识别发布或重要的参考点。",
        {
            path: z.string().min(1, "需要提供仓库路径").describe("Git 仓库的路径"),
        },
        async ({path}) => {
            try {
                const normalizedPath = PathValidation.normalizePath(path);
                const gitService = new GitService(normalizedPath);

                // Check if this is a git repository
                const isRepo = await gitService.isGitRepository();
                if (!isRepo) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: Not a Git repository: ${normalizedPath}`,
                            },
                        ],
                        isError: true,
                    };
                }

                const result = await gitService.listTags();

                if (!result.resultSuccessful) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: ${result.resultError.errorMessage}`,
                            },
                        ],
                        isError: true,
                    };
                }

                if (result.resultData.length === 0) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `No tags found in repository at: ${normalizedPath}`,
                            },
                        ],
                    };
                }

                // Format output
                let output = `Tags in repository at: ${normalizedPath}\n\n`;
                result.resultData.forEach((tag) => {
                    output += `${tag}\n`;
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: output,
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${
                                error instanceof Error ? error.message : String(error)
                            }`,
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    // Create stash
    server.tool(
        "git_stash_create",
        "将未提交的更改保存到暂存区。捕获工作目录和索引的当前状态，并将其保存到暂存区堆栈中，允许您在不提交进行中的工作的情况下切换分支。",
        {
            path: z.string().min(1, "需要提供仓库路径").describe("Git 仓库的路径"),
            message: z.string().optional().describe("暂存的可选描述"),
            includeUntracked: z
                .boolean()
                .optional()
                .default(false)
                .describe("是否包含未跟踪的文件"),
        },
        async ({path, message, includeUntracked}) => {
            try {
                const normalizedPath = PathValidation.normalizePath(path);
                const gitService = new GitService(normalizedPath);

                // Check if this is a git repository
                const isRepo = await gitService.isGitRepository();
                if (!isRepo) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: Not a Git repository: ${normalizedPath}`,
                            },
                        ],
                        isError: true,
                    };
                }

                const result = await gitService.createStash({
                    message,
                    includeUntracked,
                });

                if (!result.resultSuccessful) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: ${result.resultError.errorMessage}`,
                            },
                        ],
                        isError: true,
                    };
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: `Successfully created stash${
                                message ? ` with message: "${message}"` : ""
                            }${includeUntracked ? " (including untracked files)" : ""}`,
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${
                                error instanceof Error ? error.message : String(error)
                            }`,
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    // List stashes
    server.tool(
        "git_stash_list",
        "列出仓库中的所有暂存。显示已创建的暂存堆栈及其描述，允许您识别要应用或弹出的暂存。",
        {
            path: z.string().min(1, "需要提供仓库路径").describe("Git 仓库的路径"),
        },
        async ({path}) => {
            try {
                const normalizedPath = PathValidation.normalizePath(path);
                const gitService = new GitService(normalizedPath);

                // Check if this is a git repository
                const isRepo = await gitService.isGitRepository();
                if (!isRepo) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: Not a Git repository: ${normalizedPath}`,
                            },
                        ],
                        isError: true,
                    };
                }

                const result = await gitService.listStashes();

                if (!result.resultSuccessful) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: ${result.resultError.errorMessage}`,
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
                                text: `No stashes found in repository at: ${normalizedPath}`,
                            },
                        ],
                    };
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: `Stashes in repository at: ${normalizedPath}\n\n${result.resultData}`,
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${
                                error instanceof Error ? error.message : String(error)
                            }`,
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    // Apply stash
    server.tool(
        "git_stash_apply",
        "将暂存的更改应用于工作目录。将指定暂存中的更改应用于当前工作目录，但保留暂存列表中的暂存。",
        {
            path: z.string().min(1, "需要提供仓库路径").describe("Git 仓库的路径"),
            stashId: z
                .string()
                .optional()
                .default("stash@{0}")
                .describe("要应用的暂存引用（默认为最近的暂存）"),
        },
        async ({path, stashId}) => {
            try {
                const normalizedPath = PathValidation.normalizePath(path);
                const gitService = new GitService(normalizedPath);

                // Check if this is a git repository
                const isRepo = await gitService.isGitRepository();
                if (!isRepo) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: Not a Git repository: ${normalizedPath}`,
                            },
                        ],
                        isError: true,
                    };
                }

                const result = await gitService.applyStash(stashId);

                if (!result.resultSuccessful) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: ${result.resultError.errorMessage}`,
                            },
                        ],
                        isError: true,
                    };
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: `Successfully applied stash: ${stashId}`,
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${
                                error instanceof Error ? error.message : String(error)
                            }`,
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    // Pop stash
    server.tool(
        "git_stash_pop",
        "应用并删除暂存。将指定的暂存应用于工作目录，然后将其从暂存堆栈中删除。结合应用和删除操作。",
        {
            path: z.string().min(1, "需要提供仓库路径").describe("Git 仓库的路径"),
            stashId: z
                .string()
                .optional()
                .default("stash@{0}")
                .describe("要应用的暂存引用（默认为最近的暂存）"),
        },
        async ({path, stashId}) => {
            try {
                const normalizedPath = PathValidation.normalizePath(path);
                const gitService = new GitService(normalizedPath);

                // Check if this is a git repository
                const isRepo = await gitService.isGitRepository();
                if (!isRepo) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: Not a Git repository: ${normalizedPath}`,
                            },
                        ],
                        isError: true,
                    };
                }

                const result = await gitService.popStash(stashId);

                if (!result.resultSuccessful) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: ${result.resultError.errorMessage}`,
                            },
                        ],
                        isError: true,
                    };
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: `Successfully popped stash: ${stashId}`,
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${
                                error instanceof Error ? error.message : String(error)
                            }`,
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    // Cherry-pick commits
    server.tool(
        "git_cherry_pick",
        "将特定提交的更改应用于当前分支。将一个或多个现有提交中引入的更改应用于当前分支，并创建新的提交。",
        {
            path: z.string().min(1, "需要提供仓库路径").describe("Git 仓库的路径"),
            commits: z
                .array(z.string())
                .min(1, "至少需要一个提交哈希值")
                .describe("要挑选的提交哈希值数组"),
        },
        async ({path, commits}) => {
            try {
                const normalizedPath = PathValidation.normalizePath(path);
                const gitService = new GitService(normalizedPath);

                // Check if this is a git repository
                const isRepo = await gitService.isGitRepository();
                if (!isRepo) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: Not a Git repository: ${normalizedPath}`,
                            },
                        ],
                        isError: true,
                    };
                }

                const result = await gitService.cherryPick(commits);

                if (!result.resultSuccessful) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: ${result.resultError.errorMessage}`,
                            },
                        ],
                        isError: true,
                    };
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: `Successfully cherry-picked ${commits.length} commit${
                                commits.length > 1 ? "s" : ""
                            }`,
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${
                                error instanceof Error ? error.message : String(error)
                            }`,
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    // Rebase
    server.tool(
        "git_rebase",
        "在另一个基提交之上重新应用提交。将一个分支上提交的所有更改重新应用到另一个分支上，提供更清晰的项目历史。",
        {
            path: z.string().min(1, "需要提供仓库路径").describe("Git 仓库的路径"),
            branch: z
                .string()
                .min(1, "需要提供要变基到的分支")
                .describe("要变基到的分支或引用"),
            interactive: z
                .boolean()
                .optional()
                .default(false)
                .describe("是否使用交互式变基模式"),
        },
        async ({path, branch, interactive}) => {
            try {
                const normalizedPath = PathValidation.normalizePath(path);
                const gitService = new GitService(normalizedPath);

                // Check if this is a git repository
                const isRepo = await gitService.isGitRepository();
                if (!isRepo) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: Not a Git repository: ${normalizedPath}`,
                            },
                        ],
                        isError: true,
                    };
                }

                const result = await gitService.rebase(branch, interactive);

                if (!result.resultSuccessful) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: ${result.resultError.errorMessage}`,
                            },
                        ],
                        isError: true,
                    };
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: `Successfully rebased onto '${branch}'${
                                interactive ? " (interactive)" : ""
                            }`,
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${
                                error instanceof Error ? error.message : String(error)
                            }`,
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    // Log commits
    server.tool(
        "git_log",
        "显示提交历史。以逆时间顺序显示提交日志，可选择限制为特定文件的历史或最大提交数量。",
        {
            path: z.string().min(1, "需要提供仓库路径").describe("Git 仓库的路径"),
            maxCount: z
                .number()
                .positive()
                .optional()
                .default(50)
                .describe("要显示的最大提交数量"),
            file: z.string().optional().describe("要显示历史的特定文件路径"),
        },
        async ({path, maxCount, file}) => {
            try {
                const normalizedPath = PathValidation.normalizePath(path);
                const gitService = new GitService(normalizedPath);

                // Check if this is a git repository
                const isRepo = await gitService.isGitRepository();
                if (!isRepo) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: Not a Git repository: ${normalizedPath}`,
                            },
                        ],
                        isError: true,
                    };
                }

                const result = await gitService.getLog({
                    maxCount,
                    file,
                });

                if (!result.resultSuccessful) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: ${result.resultError.errorMessage}`,
                            },
                        ],
                        isError: true,
                    };
                }

                if (result.resultData.length === 0) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `No commits found${file ? ` for file '${file}'` : ""}`,
                            },
                        ],
                    };
                }

                // Format output
                let output = `Commit history${
                    file ? ` for file '${file}'` : ""
                } (showing up to ${maxCount} commits)\n\n`;

                result.resultData.forEach((commit) => {
                    output += `Commit: ${commit.hash}\n`;
                    output += `Author: ${commit.author} <${commit.authorEmail}>\n`;
                    output += `Date: ${commit.date.toISOString()}\n\n`;
                    output += `    ${commit.message}\n\n`;
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: output,
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${
                                error instanceof Error ? error.message : String(error)
                            }`,
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    // Show commit details
    server.tool(
        "git_show",
        "显示特定提交的详细信息。显示提交消息、作者、日期以及提交引入的更改，包括差异。",
        {
            path: z.string().min(1, "需要提供仓库路径").describe("Git 仓库的路径"),
            commitHash: z
                .string()
                .min(1, "需要提供提交哈希值")
                .describe("要显示的提交哈希值或引用"),
        },
        async ({path, commitHash}) => {
            try {
                const normalizedPath = PathValidation.normalizePath(path);
                const gitService = new GitService(normalizedPath);

                // Check if this is a git repository
                const isRepo = await gitService.isGitRepository();
                if (!isRepo) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: Not a Git repository: ${normalizedPath}`,
                            },
                        ],
                        isError: true,
                    };
                }

                const result = await gitService.showCommit(commitHash);

                if (!result.resultSuccessful) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Error: ${result.resultError.errorMessage}`,
                            },
                        ],
                        isError: true,
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
                            text: `Error: ${
                                // @ts-ignore
                                error?.message || error?.errorMessage || String(error)
                            }`,
                        },
                    ],
                    isError: true,
                };
            }
        }
    );
}
