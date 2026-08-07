// Add /global/en-US in front of paths.
//
// The implementation lives in config/env.ts because it is purely an environment
// read and the API layer needs it too. Re-exported here so the browser layer
// keeps importing its path helper from its own support directory.
export { buildPath } from '../../config/env';
