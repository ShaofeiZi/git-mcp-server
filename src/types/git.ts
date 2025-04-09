/**
 * Git-Related Type Definitions
 * Git 相关类型定义
 * ============================
 *
 * Type definitions for Git operations and entities used throughout the server.
 * 服务器中使用的 Git 操作和实体的类型定义。
 */

/**
 * Options for repository operations
 * 仓库操作的选项
 */
export interface GitRepositoryOptions {
  /** Git directory path (default: .git) */
  /** Git 目录路径（默认：.git） */
  gitdir?: string;
  /** Bare repository flag */
  /** 裸仓库标志 */
  bare?: boolean;
  /** Optional depth for shallow clones */
  /** 浅克隆的可选深度 */
  depth?: number;
  /** Optional branch name to checkout */
  /** 要检出的可选分支名称 */
  branch?: string;
  /** Optional remote name */
  /** 可选的远程名称 */
  remote?: string;
}

/**
 * Options for commit operations
 * 提交操作的选项
 */
export interface GitCommitOptions {
  /** Commit message */
  /** 提交消息 */
  message: string;
  /** Optional author name */
  /** 可选的作者名称 */
  author?: {
    name?: string;
    email?: string;
  };
  /** Optional commit date */
  /** 可选的提交日期 */
  date?: Date;
  /** Whether to allow empty commits */
  /** 是否允许空提交 */
  allowEmpty?: boolean;
  /** Whether to amend the previous commit */
  /** 是否修改上一次提交 */
  amend?: boolean;
}

/**
 * Options for branch operations
 * 分支操作的选项
 */
export interface GitBranchOptions {
  /** Branch name */
  /** 分支名称 */
  name: string;
  /** Whether to checkout the branch after creation */
  /** 创建后是否检出分支 */
  checkout?: boolean;
  /** Reference to create branch from */
  /** 创建分支的参考点 */
  startPoint?: string;
}

/**
 * Options for merge operations
 * 合并操作的选项
 */
export interface GitMergeOptions {
  /** Branch to merge */
  /** 要合并的分支 */
  branch: string;
  /** Whether to fast-forward if possible */
  /** 是否在可能的情况下快进 */
  fastForwardOnly?: boolean;
  /** Whether to create a merge commit (no fast-forward) */
  /** 是否创建合并提交（不快进） */
  noFastForward?: boolean;
  /** Commit message for merge */
  /** 合并的提交消息 */
  message?: string;
}

/**
 * Options for remote operations
 * 远程操作的选项
 */
export interface GitRemoteOptions {
  /** Remote name */
  /** 远程名称 */
  name: string;
  /** Remote URL */
  /** 远程 URL */
  url: string;
}

/**
 * Options for pull operations
 * 拉取操作的选项
 */
export interface GitPullOptions {
  /** Remote name */
  /** 远程名称 */
  remote?: string;
  /** Branch name */
  /** 分支名称 */
  branch?: string;
  /** Whether to rebase instead of merge */
  /** 是否使用变基而不是合并 */
  rebase?: boolean;
}

/**
 * Options for push operations
 * 推送操作的选项
 */
export interface GitPushOptions {
  /** Remote name */
  /** 远程名称 */
  remote?: string;
  /** Branch name */
  /** 分支名称 */
  branch?: string;
  /** Whether to force push */
  /** 是否强制推送 */
  force?: boolean;
  /** Whether to set upstream */
  /** 是否设置上游 */
  setUpstream?: boolean;
}

/**
 * Options for tag operations
 * 标签操作的选项
 */
export interface GitTagOptions {
  /** Tag name */
  /** 标签名称 */
  name: string;
  /** Optional tag message (creates annotated tag) */
  /** 可选的标签消息（创建附注标签） */
  message?: string;
  /** Reference to create tag from */
  /** 创建标签的参考点 */
  ref?: string;
}

/**
 * Options for stash operations
 * 存储操作的选项
 */
export interface GitStashOptions {
  /** Optional stash message */
  /** 可选的存储消息 */
  message?: string;
  /** Whether to include untracked files */
  /** 是否包括未跟踪的文件 */
  includeUntracked?: boolean;
}

/**
 * Git log entry
 * Git 日志条目
 */
export interface GitLogEntry {
  /** Commit hash */
  /** 提交哈希 */
  hash: string;
  /** Abbreviated commit hash */
  /** 缩写的提交哈希 */
  abbrevHash: string;
  /** Author name */
  /** 作者名称 */
  author: string;
  /** Author email */
  /** 作者电子邮件 */
  authorEmail: string;
  /** Author date */
  /** 作者日期 */
  date: Date;
  /** Commit message */
  /** 提交消息 */
  message: string;
  /** Reference names (branches, tags) */
  /** 参考名称（分支、标签） */
  refs?: string;
}

/**
 * Git file status
 * Git 文件状态
 */
export interface GitFileStatus {
  /** File path */
  /** 文件路径 */
  path: string;
  /** File status (added, modified, deleted, etc.) */
  /** 文件状态（添加、修改、删除等） */
  status: string;
  /** Index status */
  /** 索引状态 */
  index?: string;
  /** Working directory status */
  /** 工作目录状态 */
  working_dir?: string;
}

/**
 * Git repository status
 * Git 仓库状态
 */
export interface GitRepositoryStatus {
  /** Current branch */
  /** 当前分支 */
  current: string;
  /** Tracking branch */
  /** 跟踪分支 */
  tracking?: string;
  /** Whether the repository is detached HEAD */
  /** 仓库是否处于分离的 HEAD 状态 */
  detached: boolean;
  /** List of files with status */
  /** 带状态的文件列表 */
  files: GitFileStatus[];
  /** Whether the repository has conflicts */
  /** 仓库是否有冲突 */
  conflicted: string[];
  /** Modified files */
  /** 修改的文件 */
  modified: string[];
  /** Deleted files */
  /** 删除的文件 */
  deleted: string[];
  /** Created files */
  /** 创建的文件 */
  created: string[];
  /** Renamed files */
  /** 重命名的文件 */
  renamed: string[];
  /** Untracked files */
  /** 未跟踪的文件 */
  not_added: string[];
  /** Whether the repository is clean */
  /** 仓库是否干净 */
  isClean(): boolean;
}

/**
 * Git diff entry
 * Git 差异条目
 */
export interface GitDiffEntry {
  /** File path */
  /** 文件路径 */
  path: string;
  /** Status of the file (added, modified, deleted, etc.) */
  /** 文件状态（添加、修改、删除等） */
  status?: string;
  /** Old file path (for renames) */
  /** 旧文件路径（用于重命名） */
  oldPath?: string;
  /** Whether the file is binary */
  /** 文件是否为二进制 */
  binary?: boolean;
  /** Diff content */
  /** 差异内容 */
  content?: string;
  /** Added lines count */
  /** 添加的行数 */
  added?: number;
  /** Deleted lines count */
  /** 删除的行数 */
  deleted?: number;
}

/**
 * Git error interface
 * Git 错误接口
 */
export interface GitError extends Error {
  /** Git error code */
  /** Git 错误代码 */
  code?: string;
  /** Command that caused the error */
  /** 导致错误的命令 */
  command?: string;
  /** Command arguments */
  /** 命令参数 */
  args?: string[];
  /** Git stderr output */
  /** Git 标准错误输出 */
  stderr?: string;
}
