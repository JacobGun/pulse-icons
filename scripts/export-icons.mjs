import fs from "node:fs/promises";
import path from "node:path";

const token = process.env.FIGMA_ACCESS_TOKEN;

if (!token) {
  throw new Error(
    "FIGMA_ACCESS_TOKEN is not set. Set it in PowerShell before running the exporter."
  );
}

const fileKey = "LZFllZKqgx93iG0mgXEr1T";
const customIconsPageName = "02 · Ascom-specific icons";
const outputRoot = path.resolve("icons", "custom");

function findPage(document, pageName) {
  return document.children?.find(
    (node) => node.type === "CANVAS" && node.name === pageName
  );
}

function collectComponents(node, results = []) {
  if (node.type === "COMPONENT") {
    results.push({
      id: node.id,
      name: node.name,
    });
  }

  for (const child of node.children ?? []) {
    collectComponents(child, results);
  }

  return results;
}

function validateIconName(iconName) {
  const parts = iconName.split("/");

  if (parts.length < 2) {
    throw new Error(
      `Icon "${iconName}" must follow the category/icon_name convention.`
    );
  }

  for (const part of parts) {
    if (!part) {
      throw new Error(`Icon "${iconName}" contains an empty path segment.`);
    }

    if (!/^[a-z0-9_]+$/.test(part)) {
      throw new Error(
        `Icon "${iconName}" contains unsupported characters. ` +
          "Use lowercase letters, numbers, underscores, and forward slashes."
      );
    }

    if (part === "." || part === "..") {
      throw new Error(`Icon "${iconName}" contains an unsafe path segment.`);
    }
  }

  return parts;
}

function normalizeSvg(rawSvg) {
  return rawSvg
    .replaceAll('fill="black"', 'fill="currentColor"')
    .replaceAll('fill="#000000"', 'fill="currentColor"')
    .replaceAll('fill="#000"', 'fill="currentColor"');
}

function validateSvg(svg, iconName) {
  const viewBoxMatch = svg.match(
    /<svg\b[^>]*\bviewBox="([^"]+)"[^>]*>/i
  );

  if (!viewBoxMatch) {
    throw new Error(`Icon "${iconName}" is missing an SVG viewBox.`);
  }

  if (viewBoxMatch[1].trim() !== "0 0 24 24") {
    throw new Error(
      `Icon "${iconName}" has unsupported viewBox "${viewBoxMatch[1]}". ` +
        `Expected "0 0 24 24".`
    );
  }

  const paths = svg.match(/<path\b[^>]*>/gi) ?? [];

  if (paths.length === 0) {
    throw new Error(
      `Icon "${iconName}" must contain at least one SVG path.`
    );
  }

  const unsupportedElements = [
    "script",
    "image",
    "text",
    "foreignObject",
    "use",
  ];

  for (const element of unsupportedElements) {
    const pattern = new RegExp(`<${element}\\b`, "i");

    if (pattern.test(svg)) {
      throw new Error(
        `Icon "${iconName}" contains unsupported <${element}> content.`
      );
    }
  }
}

async function figmaRequest(url) {
  const response = await fetch(url, {
    headers: {
      "X-Figma-Token": token,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Figma API request failed: ${response.status} ${response.statusText}\n${errorBody}`
    );
  }

  return response;
}

async function findFiles(directory, extension) {
  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  });

  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findFiles(fullPath, extension)));
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(fullPath);
    }
  }

  return files;
}

console.log(`Reading Figma file ${fileKey}...`);

const fileResponse = await figmaRequest(
  `https://api.figma.com/v1/files/${fileKey}`
);

const file = await fileResponse.json();
const customIconsPage = findPage(file.document, customIconsPageName);

if (!customIconsPage) {
  const availablePages =
    file.document.children
      ?.filter((node) => node.type === "CANVAS")
      .map((node) => node.name)
      .join(", ") ?? "none";

  throw new Error(
    `Could not find page "${customIconsPageName}". ` +
      `Available pages: ${availablePages}`
  );
}

const discoveredComponents = collectComponents(customIconsPage);

if (discoveredComponents.length === 0) {
  throw new Error(
    `No components were found on page "${customIconsPageName}".`
  );
}

const icons = discoveredComponents.map((component) => ({
  ...component,
  pathParts: validateIconName(component.name),
}));

const expectedSvgPaths = new Set(
  icons.map((icon) =>
    path.resolve(
      outputRoot,
      ...icon.pathParts.slice(0, -1),
      `${icon.pathParts.at(-1)}.svg`
    )
  )
);



const duplicateNames = icons
  .map((icon) => icon.name)
  .filter((name, index, names) => names.indexOf(name) !== index);

if (duplicateNames.length > 0) {
  throw new Error(
    `Duplicate icon names found: ${[...new Set(duplicateNames)].join(", ")}`
  );
}

console.log(`Found ${icons.length} custom icon component(s):`);

for (const icon of icons) {
  console.log(`- ${icon.name} (${icon.id})`);
}

const encodedIds = icons
  .map((icon) => encodeURIComponent(icon.id))
  .join(",");

const imagesResponse = await figmaRequest(
  `https://api.figma.com/v1/images/${fileKey}` +
    `?ids=${encodedIds}&format=svg`
);

const imagesResult = await imagesResponse.json();

const validatedIcons = [];

for (const icon of icons) {
  const svgUrl = imagesResult.images?.[icon.id];

  if (!svgUrl) {
    throw new Error(
      `Figma did not return an SVG URL for "${icon.name}" (${icon.id}).`
    );
  }

  const svgResponse = await fetch(svgUrl);

  if (!svgResponse.ok) {
    throw new Error(
      `SVG download failed for "${icon.name}": ` +
        `${svgResponse.status} ${svgResponse.statusText}`
    );
  }

  const rawSvg = await svgResponse.text();

  const svg = normalizeSvg(rawSvg);

  validateSvg(svg, icon.name);


  validatedIcons.push({
    ...icon,
    svg,
    outputPath: path.join(
      outputRoot,
      ...icon.pathParts.slice(0, -1),
      `${icon.pathParts.at(-1)}.svg`
    ),
  });
}

const existingSvgPaths = await findFiles(outputRoot, ".svg");

for (const existingPath of existingSvgPaths) {
  if (!expectedSvgPaths.has(path.resolve(existingPath))) {
    await fs.unlink(existingPath);

    console.log(
      `Removed stale icon -> ${path.relative(
        process.cwd(),
        existingPath
      )}`
    );
  }
}

for (const icon of validatedIcons) {
  await fs.mkdir(path.dirname(icon.outputPath), { recursive: true });
  await fs.writeFile(icon.outputPath, icon.svg, "utf8");

  console.log(
    `Exported ${icon.name} -> ${path.relative(
      process.cwd(),
      icon.outputPath
    )}`
  );
}

console.log(`Export complete: ${validatedIcons.length} custom icon(s).`);