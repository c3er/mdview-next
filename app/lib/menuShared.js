const IPC_PREFIX = "menu-"

exports.IPC_PREFIX = IPC_PREFIX

exports.id = {
    about: "about",
    clearFileHistory: "clear-file-history",
    encodingChange: "encoding-change",
    errorDialog: "error-dialog",
    find: "find",
    findNext: "find-next",
    findPrevious: "find-previous",
    navigateBack: "navigate-back",
    navigateForward: "navigate-forward",
    print: "print",
    rawText: "raw-text",
    settings: "settings",
    tocForgetDocumentOverride: "toc-forget-Document-override",
    tocShowForAll: "toc-show-for-all",
    tocShowForThisDocument: "toc-show-for-this-document",
    unblockAll: "unblock-all",
    zoomIn: "zoom-in",
    zoomOut: "zoom-out",
    zoomReset: "zoom-reset",
}

exports.ipcMessageId = id => IPC_PREFIX + id
