/**
 * Git Service
 * Git 服务
 * ===========
 *
 * An abstraction layer for Git operations using simple-git.
 * 使用 simple-git 的 Git 操作抽象层。
 * Provides a clean interface for the MCP server to interact with Git repositories.
 * 为 MCP 服务器提供与 Git 仓库交互的清晰接口。
 */

import { simpleGit } from "simple-git";
type SimpleGit = any;
type SimpleGitOptions = any;
import fs from "fs/promises";
import { execSync } from "child_process";
import path from "path";
import { PathValidation } from "../utils/validation.js"; // Import PathValidation
import { getGlobalSettings } from "../utils/global-settings.js"; // Import GlobalSettings
import {
  GitRepositoryOptions,
  GitCommitOptions,
  GitBranchOptions,
  GitMergeOptions,
  GitRemoteOptions,
  GitPullOptions,
  GitPushOptions,
  GitTagOptions,
  GitStashOptions,
  GitRepositoryStatus,
  GitLogEntry,
  GitDiffEntry,
  GitError,
  // GitBranchSummary is not exported from types, use inline definition below
} from "../types/git.js";
// Define BranchSummary inline as it's not exported from types
// 内联定义 BranchSummary，因为它没有从 types 导出
interface BranchSummary {
  current: string;
  branches: {
    [key: string]: {
      current: boolean;
      name: string;
      commit: string;
      label: string;
    };
  };
  all: string[];
  // Add other properties if needed based on simple-git's actual return type
  // 根据 simple-git 的实际返回类型，如有需要添加其他属性
}
import {
  createGitError,
  createSuccessResult,
  createFailureResult,
  OperationResult,
  StandardizedApplicationErrorObject,
  wrapExceptionAsStandardizedError,
  createStandardizedError, // Use the correct function
  ErrorCategoryType, // Import category type
  ErrorSeverityLevel, // Import severity level
} from "./error-service.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js"; // Import from SDK

export class GitService {
  private git: SimpleGit;
  private repoPath: string;

  /**
   * Creates a new GitService instance for a specific repository path
   * 为特定仓库路径创建一个新的 GitService 实例
   *
   * @param repoPath - Path to the git repository
   *                 - Git 仓库的路径
   * @param options - Additional simple-git options
   *                - 额外的 simple-git 选项
   */
  constructor(repoPath: string, options: SimpleGitOptions = {}) {
    // --- Path Sandboxing Validation ---
    // --- 路径沙箱验证 ---
    const settings = getGlobalSettings();
    const normalizedRepoPath = PathValidation.normalizePath(repoPath);

    if (
      !PathValidation.isWithinDirectory(
        normalizedRepoPath,
        settings.allowedBaseDir
      )
    ) {
      // Use createStandardizedError with appropriate parameters
      // 使用带有适当参数的 createStandardizedError
      throw createStandardizedError(
        `Access denied: Repository path '${repoPath}' (resolved to '${normalizedRepoPath}') is outside the allowed base directory '${settings.allowedBaseDir}'.`,
        "PATH_OUTSIDE_BASEDIR", // Error code
        ErrorCategoryType.CATEGORY_VALIDATION, // Category
        ErrorSeverityLevel.SEVERITY_ERROR, // Severity
        {
          requestedPath: repoPath,
          resolvedPath: normalizedRepoPath,
          allowedBaseDir: settings.allowedBaseDir,
        } // Context
      );
    }
    this.repoPath = normalizedRepoPath; // Use the validated, normalized path
    // --- End Path Sandboxing Validation ---
    // --- 结束路径沙箱验证 ---

    try {
      // Try to get the global git user configuration
      // 尝试获取全局 git 用户配置
      const globalUserName = execSync("git config --global user.name")
        .toString()
        .trim();
      const globalUserEmail = execSync("git config --global user.email")
        .toString()
        .trim();

      // Initialize git with this configuration to ensure it uses the global values
      // 使用此配置初始化 git，以确保它使用全局值
      this.git = simpleGit(this.repoPath, {
        ...options,
        config: [
          `user.name=${globalUserName}`,
          `user.email=${globalUserEmail}`,
        ],
      });
    } catch (error) {
      // If we can't get the global config, fall back to standard initialization
      // 如果无法获取全局配置，回退到标准初始化
      console.error(
        "Failed to get global git config, using default initialization",
        error
      );
      this.git = simpleGit(this.repoPath, {
        ...options,
        baseDir: this.repoPath,
      });
    }
  }

