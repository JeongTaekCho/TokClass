export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const unauthorized = (msg = "다시 입장해 주세요.") => new ApiError(401, msg, "unauthorized");
export const forbidden = (msg = "이 작업을 할 권한이 없어요.") => new ApiError(403, msg, "forbidden");
export const notFound = (msg = "찾을 수 없어요.") => new ApiError(404, msg, "not_found");
export const badRequest = (msg = "입력값을 확인해 주세요.") => new ApiError(400, msg, "bad_request");
