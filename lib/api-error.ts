import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized: Authentication required") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden: Insufficient permissions") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = "Bad request", details?: any) {
    super(message, 400, details);
    this.name = "BadRequestError";
  }
}

/**
 * Centralized API error handler mapping to 400/401/403/404/500 per PRD Part 8 Section D.
 */
export function handleApiError(error: unknown): NextResponse {
  if (process.env.NODE_ENV !== "test") {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[API Error Caught]: ${errorMsg}`);
  }

  // 1. Zod Validation Errors -> 400
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: error.flatten(),
      },
      { status: 400 }
    );
  }

  // 2. Custom App Errors (Unauthorized, Forbidden, NotFound, BadRequest, etc.)
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
      { status: error.statusCode }
    );
  }

  // 3. Prisma Record Not Found error (P2025) -> 404
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as any).code === "P2025"
  ) {
    return NextResponse.json(
      { error: "Resource not found" },
      { status: 404 }
    );
  }

  // 4. Standard Error object or fallback -> 500
  const message =
    error instanceof Error ? error.message : "An unexpected server error occurred";

  return NextResponse.json(
    {
      error: process.env.NODE_ENV === "production" ? "Internal server error" : message,
    },
    { status: 500 }
  );
}
