const lib = require("./testLib")
const mocking = require("./mocking")

const about = require("../app/lib/aboutRenderer")
const error = require("../app/lib/errorRenderer")

describe("Menu module", () => {
    describe("Handlers", () => {
        const ipc = require("../app/lib/ipcRenderer")

        const menuHandling = require("../app/lib/menuHandlingRenderer")
        const menuShared = require("../app/lib/menuShared")

        beforeEach(() => {
            mocking.cleanup()
            lib.registerElectronLogIpc()
            lib.registerMenuItemEnabledMessage()
            ipc.init(mocking.createElectron())
            menuHandling.init()

            const document = mocking.createDocument()
            about.init(document, mocking.createElectron())
            error.init(document)
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
