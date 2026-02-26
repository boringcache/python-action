"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const utils_1 = require("./utils");
async function run() {
    try {
        const cliVersion = core.getInput('cli-version');
        const workspace = core.getInput('workspace') || core.getState('workspace');
        const pythonTag = core.getState('python-tag');
        const pipTag = core.getState('pip-tag');
        const uvTag = core.getState('uv-tag');
        const miseDir = core.getState('mise-dir');
        const pipCacheDir = core.getState('pip-cache-dir');
        const uvCacheDir = core.getState('uv-cache-dir');
        const cachePython = core.getState('cache-python') === 'true';
        const cachePip = core.getInput('cache-pip') !== 'false' && core.getState('cache-pip') !== 'false';
        const cacheUv = core.getInput('cache-uv') !== 'false' && core.getState('cache-uv') !== 'false';
        const verbose = core.getState('verbose') === 'true';
        const exclude = core.getState('exclude');
        if (!workspace) {
            core.info('No workspace found, skipping cache save');
            return;
        }
        if (cliVersion.toLowerCase() !== 'skip') {
            await (0, utils_1.ensureBoringCache)({ version: cliVersion });
        }
        core.info('Saving to BoringCache...');
        if (cachePython && pythonTag) {
            core.info(`Saving Python [${pythonTag}]...`);
            const pythonArgs = ['save', workspace, `${pythonTag}:${miseDir}`];
            if (verbose)
                pythonArgs.push('--verbose');
            await (0, utils_1.execBoringCache)(pythonArgs);
        }
        if (cachePip && pipTag) {
            core.info(`Saving pip cache [${pipTag}]...`);
            const args = ['save', workspace, `${pipTag}:${pipCacheDir}`];
            if (verbose)
                args.push('--verbose');
            if (exclude)
                args.push('--exclude', exclude);
            await (0, utils_1.execBoringCache)(args);
        }
        if (cacheUv && uvTag) {
            await (0, utils_1.pruneUvCache)();
            core.info(`Saving uv cache [${uvTag}]...`);
            const args = ['save', workspace, `${uvTag}:${uvCacheDir}`];
            if (verbose)
                args.push('--verbose');
            if (exclude)
                args.push('--exclude', exclude);
            await (0, utils_1.execBoringCache)(args);
        }
        core.info('Save complete');
    }
    catch (error) {
        core.warning(`Cache save failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
run();
