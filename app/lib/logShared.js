exports.processType = {
    main: "main",
    started: "started",
    renderer: "renderer",
}

exports.scopeString = (processType, pid) => `${processType} ${pid}`
