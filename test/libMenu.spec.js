const lib = require("./testLib")
const mocking = require("./mocking")

const about = require("../app/lib/aboutRenderer")
const error = require("../app/lib/errorRenderer")
const navigation = require("../app/lib/navigationRenderer")
const renderer = require("../app/lib/commonRenderer")
const search = require("../app/lib/searchRenderer")
const settings = require("../app/lib/settingsRenderer")
const storage = require("../app/lib/storageRenderer")

describe("Menu module", () => {
    describe("Handlers", () => {
        const ipc = require("../app/lib/ipcRenderer")

        const menuHandling = require("../app/lib/menuHandlingRenderer")
        const menuShared = require("../app/lib/menuShared")

        beforeEach(() => {
            mocking.cleanup()

            const documentMock = mocking.createDocument()
            const windowMock = mocking.createWindow()
            const electronMock = mocking.createElectron()

            lib.registerElectronLogIpc()
            lib.registerMenuItemEnabledMessage()
            ipc.init(electronMock)
            menuHandling.init()

            renderer.init(documentMock, windowMock)
            about.init(documentMock, electronMock)
            error.init(documentMock)
            search.init(documentMock, () => {})
            navigation.init(documentMock, lib.DEFAULT_DOCUMENT_PATH, electronMock)
            storage.init(lib.STORAGE_PATHS, electronMock, mocking.createTheme())

            settings.init(documentMock, windowMock)
            settings.setFilePath(lib.DEFAULT_DOCUMENT_PATH)
        })

        describe("Handlers", () => {
            for (const menuId of Object.values(menuShared.id)) {
                it(`handles menu entry "${menuId}`, () => {
                    mocking.ipc.sendToRenderer(menuShared.ipcMessageId(menuId))
                })
            }
        })
    })
})
