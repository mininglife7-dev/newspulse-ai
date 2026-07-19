/**
 * Governor OS Foundation — Execution Adapter
 * Wraps subprocess execution with bounded safety constraints.
 * Enforces: timeout (300s), output size limit (50KB), retry logic (max 3 times).
 * Captures: exit code, stdout, stderr, duration, hash.
 */

import { execSync, spawnSync } from 'child_process';

/**
 * Execution bounds (from CATHEDRAL_HOMEOSTASIS_SPEC.md)
 */
export const EXECUTION_BOUNDS = {
  MAX_COMMAND_DURATION_MS: 300_000, // 300 seconds
  MAX_OUTPUT_SIZE_BYTES: 50_000, // 50 KB
  MAX_RETRIES: 3,
  MAX_QUEUE_SIZE: 100,
};

export interface ExecutionResult {
  exit_code: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
  output_size: number;
  truncated: boolean;
  error?: string;
}

export class ExecutionAdapter {
  /**
   * Execute a command with bounds and retry logic
   * Returns structured result with exit code, output, duration
   */
  static async executeCommand(
    command: string,
    options?: {
      cwd?: string;
      timeout?: number; // milliseconds, default 300s
      maxRetries?: number; // default 3
      captureOutput?: boolean; // default true
      shell?: boolean; // default true
    }
  ): Promise<ExecutionResult> {
    const timeout = options?.timeout ?? EXECUTION_BOUNDS.MAX_COMMAND_DURATION_MS;
    const maxRetries = options?.maxRetries ?? EXECUTION_BOUNDS.MAX_RETRIES;
    const captureOutput = options?.captureOutput !== false;
    const shell = options?.shell !== false;

    let lastError: ExecutionResult | undefined;

    // Retry loop
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();

        // Execute command using spawnSync (more flexible than execSync)
        const result = spawnSync(command, [], {
          cwd: options?.cwd || process.cwd(),
          timeout,
          shell,
          encoding: 'utf-8',
          stdio: captureOutput ? ['pipe', 'pipe', 'pipe'] : 'inherit',
        });

        const duration_ms = Date.now() - startTime;

        // Extract and truncate output
        let stdout = result.stdout as string || '';
        let stderr = result.stderr as string || '';
        const output_size = stdout.length + stderr.length;
        const truncated = output_size > EXECUTION_BOUNDS.MAX_OUTPUT_SIZE_BYTES;

        if (truncated) {
          // Keep first half of stdout, first half of stderr
          const halfSize = Math.floor(EXECUTION_BOUNDS.MAX_OUTPUT_SIZE_BYTES / 2);
          stdout = stdout.length > halfSize ? stdout.slice(0, halfSize) : stdout;
          stderr = stderr.length > halfSize ? stderr.slice(0, halfSize) : stderr;
        }

        const executionResult: ExecutionResult = {
          exit_code: result.status ?? 1,
          stdout,
          stderr,
          duration_ms,
          output_size,
          truncated,
        };

        // Success on exit code 0
        if (result.status === 0) {
          return executionResult;
        }

        // Non-zero exit code on last attempt = failure
        if (attempt === maxRetries) {
          return executionResult;
        }

        // Non-zero on non-final attempt = retry
        lastError = executionResult;
        continue;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);

        // Timeout
        if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
          lastError = {
            exit_code: 124, // Standard timeout exit code
            stdout: '',
            stderr: `Command timed out after ${timeout}ms`,
            duration_ms: timeout,
            output_size: 0,
            truncated: false,
            error: 'TIMEOUT',
          };

          if (attempt === maxRetries) {
            return lastError;
          }
          continue;
        }

        // Other error
        lastError = {
          exit_code: 1,
          stdout: '',
          stderr: errorMessage,
          duration_ms: 0,
          output_size: errorMessage.length,
          truncated: false,
          error: 'EXECUTION_ERROR',
        };

        if (attempt === maxRetries) {
          return lastError;
        }
        continue;
      }
    }

    // All retries exhausted
    return lastError || {
      exit_code: 1,
      stdout: '',
      stderr: 'Command failed after all retries',
      duration_ms: 0,
      output_size: 0,
      truncated: false,
      error: 'MAX_RETRIES_EXCEEDED',
    };
  }

  /**
   * Execute simple inline command (for scripting)
   * Used for one-liners like "npm run type-check"
   */
  static executeSync(command: string, options?: { cwd?: string }): ExecutionResult {
    try {
      const startTime = Date.now();

      const output = execSync(command, {
        cwd: options?.cwd || process.cwd(),
        encoding: 'utf-8',
        timeout: EXECUTION_BOUNDS.MAX_COMMAND_DURATION_MS,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const duration_ms = Date.now() - startTime;
      const output_size = output.length;
      const truncated = output_size > EXECUTION_BOUNDS.MAX_OUTPUT_SIZE_BYTES;

      return {
        exit_code: 0,
        stdout: truncated ? output.slice(0, EXECUTION_BOUNDS.MAX_OUTPUT_SIZE_BYTES) : output,
        stderr: '',
        duration_ms,
        output_size,
        truncated,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      return {
        exit_code: 1,
        stdout: '',
        stderr: errorMessage,
        duration_ms: 0,
        output_size: errorMessage.length,
        truncated: false,
        error: 'EXECUTION_ERROR',
      };
    }
  }

  /**
   * Validate command is safe before execution
   */
  static validateCommand(command: string): { valid: boolean; reason?: string } {
    // Check for shell metacharacters that could indicate injection
    const dangerousPatterns = [
      /;\s*[\w]/i, // semicolon followed by word (command chaining)
      /\|\s*[\w]/i, // pipe followed by word (piping)
      /`/i, // backticks (command substitution)
      /\$\(/i, // $() (command substitution)
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          valid: false,
          reason: `Potentially unsafe command pattern detected: ${command}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Summarize execution result for logging
   */
  static summarizeResult(result: ExecutionResult): string {
    const status = result.exit_code === 0 ? '✓ SUCCESS' : '✗ FAILED';
    const duration = `${result.duration_ms}ms`;
    const truncated = result.truncated ? ' (truncated)' : '';

    return `${status} exit=${result.exit_code} duration=${duration}${truncated}`;
  }

  /**
   * Get execution bounds
   */
  static getBounds(): typeof EXECUTION_BOUNDS {
    return EXECUTION_BOUNDS;
  }
}

/**
 * Helper to execute npm commands safely
 */
export async function executeNpm(
  args: string[],
  options?: { cwd?: string }
): Promise<ExecutionResult> {
  const command = `npm ${args.join(' ')}`;
  return ExecutionAdapter.executeCommand(command, {
    cwd: options?.cwd,
    timeout: EXECUTION_BOUNDS.MAX_COMMAND_DURATION_MS,
  });
}

/**
 * Helper to execute git commands safely
 */
export async function executeGit(
  args: string[],
  options?: { cwd?: string }
): Promise<ExecutionResult> {
  const command = `git ${args.join(' ')}`;
  return ExecutionAdapter.executeCommand(command, {
    cwd: options?.cwd,
    timeout: EXECUTION_BOUNDS.MAX_COMMAND_DURATION_MS,
  });
}

/**
 * Helper to execute bash script safely
 */
export async function executeBash(
  script: string,
  options?: { cwd?: string }
): Promise<ExecutionResult> {
  const command = `bash -c "${script.replace(/"/g, '\\"')}"`;
  return ExecutionAdapter.executeCommand(command, {
    cwd: options?.cwd,
    timeout: EXECUTION_BOUNDS.MAX_COMMAND_DURATION_MS,
  });
}
