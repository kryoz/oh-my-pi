/**
 * Lite mode configuration (active by default).
 *
 * Lite mode restricts the agent to a minimal tool set and disables heavy
 * features (GitHub, browser, MCP, debug, image inspection) to reduce system
 * prompt size and startup overhead.
 *
 * Override with `OMP_LITE=0` to restore the full tool set.
 */

import type { SettingPath } from "../config/settings-schema";

/** Tool names available in lite mode. */
export const LITE_TOOL_NAMES = [
	"read",
	"bash",
	"edit",
	"ast_grep",
	"ast_edit",
	"ask",
	"eval",
	"glob",
	"grep",
	"lsp",
	"checkpoint",
	"rewind",
	"task",
	"todo",
	"web_search",
	"write",
	"memory_edit",
	"retain",
	"recall",
	"reflect",
	"learn",
	"manage_skill",
] as const;

/** Settings overrides applied when lite mode is active. */
export const LITE_SETTINGS_OVERRIDES: Array<[SettingPath, boolean | string]> = [
	["github.enabled", false],
	["browser.enabled", false],
	["inspect_image.enabled", false],
	["debug.enabled", false],
	["autolearn.enabled", true],
	["memory.backend", "mnemopi"],
];
