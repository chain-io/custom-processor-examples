const fs = require('fs')
const path = require('path')

/**
 * Utility method to scan all files in a directory and create a payload
 * in the format expected by the preprocessor/postprocessor.
 * This can be used to test all of the expected scenarios for a preprocessor/postprocessor
 * @param {string} dirPath - the path to the directory to scan. It will inclue all files in the directory
 **/
module.exports = function createPayloadFromDir(dirPath) {
  const files = fs.readdirSync(dirPath)
  const payload = []
  files.forEach((file) => {
    const filePath = path.join(dirPath, file)
    if (fs.statSync(filePath).isFile()) {
      const fileContent = fs.readFileSync(filePath, 'utf8')
      payload.push({
        type: 'file',
        body: fileContent,
        file_name: file
      })
    }
  })
  return payload
}
