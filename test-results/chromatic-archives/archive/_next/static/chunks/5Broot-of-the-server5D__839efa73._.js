(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[turbopack]/browser/dev/hmr-client/hmr-client.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/// <reference path="../../../shared/runtime-types.d.ts" />
/// <reference path="../../runtime/base/dev-globals.d.ts" />
/// <reference path="../../runtime/base/dev-protocol.d.ts" />
/// <reference path="../../runtime/base/dev-extensions.ts" />
__turbopack_context__.s([
    "connect",
    ()=>connect,
    "setHooks",
    ()=>setHooks,
    "subscribeToUpdate",
    ()=>subscribeToUpdate
]);
function connect({ addMessageListener, sendMessage, onUpdateError = console.error }) {
    addMessageListener((msg)=>{
        switch(msg.type){
            case 'turbopack-connected':
                handleSocketConnected(sendMessage);
                break;
            default:
                try {
                    if (Array.isArray(msg.data)) {
                        for(let i = 0; i < msg.data.length; i++){
                            handleSocketMessage(msg.data[i]);
                        }
                    } else {
                        handleSocketMessage(msg.data);
                    }
                    applyAggregatedUpdates();
                } catch (e) {
                    console.warn('[Fast Refresh] performing full reload\n\n' + "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" + 'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' + 'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' + 'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' + 'Fast Refresh requires at least one parent function component in your React tree.');
                    onUpdateError(e);
                    location.reload();
                }
                break;
        }
    });
    const queued = globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS;
    if (queued != null && !Array.isArray(queued)) {
        throw new Error('A separate HMR handler was already registered');
    }
    globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS = {
        push: ([chunkPath, callback])=>{
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    };
    if (Array.isArray(queued)) {
        for (const [chunkPath, callback] of queued){
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    }
}
const updateCallbackSets = new Map();
function sendJSON(sendMessage, message) {
    sendMessage(JSON.stringify(message));
}
function resourceKey(resource) {
    return JSON.stringify({
        path: resource.path,
        headers: resource.headers || null
    });
}
function subscribeToUpdates(sendMessage, resource) {
    sendJSON(sendMessage, {
        type: 'turbopack-subscribe',
        ...resource
    });
    return ()=>{
        sendJSON(sendMessage, {
            type: 'turbopack-unsubscribe',
            ...resource
        });
    };
}
function handleSocketConnected(sendMessage) {
    for (const key of updateCallbackSets.keys()){
        subscribeToUpdates(sendMessage, JSON.parse(key));
    }
}
// we aggregate all pending updates until the issues are resolved
const chunkListsWithPendingUpdates = new Map();
function aggregateUpdates(msg) {
    const key = resourceKey(msg.resource);
    let aggregated = chunkListsWithPendingUpdates.get(key);
    if (aggregated) {
        aggregated.instruction = mergeChunkListUpdates(aggregated.instruction, msg.instruction);
    } else {
        chunkListsWithPendingUpdates.set(key, msg);
    }
}
function applyAggregatedUpdates() {
    if (chunkListsWithPendingUpdates.size === 0) return;
    hooks.beforeRefresh();
    for (const msg of chunkListsWithPendingUpdates.values()){
        triggerUpdate(msg);
    }
    chunkListsWithPendingUpdates.clear();
    finalizeUpdate();
}
function mergeChunkListUpdates(updateA, updateB) {
    let chunks;
    if (updateA.chunks != null) {
        if (updateB.chunks == null) {
            chunks = updateA.chunks;
        } else {
            chunks = mergeChunkListChunks(updateA.chunks, updateB.chunks);
        }
    } else if (updateB.chunks != null) {
        chunks = updateB.chunks;
    }
    let merged;
    if (updateA.merged != null) {
        if (updateB.merged == null) {
            merged = updateA.merged;
        } else {
            // Since `merged` is an array of updates, we need to merge them all into
            // one, consistent update.
            // Since there can only be `EcmascriptMergeUpdates` in the array, there is
            // no need to key on the `type` field.
            let update = updateA.merged[0];
            for(let i = 1; i < updateA.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateA.merged[i]);
            }
            for(let i = 0; i < updateB.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateB.merged[i]);
            }
            merged = [
                update
            ];
        }
    } else if (updateB.merged != null) {
        merged = updateB.merged;
    }
    return {
        type: 'ChunkListUpdate',
        chunks,
        merged
    };
}
function mergeChunkListChunks(chunksA, chunksB) {
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    return chunks;
}
function mergeChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted' || updateA.type === 'deleted' && updateB.type === 'added') {
        return undefined;
    }
    if (updateA.type === 'partial') {
        invariant(updateA.instruction, 'Partial updates are unsupported');
    }
    if (updateB.type === 'partial') {
        invariant(updateB.instruction, 'Partial updates are unsupported');
    }
    return undefined;
}
function mergeChunkListEcmascriptMergedUpdates(mergedA, mergedB) {
    const entries = mergeEcmascriptChunkEntries(mergedA.entries, mergedB.entries);
    const chunks = mergeEcmascriptChunksUpdates(mergedA.chunks, mergedB.chunks);
    return {
        type: 'EcmascriptMergedUpdate',
        entries,
        chunks
    };
}
function mergeEcmascriptChunkEntries(entriesA, entriesB) {
    return {
        ...entriesA,
        ...entriesB
    };
}
function mergeEcmascriptChunksUpdates(chunksA, chunksB) {
    if (chunksA == null) {
        return chunksB;
    }
    if (chunksB == null) {
        return chunksA;
    }
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeEcmascriptChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    if (Object.keys(chunks).length === 0) {
        return undefined;
    }
    return chunks;
}
function mergeEcmascriptChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted') {
        // These two completely cancel each other out.
        return undefined;
    }
    if (updateA.type === 'deleted' && updateB.type === 'added') {
        const added = [];
        const deleted = [];
        const deletedModules = new Set(updateA.modules ?? []);
        const addedModules = new Set(updateB.modules ?? []);
        for (const moduleId of addedModules){
            if (!deletedModules.has(moduleId)) {
                added.push(moduleId);
            }
        }
        for (const moduleId of deletedModules){
            if (!addedModules.has(moduleId)) {
                deleted.push(moduleId);
            }
        }
        if (added.length === 0 && deleted.length === 0) {
            return undefined;
        }
        return {
            type: 'partial',
            added,
            deleted
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'partial') {
        const added = new Set([
            ...updateA.added ?? [],
            ...updateB.added ?? []
        ]);
        const deleted = new Set([
            ...updateA.deleted ?? [],
            ...updateB.deleted ?? []
        ]);
        if (updateB.added != null) {
            for (const moduleId of updateB.added){
                deleted.delete(moduleId);
            }
        }
        if (updateB.deleted != null) {
            for (const moduleId of updateB.deleted){
                added.delete(moduleId);
            }
        }
        return {
            type: 'partial',
            added: [
                ...added
            ],
            deleted: [
                ...deleted
            ]
        };
    }
    if (updateA.type === 'added' && updateB.type === 'partial') {
        const modules = new Set([
            ...updateA.modules ?? [],
            ...updateB.added ?? []
        ]);
        for (const moduleId of updateB.deleted ?? []){
            modules.delete(moduleId);
        }
        return {
            type: 'added',
            modules: [
                ...modules
            ]
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'deleted') {
        // We could eagerly return `updateB` here, but this would potentially be
        // incorrect if `updateA` has added modules.
        const modules = new Set(updateB.modules ?? []);
        if (updateA.added != null) {
            for (const moduleId of updateA.added){
                modules.delete(moduleId);
            }
        }
        return {
            type: 'deleted',
            modules: [
                ...modules
            ]
        };
    }
    // Any other update combination is invalid.
    return undefined;
}
function invariant(_, message) {
    throw new Error(`Invariant: ${message}`);
}
const CRITICAL = [
    'bug',
    'error',
    'fatal'
];
function compareByList(list, a, b) {
    const aI = list.indexOf(a) + 1 || list.length;
    const bI = list.indexOf(b) + 1 || list.length;
    return aI - bI;
}
const chunksWithIssues = new Map();
function emitIssues() {
    const issues = [];
    const deduplicationSet = new Set();
    for (const [_, chunkIssues] of chunksWithIssues){
        for (const chunkIssue of chunkIssues){
            if (deduplicationSet.has(chunkIssue.formatted)) continue;
            issues.push(chunkIssue);
            deduplicationSet.add(chunkIssue.formatted);
        }
    }
    sortIssues(issues);
    hooks.issues(issues);
}
function handleIssues(msg) {
    const key = resourceKey(msg.resource);
    let hasCriticalIssues = false;
    for (const issue of msg.issues){
        if (CRITICAL.includes(issue.severity)) {
            hasCriticalIssues = true;
        }
    }
    if (msg.issues.length > 0) {
        chunksWithIssues.set(key, msg.issues);
    } else if (chunksWithIssues.has(key)) {
        chunksWithIssues.delete(key);
    }
    emitIssues();
    return hasCriticalIssues;
}
const SEVERITY_ORDER = [
    'bug',
    'fatal',
    'error',
    'warning',
    'info',
    'log'
];
const CATEGORY_ORDER = [
    'parse',
    'resolve',
    'code generation',
    'rendering',
    'typescript',
    'other'
];
function sortIssues(issues) {
    issues.sort((a, b)=>{
        const first = compareByList(SEVERITY_ORDER, a.severity, b.severity);
        if (first !== 0) return first;
        return compareByList(CATEGORY_ORDER, a.category, b.category);
    });
}
const hooks = {
    beforeRefresh: ()=>{},
    refresh: ()=>{},
    buildOk: ()=>{},
    issues: (_issues)=>{}
};
function setHooks(newHooks) {
    Object.assign(hooks, newHooks);
}
function handleSocketMessage(msg) {
    sortIssues(msg.issues);
    handleIssues(msg);
    switch(msg.type){
        case 'issues':
            break;
        case 'partial':
            // aggregate updates
            aggregateUpdates(msg);
            break;
        default:
            // run single update
            const runHooks = chunkListsWithPendingUpdates.size === 0;
            if (runHooks) hooks.beforeRefresh();
            triggerUpdate(msg);
            if (runHooks) finalizeUpdate();
            break;
    }
}
function finalizeUpdate() {
    hooks.refresh();
    hooks.buildOk();
    // This is used by the Next.js integration test suite to notify it when HMR
    // updates have been completed.
    // TODO: Only run this in test environments (gate by `process.env.__NEXT_TEST_MODE`)
    if (globalThis.__NEXT_HMR_CB) {
        globalThis.__NEXT_HMR_CB();
        globalThis.__NEXT_HMR_CB = null;
    }
}
function subscribeToChunkUpdate(chunkListPath, sendMessage, callback) {
    return subscribeToUpdate({
        path: chunkListPath
    }, sendMessage, callback);
}
function subscribeToUpdate(resource, sendMessage, callback) {
    const key = resourceKey(resource);
    let callbackSet;
    const existingCallbackSet = updateCallbackSets.get(key);
    if (!existingCallbackSet) {
        callbackSet = {
            callbacks: new Set([
                callback
            ]),
            unsubscribe: subscribeToUpdates(sendMessage, resource)
        };
        updateCallbackSets.set(key, callbackSet);
    } else {
        existingCallbackSet.callbacks.add(callback);
        callbackSet = existingCallbackSet;
    }
    return ()=>{
        callbackSet.callbacks.delete(callback);
        if (callbackSet.callbacks.size === 0) {
            callbackSet.unsubscribe();
            updateCallbackSets.delete(key);
        }
    };
}
function triggerUpdate(msg) {
    const key = resourceKey(msg.resource);
    const callbackSet = updateCallbackSets.get(key);
    if (!callbackSet) {
        return;
    }
    for (const callback of callbackSet.callbacks){
        callback(msg);
    }
    if (msg.type === 'notFound') {
        // This indicates that the resource which we subscribed to either does not exist or
        // has been deleted. In either case, we should clear all update callbacks, so if a
        // new subscription is created for the same resource, it will send a new "subscribe"
        // message to the server.
        // No need to send an "unsubscribe" message to the server, it will have already
        // dropped the update stream before sending the "notFound" message.
        updateCallbackSets.delete(key);
    }
}
}),
"[project]/src/components/Modal/Modal.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Modal",
    ()=>Modal,
    "modalStyles",
    ()=>modalStyles
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/compiler-runtime.js [client] (ecmascript)");
;
;
const Modal = (t0)=>{
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["c"])(21);
    if ($[0] !== "a6255c6fa3b0d41e656de7db19e5ba9dd3e9724d3dab511174fbfb144e13396d") {
        for(let $i = 0; $i < 21; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "a6255c6fa3b0d41e656de7db19e5ba9dd3e9724d3dab511174fbfb144e13396d";
    }
    const { isOpen, onClose, title, children, size: t1 } = t0;
    const size = t1 === undefined ? "medium" : t1;
    if (!isOpen) {
        return null;
    }
    let t2;
    if ($[1] !== onClose) {
        t2 = (e)=>{
            if (e.target === e.currentTarget) {
                onClose();
            }
        };
        $[1] = onClose;
        $[2] = t2;
    } else {
        t2 = $[2];
    }
    const handleBackdropClick = t2;
    const t3 = styles[size];
    let t4;
    if ($[3] !== t3) {
        t4 = {
            ...styles.modal,
            ...t3
        };
        $[3] = t3;
        $[4] = t4;
    } else {
        t4 = $[4];
    }
    let t5;
    if ($[5] !== title) {
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
            style: styles.title,
            children: title
        }, void 0, false, {
            fileName: "[project]/src/components/Modal/Modal.tsx",
            lineNumber: 56,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[5] = title;
        $[6] = t5;
    } else {
        t5 = $[6];
    }
    let t6;
    if ($[7] !== onClose) {
        t6 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            onClick: onClose,
            style: styles.closeButton,
            "aria-label": "Close modal",
            children: "×"
        }, void 0, false, {
            fileName: "[project]/src/components/Modal/Modal.tsx",
            lineNumber: 64,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[7] = onClose;
        $[8] = t6;
    } else {
        t6 = $[8];
    }
    let t7;
    if ($[9] !== t5 || $[10] !== t6) {
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.header,
            children: [
                t5,
                t6
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/Modal/Modal.tsx",
            lineNumber: 72,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[9] = t5;
        $[10] = t6;
        $[11] = t7;
    } else {
        t7 = $[11];
    }
    let t8;
    if ($[12] !== children) {
        t8 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.content,
            children: children
        }, void 0, false, {
            fileName: "[project]/src/components/Modal/Modal.tsx",
            lineNumber: 81,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[12] = children;
        $[13] = t8;
    } else {
        t8 = $[13];
    }
    let t9;
    if ($[14] !== t4 || $[15] !== t7 || $[16] !== t8) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: t4,
            children: [
                t7,
                t8
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/Modal/Modal.tsx",
            lineNumber: 89,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[14] = t4;
        $[15] = t7;
        $[16] = t8;
        $[17] = t9;
    } else {
        t9 = $[17];
    }
    let t10;
    if ($[18] !== handleBackdropClick || $[19] !== t9) {
        t10 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.backdrop,
            onClick: handleBackdropClick,
            role: "dialog",
            children: t9
        }, void 0, false, {
            fileName: "[project]/src/components/Modal/Modal.tsx",
            lineNumber: 99,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[18] = handleBackdropClick;
        $[19] = t9;
        $[20] = t10;
    } else {
        t10 = $[20];
    }
    return t10;
};
_c = Modal;
const styles = {
    backdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
    },
    modal: {
        backgroundColor: 'var(--card-background, white)',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        maxHeight: '90vh',
        overflow: 'auto',
        animation: 'modalSlideIn 0.3s ease'
    },
    small: {
        width: '90%',
        maxWidth: '400px'
    },
    medium: {
        width: '90%',
        maxWidth: '600px'
    },
    large: {
        width: '90%',
        maxWidth: '900px'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem',
        borderBottom: '1px solid var(--border-color, #ddd)'
    },
    title: {
        margin: 0,
        fontSize: '0.5rem',
        color: 'var(--text-color, #333)'
    },
    closeButton: {
        background: 'none',
        border: 'none',
        fontSize: '2rem',
        cursor: 'pointer',
        color: 'var(--text-light, #999)',
        padding: 0,
        width: '2rem',
        height: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'color 0.2s ease'
    },
    content: {
        padding: '1.5rem'
    }
};
// Add animation keyframes to global styles
const modalAnimation = `
  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(-50px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
const modalStyles = modalAnimation;
var _c;
__turbopack_context__.k.register(_c, "Modal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/Forms/EntitlementForm.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EntitlementForm",
    ()=>EntitlementForm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/compiler-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
const EntitlementForm = (t0)=>{
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["c"])(134);
    if ($[0] !== "cc45935909a39096e7db07eedd1e2f38e8a839f51939eb585260417e2162351c") {
        for(let $i = 0; $i < 134; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "cc45935909a39096e7db07eedd1e2f38e8a839f51939eb585260417e2162351c";
    }
    const { onSubmit, onCancel, isLoading: t1, initialData, submitButtonLabel: t2 } = t0;
    const isLoading = t1 === undefined ? false : t1;
    const submitButtonLabel = t2 === undefined ? "Create Entitlement" : t2;
    const t3 = initialData?.sku || "";
    const t4 = initialData?.product_type || "";
    const t5 = initialData?.start_date || "";
    const t6 = initialData?.end_date || "";
    const t7 = initialData?.quantity || 1;
    const t8 = initialData?.status || "pending";
    let t9;
    if ($[1] !== t3 || $[2] !== t4 || $[3] !== t5 || $[4] !== t6 || $[5] !== t7 || $[6] !== t8) {
        t9 = {
            sku: t3,
            product_type: t4,
            start_date: t5,
            end_date: t6,
            quantity: t7,
            status: t8
        };
        $[1] = t3;
        $[2] = t4;
        $[3] = t5;
        $[4] = t6;
        $[5] = t7;
        $[6] = t8;
        $[7] = t9;
    } else {
        t9 = $[7];
    }
    const [formData, setFormData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(t9);
    let t10;
    if ($[8] === Symbol.for("react.memo_cache_sentinel")) {
        t10 = {};
        $[8] = t10;
    } else {
        t10 = $[8];
    }
    const [errors, setErrors] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(t10);
    const [submitError, setSubmitError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    let t11;
    if ($[9] !== formData.end_date || $[10] !== formData.product_type || $[11] !== formData.quantity || $[12] !== formData.sku || $[13] !== formData.start_date) {
        t11 = ()=>{
            const newErrors = {};
            if (!formData.sku.trim()) {
                newErrors.sku = "SKU is required";
            }
            if (!formData.product_type.trim()) {
                newErrors.product_type = "Product type is required";
            }
            if (!formData.start_date) {
                newErrors.start_date = "Start date is required";
            }
            if (!formData.end_date) {
                newErrors.end_date = "End date is required";
            }
            if (formData.start_date && formData.end_date && new Date(formData.start_date) > new Date(formData.end_date)) {
                newErrors.end_date = "End date must be after start date";
            }
            if (formData.quantity <= 0) {
                newErrors.quantity = "Quantity must be greater than 0";
            }
            setErrors(newErrors);
            return Object.keys(newErrors).length === 0;
        };
        $[9] = formData.end_date;
        $[10] = formData.product_type;
        $[11] = formData.quantity;
        $[12] = formData.sku;
        $[13] = formData.start_date;
        $[14] = t11;
    } else {
        t11 = $[14];
    }
    const validateForm = t11;
    let t12;
    if ($[15] !== errors) {
        t12 = (e)=>{
            const { name, value, type } = e.target;
            setFormData((prev)=>({
                    ...prev,
                    [name]: type === "number" ? parseInt(value, 10) : value
                }));
            if (errors[name]) {
                setErrors((prev_0)=>({
                        ...prev_0,
                        [name]: undefined
                    }));
            }
        };
        $[15] = errors;
        $[16] = t12;
    } else {
        t12 = $[16];
    }
    const handleChange = t12;
    let t13;
    if ($[17] !== formData || $[18] !== onSubmit || $[19] !== validateForm) {
        t13 = async (e_0)=>{
            e_0.preventDefault();
            setSubmitError(null);
            if (!validateForm()) {
                return;
            }
            ;
            try {
                await onSubmit(formData);
            } catch (t14) {
                const error = t14;
                setSubmitError(error instanceof Error ? error.message : "An error occurred");
            }
        };
        $[17] = formData;
        $[18] = onSubmit;
        $[19] = validateForm;
        $[20] = t13;
    } else {
        t13 = $[20];
    }
    const handleSubmit = t13;
    let t14;
    if ($[21] !== submitError) {
        t14 = submitError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.errorAlert,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                style: styles.errorText,
                children: submitError
            }, void 0, false, {
                fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
                lineNumber: 157,
                columnNumber: 57
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 157,
            columnNumber: 26
        }, ("TURBOPACK compile-time value", void 0));
        $[21] = submitError;
        $[22] = t14;
    } else {
        t14 = $[22];
    }
    let t15;
    if ($[23] === Symbol.for("react.memo_cache_sentinel")) {
        t15 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            htmlFor: "sku",
            style: styles.label,
            children: [
                "SKU ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    style: styles.required,
                    children: "*"
                }, void 0, false, {
                    fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
                    lineNumber: 165,
                    columnNumber: 57
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 165,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[23] = t15;
    } else {
        t15 = $[23];
    }
    let t16;
    if ($[24] !== errors.sku) {
        t16 = errors.sku ? styles.inputError : {};
        $[24] = errors.sku;
        $[25] = t16;
    } else {
        t16 = $[25];
    }
    let t17;
    if ($[26] !== t16) {
        t17 = {
            ...styles.input,
            ...t16
        };
        $[26] = t16;
        $[27] = t17;
    } else {
        t17 = $[27];
    }
    let t18;
    if ($[28] !== formData.sku || $[29] !== handleChange || $[30] !== isLoading || $[31] !== t17) {
        t18 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
            type: "text",
            id: "sku",
            name: "sku",
            value: formData.sku,
            onChange: handleChange,
            placeholder: "Enter SKU",
            style: t17,
            disabled: isLoading
        }, void 0, false, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 191,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[28] = formData.sku;
        $[29] = handleChange;
        $[30] = isLoading;
        $[31] = t17;
        $[32] = t18;
    } else {
        t18 = $[32];
    }
    let t19;
    if ($[33] !== errors.sku) {
        t19 = errors.sku && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            style: styles.fieldError,
            children: errors.sku
        }, void 0, false, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 202,
            columnNumber: 25
        }, ("TURBOPACK compile-time value", void 0));
        $[33] = errors.sku;
        $[34] = t19;
    } else {
        t19 = $[34];
    }
    let t20;
    if ($[35] !== t18 || $[36] !== t19) {
        t20 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.formGroup,
            children: [
                t15,
                t18,
                t19
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 210,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[35] = t18;
        $[36] = t19;
        $[37] = t20;
    } else {
        t20 = $[37];
    }
    let t21;
    if ($[38] === Symbol.for("react.memo_cache_sentinel")) {
        t21 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            htmlFor: "product_type",
            style: styles.label,
            children: [
                "Product Type ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    style: styles.required,
                    children: "*"
                }, void 0, false, {
                    fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
                    lineNumber: 219,
                    columnNumber: 75
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 219,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[38] = t21;
    } else {
        t21 = $[38];
    }
    let t22;
    if ($[39] !== errors.product_type) {
        t22 = errors.product_type ? styles.inputError : {};
        $[39] = errors.product_type;
        $[40] = t22;
    } else {
        t22 = $[40];
    }
    let t23;
    if ($[41] !== t22) {
        t23 = {
            ...styles.input,
            ...t22
        };
        $[41] = t22;
        $[42] = t23;
    } else {
        t23 = $[42];
    }
    let t24;
    if ($[43] !== formData.product_type || $[44] !== handleChange || $[45] !== isLoading || $[46] !== t23) {
        t24 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
            type: "text",
            id: "product_type",
            name: "product_type",
            value: formData.product_type,
            onChange: handleChange,
            placeholder: "e.g., Software License, Hardware",
            style: t23,
            disabled: isLoading
        }, void 0, false, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 245,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[43] = formData.product_type;
        $[44] = handleChange;
        $[45] = isLoading;
        $[46] = t23;
        $[47] = t24;
    } else {
        t24 = $[47];
    }
    let t25;
    if ($[48] !== errors.product_type) {
        t25 = errors.product_type && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            style: styles.fieldError,
            children: errors.product_type
        }, void 0, false, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 256,
            columnNumber: 34
        }, ("TURBOPACK compile-time value", void 0));
        $[48] = errors.product_type;
        $[49] = t25;
    } else {
        t25 = $[49];
    }
    let t26;
    if ($[50] !== t24 || $[51] !== t25) {
        t26 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.formGroup,
            children: [
                t21,
                t24,
                t25
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 264,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[50] = t24;
        $[51] = t25;
        $[52] = t26;
    } else {
        t26 = $[52];
    }
    let t27;
    if ($[53] === Symbol.for("react.memo_cache_sentinel")) {
        t27 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            htmlFor: "start_date",
            style: styles.label,
            children: [
                "Start Date ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    style: styles.required,
                    children: "*"
                }, void 0, false, {
                    fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
                    lineNumber: 273,
                    columnNumber: 71
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 273,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[53] = t27;
    } else {
        t27 = $[53];
    }
    let t28;
    if ($[54] !== errors.start_date) {
        t28 = errors.start_date ? styles.inputError : {};
        $[54] = errors.start_date;
        $[55] = t28;
    } else {
        t28 = $[55];
    }
    let t29;
    if ($[56] !== t28) {
        t29 = {
            ...styles.input,
            ...t28
        };
        $[56] = t28;
        $[57] = t29;
    } else {
        t29 = $[57];
    }
    let t30;
    if ($[58] !== formData.start_date || $[59] !== handleChange || $[60] !== isLoading || $[61] !== t29) {
        t30 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
            type: "date",
            id: "start_date",
            name: "start_date",
            value: formData.start_date,
            onChange: handleChange,
            style: t29,
            disabled: isLoading
        }, void 0, false, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 299,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[58] = formData.start_date;
        $[59] = handleChange;
        $[60] = isLoading;
        $[61] = t29;
        $[62] = t30;
    } else {
        t30 = $[62];
    }
    let t31;
    if ($[63] !== errors.start_date) {
        t31 = errors.start_date && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            style: styles.fieldError,
            children: errors.start_date
        }, void 0, false, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 310,
            columnNumber: 32
        }, ("TURBOPACK compile-time value", void 0));
        $[63] = errors.start_date;
        $[64] = t31;
    } else {
        t31 = $[64];
    }
    let t32;
    if ($[65] !== t30 || $[66] !== t31) {
        t32 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.formGroup,
            children: [
                t27,
                t30,
                t31
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 318,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[65] = t30;
        $[66] = t31;
        $[67] = t32;
    } else {
        t32 = $[67];
    }
    let t33;
    if ($[68] === Symbol.for("react.memo_cache_sentinel")) {
        t33 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            htmlFor: "end_date",
            style: styles.label,
            children: [
                "End Date ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    style: styles.required,
                    children: "*"
                }, void 0, false, {
                    fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
                    lineNumber: 327,
                    columnNumber: 67
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 327,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[68] = t33;
    } else {
        t33 = $[68];
    }
    let t34;
    if ($[69] !== errors.end_date) {
        t34 = errors.end_date ? styles.inputError : {};
        $[69] = errors.end_date;
        $[70] = t34;
    } else {
        t34 = $[70];
    }
    let t35;
    if ($[71] !== t34) {
        t35 = {
            ...styles.input,
            ...t34
        };
        $[71] = t34;
        $[72] = t35;
    } else {
        t35 = $[72];
    }
    let t36;
    if ($[73] !== formData.end_date || $[74] !== handleChange || $[75] !== isLoading || $[76] !== t35) {
        t36 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
            type: "date",
            id: "end_date",
            name: "end_date",
            value: formData.end_date,
            onChange: handleChange,
            style: t35,
            disabled: isLoading
        }, void 0, false, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 353,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[73] = formData.end_date;
        $[74] = handleChange;
        $[75] = isLoading;
        $[76] = t35;
        $[77] = t36;
    } else {
        t36 = $[77];
    }
    let t37;
    if ($[78] !== errors.end_date) {
        t37 = errors.end_date && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            style: styles.fieldError,
            children: errors.end_date
        }, void 0, false, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 364,
            columnNumber: 30
        }, ("TURBOPACK compile-time value", void 0));
        $[78] = errors.end_date;
        $[79] = t37;
    } else {
        t37 = $[79];
    }
    let t38;
    if ($[80] !== t36 || $[81] !== t37) {
        t38 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.formGroup,
            children: [
                t33,
                t36,
                t37
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 372,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[80] = t36;
        $[81] = t37;
        $[82] = t38;
    } else {
        t38 = $[82];
    }
    let t39;
    if ($[83] !== t32 || $[84] !== t38) {
        t39 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.formRow,
            children: [
                t32,
                t38
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 381,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[83] = t32;
        $[84] = t38;
        $[85] = t39;
    } else {
        t39 = $[85];
    }
    let t40;
    if ($[86] === Symbol.for("react.memo_cache_sentinel")) {
        t40 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            htmlFor: "quantity",
            style: styles.label,
            children: [
                "Quantity ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    style: styles.required,
                    children: "*"
                }, void 0, false, {
                    fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
                    lineNumber: 390,
                    columnNumber: 67
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 390,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[86] = t40;
    } else {
        t40 = $[86];
    }
    let t41;
    if ($[87] !== errors.quantity) {
        t41 = errors.quantity ? styles.inputError : {};
        $[87] = errors.quantity;
        $[88] = t41;
    } else {
        t41 = $[88];
    }
    let t42;
    if ($[89] !== t41) {
        t42 = {
            ...styles.input,
            ...t41
        };
        $[89] = t41;
        $[90] = t42;
    } else {
        t42 = $[90];
    }
    let t43;
    if ($[91] !== formData.quantity || $[92] !== handleChange || $[93] !== isLoading || $[94] !== t42) {
        t43 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
            type: "number",
            id: "quantity",
            name: "quantity",
            value: formData.quantity,
            onChange: handleChange,
            min: "1",
            placeholder: "1",
            style: t42,
            disabled: isLoading
        }, void 0, false, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 416,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[91] = formData.quantity;
        $[92] = handleChange;
        $[93] = isLoading;
        $[94] = t42;
        $[95] = t43;
    } else {
        t43 = $[95];
    }
    let t44;
    if ($[96] !== errors.quantity) {
        t44 = errors.quantity && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            style: styles.fieldError,
            children: errors.quantity
        }, void 0, false, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 427,
            columnNumber: 30
        }, ("TURBOPACK compile-time value", void 0));
        $[96] = errors.quantity;
        $[97] = t44;
    } else {
        t44 = $[97];
    }
    let t45;
    if ($[98] !== t43 || $[99] !== t44) {
        t45 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.formGroup,
            children: [
                t40,
                t43,
                t44
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 435,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[98] = t43;
        $[99] = t44;
        $[100] = t45;
    } else {
        t45 = $[100];
    }
    let t46;
    if ($[101] === Symbol.for("react.memo_cache_sentinel")) {
        t46 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            htmlFor: "status",
            style: styles.label,
            children: "Status"
        }, void 0, false, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 444,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[101] = t46;
    } else {
        t46 = $[101];
    }
    let t47;
    let t48;
    let t49;
    if ($[102] === Symbol.for("react.memo_cache_sentinel")) {
        t47 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "pending",
            children: "Pending"
        }, void 0, false, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 453,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        t48 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "fulfilled",
            children: "Fulfilled"
        }, void 0, false, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 454,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        t49 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "canceled",
            children: "Canceled"
        }, void 0, false, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 455,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[102] = t47;
        $[103] = t48;
        $[104] = t49;
    } else {
        t47 = $[102];
        t48 = $[103];
        t49 = $[104];
    }
    let t50;
    if ($[105] !== formData.status || $[106] !== handleChange || $[107] !== isLoading) {
        t50 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.formGroup,
            children: [
                t46,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                    id: "status",
                    name: "status",
                    value: formData.status,
                    onChange: handleChange,
                    style: styles.select,
                    disabled: isLoading,
                    children: [
                        t47,
                        t48,
                        t49
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
                    lineNumber: 466,
                    columnNumber: 46
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 466,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[105] = formData.status;
        $[106] = handleChange;
        $[107] = isLoading;
        $[108] = t50;
    } else {
        t50 = $[108];
    }
    let t51;
    if ($[109] !== t45 || $[110] !== t50) {
        t51 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.formRow,
            children: [
                t45,
                t50
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 476,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[109] = t45;
        $[110] = t50;
        $[111] = t51;
    } else {
        t51 = $[111];
    }
    let t52;
    if ($[112] !== isLoading) {
        t52 = isLoading ? styles.buttonDisabled : {};
        $[112] = isLoading;
        $[113] = t52;
    } else {
        t52 = $[113];
    }
    let t53;
    if ($[114] !== t52) {
        t53 = {
            ...styles.submitButton,
            ...t52
        };
        $[114] = t52;
        $[115] = t53;
    } else {
        t53 = $[115];
    }
    const t54 = isLoading ? "Creating..." : submitButtonLabel;
    let t55;
    if ($[116] !== isLoading || $[117] !== t53 || $[118] !== t54) {
        t55 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            type: "submit",
            style: t53,
            disabled: isLoading,
            children: t54
        }, void 0, false, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 505,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[116] = isLoading;
        $[117] = t53;
        $[118] = t54;
        $[119] = t55;
    } else {
        t55 = $[119];
    }
    let t56;
    if ($[120] !== isLoading || $[121] !== onCancel) {
        t56 = onCancel && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            type: "button",
            onClick: onCancel,
            style: styles.cancelButton,
            disabled: isLoading,
            children: "Cancel"
        }, void 0, false, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 515,
            columnNumber: 23
        }, ("TURBOPACK compile-time value", void 0));
        $[120] = isLoading;
        $[121] = onCancel;
        $[122] = t56;
    } else {
        t56 = $[122];
    }
    let t57;
    if ($[123] !== t55 || $[124] !== t56) {
        t57 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.formActions,
            children: [
                t55,
                t56
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 524,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[123] = t55;
        $[124] = t56;
        $[125] = t57;
    } else {
        t57 = $[125];
    }
    let t58;
    if ($[126] !== handleSubmit || $[127] !== t14 || $[128] !== t20 || $[129] !== t26 || $[130] !== t39 || $[131] !== t51 || $[132] !== t57) {
        t58 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
            onSubmit: handleSubmit,
            style: styles.form,
            children: [
                t14,
                t20,
                t26,
                t39,
                t51,
                t57
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/Forms/EntitlementForm.tsx",
            lineNumber: 533,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[126] = handleSubmit;
        $[127] = t14;
        $[128] = t20;
        $[129] = t26;
        $[130] = t39;
        $[131] = t51;
        $[132] = t57;
        $[133] = t58;
    } else {
        t58 = $[133];
    }
    return t58;
};
_s(EntitlementForm, "AoJoitwxsDY1yWTeMn2Yp/STVVU=");
_c = EntitlementForm;
const styles = {
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        maxWidth: '600px'
    },
    errorAlert: {
        backgroundColor: 'var(--danger-color, #e74c3c)',
        color: 'white',
        padding: '1rem',
        borderRadius: '0.25rem',
        marginBottom: '1rem'
    },
    errorText: {
        margin: 0,
        fontSize: '0.95rem'
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
    },
    formRow: {
        display: 'flex',
        gap: '1.5rem'
    },
    label: {
        fontWeight: 500,
        color: 'var(--text-color, #333)',
        fontSize: '0.95rem'
    },
    required: {
        color: 'var(--danger-color, #e74c3c)'
    },
    input: {
        padding: '0.75rem 1rem',
        border: '1px solid var(--border-color, #ddd)',
        borderRadius: '0.25rem',
        fontSize: '1rem',
        fontFamily: 'inherit',
        transition: 'border-color 0.2s ease'
    },
    inputError: {
        borderColor: 'var(--danger-color, #e74c3c)',
        backgroundColor: 'rgba(231, 76, 60, 0.05)'
    },
    select: {
        padding: '0.75rem 1rem',
        border: '1px solid var(--border-color, #ddd)',
        borderRadius: '0.25rem',
        fontSize: '1rem',
        fontFamily: 'inherit',
        backgroundColor: 'white'
    },
    fieldError: {
        color: 'var(--danger-color, #e74c3c)',
        fontSize: '0.85rem'
    },
    formActions: {
        display: 'flex',
        gap: '1rem',
        marginTop: '1rem'
    },
    submitButton: {
        backgroundColor: 'var(--primary-color, #3498db)',
        color: 'white',
        padding: '0.75rem 1.5rem',
        border: 'none',
        borderRadius: '0.25rem',
        fontSize: '1rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background-color 0.2s ease'
    },
    buttonDisabled: {
        opacity: 0.6,
        cursor: 'not-allowed'
    },
    cancelButton: {
        backgroundColor: 'var(--border-color, #ddd)',
        color: 'var(--text-color, #333)',
        padding: '0.75rem 1.5rem',
        border: 'none',
        borderRadius: '0.25rem',
        fontSize: '1rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background-color 0.2s ease'
    }
};
var _c;
__turbopack_context__.k.register(_c, "EntitlementForm");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/Header/Header.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Header",
    ()=>Header
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/link.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Modal$2f$Modal$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/Modal/Modal.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Forms$2f$EntitlementForm$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/Forms/EntitlementForm.tsx [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
const Header = ()=>{
    _s();
    const [isModalOpen, setIsModalOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleOpenModal = (e)=>{
        e.preventDefault();
        setIsModalOpen(true);
    };
    const handleCloseModal = ()=>{
        setIsModalOpen(false);
    };
    const handleSubmitForm = async (data)=>{
        setIsLoading(true);
        try {
            const response = await fetch('/api/entitlements', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error('Failed to create entitlement');
            }
            // Close modal on success
            setIsModalOpen(false);
        // Optional: You can add a success toast notification here
        // Or refresh the entitlements list
        } finally{
            setIsLoading(false);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
        style: styles.header,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: styles.container,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/",
                        style: styles.logo,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            style: styles.logoH1,
                            children: "Entitlement Manager"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Header/Header.tsx",
                            lineNumber: 41,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/src/components/Header/Header.tsx",
                        lineNumber: 40,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                        style: styles.nav,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                href: "/",
                                style: styles.navLink,
                                children: "Dashboard"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Header/Header.tsx",
                                lineNumber: 45,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: handleOpenModal,
                                style: styles.navButton,
                                children: "Add Entitlement"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Header/Header.tsx",
                                lineNumber: 48,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Header/Header.tsx",
                        lineNumber: 44,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Header/Header.tsx",
                lineNumber: 39,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Modal$2f$Modal$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Modal"], {
                isOpen: isModalOpen,
                onClose: handleCloseModal,
                title: "Create New Entitlement",
                size: "medium",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Forms$2f$EntitlementForm$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["EntitlementForm"], {
                    onSubmit: handleSubmitForm,
                    onCancel: handleCloseModal,
                    isLoading: isLoading,
                    submitButtonLabel: "Create Entitlement"
                }, void 0, false, {
                    fileName: "[project]/src/components/Header/Header.tsx",
                    lineNumber: 55,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/src/components/Header/Header.tsx",
                lineNumber: 54,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/Header/Header.tsx",
        lineNumber: 38,
        columnNumber: 10
    }, ("TURBOPACK compile-time value", void 0));
};
_s(Header, "g2gvQZoHfpliQkaW2K4MXYeS7S8=");
_c = Header;
const styles = {
    header: {
        backgroundColor: 'var(--card-background)',
        borderBottom: '1px solid var(--border-color)',
        boxShadow: 'var(--box-shadow)',
        padding: '1rem 0',
        width: '100%',
        boxSizing: 'border-box'
    },
    container: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 1rem',
        width: '100%',
        boxSizing: 'border-box'
    },
    logo: {
        textDecoration: 'none'
    },
    logoH1: {
        margin: 0,
        fontSize: '1.5rem',
        color: 'var(--primary-color)',
        padding: 0
    },
    nav: {
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'center'
    },
    navLink: {
        color: 'var(--text-color)',
        fontWeight: 500,
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'color 0.3s ease',
        padding: 0
    },
    navButton: {
        backgroundColor: 'var(--primary-color)',
        color: 'white',
        padding: '0.5rem 1rem',
        border: 'none',
        borderRadius: '0.25rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        fontSize: '1rem'
    }
};
var _c;
__turbopack_context__.k.register(_c, "Header");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/SearchBar/SearchBar.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SearchBar",
    ()=>SearchBar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/compiler-runtime.js [client] (ecmascript)");
;
;
const SearchBar = ()=>{
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["c"])(3);
    if ($[0] !== "6c0acb81a64862d159b30b3f069464112ae3d6c0857429449a0b3300ff133364") {
        for(let $i = 0; $i < 3; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "6c0acb81a64862d159b30b3f069464112ae3d6c0857429449a0b3300ff133364";
    }
    let t0;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
            style: styles.form,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "text",
                    placeholder: "Search entitlements...",
                    style: styles.input
                }, void 0, false, {
                    fileName: "[project]/src/components/SearchBar/SearchBar.tsx",
                    lineNumber: 14,
                    columnNumber: 36
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    type: "submit",
                    style: styles.button,
                    children: "Search"
                }, void 0, false, {
                    fileName: "[project]/src/components/SearchBar/SearchBar.tsx",
                    lineNumber: 14,
                    columnNumber: 115
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/SearchBar/SearchBar.tsx",
            lineNumber: 14,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[1] = t0;
    } else {
        t0 = $[1];
    }
    let t1;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.container,
            children: [
                t0,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: styles.filters,
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                        style: styles.select,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "",
                                children: "All statuses"
                            }, void 0, false, {
                                fileName: "[project]/src/components/SearchBar/SearchBar.tsx",
                                lineNumber: 21,
                                columnNumber: 102
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "FULFILLED",
                                children: "Fulfilled"
                            }, void 0, false, {
                                fileName: "[project]/src/components/SearchBar/SearchBar.tsx",
                                lineNumber: 21,
                                columnNumber: 140
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "PENDING",
                                children: "Pending"
                            }, void 0, false, {
                                fileName: "[project]/src/components/SearchBar/SearchBar.tsx",
                                lineNumber: 21,
                                columnNumber: 184
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "CANCELED",
                                children: "Canceled"
                            }, void 0, false, {
                                fileName: "[project]/src/components/SearchBar/SearchBar.tsx",
                                lineNumber: 21,
                                columnNumber: 224
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/SearchBar/SearchBar.tsx",
                        lineNumber: 21,
                        columnNumber: 72
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/src/components/SearchBar/SearchBar.tsx",
                    lineNumber: 21,
                    columnNumber: 44
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/SearchBar/SearchBar.tsx",
            lineNumber: 21,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[2] = t1;
    } else {
        t1 = $[2];
    }
    return t1;
};
_c = SearchBar;
const styles = {
    container: {
        backgroundColor: 'var(--card-background)',
        borderRadius: '0.5rem',
        boxShadow: 'var(--box-shadow)',
        padding: '1.5rem',
        marginBottom: '2rem'
    },
    form: {
        display: 'flex',
        gap: '1rem',
        marginBottom: '1rem'
    },
    input: {
        flex: 1,
        padding: '0.75rem 1rem',
        border: '1px solid var(--border-color)',
        borderRadius: '0.25rem',
        fontSize: '1rem'
    },
    button: {
        backgroundColor: 'var(--primary-color)',
        color: 'white',
        padding: '0.75rem 1.5rem',
        borderRadius: '0.25rem',
        fontWeight: 500,
        transition: 'var(--transition)',
        cursor: 'pointer'
    },
    filters: {
        display: 'flex',
        gap: '1rem'
    },
    select: {
        padding: '0.5rem',
        border: '1px solid var(--border-color)',
        borderRadius: '0.25rem',
        backgroundColor: 'white'
    }
}; // const SearchBar = ({ onSearch }) => {
 //   const [searchTerm, setSearchTerm] = useState('');
 //   const handleSubmit = (e) => {
 //     e.preventDefault();
 //     onSearch(searchTerm);
 //   };
 //   return (
 //     <div className={styles.container}>
 //       <form onSubmit={handleSubmit} className={styles.form}>
 //         <input
 //           type="text"
 //           placeholder="Search entitlements..."
 //           value={searchTerm}
 //           onChange={(e) => setSearchTerm(e.target.value)}
 //           className={styles.input}
 //         />
 //         <button type="submit" className={styles.button}>
 //           Search
 //         </button>
 //       </form>
 //       <div className={styles.filters}>
 //         <select className={styles.select} onChange={(e) => onSearch(searchTerm, e.target.value)}>
 //           <option value="">All statuses</option>
 //           <option value="FULFILLED">Fulfilled</option>
 //           <option value="PENDING">Pending</option>
 //           <option value="CANCELED">Canceled</option>
 //         </select>
 //       </div>
 //     </div>
 //   );
var _c;
__turbopack_context__.k.register(_c, "SearchBar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EntitlementCardSkeleton",
    ()=>EntitlementCardSkeleton
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/compiler-runtime.js [client] (ecmascript)");
;
;
const EntitlementCardSkeleton = ()=>{
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["c"])(8);
    if ($[0] !== "506c0720f4bc4f7c8e0cf6e9dc777241d917452bd794133c9bd4b0981e68dc86") {
        for(let $i = 0; $i < 8; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "506c0720f4bc4f7c8e0cf6e9dc777241d917452bd794133c9bd4b0981e68dc86";
    }
    let t0;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.statusBadgeSkeleton
        }, void 0, false, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx",
            lineNumber: 13,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[1] = t0;
    } else {
        t0 = $[1];
    }
    let t1;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.cardHeader,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: styles.skeletonLine
                }, void 0, false, {
                    fileName: "[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx",
                    lineNumber: 20,
                    columnNumber: 41
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        ...styles.skeletonLine,
                        marginTop: "0.5rem",
                        width: "60%"
                    }
                }, void 0, false, {
                    fileName: "[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx",
                    lineNumber: 20,
                    columnNumber: 76
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx",
            lineNumber: 20,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[2] = t1;
    } else {
        t1 = $[2];
    }
    let t2;
    if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.infoRow,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        ...styles.skeletonLine,
                        width: "30%"
                    }
                }, void 0, false, {
                    fileName: "[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx",
                    lineNumber: 31,
                    columnNumber: 38
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        ...styles.skeletonLine,
                        width: "40%"
                    }
                }, void 0, false, {
                    fileName: "[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx",
                    lineNumber: 34,
                    columnNumber: 12
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx",
            lineNumber: 31,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[3] = t2;
    } else {
        t2 = $[3];
    }
    let t3;
    if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
        t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.infoRow,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        ...styles.skeletonLine,
                        width: "30%"
                    }
                }, void 0, false, {
                    fileName: "[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx",
                    lineNumber: 44,
                    columnNumber: 38
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        ...styles.skeletonLine,
                        width: "40%"
                    }
                }, void 0, false, {
                    fileName: "[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx",
                    lineNumber: 47,
                    columnNumber: 12
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx",
            lineNumber: 44,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[4] = t3;
    } else {
        t3 = $[4];
    }
    let t4;
    if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
        t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.infoRow,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        ...styles.skeletonLine,
                        width: "30%"
                    }
                }, void 0, false, {
                    fileName: "[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx",
                    lineNumber: 57,
                    columnNumber: 38
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        ...styles.skeletonLine,
                        width: "40%"
                    }
                }, void 0, false, {
                    fileName: "[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx",
                    lineNumber: 60,
                    columnNumber: 12
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx",
            lineNumber: 57,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[5] = t4;
    } else {
        t4 = $[5];
    }
    let t5;
    if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.cardContent,
            children: [
                t2,
                t3,
                t4,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: styles.infoRow,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                ...styles.skeletonLine,
                                width: "30%"
                            }
                        }, void 0, false, {
                            fileName: "[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx",
                            lineNumber: 70,
                            columnNumber: 82
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                ...styles.skeletonLine,
                                width: "40%"
                            }
                        }, void 0, false, {
                            fileName: "[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx",
                            lineNumber: 73,
                            columnNumber: 14
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx",
                    lineNumber: 70,
                    columnNumber: 54
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx",
            lineNumber: 70,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[6] = t5;
    } else {
        t5 = $[6];
    }
    let t6;
    if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
        t6 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.card,
            children: [
                t0,
                t1,
                t5,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: styles.cardFooter,
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            ...styles.skeletonLine,
                            width: "50%"
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx",
                        lineNumber: 83,
                        columnNumber: 78
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx",
                    lineNumber: 83,
                    columnNumber: 47
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx",
            lineNumber: 83,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[7] = t6;
    } else {
        t6 = $[7];
    }
    return t6;
};
_c = EntitlementCardSkeleton;
const styles = {
    card: {
        backgroundColor: 'var(--card-background)',
        borderRadius: '0.5rem',
        boxShadow: 'var(--box-shadow)',
        padding: '1.5rem',
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
    },
    statusBadgeSkeleton: {
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        width: '60px',
        height: '20px',
        borderRadius: '1rem',
        backgroundColor: 'var(--skeleton-color)',
        animation: 'pulse 2s infinite'
    },
    cardHeader: {
        marginBottom: '1rem'
    },
    cardContent: {
        flex: 1
    },
    infoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '0.5rem',
        gap: '1rem'
    },
    skeletonLine: {
        height: '1rem',
        backgroundColor: 'var(--skeleton-color)',
        borderRadius: '0.25rem',
        animation: 'pulse 2s infinite'
    },
    cardFooter: {
        marginTop: '1rem',
        paddingTop: '1rem',
        borderTop: '1px solid var(--border-color)'
    }
};
var _c;
__turbopack_context__.k.register(_c, "EntitlementCardSkeleton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/EntitlementCard/EntitlementCard.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EntitlementCard",
    ()=>EntitlementCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/compiler-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/link.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EntitlementCard$2f$EntitlementCardSkeleton$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/EntitlementCard/EntitlementCardSkeleton.tsx [client] (ecmascript)");
;
;
;
;
const formatDate = (dateString)=>{
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
};
const getStatusColor = (status)=>{
    const normalizedStatus = status.toUpperCase();
    switch(normalizedStatus){
        case 'FULFILLED':
            return styles.fulfilled;
        case 'PENDING':
            return styles.pending;
        case 'CANCELED':
            return styles.canceled;
        default:
            return styles.pending;
    }
};
const EntitlementCard = (t0)=>{
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["c"])(46);
    if ($[0] !== "ad38468746661cd378432a3275094305fbb049ddd580df0d2701ac950e4cc4f3") {
        for(let $i = 0; $i < 46; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "ad38468746661cd378432a3275094305fbb049ddd580df0d2701ac950e4cc4f3";
    }
    const { entitlement, isLoading: t1 } = t0;
    const isLoading = t1 === undefined ? false : t1;
    if (isLoading) {
        let t2;
        if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
            t2 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EntitlementCard$2f$EntitlementCardSkeleton$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["EntitlementCardSkeleton"], {}, void 0, false, {
                fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
                lineNumber: 51,
                columnNumber: 12
            }, ("TURBOPACK compile-time value", void 0));
            $[1] = t2;
        } else {
            t2 = $[1];
        }
        return t2;
    }
    let t2;
    if ($[2] !== entitlement.entitlementID) {
        t2 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
            children: [
                "ID: ",
                entitlement.entitlementID
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
            lineNumber: 60,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[2] = entitlement.entitlementID;
        $[3] = t2;
    } else {
        t2 = $[3];
    }
    let t3;
    if ($[4] !== entitlement.sku) {
        t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.sku,
            children: entitlement.sku
        }, void 0, false, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
            lineNumber: 68,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[4] = entitlement.sku;
        $[5] = t3;
    } else {
        t3 = $[5];
    }
    let t4;
    if ($[6] !== t2 || $[7] !== t3) {
        t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.cardHeader,
            children: [
                t2,
                t3
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
            lineNumber: 76,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[6] = t2;
        $[7] = t3;
        $[8] = t4;
    } else {
        t4 = $[8];
    }
    let t5;
    if ($[9] !== entitlement.status) {
        t5 = getStatusColor(entitlement.status);
        $[9] = entitlement.status;
        $[10] = t5;
    } else {
        t5 = $[10];
    }
    let t6;
    if ($[11] !== t5) {
        t6 = {
            ...styles.statusBadge,
            ...t5
        };
        $[11] = t5;
        $[12] = t6;
    } else {
        t6 = $[12];
    }
    let t7;
    if ($[13] !== entitlement.status || $[14] !== t6) {
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: t6,
            children: entitlement.status
        }, void 0, false, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
            lineNumber: 104,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[13] = entitlement.status;
        $[14] = t6;
        $[15] = t7;
    } else {
        t7 = $[15];
    }
    let t8;
    if ($[16] !== t4 || $[17] !== t7) {
        t8 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.headerWithBadge,
            children: [
                t4,
                t7
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
            lineNumber: 113,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[16] = t4;
        $[17] = t7;
        $[18] = t8;
    } else {
        t8 = $[18];
    }
    let t9;
    if ($[19] === Symbol.for("react.memo_cache_sentinel")) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            style: styles.label,
            children: "Product:"
        }, void 0, false, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
            lineNumber: 122,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[19] = t9;
    } else {
        t9 = $[19];
    }
    const t10 = entitlement.product_type || "N/A";
    let t11;
    if ($[20] !== t10) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.infoRow,
            children: [
                t9,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: t10
                }, void 0, false, {
                    fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
                    lineNumber: 130,
                    columnNumber: 43
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
            lineNumber: 130,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[20] = t10;
        $[21] = t11;
    } else {
        t11 = $[21];
    }
    let t12;
    if ($[22] === Symbol.for("react.memo_cache_sentinel")) {
        t12 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            style: styles.label,
            children: "Start Date:"
        }, void 0, false, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
            lineNumber: 138,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[22] = t12;
    } else {
        t12 = $[22];
    }
    let t13;
    if ($[23] !== entitlement.start_date) {
        t13 = formatDate(entitlement.start_date);
        $[23] = entitlement.start_date;
        $[24] = t13;
    } else {
        t13 = $[24];
    }
    let t14;
    if ($[25] !== t13) {
        t14 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.infoRow,
            children: [
                t12,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: t13
                }, void 0, false, {
                    fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
                    lineNumber: 153,
                    columnNumber: 44
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
            lineNumber: 153,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[25] = t13;
        $[26] = t14;
    } else {
        t14 = $[26];
    }
    let t15;
    if ($[27] === Symbol.for("react.memo_cache_sentinel")) {
        t15 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            style: styles.label,
            children: "End Date:"
        }, void 0, false, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
            lineNumber: 161,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[27] = t15;
    } else {
        t15 = $[27];
    }
    let t16;
    if ($[28] !== entitlement.end_date) {
        t16 = formatDate(entitlement.end_date);
        $[28] = entitlement.end_date;
        $[29] = t16;
    } else {
        t16 = $[29];
    }
    let t17;
    if ($[30] !== t16) {
        t17 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.infoRow,
            children: [
                t15,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: t16
                }, void 0, false, {
                    fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
                    lineNumber: 176,
                    columnNumber: 44
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
            lineNumber: 176,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[30] = t16;
        $[31] = t17;
    } else {
        t17 = $[31];
    }
    let t18;
    if ($[32] === Symbol.for("react.memo_cache_sentinel")) {
        t18 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            style: styles.label,
            children: "Quantity:"
        }, void 0, false, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
            lineNumber: 184,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[32] = t18;
    } else {
        t18 = $[32];
    }
    let t19;
    if ($[33] !== entitlement.quantity) {
        t19 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.infoRow,
            children: [
                t18,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    children: entitlement.quantity
                }, void 0, false, {
                    fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
                    lineNumber: 191,
                    columnNumber: 44
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
            lineNumber: 191,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[33] = entitlement.quantity;
        $[34] = t19;
    } else {
        t19 = $[34];
    }
    let t20;
    if ($[35] !== t11 || $[36] !== t14 || $[37] !== t17 || $[38] !== t19) {
        t20 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.cardContent,
            children: [
                t11,
                t14,
                t17,
                t19
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
            lineNumber: 199,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[35] = t11;
        $[36] = t14;
        $[37] = t17;
        $[38] = t19;
        $[39] = t20;
    } else {
        t20 = $[39];
    }
    const t21 = `/entitlements/${entitlement.entitlementID}`;
    let t22;
    if ($[40] !== t21) {
        t22 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.cardFooter,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                href: t21,
                style: styles.viewDetails,
                children: "View Details →"
            }, void 0, false, {
                fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
                lineNumber: 211,
                columnNumber: 42
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
            lineNumber: 211,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[40] = t21;
        $[41] = t22;
    } else {
        t22 = $[41];
    }
    let t23;
    if ($[42] !== t20 || $[43] !== t22 || $[44] !== t8) {
        t23 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: styles.card,
                children: [
                    t8,
                    t20,
                    t22
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
                lineNumber: 219,
                columnNumber: 16
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/src/components/EntitlementCard/EntitlementCard.tsx",
            lineNumber: 219,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[42] = t20;
        $[43] = t22;
        $[44] = t8;
        $[45] = t23;
    } else {
        t23 = $[45];
    }
    return t23;
};
_c = EntitlementCard;
const styles = {
    card: {
        backgroundColor: 'var(--card-background)',
        borderRadius: '0.5rem',
        boxShadow: 'var(--box-shadow)',
        padding: '1.5rem',
        transition: 'var(--transition)',
        cursor: 'pointer',
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column'
    },
    headerWithBadge: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem',
        marginBottom: '1rem'
    },
    statusBadge: {
        color: 'white',
        fontSize: '0.75rem',
        fontWeight: 600,
        padding: '0.25rem 0.75rem',
        borderRadius: '1rem',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        flexShrink: 0
    },
    fulfilled: {
        backgroundColor: 'var(--secondary-color)'
    },
    pending: {
        backgroundColor: 'var(--warning-color)'
    },
    canceled: {
        backgroundColor: 'var(--danger-color)'
    },
    cardHeader: {
        flex: 1,
        margin: 0
    },
    sku: {
        color: 'var(--text-light)',
        fontSize: '0.875rem'
    },
    cardContent: {
        flex: 1
    },
    infoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '0.5rem'
    },
    label: {
        color: 'var(--text-light)',
        fontWeight: 500
    },
    cardFooter: {
        marginTop: '1rem',
        paddingTop: '1rem',
        borderTop: '1px solid var(--border-color)'
    },
    viewDetails: {
        color: 'var(--primary-color)',
        fontWeight: 500,
        textAlign: 'right'
    }
};
var _c;
__turbopack_context__.k.register(_c, "EntitlementCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/EntitlementGrid/EntitlementGrid.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EntitlementGrid",
    ()=>EntitlementGrid
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/compiler-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EntitlementCard$2f$EntitlementCard$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/EntitlementCard/EntitlementCard.tsx [client] (ecmascript)");
;
;
;
const EntitlementGrid = (t0)=>{
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["c"])(8);
    if ($[0] !== "8d78bd22888ebb43ae595f76b0f6d8d0c569e15f46e3ee1b175f70facf089714") {
        for(let $i = 0; $i < 8; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "8d78bd22888ebb43ae595f76b0f6d8d0c569e15f46e3ee1b175f70facf089714";
    }
    const { entitlements, isLoading } = t0;
    let t1;
    if ($[1] !== entitlements || $[2] !== isLoading) {
        let t2;
        if ($[4] !== isLoading) {
            t2 = (entitlement)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EntitlementCard$2f$EntitlementCard$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["EntitlementCard"], {
                    entitlement: entitlement,
                    isLoading: isLoading
                }, entitlement.entitlementID, false, {
                    fileName: "[project]/src/components/EntitlementGrid/EntitlementGrid.tsx",
                    lineNumber: 19,
                    columnNumber: 27
                }, ("TURBOPACK compile-time value", void 0));
            $[4] = isLoading;
            $[5] = t2;
        } else {
            t2 = $[5];
        }
        t1 = entitlements.map(t2);
        $[1] = entitlements;
        $[2] = isLoading;
        $[3] = t1;
    } else {
        t1 = $[3];
    }
    let t2;
    if ($[6] !== t1) {
        t2 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: styles.container,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: styles.grid,
                children: t1
            }, void 0, false, {
                fileName: "[project]/src/components/EntitlementGrid/EntitlementGrid.tsx",
                lineNumber: 34,
                columnNumber: 40
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/src/components/EntitlementGrid/EntitlementGrid.tsx",
            lineNumber: 34,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[6] = t1;
        $[7] = t2;
    } else {
        t2 = $[7];
    }
    return t2;
};
_c = EntitlementGrid;
const styles = {
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1rem',
        width: '100%',
        boxSizing: 'border-box'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '2rem 1.5rem',
        width: '100%'
    }
};
var _c;
__turbopack_context__.k.register(_c, "EntitlementGrid");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/mockEntitlement.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
const mockEntitlements = [
    {
        entitlementID: "12345",
        sku: "SKU-001",
        product_type: "Software",
        start_date: "2023-01-01T00:00:00Z",
        end_date: "2024-01-01T00:00:00Z",
        quantity: 10,
        status: 'fulfilled'
    },
    {
        entitlementID: "67890",
        sku: "SKU-002",
        product_type: "Service",
        start_date: "2023-06-15T00:00:00Z",
        end_date: "2024-06-15T00:00:00Z",
        quantity: 5,
        status: 'pending'
    },
    {
        entitlementID: "11223",
        sku: "SKU-003",
        product_type: "Subscription",
        start_date: "2023-03-10T00:00:00Z",
        end_date: "2024-03-10T00:00:00Z",
        quantity: 20,
        status: 'canceled'
    },
    {
        entitlementID: "44556",
        sku: "SKU-004",
        product_type: "License",
        start_date: "2023-07-01T00:00:00Z",
        end_date: "2024-07-01T00:00:00Z",
        quantity: 15,
        status: 'fulfilled'
    },
    {
        entitlementID: "77889",
        sku: "SKU-005",
        product_type: "Service",
        start_date: "2023-05-20T00:00:00Z",
        end_date: "2024-05-20T00:00:00Z",
        quantity: 8,
        status: 'pending'
    }
];
const __TURBOPACK__default__export__ = mockEntitlements;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/pages/index.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Home
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/compiler-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Header$2f$Header$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/Header/Header.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$SearchBar$2f$SearchBar$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/SearchBar/SearchBar.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EntitlementGrid$2f$EntitlementGrid$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/EntitlementGrid/EntitlementGrid.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$mockEntitlement$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/pages/mockEntitlement.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
function Home() {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["c"])(5);
    if ($[0] !== "5e7ad5d5a69bbd2a6f20facfe817392a23ece3f2a06ad49a5121315ce177b467") {
        for(let $i = 0; $i < 5; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "5e7ad5d5a69bbd2a6f20facfe817392a23ece3f2a06ad49a5121315ce177b467";
    }
    const [isLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    let t0;
    let t1;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Header$2f$Header$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["Header"], {}, void 0, false, {
            fileName: "[project]/src/pages/index.tsx",
            lineNumber: 19,
            columnNumber: 10
        }, this);
        t1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$SearchBar$2f$SearchBar$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["SearchBar"], {}, void 0, false, {
            fileName: "[project]/src/pages/index.tsx",
            lineNumber: 20,
            columnNumber: 10
        }, this);
        $[1] = t0;
        $[2] = t1;
    } else {
        t0 = $[1];
        t1 = $[2];
    }
    let t2;
    if ($[3] !== isLoading) {
        t2 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t0,
                t1,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$EntitlementGrid$2f$EntitlementGrid$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["EntitlementGrid"], {
                    entitlements: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$pages$2f$mockEntitlement$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["default"],
                    isLoading: isLoading
                }, void 0, false, {
                    fileName: "[project]/src/pages/index.tsx",
                    lineNumber: 29,
                    columnNumber: 23
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/pages/index.tsx",
            lineNumber: 29,
            columnNumber: 10
        }, this);
        $[3] = isLoading;
        $[4] = t2;
    } else {
        t2 = $[4];
    }
    return t2;
}
_s(Home, "+SThRCGkngsF4NgIiL6AN16ylzc=");
_c = Home;
var _c;
__turbopack_context__.k.register(_c, "Home");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/src/pages/index.tsx [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/src/pages/index.tsx [client] (ecmascript)");
    }
]);
// @ts-expect-error module.hot exists
if (module.hot) {
    // @ts-expect-error module.hot exists
    module.hot.dispose(function() {
        window.__NEXT_P.push([
            PAGE_PATH
        ]);
    });
}
}),
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/src/pages/index\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/src/pages/index.tsx [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__839efa73._.js.map