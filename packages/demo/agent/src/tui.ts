/**
 * TUI pacing primitives for interactive demo flow.
 *
 * - waitForKeypress: Pause until user presses Enter
 * - typewriter: Stream text one character at a time
 * - asyncSpinner: Show Braille spinner during async operations
 */

import * as R from "ramda";
import chalk from "chalk";

// ── Braille spinner frames ────────────────────────────────────────────

const SPINNER_FRAMES: ReadonlyArray<string> = [
  "⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏",
];

const SPINNER_INTERVAL_MS = 80;

// ── SIGINT handler ────────────────────────────────────────────────────

let sigintHandlerInstalled = false;

const installSigintHandler = (): void => {
  sigintHandlerInstalled
    ? undefined
    : (process.on("SIGINT", () => {
        process.stdout.write("\n");
        process.exit(130);
      }), sigintHandlerInstalled = true);
};

// ── waitForKeypress ───────────────────────────────────────────────────

export const waitForKeypress = async (prompt = "Press any key to continue"): Promise<void> => {
  installSigintHandler();

  const { createInterface } = await import("node:readline");
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  await new Promise<void>((resolve) => {
    rl.question(chalk.dim(`\n  ${prompt} — Press Enter to continue`), () => {
      rl.close();
      resolve();
    });
  });
};

// ── typewriter ────────────────────────────────────────────────────────

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const typewriter = async (
  text: string,
  options: Readonly<{ delay?: number }> = {},
): Promise<void> => {
  const delay = options.delay ?? 100;
  const chars = text.split("");

  const writeChar = async (char: string): Promise<void> => {
    process.stdout.write(char);
    await sleep(delay);
  };

  await R.reduce(
    (acc: Promise<void>, char: string) => acc.then(() => writeChar(char)),
    Promise.resolve(),
    chars,
  );
  process.stdout.write("\n");
};

// ── asyncSpinner ──────────────────────────────────────────────────────

export const asyncSpinner = async <T>(
  label: string,
  operation: () => Promise<T>,
): Promise<T> => {
  let frameIndex = 0;

  const renderFrame = (): void => {
    const frame = SPINNER_FRAMES[frameIndex % SPINNER_FRAMES.length];
    process.stdout.write(`\r  ${frame} ${label}`);
    frameIndex += 1;
  };

  const interval = setInterval(renderFrame, SPINNER_INTERVAL_MS);
  renderFrame();

  const cleanup = (result: T): T => {
    clearInterval(interval);
    process.stdout.write(`\r  ${chalk.green("✓")} ${label}\n`);
    return result;
  };

  const cleanupError = (error: unknown): Promise<never> => {
    clearInterval(interval);
    process.stdout.write(`\r  ${chalk.red("✗")} ${label}\n`);
    return Promise.reject(error);
  };

  return operation().then(cleanup, cleanupError);
};
