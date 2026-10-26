import fs from "node:fs/promises";
import path from "node:path";

const inputRoot = path.resolve("icons", "custom");
const outputRoot = path.resolve("packages", "web", "src");

async function findSvgFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findSvgFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".svg")) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractSvgData(svg, sourcePath) {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  const pathMatches = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)];

    if (!viewBoxMatch) {
  throw new Error(`No viewBox found in ${sourcePath}`);
    }

    if (pathMatches.length === 0) {
        throw new Error(`No paths found in ${sourcePath}`);
    }

    const pathData = pathMatches
        .map((match) => match[1])
        .join(" ");

    return {
        viewBox: viewBoxMatch[1],
        path: pathData,
    };
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

const svgFiles = await findSvgFiles(inputRoot);

if (svgFiles.length === 0) {
  throw new Error("No custom SVG icons were found.");
}

console.log(`Found ${svgFiles.length} custom SVG icon(s):`);

for (const svgPath of svgFiles) {
  const relativeSvgPath = path.relative(inputRoot, svgPath);

  const iconName = toPosixPath(
    relativeSvgPath.replace(/\.svg$/i, "")
  );

  const svg = await fs.readFile(svgPath, "utf8");
  const { viewBox, path: pathData } = extractSvgData(svg, svgPath);

  const relativeModulePath = relativeSvgPath.replace(/\.svg$/i, ".js");
  const outputPath = path.join(outputRoot, relativeModulePath);

  const moduleCode = `import { registerIcon } from "@pulse/web/icon";

const icon = {
  viewBox: ${JSON.stringify(viewBox)},
  path: ${JSON.stringify(pathData)},
};

registerIcon(${JSON.stringify(iconName)}, "outlined", {
  outlined: icon,
  filled: icon,
});
`;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, moduleCode, "utf8");

  console.log(
    `- ${iconName} -> ${path.relative(process.cwd(), outputPath)}`
  );
}

console.log(`Web build complete: ${svgFiles.length} icon module(s).`);