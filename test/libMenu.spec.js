const lib = require("./testLib")
const mocking = require("./mocking")

const error = require("../app/lib/errorRenderer")

describe("Menu module", () => {
    describe("Handlers", () => {
        const ipc = require("../app/lib/ipcRenderer")

        const menuHandling = require("../app/lib/menuHandlingRenderer")
        const menuShared = require("../app/lib/menuShared")

        beforeEach(() => {
            mocking.cleanup()
            lib.registerElectronLogIpc()
            ipc.init(mocking.createElectron())
            menuHandling.init()

            error.init(mocking.createDocument())
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
