import { fetchPackage } from "./repo.js";

let _state = {
  // Steps are the set of packages/configurations that need to be processed
  steps: [],
  // Variables are the set of inputs/outputs that are processed as the
  // flow proceeds. These are needed in the browser frontend
  variables: {},
  // Inputs are the actual values used in the execution
  inputs: {}
};

function mergeInputsWithConflictCheck(steps) {
  const variables = {};
  const seenKeys = new Set();

  for (const step of steps) {
    const inputs = step.versions.configuration.inputs;

    for (const [key, value] of Object.entries(inputs)) {
      if (seenKeys.has(key)) {
        throw new Error(
          `❌ Conflict detected: variable "${key}" is already defined in another step.`
        );
      }

      seenKeys.add(key);
      variables[key] = value;
    }
  }

  return variables;
}

export async function initState(packages) {
  resetState();

  // Fetch the package details to figure out the type of package,
  // i.e. if it's a package or an agent.
  const fetchedPackages = [];
  let pkgDetails;
  for (const pkg of packages) {
    pkgDetails = await fetchPackage(
      `https://api.tofuhub.co/functions/v1/packages/${pkg}`,
      process.env.TOFUHUB_API_TOKEN
    );

    fetchedPackages.push(pkgDetails)
    setStep(pkgDetails.name, pkg, pkgDetails.package_types.name, pkgDetails.versions.configuration)
  }

  const variables = mergeInputsWithConflictCheck(fetchedPackages);
  console.info(variables)
  for (const [key, value] of Object.entries(variables)) {
    setVariable(key, value)
  }

  return _state;
}

export function getState() {
  return _state;
}

export function setInput(key, value) {
  _state.inputs[key] = value;
  return _state;
}

export function setVariable(key, value) {
  _state.variables[key] = value;
  return _state;
}

// Variables is an object with key, value pairs
export function setInputs(inputs) {
  _state.inputs = inputs;
  return _state;
}

// Variables is an object with key, value pairs
export function setVariables(variables) {
  _state.variables = {
    ...variables,
    ..._state.variables
  }
  return _state;
}

export function getVariable(key) {
  return _state.variables[key];
}

export function getInputs() {
  return _state.inputs;
}

export function getVariables() {
  return _state.variables;
}

export function getSteps() {
  return _state.steps;
}

export function setStep(name, packageName, type, variables) {
  _state.steps.push({ name, package: packageName, type, variables});
  return _state;
}

export function resetState() {
  _state = { steps: [], variables: {} };
  return _state;
}