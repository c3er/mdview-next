const common = require("./common")
const encodingLib = require("./encodingShared")
const error = require("./errorMain")
const log = require("./logMain")

const shared = require("./menuShared")

let electron

function sendToRenderer(window, id, ...args) {
    window.send(shared.ipcMessageId(id), ...args)
}

function openFile(filePath) {
    log.debug(`Open file "${filePath}"`)
}

function reload() {
    log.debug("Reloading")
}

exports.init = electronMock => (electron = electronMock ?? require("electron"))

exports.create = window => {
    const aboutEntry = {
        label: "&About",
        id: shared.id.about,
        click() {
            sendToRenderer(window, shared.id.about)
        },
    }
    const settingsEntry = {
        label: "&Settings...",
        accelerator: "CmdOrCtrl+,",
        id: shared.id.settings,
        click() {
            sendToRenderer(window, shared.id.settings)
        },
    }
    return electron.Menu.buildFromTemplate([
        ...(common.isMacOS()
            ? [
                  {
                      label: electron.app.name,
                      submenu: [
                          aboutEntry,
                          { type: "separator" },
                          settingsEntry,
                          { role: "services" },
                          { type: "separator" },
                          { role: "hide" },
                          { role: "hideOthers" },
                          { role: "unhide" },
                          { type: "separator" },
                          { role: "quit" },
                      ],
                  },
              ]
            : []),
        {
            label: "&File",
            submenu: [
                {
                    label: "&Open",
                    accelerator: "CmdOrCtrl+O",
                    async click() {
                        try {
                            const result = await electron.dialog.showOpenDialog({
                                properties: ["openFile"],
                                filters: [
                                    {
                                        name: "Markdown",
                                        extensions: common.FILE_EXTENSIONS,
                                    },
                                ],
                            })
                            if (!result.canceled) {
                                openFile(result.filePaths[0])
                            }
                        } catch (e) {
                            error.show(`Problem at opening file:\n ${e}`)
                        }
                    },
                },
                {
                    label: "&Print",
                    accelerator: "CmdOrCtrl+P",
                    click() {
                        sendToRenderer(window, shared.id.print)
                    },
                },
                { type: "separator" },
                {
                    label: "Recent Files",
                    id: "fileHistory", // Temporary
                    submenu: [],
                },
                {
                    label: "Clear Recent Files List",
                    id: shared.id.clearFileHistory,
                    enabled: false,
                    click() {
                        sendToRenderer(window, shared.id.clearFileHistory)
                    },
                },
                { type: "separator" },
                {
                    label: "&Close",
                    accelerator: "CmdOrCtrl+W",
                    click() {
                        window.close()
                    },
                },
            ],
        },
        {
            label: "&Edit",
            submenu: [
                { role: "copy" },
                { type: "separator" },
                {
                    label: "&Find...",
                    accelerator: "CmdOrCtrl+F",
                    id: shared.id.find,
                    click() {
                        sendToRenderer(window, shared.id.find)
                    },
                },
                {
                    label: "Find &next",
                    accelerator: "F3",
                    id: shared.id.findNext,
                    enabled: false,
                    click() {
                        sendToRenderer(window, shared.id.findNext)
                    },
                },
                {
                    label: "Find &previous",
                    accelerator: "Shift+F3",
                    id: shared.id.findPrevious,
                    enabled: false,
                    click() {
                        sendToRenderer(window, shared.id.findPrevious)
                    },
                },
                { type: "separator" },
                settingsEntry,
            ],
        },
        {
            label: "&View",
            submenu: [
                {
                    label: "&Back",
                    accelerator: "Alt+Left",
                    id: shared.id.navigateBack,
                    click() {
                        sendToRenderer(window, shared.id.navigateBack)
                    },
                },
                {
                    label: "&Forward",
                    accelerator: "Alt+Right",
                    id: shared.id.navigateForward,
                    click() {
                        sendToRenderer(window, shared.id.navigateForward)
                    },
                },
                { type: "separator" },
                {
                    label: "&Refresh",
                    accelerator: "F5",
                    click() {
                        reload()
                    },
                },
                {
                    label: "&Unblock All External Content",
                    accelerator: "Alt+U",
                    id: shared.id.unblockAll,
                    click() {
                        sendToRenderer(window, shared.id.unblockAll)
                    },
                },
                {
                    label: "&View Raw Text",
                    accelerator: "Ctrl+U",
                    id: shared.id.rawText,
                    click() {
                        sendToRenderer(window, shared.id.rawText)
                    },
                },
                {
                    label: "Table Of &Content",
                    submenu: [
                        {
                            label: "Show For &All Documents",
                            accelerator: "Alt+Shift+C",
                            id: shared.id.tocShowForAll,
                            type: "checkbox",
                            click() {
                                sendToRenderer(window, shared.id.tocShowForAll)
                            },
                        },
                        {
                            label: "Show For &This Document",
                            accelerator: "Alt+C",
                            id: shared.id.tocShowForThisDocument,
                            type: "checkbox",
                            click() {
                                sendToRenderer(window, shared.id.tocShowForThisDocument)
                            },
                        },
                        { type: "separator" },
                        {
                            label: "Forget Document Override",
                            id: shared.id.tocForgetDocumentOverride,
                            click() {
                                sendToRenderer(window, shared.id.tocForgetDocumentOverride)
                            },
                        },
                    ],
                },
                { type: "separator" },
                {
                    label: "&Zoom",
                    submenu: [
                        {
                            label: "Zoom &In",
                            accelerator: "CmdOrCtrl+Plus",
                            click() {
                                sendToRenderer(window, shared.id.zoomIn)
                            },
                        },
                        {
                            label: "Zoom &Out",
                            accelerator: "CmdOrCtrl+-",
                            click() {
                                sendToRenderer(window, shared.id.zoomOut)
                            },
                        },
                        { type: "separator" },
                        {
                            label: "&Reset Zoom",
                            accelerator: "CmdOrCtrl+0",
                            click() {
                                sendToRenderer(window, shared.id.zoomReset)
                            },
                        },
                    ],
                },
            ],
        },
        {
            label: "En&coding",
            submenu: encodingLib.ENCODINGS.map(encoding => {
                const encodingId = shared.ipcMessageId(encodingLib.toId(encoding))
                return {
                    label: encoding,
                    type: "radio",
                    id: encodingId,
                    click() {
                        sendToRenderer(window, shared.id.encodingChange, encodingId)
                    },
                }
            }),
        },
        {
            label: "&Tools",
            submenu: [
                {
                    label: "&Developer Tools",
                    accelerator: "F10",
                    click() {
                        window.openDevTools()
                    },
                },
                {
                    label: "De&bug",
                    submenu: [
                        {
                            label: "Throw e&xception",
                            click() {
                                throw new Error("An exception")
                            },
                        },
                        {
                            label: "Show &error dialog",
                            id: shared.id.errorDialog,
                            click() {
                                sendToRenderer(window, shared.id.errorDialog)
                            },
                        },
                        {
                            label: "Soft &reload",
                            click() {
                                log.debug("Soft reload")
                            },
                        },
                    ],
                },
            ],
        },
        { role: "windowMenu" },
        ...(!common.isMacOS()
            ? [
                  {
                      label: "&Help",
                      submenu: [aboutEntry],
                  },
              ]
            : []),
    ])
}
