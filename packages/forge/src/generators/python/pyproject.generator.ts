/**
 * Python pyproject.toml generator.
 *
 * WHY: Generates a complete pyproject.toml with all dependencies,
 * build config, ruff, and pytest settings.
 */

import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';

const TEMPLATE = `[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "flusk"
version = "0.1.0"
description = "LLM cost optimization — Python package"
license = "MIT"
requires-python = ">=3.11"
classifiers = [
    "Development Status :: 3 - Alpha",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Typing :: Typed",
]
dependencies = [
    "pydantic>=2.0",
    "click>=8.0",
    "opentelemetry-api>=1.20",
    "opentelemetry-sdk>=1.20",
    "rich>=13.0",
]

[project.optional-dependencies]
dev = ["pytest>=8.0", "ruff>=0.4", "mypy>=1.10"]

[project.scripts]
flusk = "flusk.cli.main:cli"

[project.urls]
Homepage = "https://github.com/flusk-io/flusk"
Repository = "https://github.com/flusk-io/flusk"
Issues = "https://github.com/flusk-io/flusk/issues"

[tool.hatch.build.targets.wheel]
packages = ["src/flusk"]

[tool.ruff]
target-version = "py311"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "N", "UP", "B"]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["src"]
`;

/** Generate pyproject.toml */
export async function generatePyproject(
  projectRoot: string,
): Promise<{ path: string; content: string }> {
  const outDir = resolve(projectRoot, 'flusk-py');
  await mkdir(outDir, { recursive: true });
  const filePath = resolve(outDir, 'pyproject.toml');
  await writeFile(filePath, TEMPLATE, 'utf-8');
  return { path: 'flusk-py/pyproject.toml', content: TEMPLATE };
}
