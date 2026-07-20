---
name: port-pi-dev-extension
description: Порт расширения из pi.dev экосистемы в oh-my-pi coding-agent
---

## Триггер

Порт кода расширения из pi.dev (`@earendil-works/*`) в oh-my-pi (`@oh-my-pi/*`).

## Шаги

### 1. Импортные пути

| pi.dev | oh-my-pi |
|---|---|
| `@earendil-works/pi-coding-agent` | `@oh-my-pi/pi-coding-agent` |
| `@earendil-works/pi-tui` | `@oh-my-pi/pi-tui` |

Добавить `import { isEnoent } from "@oh-my-pi/pi-utils"` для обработки ошибок файлов.

### 2. systemPrompt в before_agent_start

**Критично:** oh-my-pi использует `string[]`, не `string`.

```typescript
// WRONG — pi.dev style
return { systemPrompt: `${event.systemPrompt}\n\n${FRAGMENT}` };

// WRONG — dead field, not wired in runner
return { systemPromptAppend: FRAGMENT };

// CORRECT
return { systemPrompt: [...event.systemPrompt, FRAGMENT] };
```

### 3. Файловый I/O

```typescript
// load
try {
  const raw = await Bun.file(path).text();
  return JSON.parse(raw);
} catch (err) {
  if (isEnoent(err)) return DEFAULT;
  throw err;
}

// save — Bun.write auto-creates parent dirs, no mkdir needed
await Bun.write(path, content);
```

### 4. Пути к конфигам

`~/.pi/agent/` → `~/.omp/agent/`

### 5. Типы таймеров

`ReturnType<typeof setInterval>` → `Timer` (глобальный тип Bun). Проверить по `welcome.ts:143`.

### 6. Сессия

- `ctx.sessionManager.getBranch()` — чтение записей текущей ветки
- `pi.appendEntry(customType, data)` — запись
- Кастомные записи: `entry.type === "custom" && (entry as { customType?: string }).customType === "name"`

### 7. UI

```typescript
await ctx.ui.custom((tui, theme, _keybindings, done) => ({
  render(w: number): readonly string[] { return container.render(w); },
  invalidate() { container.invalidate(); },
  handleInput(data: string) { /* ... */ tui.requestRender(); },
}));
```

### 8. Верификация

`examples/` не в tsconfig — создать временный tsconfig:
```json
{ "extends": "./tsconfig.json", "include": ["src", "test", "scripts", "examples/extensions/FILE.ts"] }
```

```bash
bunx tsgo --noEmit --project tsconfig.check.json
bunx biome check examples/extensions/FILE.ts
```

НЕ использовать `tsc` — только `tsgo` (через `bun check` или напрямую).
