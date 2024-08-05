const IPC_PREFIX = "menu-"

exports.IPC_PREFIX = IPC_PREFIX

exports.id = {
    about: "about",
    close: "close",
}

exports.ipcMessageId = id => IPC_PREFIX + id
