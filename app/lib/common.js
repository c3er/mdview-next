exports.FILE_EXTENSIONS = ["md", "markdown"]

// Source: https://stackoverflow.com/a/32108184 (How do I test for an empty JavaScript object?)
exports.isEmptyObject = obj => Object.keys(obj).length === 0 && obj.constructor === Object

exports.isMacOS = () => process.platform === "darwin"
