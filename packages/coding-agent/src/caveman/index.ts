/**
 * Caveman — compress agent output while keeping technical accuracy.
 *
 * Based on https://github.com/JuliusBrussee/caveman
 *
 * Settings: /settings → interaction → Agent → Caveman Mode
 * Quick toggle: /caveman [level]
 */

import { Settings } from "../config/settings";
import type { ExtensionContext, ExtensionFactory } from "../extensibility/extensions";

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

const LEVELS = ["off", "lite", "full", "ultra", "wenyan-lite", "wenyan", "wenyan-ultra", "micro"] as const;
const STOP_ALIASES = new Set(["off", "stop", "quit"]);
type Level = (typeof LEVELS)[number];

const CAVEMAN_COMMAND_OPTIONS = [
	{ value: "lite", label: "lite", description: "Professional, no fluff" },
	{ value: "full", label: "full", description: "Classic caveman" },
	{ value: "ultra", label: "ultra", description: "Maximum compression" },
	{ value: "wenyan-lite", label: "wenyan-lite", description: "Semi-classical Chinese" },
	{ value: "wenyan", label: "wenyan", description: "Full 文言文" },
	{ value: "wenyan-ultra", label: "wenyan-ultra", description: "Extreme 文言文" },
	{ value: "micro", label: "micro", description: "Experimental prompt-minimized mode" },
	{ value: "off", label: "off", description: "Disable caveman mode" },
	{ value: "stop", label: "stop", description: "Disable caveman mode" },
	{ value: "quit", label: "quit", description: "Disable caveman mode" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLevel(): Level {
	const val = Settings.instance.get("caveman.level");
	return LEVELS.includes(val) ? val : "off";
}

function getShowStatus(): boolean {
	return Settings.instance.get("caveman.showStatus");
}

function setLevel(level: Level) {
	Settings.instance.set("caveman.level", level);
}

// ---------------------------------------------------------------------------
// Level display labels
// ---------------------------------------------------------------------------

const LEVEL_LABELS: Record<Exclude<Level, "off">, string> = {
	lite: "LITE",
	full: "FULL",
	ultra: "ULTRA",
	"wenyan-lite": "文言",
	wenyan: "文言文",
	"wenyan-ultra": "文言文極",
	micro: "MICRO",
};

// ---------------------------------------------------------------------------
// System prompt fragments
// ---------------------------------------------------------------------------

const BASE = `\
IMPORTANT: You are in CAVEMAN MODE. Respond terse like smart caveman. \
All technical substance stay. Only fluff die.

Rules:
- Drop articles (a/an/the), filler (just/really/basically/actually/simply), \
pleasantries, hedging
- Fragments OK. Short synonyms preferred. Technical terms exact
- Code blocks unchanged. Errors quoted exact
- Pattern: [thing] [action] [reason]. [next step].

Bad: "Sure! I'd be happy to help you with that. The issue you're experiencing is likely caused by..."
Good: "Bug in auth middleware. Token expiry check use \`<\` not \`<=\`. Fix:"`;

const MICRO_PROMPT = `# Token efficiency
Respond like smart caveman. Cut all filler, keep technical substance.
- Drop articles (a, an, the), filler (just, really, basically, actually).
- Drop pleasantries (sure, certainly, happy to).
- No hedging. Fragments fine. Short synonyms.
- Technical terms stay exact. Code blocks unchanged.
- Pattern: [thing] [action] [reason]. [next step].`;

const INTENSITY: Record<Exclude<Level, "off" | "micro">, string> = {
	lite: `\
No filler/hedging. Keep articles + full sentences. Professional but tight.
Example: "Your component re-renders because you create a new object reference each render. Wrap it in \`useMemo\`."`,

	full: `\
Drop articles, fragments OK, short synonyms.
Example: "New object ref each render. Inline object prop = new ref = re-render. Wrap in \`useMemo\`."`,

	ultra: `\
Abbreviate (DB/auth/config/req/res/fn/impl), strip conjunctions, arrows for causality (X → Y).
Example: "Inline obj prop → new ref → re-render. \`useMemo\`."`,

	"wenyan-lite": `\
Semi-classical Chinese. Grammar intact, filler gone. Technical terms in English.
Example: "組件頻重繪，以每繪新生對象參照故。以 useMemo 包之。"`,

	wenyan: `\
Maximum classical terseness. 80-90% character reduction. Technical terms in English.
Example: "物出新參照，致重繪。useMemo Wrap之。"`,

	"wenyan-ultra": `\
Extreme classical compression. Technical terms in English.
Example: "新參照→重繪。useMemo Wrap。"`,
};

const SAFETY = `\
Auto-clarity: drop caveman for security warnings, irreversible action confirmations, \
or when user is confused. Resume after.
Boundaries: write normal code. Only compress explanations. "stop caveman" or "normal mode" reverts.`;

// ---------------------------------------------------------------------------
// Extension factory
// ---------------------------------------------------------------------------

export const createCavemanExtension: ExtensionFactory = pi => {
	function syncStatus(ctx: Pick<ExtensionContext, "ui">) {
		const level = getLevel();

		if (level === "off" || !getShowStatus()) {
			ctx.ui.setCavemanModeStatus(undefined);
			return;
		}

		ctx.ui.setCavemanModeStatus(level);
	}

	// -- Lifecycle --

	pi.on("session_start", async (_event, ctx) => {
		syncStatus(ctx);
	});

	pi.on("agent_start", async (_event, ctx) => {
		syncStatus(ctx);
	});

	pi.on("agent_end", async (_event, ctx) => {
		syncStatus(ctx);
	});

	pi.on("session_shutdown", async () => {});

	// -- /caveman command --

	pi.registerCommand("caveman", {
		description: "Toggle caveman mode or set level (stop/off/quit to disable). See /settings for persistent config",
		getArgumentCompletions: (prefix: string) => {
			const normalized = prefix.trim().toLowerCase();
			const items = CAVEMAN_COMMAND_OPTIONS.filter(item => item.value.startsWith(normalized));
			return items.length > 0 ? items : null;
		},
		handler: async (args, ctx) => {
			const arg = args?.trim().toLowerCase();
			const currentLevel = getLevel();

			if (!arg) {
				setLevel(currentLevel === "off" ? "full" : "off");
			} else if (STOP_ALIASES.has(arg)) {
				setLevel("off");
			} else if (LEVELS.includes(arg as Level)) {
				setLevel(arg as Level);
			} else {
				ctx.ui.notify(`Unknown: "${arg}". Use: ${LEVELS.join(", ")}, stop, quit`, "error");
				return;
			}

			const newLevel = getLevel();
			syncStatus(ctx);

			ctx.ui.notify(newLevel === "off" ? "Caveman mode off." : `Caveman: ${LEVEL_LABELS[newLevel]}`, "info");
		},
	});

	// -- Inject caveman rules into system prompt --

	pi.on("before_agent_start", async event => {
		const level = getLevel();
		if (level === "off") return;
		if (level === "micro") {
			return {
				systemPrompt: [...event.systemPrompt, MICRO_PROMPT],
			};
		}
		return {
			systemPrompt: [...event.systemPrompt, BASE, INTENSITY[level], SAFETY],
		};
	});
};
