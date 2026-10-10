export function expandHook(command, bindings) {
  return command.replace(/\{\{(\w+)\}\}/g, (_, key) => bindings[key]);
}
