const menu = require("./menuRenderer")
const navigation = require("./navigationRenderer")
const storage = require("./storageRenderer")

const ADD_TO_FILE_HISTORY_NAV_ID = "add-to-file-history"

function addFile(filePath) {
    storage.loadFileHistory().add(filePath)
    menu.update()
}

function clear() {
    storage.loadFileHistory().clear()
    menu.update()
}

exports.init = (mainMenu, initialFilePath, electronMock) => {
    _mainMenu = mainMenu
    electron = electronMock ?? require("electron")

    addFile(initialFilePath)

    navigation.register(ADD_TO_FILE_HISTORY_NAV_ID, () => addFile(navigation.currentDocumentPath()))
}

exports.clear = clear

exports.updateMenu = () => menu.update()
