/**
 * Error Handling Service
 * 错误处理服务
 * ======================
 *
 * Standardized error handling for Git operations and MCP server.
 * 为 Git 操作和 MCP 服务器提供标准化的错误处理。
 */

/**
 * Standardized error category classification
 * 标准化的错误类别分类
 */
export const ErrorCategoryType = {
  CATEGORY_VALIDATION: "VALIDATION", // 验证错误 / Validation errors
  CATEGORY_GIT: "GIT", // Git 相关错误 / Git-related errors
  CATEGORY_MCP: "MCP", // MCP 服务器错误 / MCP server errors
  CATEGORY_SYSTEM: "SYSTEM", // 系统错误 / System errors
  CATEGORY_UNKNOWN: "UNKNOWN", // 未知错误 / Unknown errors
} as const;

export type ErrorCategoryType =
  (typeof ErrorCategoryType)[keyof typeof ErrorCategoryType];

/**
 * Error severity classification
 * 错误严重程度分类
 */
export const ErrorSeverityLevel = {
  SEVERITY_DEBUG: 0, // 调试级别 / Debug level
  SEVERITY_INFO: 1, // 信息级别 / Information level
  SEVERITY_WARN: 2, // 警告级别 / Warning level
  SEVERITY_ERROR: 3, // 错误级别 / Error level
  SEVERITY_FATAL: 4, // 致命级别 / Fatal level
} as const;

export type ErrorSeverityLevel =
  (typeof ErrorSeverityLevel)[keyof typeof ErrorSeverityLevel];

/**
 * Standardized error structure for consistent error handling
 * 标准化的错误结构，用于一致的错误处理
 */
export interface StandardizedApplicationErrorObject {
  errorMessage: string; // 人类可读的错误描述 / Human-readable description
  errorCode: string; // 机器可读的标识符 / Machine-readable identifier
  errorCategory: ErrorCategoryType; // 受影响的系统区域 / System area affected
  errorSeverity: ErrorSeverityLevel; // 错误的严重程度 / How critical the error is
  errorTimestamp: string; // 错误发生的时间 / When the error occurred
  errorContext: Record<string, unknown>; // 额外的相关数据 / Additional relevant data
  errorStack?: string; // 可用的堆栈跟踪 / Stack trace if available
}

/**
 * Creates a standardized success result
 * 创建标准化的成功结果
 */
export function createSuccessResult<DataType>(data: DataType): {
  resultSuccessful: true;
  resultData: DataType;
} {
  return { resultSuccessful: true, resultData: data };
}

/**
 * Creates a standardized failure result
 * 创建标准化的失败结果
 */
export function createFailureResult<ErrorType>(error: ErrorType): {
  resultSuccessful: false;
  resultError: ErrorType;
} {
  return { resultSuccessful: false, resultError: error };
}

/**
 * Creates a standardized error object
 * 创建标准化的错误对象
 */
export function createStandardizedError(
  message: string,
  code: string,
  category: ErrorCategoryType,
  severity: ErrorSeverityLevel,
  context: Record<string, unknown> = {}
): StandardizedApplicationErrorObject {
  return {
    errorMessage: message,
    errorCode: code,
    errorCategory: category,
    errorSeverity: severity,
    errorTimestamp: new Date().toISOString(),
    errorContext: context,
  };
}

/**
 * Converts an exception to a standardized error object
 * 将异常转换为标准化的错误对象
 */
export function wrapExceptionAsStandardizedError(
  exception: unknown,
  defaultMessage: string
): StandardizedApplicationErrorObject {
  const errorMessage =
    exception instanceof Error ? exception.message : defaultMessage;
  const errorStack = exception instanceof Error ? exception.stack : undefined;

  return {
    errorMessage,
    errorCode: "UNEXPECTED_ERROR",
    errorCategory: ErrorCategoryType.CATEGORY_UNKNOWN,
    errorSeverity: ErrorSeverityLevel.SEVERITY_ERROR,
    errorTimestamp: new Date().toISOString(),
    errorContext: { originalException: exception },
    errorStack,
  };
}

/**
 * Handles Git-specific errors and converts them to standardized format
 * 处理 Git 特定错误并将其转换为标准化格式
 */
export function createGitError(
  message: string,
  code: string,
  context: Record<string, unknown> = {}
): StandardizedApplicationErrorObject {
  return createStandardizedError(
    message,
    code,
    ErrorCategoryType.CATEGORY_GIT,
    ErrorSeverityLevel.SEVERITY_ERROR,
    context
  );
}

/**
 * Combined type for operation results
 * 操作结果的组合类型
 */
export type OperationResult<
  DataType,
  ErrorType = StandardizedApplicationErrorObject
> =
  | { resultSuccessful: true; resultData: DataType }
  | { resultSuccessful: false; resultError: ErrorType };
