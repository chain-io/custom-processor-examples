// Chain.io Custom Pre-Processor: Split Root Array JSON into Individual Files
// This script expects each source file to be a JSON file whose root is an array.
// For each object in the array, it creates a new file (with a unique name and uuid).
// If the file is not a JSON array at the root, it is omitted from the output.

const processedFiles = destinationFiles.flatMap((file) => {
  let data
  try {
    data = JSON.parse(file.body)
  } catch (err) {
    userLog.warning(`Skipping file ${file.file_name}: invalid JSON.`)
    return [] // Omit invalid JSON files
  }

  if (!Array.isArray(data)) {
    userLog.info(`Skipping file ${file.file_name}: root is not an array.`)
    return [] // Omit files that are not root arrays
  }

  // For each object in the array, create a new file
  return data.map((obj, idx) => {
    // Defensive: Only split if obj is an object (not primitive)
    if (typeof obj !== 'object' || obj === null) {
      userLog.warning(`Skipping non-object entry at index ${idx} in file ${file.file_name}`)
      return null
    }
    // Generate a new file name based on the original, with index
    const extIdx = file.file_name.lastIndexOf('.')
    const baseName = extIdx !== -1 ? file.file_name.slice(0, extIdx) : file.file_name
    const ext = extIdx !== -1 ? file.file_name.slice(extIdx) : '.json'
    const newFileName = `${baseName}_${idx + 1}${ext}`
    return {
      uuid: uuid(),
      type: 'file',
      file_name: newFileName,
      format: 'json',
      mime_type: 'application/json',
      body: JSON.stringify(obj)
    }
  }).filter(Boolean)
})

if (processedFiles.length === 0) {
  userLog.info('No valid array files found to split. Returning skipped.')
  returnSkipped([])
} else {
  userLog.info(`Split into ${processedFiles.length} files.`)
  returnSuccess(processedFiles)
}
