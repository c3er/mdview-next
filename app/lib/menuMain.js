const shared = require("./menuShared")

let electron

function sendToRenderer(window, id) {
    window.send(shared.ipcMessageId(id))
}

exports.init = electronMock => (electron = electronMock ?? require("electron"))

exports.create = (id, selectWindow) =>
    electron.Menu.buildFromTemplate([
        {
            label: electron.app.name,
            submenu: [
                {
                    label: "&About",
                    click() {
                        sendToRenderer(selectWindow(id), shared.id.about)
                    },
                },
                { type: "separator" },
                {
                    label: "Close window",
                    accelerator: "CmdOrCtrl+W",
                    click() {
                        selectWindow(id).close()
                    },
                },
                {
                    label: "Developer tools",
                    accelerator: "F10",
                    click() {
                        selectWindow(id).openDevTools()
                    },
                },
                {
                    label: "Throw exception",
                    click() {
                        throw new Error("An error")
                    },
                },
                { type: "separator" },
                { role: "services" },
                { type: "separator" },
                { role: "hide" },
                { role: "hideOthers" },
                { role: "unhide" },
                { type: "separator" },
                { type: "separator" },
                { role: "quit" },
            ],
        },
    ])
