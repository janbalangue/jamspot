// tsc emits value imports like `require("@/lib/supabase")` as-is (it only
// resolves the "@/*" path alias for type-checking, not for the emitted JS).
// This hook makes those requires resolvable at runtime by mapping them onto
// the compiled output in .ui-test-build, mirroring the "@/*" -> "./*" alias
// from tsconfig.json.
// Avoid using `require()` for this built-in to satisfy lint rules; the
// module constructor is available on the global `module` in CommonJS.
const Module = module.constructor;

const isWindows = process.platform === "win32";
const sep = isWindows ? "\\" : "/";
const joinPath = (...parts) =>
  parts
    .map((part) => String(part))
    .filter((part, idx) => part !== "" || idx === 0)
    .map((part, idx) => (idx === 0 ? part : part.replace(/^[\\/]+/, "")))
    .join(sep);

const buildRoot = joinPath(__dirname, "..", "..", ".ui-test-build");
const originalLoad = Module._load;

Module._load = function load(request, parent, isMain) {
  if (request.startsWith("@/")) {
    const resolved = joinPath(buildRoot, request.slice(2));
    return originalLoad.call(this, resolved, parent, isMain);
  }

  return originalLoad.call(this, request, parent, isMain);
};
