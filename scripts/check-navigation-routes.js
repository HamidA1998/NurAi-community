#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const navigatorPath = "client/navigation/RootStackNavigator.tsx";

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${relativePath}: missing file`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function main() {
  const findings = [];
  const text = read(navigatorPath);
  const screenImports = new Map();
  const lazyComponents = new Map();
  const allowedComponents = new Set(["BottomTabNavigator"]);

  for (const match of text.matchAll(
    /import\s+([A-Za-z0-9_]+)\s+from\s+"@\/screens\/([^"]+)";/g,
  )) {
    screenImports.set(match[1], match[2]);
  }

  for (const match of text.matchAll(
    /const\s+([A-Za-z0-9_]+)\s*=\s*\(\)\s*=>\s*require\("@\/(screens|navigation)\/([^"]+)"\)\.([A-Za-z0-9_]+);/g,
  )) {
    const [, getterName, folder, importPath] = match;
    lazyComponents.set(getterName, `${folder}/${importPath}`);
  }

  for (const [componentName, screenPath] of screenImports.entries()) {
    const relativePath = path.join("client/screens", `${screenPath}.tsx`);
    if (!fs.existsSync(path.join(root, relativePath))) {
      findings.push(
        `${navigatorPath}: ${componentName} points at missing ${relativePath}`,
      );
    }
  }

  for (const [getterName, importPath] of lazyComponents.entries()) {
    const relativePath = path.join("client", `${importPath}.tsx`);
    if (!fs.existsSync(path.join(root, relativePath))) {
      findings.push(
        `${navigatorPath}: ${getterName} points at missing ${relativePath}`,
      );
    }
  }

  const screenBlocks = [...text.matchAll(/<Stack\.Screen\b([\s\S]*?)\/>/g)];
  for (const match of screenBlocks) {
    const block = match[1];
    const lineNumber = text.slice(0, match.index).split(/\r?\n/).length;
    const nameMatch = block.match(/name="([^"]+)"/);
    const componentMatches = [
      ...block.matchAll(/component=\{([A-Za-z0-9_]+)\}/g),
    ];
    const getComponentMatches = [
      ...block.matchAll(/getComponent=\{([A-Za-z0-9_]+)\}/g),
    ];

    if (!nameMatch) {
      findings.push(
        `${navigatorPath}:${lineNumber}: Stack.Screen is missing a name.`,
      );
    }
    if (componentMatches.length + getComponentMatches.length !== 1) {
      findings.push(
        `${navigatorPath}:${lineNumber}: ${nameMatch?.[1] || "unnamed route"} must have exactly one component or getComponent prop.`,
      );
      continue;
    }

    const componentName = componentMatches[0]?.[1];
    const getterName = getComponentMatches[0]?.[1];
    if (componentName) {
      if (
        !screenImports.has(componentName) &&
        !allowedComponents.has(componentName)
      ) {
        findings.push(
          `${navigatorPath}:${lineNumber}: ${nameMatch?.[1] || "unnamed route"} uses untracked component ${componentName}.`,
        );
      }
    } else if (getterName && !lazyComponents.has(getterName)) {
      findings.push(
        `${navigatorPath}:${lineNumber}: ${nameMatch?.[1] || "unnamed route"} uses untracked getComponent ${getterName}.`,
      );
    }
  }

  if (findings.length) {
    console.error("Navigation route check failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exit(1);
  }

  console.log(
    `Navigation route check passed: ${screenBlocks.length} stack screens, ${screenImports.size} eager screen imports, and ${lazyComponents.size} lazy route components verified.`,
  );
}

main();