  /**
   * Validates a path relative to the repository root to prevent traversal.
   * 验证相对于仓库根目录的路径，以防止目录遍历。
   * Throws a standardized error if validation fails.
   * 如果验证失败，则抛出标准化错误。
   *
   * @param relativePath - The path relative to the repository root.
   *                     - 相对于仓库根目录的路径。
   * @param paramName - The name of the parameter being validated (for error messages).
   *                  - 被验证的参数名称（用于错误消息）。
   * @returns The validated and normalized relative path.
   *          验证并规范化后的相对路径。
   */
  private validateRelativePath(
    relativePath: string,
    paramName: string
  ): string {
    // Avoid validating special case '.' which means 'current directory' or 'all' in some contexts
    // 避免验证特殊情况 '.'，它在某些上下文中表示"当前目录"或"全部"
    if (relativePath === "." || relativePath === "") {
      return relativePath;
    }

    // Normalize the input relative path *before* resolving against the repo path
    // 在解析到仓库路径之前，先规范化输入的相对路径
    // This handles inputs like 'subdir/../file' correctly within the context of the repo
    // 这在仓库上下文中正确处理像 'subdir/../file' 这样的输入
    const normalizedRelativePath = path.normalize(relativePath);

    // Resolve the normalized relative path against the repository path
    // 将规范化的相对路径解析为仓库路径
    const resolvedPath = path.resolve(this.repoPath, normalizedRelativePath);

    // Use the existing validation utility
    // 使用现有的验证工具
    // Check if the resolved path is the repo path itself OR is within it
    // 检查解析后的路径是否为仓库路径本身或在其内部
    if (
      resolvedPath !== this.repoPath &&
      !PathValidation.isWithinDirectory(resolvedPath, this.repoPath)
    ) {
      throw createStandardizedError(
        `Access denied: Path '${relativePath}' in parameter '${paramName}' (resolved to '${resolvedPath}') attempts to traverse outside the repository root '${this.repoPath}'.`,
        "PATH_TRAVERSAL_ATTEMPT", // Keep specific error code
        ErrorCategoryType.CATEGORY_VALIDATION, // Use existing validation category
        ErrorSeverityLevel.SEVERITY_ERROR, // Use existing error severity
        {
          requestedPath: relativePath,
          resolvedPath: resolvedPath,
          repoPath: this.repoPath,
          parameter: paramName,
        }
      );
    }
    // Return the normalized relative path, as simple-git expects paths relative to repoPath
    // 返回规范化的相对路径，因为 simple-git 需要相对于 repoPath 的路径
    return normalizedRelativePath;
  }

  /**
   * Handles Git errors in a standardized way
   * 以标准化的方式处理 Git 错误
   *
   * @param error - The error to handle
   *              - 要处理的错误
   * @param defaultMessage - Default message if error is not a Git error
   *                       - 如果错误不是 Git 错误，则使用的默认消息
   * @returns Standardized error object
   *          标准化的错误对象
   */
  private handleGitError(
    error: unknown,
    defaultMessage: string
  ): StandardizedApplicationErrorObject {
    if ((error as GitError).code) {
      const gitError = error as GitError;
      return createGitError(
        gitError.message || defaultMessage,
        gitError.code || "GIT_ERROR",
        {
          command: gitError.command,
          args: gitError.args,
          stderr: gitError.stderr,
        }
      );
    }

    return wrapExceptionAsStandardizedError(error, defaultMessage);
  }

  /**
   * Ensures the repository directory exists
   * 确保仓库目录存在
   *
   * @returns Promise resolving when directory exists or is created
   *          当目录存在或创建时解析的 Promise
   */
  private async ensureRepoPathExists(): Promise<void> {
    try {
      await fs.access(this.repoPath);
    } catch (error) {
      // Create directory if it doesn't exist
      // 如果目录不存在，则创建目录
      await fs.mkdir(this.repoPath, { recursive: true });
    }
  }

  /**
   * Checks if a path is a Git repository
   * 检查路径是否为 Git 仓库
   *
   * @param dirPath - Path to check
   *                - 要检查的路径
   * @returns Promise resolving to true if path is a Git repository
   *          如果路径是 Git 仓库，则解析为 true 的 Promise
   */
  async isGitRepository(dirPath: string = this.repoPath): Promise<boolean> {
    // --- Path Sandboxing Validation ---
    // --- 路径沙箱验证 ---
    const settings = getGlobalSettings();
    const normalizedDirPath = PathValidation.normalizePath(dirPath);
    if (
      !PathValidation.isWithinDirectory(
        normalizedDirPath,
        settings.allowedBaseDir
      )
    ) {
      console.error(
        `Security Warning: isGitRepository check attempted outside allowed base directory. Path: ${dirPath}, Base: ${settings.allowedBaseDir}`
      );
      // Return false instead of throwing an error, as this might be used for checks
      // 返回 false 而不是抛出错误，因为这可能用于检查
      return false;
    }
    // --- End Path Sandboxing Validation ---
    // --- 结束路径沙箱验证 ---

    try {
      const gitDir = path.join(normalizedDirPath, ".git"); // Use normalized path
      await fs.access(gitDir);
      return true;
    } catch (error) {
      try {
        // Check if it's a bare repository by looking for common Git files
        // 通过查找常见的 Git 文件检查它是否为裸仓库
        const gitFiles = ["HEAD", "config", "objects", "refs"];
        for (const file of gitFiles) {
          await fs.access(path.join(normalizedDirPath, file)); // Use normalized path
        }
        return true;
      } catch {
        return false;
      }
    }
  }

  // ==========================================
  // Repository Operations
  // 仓库操作
  // ==========================================

