// Self-contained eval helpers (validator + loader). Mirrors the shared
// skill-evals contract: a skill's evals/evals.json is a { skill_name, evals[] }
// document; each eval has id, prompt, expected_output, files[], assertions[].
import fs from "node:fs";
import path from "node:path";

export function toPosix(value) {
  return String(value || "").split(path.sep).join("/");
}

export function loadEvalDocument(evalFilePath) {
  return JSON.parse(fs.readFileSync(evalFilePath, "utf8"));
}

export function validateEvalDocument(doc, options = {}) {
  const errors = [];
  const allowEmptyFiles = options.allowEmptyFiles !== false;

  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    errors.push("Document must be a JSON object.");
    return errors;
  }
  if (typeof doc.skill_name !== "string" || !doc.skill_name.trim()) {
    errors.push("`skill_name` must be a non-empty string.");
  }
  if (!Array.isArray(doc.evals) || doc.evals.length === 0) {
    errors.push("`evals` must be a non-empty array.");
    return errors;
  }

  const seenIds = new Set();
  doc.evals.forEach((item, index) => {
    const prefix = `evals[${index}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`${prefix} must be an object.`);
      return;
    }
    if (item.id === undefined || item.id === null || String(item.id).trim() === "") {
      errors.push(`${prefix}.id is required.`);
    } else {
      const key = String(item.id);
      if (seenIds.has(key)) errors.push(`${prefix}.id must be unique (duplicate: ${key}).`);
      seenIds.add(key);
    }
    if (typeof item.prompt !== "string" || !item.prompt.trim()) {
      errors.push(`${prefix}.prompt must be a non-empty string.`);
    }
    if (typeof item.expected_output !== "string" || !item.expected_output.trim()) {
      errors.push(`${prefix}.expected_output must be a non-empty string.`);
    }
    if (!Array.isArray(item.files)) {
      errors.push(`${prefix}.files must be an array.`);
    } else {
      item.files.forEach((file, fileIndex) => {
        if (typeof file !== "string" || !file.trim()) {
          errors.push(`${prefix}.files[${fileIndex}] must be a non-empty string.`);
        }
      });
      if (!allowEmptyFiles && item.files.length === 0) {
        errors.push(`${prefix}.files must not be empty.`);
      }
    }
    if (item.assertions !== undefined) {
      if (!Array.isArray(item.assertions)) {
        errors.push(`${prefix}.assertions must be an array when provided.`);
      } else {
        item.assertions.forEach((assertion, ai) => {
          if (typeof assertion !== "string" || !assertion.trim()) {
            errors.push(`${prefix}.assertions[${ai}] must be a non-empty string.`);
          }
        });
      }
    }
  });

  return errors;
}
