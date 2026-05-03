/**
 * TUI pacing primitives for interactive demo flow.
 *
 * - waitForKeypress: Pause until user presses Enter
 * - typewriter: Stream text one character at a time
 * - asyncSpinner: Show Braille spinner during async operations
 * - printStateChange: Display an alternate screen with colored title and key-value table
 */

import * as R from "ramda";
import chalk from "chalk";
import terminalKit from "terminal-kit";

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

// ── displayPhaseBanner ───────────────────────────────────────────────────

export const displayPhaseBanner = (title: string, color: "gray" | "greenBright" | "green" | "cyan" = "gray"): void => {
  const WIDTH = 60;
  const padding = Math.max(0, WIDTH - title.length);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  const paddedTitle = `${" ".repeat(leftPad)}${title}${" ".repeat(rightPad)}`;

  const bgChalk = color === "greenBright" ? chalk.bgGreenBright : color === "green" ? chalk.bgGreen : color === "cyan" ? chalk.bgCyan : chalk.bgGray;
  console.log(`\n${bgChalk.black.bold(paddedTitle)}\n`);
};

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

// ── printStateChange (alternate screen, fullscreen) ─────────────────────

const TRUNCATE_MAX = 700;
const TITLE_BAR_WIDTH = 60;

const term = terminalKit.terminal;

const truncate = (value: string): string =>
  value.length > TRUNCATE_MAX
    ? `${value.slice(0, TRUNCATE_MAX)}…`
    : value;

const dimJsonKeys = (json: string): string =>
  json.replace(/"([^"]+)"(\s*:)/g, '"^-$1^:"$2');

export const serializeTruncated = (data: unknown): string =>
  truncate(dimJsonKeys(JSON.stringify(data, null, 2)));

type StateChangeRow = Readonly<{ label: string; value: string }>;

const waitForEnterOnAlternateScreen = (): Promise<void> =>
  new Promise((resolve) => {
    term.grabInput({ safe: true });
    term.on("key", function handleKey(name: string) {
      name === "CTRL_C"
        ? (term.fullscreen(false), process.exit(130))
        : undefined;
      name === "ENTER" || name === "q"
        ? (term.off("key", handleKey), term.grabInput(false), resolve())
        : undefined;
    });
  });

const toTableData = (rows: ReadonlyArray<StateChangeRow>): ReadonlyArray<ReadonlyArray<string>> => {
  const labels = R.map((row: StateChangeRow) => row.label, rows);
  const values = R.map((row: StateChangeRow) => row.value, rows);
  return [labels, values];
};

export const printStateChange = async (
  title: string,
  rows: ReadonlyArray<StateChangeRow>,
  keypressPrompt = "Press Enter to continue",
): Promise<void> => {
  term.fullscreen(true);

  const titlePadding = Math.max(0, TITLE_BAR_WIDTH - title.length);
  const leftPad = Math.floor(titlePadding / 2);
  const rightPad = titlePadding - leftPad;
  const paddedTitle = `${" ".repeat(leftPad)}${title}${" ".repeat(rightPad)}`;

  term.moveTo(1, 2);
  term.bgMagenta.white.bold(` ${paddedTitle} \n\n`);

  term.table(toTableData(rows), {
    hasBorder: true,
    contentHasMarkup: true,
    borderChars: "lightRounded",
    borderAttr: { color: "gray" },
    firstRowTextAttr: { bold: true },
    width: term.width,
    fit: true,
    lineWrap: true,
    wordWrap: true,
  });

  term("\n");
  term.dim(`  ${keypressPrompt} — Press Enter or 'q' to continue`);

  await waitForEnterOnAlternateScreen();

  term.fullscreen(false);
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