  /**
   * Initializes a new Git repository
   * 初始化新的 Git 仓库
   *
   * @param bare - Whether to create a bare repository
   *             - 是否创建裸仓库
   * @param initialBranch - Initial branch name (default: main)
   *                      - 初始分支名称（默认值：main）
   * @returns Promise resolving to operation result
   *          解析为操作结果的 Promise
   */
  async initRepo(
    bare = false,
    initialBranch = "main"
  ): Promise<OperationResult<string>> {
    try {
      await this.ensureRepoPathExists();
      // Use init with options to set the initial branch name
      // 使用带选项的 init 设置初始分支名称
      const initOptions = {
        "--initial-branch": initialBranch,
        "--bare": bare ? true : undefined,
      };
      const result = await this.git.init(initOptions);

      // If we're not in a bare repository, make an initial commit to establish the branch
      // 如果不是裸仓库，则进行初始提交以建立分支
      if (!bare) {
        try {
          // Create a README.md file as first commit to establish the branch
          // 创建 README.md 文件作为第一次提交以建立分支
          const readmePath = path.join(this.repoPath, "README.md");
          await fs.writeFile(
            readmePath,
            `# Git Repository\n\nInitialized with branch '${initialBranch}'.`
          );
          await this.git.add("README.md");
          await this.git.commit(`Initial commit`, { "--allow-empty": null });
        } catch (commitError) {
          // If initial commit fails, it's not critical - the repo is still initialized
          // 如果初始提交失败，这不是关键问题 - 仓库仍然已初始化
          console.error("Failed to create initial commit:", commitError);
        }
      }

      return createSuccessResult(result);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, "Failed to initialize repository")
      );
    }
  }

  /**
   * Clones a Git repository
   * 克隆 Git 仓库
   *
   * @param url - URL of the repository to clone
   *            - 要克隆的仓库 URL
   * @param options - Clone options
   *                - 克隆选项
   * @returns Promise resolving to operation result
   *          解析为操作结果的 Promise
   */
  async cloneRepo(
    url: string,
    options: GitRepositoryOptions = {}
  ): Promise<OperationResult<string>> {
    try {
      await this.ensureRepoPathExists();
      const result = await this.git.clone(url, this.repoPath, options);
      return createSuccessResult(result);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, `Failed to clone repository from ${url}`)
      );
    }
  }

  /**
   * Gets the status of the repository
   * 获取仓库的状态
   *
   * @returns Promise resolving to repository status
   *          解析为仓库状态的 Promise
   */
  async getStatus(): Promise<OperationResult<GitRepositoryStatus>> {
    try {
      const status = await this.git.status();
      return createSuccessResult(status);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, "Failed to get repository status")
      );
    }
  }

  // ==========================================
  // Commit Operations
  // 提交操作
  // ==========================================

  /**
   * Stages files for commit
   * 暂存文件以进行提交
   *
   * @param files - Array of file paths to stage, or '.' for all
   *              - 要暂存的文件路径数组，或使用 '.' 表示全部
   * @returns Promise resolving to operation result
   *          解析为操作结果的 Promise
   */
  async stageFiles(
    files: string[] | string = "."
  ): Promise<OperationResult<string>> {
    try {
      let validatedFiles: string[] | string;
      if (Array.isArray(files)) {
        if (files.length === 0) {
          return createSuccessResult("No files to stage");
        }
        // Validate each file path in the array
        // 验证数组中的每个文件路径
        validatedFiles = files.map((file) =>
          this.validateRelativePath(file, "files")
        );
      } else {
        // Validate the single file path (unless it's '.')
        // 验证单个文件路径（除非是 '.'）
        validatedFiles = this.validateRelativePath(files, "files");
      }

      const result = await this.git.add(validatedFiles); // Use validated files
      return createSuccessResult(result);
    } catch (error) {
      // Check if it's our standardized error by looking for errorCode property
      // 通过查找 errorCode 属性检查它是否为我们的标准化错误
      if ((error as StandardizedApplicationErrorObject)?.errorCode) {
        throw error; // Rethrow standardized errors directly
      }
      return createFailureResult(
        this.handleGitError(error, "Failed to stage files")
      );
    }
  }

  /**
   * Unstages files
   * 取消暂存文件
   *
   * @param files - Array of file paths to unstage, or '.' for all
   *              - 要取消暂存的文件路径数组，或使用 '.' 表示全部
   * @returns Promise resolving to operation result
   *          解析为操作结果的 Promise
   */
  async unstageFiles(
    files: string[] | string = "."
  ): Promise<OperationResult<string>> {
    try {
      let validatedFiles: string[] | string;
      if (Array.isArray(files)) {
        if (files.length === 0) {
          return createSuccessResult("No files to unstage");
        }
        // Validate each file path in the array
        // 验证数组中的每个文件路径
        validatedFiles = files.map((file) =>
          this.validateRelativePath(file, "files")
        );
      } else {
        // Validate the single file path (unless it's '.')
        // 验证单个文件路径（除非是 '.'）
        validatedFiles = this.validateRelativePath(files, "files");
      }

      // Use reset to unstage files
      // 使用 reset 来取消暂存文件
      const result = await this.git.reset([
        "--",
        ...(Array.isArray(validatedFiles) ? validatedFiles : [validatedFiles]),
      ]); // Use validated files
      return createSuccessResult(result);
    } catch (error) {
      // Check if it's our standardized error by looking for errorCode property
      // 通过查找 errorCode 属性检查它是否为我们的标准化错误
      if ((error as StandardizedApplicationErrorObject)?.errorCode) {
        throw error; // Rethrow standardized errors directly
      }
      return createFailureResult(
        this.handleGitError(error, "Failed to unstage files")
      );
    }
  }

  /**
   * Creates a commit
   * 创建提交
   *
   * @param options - Commit options
   *                - 提交选项
   * @returns Promise resolving to commit hash
   *          解析为提交哈希的 Promise
   */
  async commit(options: GitCommitOptions): Promise<OperationResult<string>> {
    try {
      // Simple-git uses the underlying git config for author information
      // when these specific options aren't provided, so we'll only set
      // them when explicitly specified
      // 当未提供这些特定选项时，simple-git 使用底层 git 配置获取作者信息，
      // 因此我们只在明确指定时设置它们
      const commitOptions: any = {
        "--allow-empty": options.allowEmpty ? null : undefined,
        "--amend": options.amend ? null : undefined,
      };

      if (options.author && options.author.name) {
        commitOptions["--author"] = `${options.author.name} <${
          options.author.email || ""
        }>`;
      }
      const result = await this.git.commit(options.message, commitOptions);
      return createSuccessResult(result.commit || "");
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, "Failed to create commit")
      );
    }
  }

  // ==========================================
  // Branch Operations
  // 分支操作
  // ==========================================

  /**
   * Creates a new branch
   * 创建新分支
   *
   * @param options - Branch options
   *                - 分支选项
   * @returns Promise resolving to operation result
   *          解析为操作结果的 Promise
   */
  async createBranch(
    options: GitBranchOptions
  ): Promise<OperationResult<string>> {
    try {
      const branchParams = [options.name];
      if (options.startPoint) branchParams.push(options.startPoint);

      await this.git.branch(branchParams);

      if (options.checkout) {
        await this.git.checkout(options.name);
      }

      return createSuccessResult(
        `Branch '${options.name}' created successfully`
      );
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, `Failed to create branch '${options.name}'`)
      );
    }
  }

  /**
   * Lists all branches
   * 列出所有分支
   *
   * @param all - Whether to include remote branches
   *             - 是否包括远程分支
   * @returns Promise resolving to branch summary including current branch
   *          解析为包含当前分支的分支摘要的 Promise
   */
  async listBranches(all = false): Promise<OperationResult<BranchSummary>> {
    // Return BranchSummary
    try {
      const branchSummary = await this.git.branch(all ? ["-a"] : []);
      // Directly return the summary object provided by simple-git
      return createSuccessResult(branchSummary);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, "Failed to list branches")
      );
    }
  }

  /**
   * Checkout a branch or commit
   * 检查分支或提交
   *
   * @param target - Branch name, commit hash, or reference to checkout
   *                - 分支名称、提交哈希或参考检查
   * @param createBranch - Whether to create the branch if it doesn't exist
   *                      - 如果分支不存在，则创建分支
   * @returns Promise resolving to operation result
   *          解析为操作结果的 Promise
   */
  async checkout(
    target: string,
    createBranch = false
  ): Promise<OperationResult<string>> {
    try {
      const options = createBranch ? ["-b"] : [];
      const result = await this.git.checkout([...options, target]);
      return createSuccessResult(result);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, `Failed to checkout '${target}'`)
      );
    }
  }

  /**
   * Delete a branch
   * 删除分支
   *
   * @param branchName - Name of the branch to delete
   *                    - 要删除的分支名称
   * @param force - Whether to force delete
   *               - 是否强制删除
   * @returns Promise resolving to operation result
   *          解析为操作结果的 Promise
   */
  async deleteBranch(
    branchName: string,
    force = false
  ): Promise<OperationResult<string>> {
    try {
      const options = force ? ["-D"] : ["-d"];
      const result = await this.git.branch([...options, branchName]);
      return createSuccessResult(result);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, `Failed to delete branch '${branchName}'`)
      );
    }
  }

  /**
   * Merge a branch into the current branch
   * 将分支合并到当前分支
   *
   * @param options - Merge options
   *                - 合并选项
   * @returns Promise resolving to merge result
   *          解析为合并结果的 Promise
   */
  async merge(options: GitMergeOptions): Promise<OperationResult<string>> {
    try {
      const mergeParams = [options.branch];

      if (options.fastForwardOnly) mergeParams.unshift("--ff-only");
      if (options.noFastForward) mergeParams.unshift("--no-ff");
      if (options.message) {
        mergeParams.unshift("-m", options.message);
      }

      const result = await this.git.merge(mergeParams);
      return createSuccessResult(result);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, `Failed to merge branch '${options.branch}'`)
      );
    }
  }

  // ==========================================
  // Remote Operations
  // 远程操作
  // ==========================================

  /**
   * Add a remote
   * 添加远程
   *
   * @param options - Remote options
   *                - 远程选项
   * @returns Promise resolving to operation result
   *          解析为操作结果的 Promise
   */
  async addRemote(options: GitRemoteOptions): Promise<OperationResult<string>> {
    try {
      const result = await this.git.addRemote(options.name, options.url);
      return createSuccessResult(result);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, `Failed to add remote '${options.name}'`)
      );
    }
  }

  /**
   * List remotes
   * 列出远程
   *
   * @returns Promise resolving to list of remotes
   *          解析为远程列表的 Promise
   */
  async listRemotes(): Promise<
    OperationResult<
      Array<{ name: string; refs: { fetch: string; push: string } }>
    >
  > {
    try {
      const remotes = await this.git.getRemotes(true);
      return createSuccessResult(remotes);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, "Failed to list remotes")
      );
    }
  }

  /**
   * Fetch from a remote
   * 从远程获取
   *
   * @param remote - Remote to fetch from (default: origin)
   *                - 要从远程获取的远程（默认值：origin）
   * @param branch - Branch to fetch (default: all branches)
   *                - 要获取的分支（默认值：所有分支）
   * @returns Promise resolving to fetch result
   *          解析为获取结果的 Promise
   */
  async fetch(
    remote = "origin",
    branch?: string
  ): Promise<OperationResult<string>> {
    try {
      const options = branch ? [remote, branch] : [remote];
      const result = await this.git.fetch(options);
      return createSuccessResult(result);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, `Failed to fetch from remote '${remote}'`)
      );
    }
  }

  /**
   * Pull from a remote
   * 从远程获取
   *
   * @param options - Pull options
   *                - 拉取选项
   * @returns Promise resolving to pull result
   *          解析为拉取结果的 Promise
   */
  async pull(options: GitPullOptions = {}): Promise<OperationResult<string>> {
    try {
      const pullOptions: Record<string, any> = {};

      if (options.remote) pullOptions.remote = options.remote;
      if (options.branch) pullOptions.branch = options.branch;
      if (options.rebase) pullOptions["--rebase"] = null;

      const result = await this.git.pull(pullOptions);
      return createSuccessResult(result);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, "Failed to pull changes")
      );
    }
  }

  /**
   * Push to a remote
   * 推送至远程
   *
   * @param options - Push options
   *                - 推送选项
   * @returns Promise resolving to push result
   *          解析为推送结果的 Promise
   */
  async push(options: GitPushOptions = {}): Promise<OperationResult<string>> {
    try {
      const pushOptions: string[] = [];

      if (options.force) pushOptions.push("--force");
      if (options.setUpstream) pushOptions.push("--set-upstream");

      const remote = options.remote || "origin";
      const branch = options.branch || "HEAD";

      const result = await this.git.push(remote, branch, pushOptions);
      return createSuccessResult(result);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, "Failed to push changes")
      );
    }
  }

  // ==========================================
  // History Operations
  // 历史操作
  // ==========================================

  /**
   * Get commit history
   * 获取提交历史
   *
   * @param options - Options for git log
   *                - git log 选项
   * @returns Promise resolving to commit history
   *          解析为提交历史的 Promise
   */
  async getLog(
    options: { maxCount?: number; file?: string } = {}
  ): Promise<OperationResult<GitLogEntry[]>> {
    try {
      let validatedFilePath: string | undefined;
      if (options.file) {
        validatedFilePath = this.validateRelativePath(
          options.file,
          "options.file"
        );
      }

      // Build options object for simple-git in the format it expects
      const logOptions: any = {
        maxCount: options.maxCount || 50,
        format: {
          hash: "%H",
          abbrevHash: "%h",
          author_name: "%an",
          author_email: "%ae",
          date: "%ai",
          message: "%s",
        },
      };

      if (validatedFilePath) {
        logOptions.file = validatedFilePath; // Use validated path
      }

      const result = await this.git.log(logOptions);

      // Parse the log output into structured data
      const entries: GitLogEntry[] = result.all.map((entry: any) => ({
        hash: entry.hash,
        abbrevHash: entry.hash.substring(0, 7),
        author: entry.author_name,
        authorEmail: entry.author_email,
        date: new Date(entry.date),
        message: entry.message,
        refs: entry.refs,
      }));

      return createSuccessResult(entries);
    } catch (error) {
      // Check if it's our standardized error by looking for errorCode property
      if ((error as StandardizedApplicationErrorObject)?.errorCode) {
        throw error; // Rethrow standardized errors directly
      }
      return createFailureResult(
        this.handleGitError(error, "Failed to get commit history")
      );
    }
  }

  /**
   * Get file blame information
   * 获取文件行号信息
   *
   * @param filePath - Path to the file
   *                  - 文件路径
   * @returns Promise resolving to blame information
   *          解析为行号信息的 Promise
   */
  async getBlame(filePath: string): Promise<OperationResult<string>> {
    try {
      const validatedPath = this.validateRelativePath(filePath, "filePath");
      const result = await this.git.raw(["blame", validatedPath]); // Use validated path
      return createSuccessResult(result);
    } catch (error) {
      // Check if it's our standardized error by looking for errorCode property
      if ((error as StandardizedApplicationErrorObject)?.errorCode) {
        throw error; // Rethrow standardized errors directly
      }
      return createFailureResult(
        this.handleGitError(error, `Failed to get blame for file '${filePath}'`)
      );
    }
  }

  /**
   * Get the diff between commits
   * 获取提交之间的差异
   *
   * @param fromRef - Starting reference (commit, branch, etc.)
   *                - 起始参考（提交、分支等）
   * @param toRef - Ending reference (default: current working tree)
   *                - 结束参考（默认值：当前工作目录）
   * @param path - Optional path to restrict the diff to
   *                - 可选路径以限制差异
   * @returns Promise resolving to diff information
   *          解析为差异信息的 Promise
   */
  async getDiff(
    fromRef: string,
    toRef = "HEAD",
    filePath?: string
  ): Promise<OperationResult<GitDiffEntry[]>> {
    // Renamed path to filePath for clarity
    try {
      let validatedPath: string | undefined;
      if (filePath) {
        validatedPath = this.validateRelativePath(filePath, "filePath");
      }

      const args = ["diff", "--name-status", fromRef];

      if (toRef !== "HEAD") {
        args.push(toRef);
      }

      if (validatedPath) {
        args.push("--", validatedPath); // Use validated path
      }

      const result = await this.git.raw(args);
      const entries: GitDiffEntry[] = [];

      // Parse the diff output into structured data
      const lines = result
        .split("\n")
        .filter((line: string) => line.trim() !== "");

      for (const line of lines) {
        const [status, ...pathParts] = line.split("\t");
        const filePath = pathParts.join("\t");

        entries.push({
          path: filePath,
          // Mapping status letters to more descriptive terms
          status:
            status === "A"
              ? "added"
              : status === "M"
              ? "modified"
              : status === "D"
              ? "deleted"
              : status === "R"
              ? "renamed"
              : status === "C"
              ? "copied"
              : status,
        });
      }

      return createSuccessResult(entries);
    } catch (error) {
      // Check if it's our standardized error by looking for errorCode property
      if ((error as StandardizedApplicationErrorObject)?.errorCode) {
        throw error; // Rethrow standardized errors directly
      }
      return createFailureResult(
        this.handleGitError(error, "Failed to get diff")
      );
    }
  }

  /**
   * Get the content of a file at a specific reference
   * 获取特定参考的文件内容
   *
   * @param filePath - Path to the file
   *                  - 文件路径
   * @param ref - Git reference (commit, branch, etc.)
   *              - Git 参考（提交、分支等）
   * @returns Promise resolving to file content
   *          解析为文件内容的 Promise
   */
  async getFileAtRef(
    filePath: string,
    ref = "HEAD"
  ): Promise<OperationResult<string>> {
    try {
      const validatedPath = this.validateRelativePath(filePath, "filePath");
      // Note: simple-git's show command expects the path within the ref string itself.
      // We validated the path component, but we still construct the argument as needed.
      const result = await this.git.show([`${ref}:${validatedPath}`]); // Use validated path component
      return createSuccessResult(result);
    } catch (error) {
      // Check if it's our standardized error by looking for errorCode property
      if ((error as StandardizedApplicationErrorObject)?.errorCode) {
        throw error; // Rethrow standardized errors directly
      }
      return createFailureResult(
        this.handleGitError(
          error,
          `Failed to get file '${filePath}' at ref '${ref}'`
        )
      );
    }
  }

  /**
   * Get unstaged diff (changes in working directory)
   * 获取未暂存差异（工作目录中的更改）
   *
   * @param path - Optional path to restrict the diff to
   *                - 可选路径以限制差异
   * @param showUntracked - Whether to include information about untracked files
   *                        - 是否包括有关未跟踪文件的信息
   * @returns Promise resolving to diff content
   *          解析为差异内容的 Promise
   */
  async getUnstagedDiff(
    filePath?: string,
    showUntracked = true
  ): Promise<OperationResult<string>> {
    // Renamed path to filePath
    try {
      let validatedPath: string | undefined;
      if (filePath) {
        validatedPath = this.validateRelativePath(filePath, "filePath");
      }

      const args = ["diff"];

      if (validatedPath) {
        args.push("--", validatedPath); // Use validated path
      }

      let diffResult = await this.git.raw(args);

      // If requested, also include information about untracked files
      if (showUntracked) {
        try {
          // Get status to find untracked files
          const statusResult = await this.getStatus();

          if (
            statusResult.resultSuccessful &&
            statusResult.resultData.not_added.length > 0
          ) {
            // Filter untracked files by validatedPath if specified
            const untrackedFiles = validatedPath
              ? statusResult.resultData.not_added.filter(
                  (file) =>
                    file === validatedPath ||
                    file.startsWith(validatedPath + "/")
                )
              : statusResult.resultData.not_added;

            if (untrackedFiles.length > 0) {
              // Add header for untracked files if we have a diff and untracked files
              if (diffResult.trim() !== "") {
                diffResult += "\n\n";
              }

              diffResult += "# Untracked files:\n";
              for (const file of untrackedFiles) {
                diffResult += `# - ${file}\n`;
              }
            }
          }
        } catch (error) {
          // Silently ignore errors with listing untracked files
          console.error("Error listing untracked files:", error);
        }
      }

      return createSuccessResult(diffResult);
    } catch (error) {
      // Check if it's our standardized error by looking for errorCode property
      if ((error as StandardizedApplicationErrorObject)?.errorCode) {
        throw error; // Rethrow standardized errors directly
      }
      return createFailureResult(
        this.handleGitError(error, "Failed to get unstaged diff")
      );
    }
  }

  /**
   * Get staged diff (changes in index)
   * 获取暂存差异（索引中的更改）
   *
   * @param path - Optional path to restrict the diff to
   *                - 可选路径以限制差异
   * @returns Promise resolving to diff content
   *          解析为差异内容的 Promise
   */
  async getStagedDiff(filePath?: string): Promise<OperationResult<string>> {
    // Renamed path to filePath
    try {
      let validatedPath: string | undefined;
      if (filePath) {
        validatedPath = this.validateRelativePath(filePath, "filePath");
      }

      const args = ["diff", "--cached"];

      if (validatedPath) {
        args.push("--", validatedPath); // Use validated path
      }

      const result = await this.git.raw(args);
      return createSuccessResult(result);
    } catch (error) {
      // Check if it's our standardized error by looking for errorCode property
      if ((error as StandardizedApplicationErrorObject)?.errorCode) {
        throw error; // Rethrow standardized errors directly
      }
      return createFailureResult(
        this.handleGitError(error, "Failed to get staged diff")
      );
    }
  }

  /**
   * List files in a directory at a specific reference
   * 获取特定参考的目录中的文件列表
   *
   * @param dirPath - Path to the directory (relative to the repo root)
   *                  - 目录路径（相对于仓库根目录）
   * @param ref - Git reference (commit, branch, etc.)
   *              - Git 参考（提交、分支等）
   * @returns Promise resolving to list of immediate files/directories within the specified path
   *          解析为在指定路径中列出直接文件/目录的 Promise
   */
  async listFilesAtRef(
    dirPath: string = ".",
    ref = "HEAD"
  ): Promise<OperationResult<string[]>> {
    try {
      const validatedDirPath = this.validateRelativePath(dirPath, "dirPath");

      // Remove '-r' to list only immediate children, not recursive
      // Use the validated path
      const result = await this.git.raw([
        "ls-tree",
        "--name-only",
        ref,
        validatedDirPath,
      ]);

      // Parse the output
      const files = result
        .split("\n")
        .filter((line: string) => line.trim() !== "");
      // No need for post-filtering, ls-tree with validatedDirPath handles it.
      // .filter((file: string) => {
      //   // If validatedDirPath is empty or root, include all files
      //   if (!validatedDirPath || validatedDirPath === '.') {
      //     return true;
      //   }

      //   // Otherwise, only include files that are within the directory
      //   // This check might be redundant now with ls-tree using the validated path
      //   return file.startsWith(validatedDirPath + '/');
      // });

      return createSuccessResult(files);
    } catch (error) {
      // Check if it's our standardized error by looking for errorCode property
      if ((error as StandardizedApplicationErrorObject)?.errorCode) {
        throw error; // Rethrow standardized errors directly
      }
      return createFailureResult(
        this.handleGitError(
          error,
          `Failed to list files in directory '${dirPath}' at ref '${ref}'`
        )
      );
    }
  }

  // ==========================================
  // Advanced Operations
  // 高级操作
  // ==========================================

  /**
   * Create a tag
   * 创建标签
   *
   * @param options - Tag options
   *                - 标签选项
   * @returns Promise resolving to operation result
   *          解析为操作结果的 Promise
   */
  async createTag(options: GitTagOptions): Promise<OperationResult<string>> {
    try {
      const tagArgs = [options.name];

      if (options.ref) {
        tagArgs.push(options.ref);
      }

      if (options.message) {
        tagArgs.unshift("-m", options.message);
        // -a creates an annotated tag
        tagArgs.unshift("-a");
      }

      const result = await this.git.tag(tagArgs);
      return createSuccessResult(result);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, `Failed to create tag '${options.name}'`)
      );
    }
  }

  /**
   * List tags
   * 列出标签
   *
   * @returns Promise resolving to list of tags
   *          解析为标签列表的 Promise
   */
  async listTags(): Promise<OperationResult<string[]>> {
    try {
      const tags = await this.git.tags();
      return createSuccessResult(tags.all);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, "Failed to list tags")
      );
    }
  }

  /**
   * Create a stash
   * 创建存档
   *
   * @param options - Stash options
   *                - 存档选项
   * @returns Promise resolving to operation result
   *          解析为操作结果的 Promise
   */
  async createStash(
    options: GitStashOptions = {}
  ): Promise<OperationResult<string>> {
    try {
      const stashArgs: string[] = [];

      if (options.message) {
        stashArgs.push("save", options.message);
      }

      if (options.includeUntracked) {
        stashArgs.push("--include-untracked");
      }

      const result = await this.git.stash(stashArgs);
      return createSuccessResult(result);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, "Failed to create stash")
      );
    }
  }

  /**
   * List stashes
   * 列出存档
   *
   * @returns Promise resolving to list of stashes
   *          解析为存档列表的 Promise
   */
  async listStashes(): Promise<OperationResult<string>> {
    try {
      const result = await this.git.stash(["list"]);
      return createSuccessResult(result);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, "Failed to list stashes")
      );
    }
  }

  /**
   * Show a commit's details
   * 显示提交详细信息
   *
   * @param commitHash - Hash of the commit to show
   *                    - 要显示的提交哈希
   * @returns Promise resolving to commit details
   *          解析为提交详细信息的 Promise
   */
  async showCommit(commitHash: string): Promise<OperationResult<string>> {
    try {
      const result = await this.git.raw(["show", commitHash]);
      return createSuccessResult(result);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, `Failed to show commit '${commitHash}'`)
      );
    }
  }

  /**
   * Apply a stash
   * 应用存档
   *
   * @param stashId - Stash identifier (default: most recent stash)
   *                  - 存档标识符（默认值：最近一次存档）
   * @returns Promise resolving to operation result
   *          解析为操作结果的 Promise
   */
  async applyStash(stashId = "stash@{0}"): Promise<OperationResult<string>> {
    try {
      const result = await this.git.stash(["apply", stashId]);
      return createSuccessResult(result);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, `Failed to apply stash '${stashId}'`)
      );
    }
  }

  /**
   * Pop a stash
   * 弹出存档
   *
   * @param stashId - Stash identifier (default: most recent stash)
   *                  - 存档标识符（默认值：最近一次存档）
   * @returns Promise resolving to operation result
   *          解析为操作结果的 Promise
   */
  async popStash(stashId = "stash@{0}"): Promise<OperationResult<string>> {
    try {
      const result = await this.git.stash(["pop", stashId]);
      return createSuccessResult(result);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, `Failed to pop stash '${stashId}'`)
      );
    }
  }

  /**
   * Cherry-pick commits
   * 挑选提交
   *
   * @param commits - Array of commit hashes to cherry-pick
   *                  - 要挑选的提交哈希数组
   * @returns Promise resolving to operation result
   *          解析为操作结果的 Promise
   */
  async cherryPick(commits: string[]): Promise<OperationResult<string>> {
    try {
      if (commits.length === 0) {
        return createSuccessResult("No commits specified for cherry-pick");
      }

      const result = await this.git.raw(["cherry-pick", ...commits]);
      return createSuccessResult(result);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, "Failed to cherry-pick commits")
      );
    }
  }

  /**
   * Rebase the current branch
   * 重置当前分支
   *
   * @param branch - Branch to rebase onto
   *                - 重置到分支
   * @param interactive - Whether to use interactive rebase
   *                      - 是否使用交互式重置
   * @returns Promise resolving to operation result
   *          解析为操作结果的 Promise
   */
  async rebase(
    branch: string,
    interactive = false
  ): Promise<OperationResult<string>> {
    try {
      const args = interactive ? ["-i", branch] : [branch];
      const result = await this.git.rebase(args);
      return createSuccessResult(result);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, `Failed to rebase onto '${branch}'`)
      );
    }
  }

  /**
   * Reset the repository to a specific commit
   * 重置仓库到特定提交
   *
   * @param ref - Reference to reset to
   *              - 重置到参考
   * @param mode - Reset mode (hard, soft, mixed)
   *                - 重置模式（硬、软、混合）
   * @returns Promise resolving to operation result
   *          解析为操作结果的 Promise
   */
  async reset(
    ref = "HEAD",
    mode: "hard" | "soft" | "mixed" = "mixed"
  ): Promise<OperationResult<string>> {
    try {
      const args = [`--${mode}`, ref];
      const result = await this.git.reset(args);
      return createSuccessResult(result);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, `Failed to reset to '${ref}'`)
      );
    }
  }

  /**
   * Clean the working directory
   * 清理工作目录
   *
   * @param directories - Whether to remove directories too
   *                        - 是否也删除目录
   * @param force - Whether to force clean
   *                - 是否强制清理
   * @returns Promise resolving to operation result
   *          解析为操作结果的 Promise
   */
  async clean(
    directories = false,
    force = false
  ): Promise<OperationResult<string>> {
    try {
      const args = ["-f"];
      if (directories) args.push("-d");
      if (force) args.push("-x");

      const result = await this.git.clean(args);
      return createSuccessResult(result);
    } catch (error) {
      return createFailureResult(
        this.handleGitError(error, "Failed to clean working directory")
      );
    }
  }
}
