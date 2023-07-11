
// Script to iterate through each file and only pass through files where all of the given xpaths are satisfied
const xpathsToMatch = [
  '//event/code[text()="Arrival"]',
  '//event/code[text()="Departure"]'
]

// This script is supposed to simply ignore any files that don't match the xpaths
// and that includes files that are not valid xml
const parseXml = (file, index) => {
  try {
    const dom = new xmldom.DOMParser({
      errorHandler: {
        error: (msg) => { throw new Error(msg) },
        fatalError: (msg) => { throw new Error(msg) }
      }
    })
    xml = dom.parseFromString(file.body)
    return xml
  } catch (e) {
    userLog.warning(`File ${file.file_name} (#${index}) could not be parsed as XML. File will not be included in payload.`)
    return null
  }
}
// Iterate through each file and only pass through files where all of the given xpaths are satisfied
const files = lodash.filter(sourceFiles, (file, index) => {
  const xml = parseXml(file, index)
  if (!xml) {
    // returning false will filter out the file
    return false
  }
  // Check if all xpaths are satisfied
  const satisfied = lodash.every(xpathsToMatch, path => {
    const result = xpath.select(path, xml)
    if (result.length === 0) {
      userLog.info(`File ${file.file_name} (#${index}) did not satisfy xpath ${path}. File will not be included in payload`)
      return false
    }
    // returning true will continue to the next xpath
    return true
  })
  if (satisfied) {
    userLog.info(`File ${file.file_name} (#${index}) satisfied all xpaths. File will be included in payload`)
    // returning true will include the file in the output
    return true
  }
  // returning false will filter out the file
  return false
})

// the last statement should be the return value of the processor
files
