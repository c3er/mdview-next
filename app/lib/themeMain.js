const ipc = require("./ipcMainIntern")

let electron

exports.init = electronMock => {
    electron = electronMock ?? require("electron")
    ipc.handle(ipc.messages.intern.fetchTheme, () => electron.nativeTheme.themeSource)
    ipc.listen(
        ipc.messages.intern.setTheme,
        (_, theme) => (electron.nativeTheme.themeSource = theme),
    )
}
