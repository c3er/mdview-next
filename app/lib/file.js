const path = require("path")

exports.transformRelativePath = (documentDirectory, filePath) =>
    path.join(documentDirectory, filePath).replace("#", "%23")

exports.isAbsolutePath = filePath => Boolean(filePath.match(/^(\S\:)?(\\|\/)/))
