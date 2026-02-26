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
const path = __importStar(require("path"));
const utils_1 = require("./utils");
async function run() {
    try {
        const cliVersion = core.getInput('cli-version');
        const inputs = {
            workspace: core.getInput('workspace'),
            pythonVersion: core.getInput('python-version'),
            workingDirectory: core.getInput('working-directory') || '.',
            cacheTagPrefix: core.getInput('cache-tag') || '',
            cachePython: core.getInput('cache-python') !== 'false',
            cachePip: core.getInput('cache-pip') !== 'false',
            cacheUv: core.getInput('cache-uv') !== 'false',
            verbose: core.getInput('verbose') === 'true',
            exclude: core.getInput('exclude'),
        };
        if (cliVersion.toLowerCase() !== 'skip') {
            await (0, utils_1.ensureBoringCache)({ version: cliVersion });
        }
        const workspace = (0, utils_1.getWorkspace)(inputs.workspace);
        core.setOutput('workspace', workspace);
        const cacheTagPrefix = (0, utils_1.getCacheTagPrefix)(inputs.cacheTagPrefix);
        const workingDir = path.resolve(inputs.workingDirectory);
        const pythonVersion = await (0, utils_1.getPythonVersion)(inputs.pythonVersion, workingDir);
        core.setOutput('python-version', pythonVersion);
        const pythonTag = `${cacheTagPrefix}-python-${pythonVersion}`;
        const pipTag = `${cacheTagPrefix}-pip`;
        const uvTag = `${cacheTagPrefix}-uv`;
        core.setOutput('python-tag', pythonTag);
        core.setOutput('pip-tag', pipTag);
        core.setOutput('uv-tag', uvTag);
        const miseDir = (0, utils_1.getMiseDataDir)();
        const pipCacheDir = (0, utils_1.getPipCacheDir)();
        const uvCacheDir = (0, utils_1.getUvCacheDir)();
        let pythonCacheHit = false;
        if (inputs.cachePython) {
            const pythonArgs = ['restore', workspace, `${pythonTag}:${miseDir}`];
            if (inputs.verbose)
                pythonArgs.push('--verbose');
            const result = await (0, utils_1.execBoringCache)(pythonArgs, { ignoreReturnCode: true });
            pythonCacheHit = result === 0;
            core.setOutput('python-cache-hit', pythonCacheHit.toString());
        }
        await (0, utils_1.installMise)();
        if (pythonCacheHit) {
            await (0, utils_1.activatePython)(pythonVersion);
        }
        else {
            await (0, utils_1.installPython)(pythonVersion);
        }
        let pipCacheHit = false;
        if (inputs.cachePip) {
            const pipArgs = ['restore', workspace, `${pipTag}:${pipCacheDir}`];
            if (inputs.verbose)
                pipArgs.push('--verbose');
            const pipResult = await (0, utils_1.execBoringCache)(pipArgs, { ignoreReturnCode: true });
            pipCacheHit = pipResult === 0;
            core.setOutput('pip-cache-hit', pipCacheHit.toString());
        }
        let uvCacheHit = false;
        if (inputs.cacheUv) {
            const uvArgs = ['restore', workspace, `${uvTag}:${uvCacheDir}`];
            if (inputs.verbose)
                uvArgs.push('--verbose');
            const uvResult = await (0, utils_1.execBoringCache)(uvArgs, { ignoreReturnCode: true });
            uvCacheHit = uvResult === 0;
            core.setOutput('uv-cache-hit', uvCacheHit.toString());
        }
        core.setOutput('cache-hit', (pipCacheHit || uvCacheHit).toString());
        core.saveState('workspace', workspace);
        core.saveState('cacheTagPrefix', cacheTagPrefix);
        core.saveState('python-tag', pythonTag);
        core.saveState('pip-tag', pipTag);
        core.saveState('uv-tag', uvTag);
        core.saveState('mise-dir', miseDir);
        core.saveState('pip-cache-dir', pipCacheDir);
        core.saveState('uv-cache-dir', uvCacheDir);
        core.saveState('cache-python', inputs.cachePython.toString());
        core.saveState('cache-pip', inputs.cachePip.toString());
        core.saveState('cache-uv', inputs.cacheUv.toString());
        core.saveState('verbose', inputs.verbose.toString());
        core.saveState('exclude', inputs.exclude);
    }
    catch (error) {
        core.setFailed(`Python setup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
run();
