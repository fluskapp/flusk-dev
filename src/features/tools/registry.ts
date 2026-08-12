import { Compile } from "typebox/compile";
import { Value } from "typebox/value";
import type { ToolSchemaJson } from "../provider/provider.js";
import type { Tool } from "./tool.js";

type Validator = ReturnType<typeof Compile>;

const validators = new WeakMap<object, Validator>();

function validatorFor(schema: Tool["parameters"]): Validator {
	let validator = validators.get(schema);
	if (!validator) {
		validator = Compile(schema);
		validators.set(schema, validator);
	}
	return validator;
}

export class ToolRegistry {
	#tools = new Map<string, Tool>();

	register(tool: Tool): void {
		this.#tools.set(tool.name, tool);
	}

	get(name: string): Tool | undefined {
		return this.#tools.get(name);
	}

	list(): Tool[] {
		return [...this.#tools.values()];
	}

	/** Typebox schemas ARE JSON Schema objects; pass them through verbatim. */
	schemas(): ToolSchemaJson[] {
		return this.list().map((tool) => ({
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters as unknown as Record<string, unknown>,
		}));
	}

	/**
	 * Clone the raw args, leniently coerce ("5" -> 5) via Value.Convert,
	 * then check against the compiled schema. Throws with error paths and
	 * the received JSON when validation fails.
	 */
	validateArgs(tool: Tool, args: unknown): unknown {
		const cloned = structuredClone(args);
		const converted = Value.Convert(tool.parameters, cloned);
		const validator = validatorFor(tool.parameters);
		if (validator.Check(converted)) return converted;
		const errors =
			[...validator.Errors(converted)]
				.map((e) => `  - ${e.instancePath || "/"}: ${e.message}`)
				.join("\n") || "  - unknown validation error";
		throw new Error(
			`Invalid arguments for tool "${tool.name}":\n${errors}\nReceived: ${JSON.stringify(args)}`,
		);
	}
}
