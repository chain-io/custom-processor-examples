// Example: Retrieve the newest file from a partner's most recent execution
// tagged with "EXAMPLETAG" and return it as the processor output.
//
// Uses: executionSearchByPartner, listExecutionFiles, getExecutionFile
// Requires the async IIFE wrapper pattern.

(async () => {
  // 1. Search for executions with the "EXAMPLETAG" data tag
  const results = await executionSearchByPartner('YOUR-PARTNER-UUID', {
    dataTag: 'EXAMPLETAG'
  })

  if (!results.data.length) {
    userLog.warning('No executions found with dataTag "EXAMPLETAG"')
    return returnSkipped([])
  }

  // 2. Get the first (most recent) invocation
  const invocation = results.data[0]
  userLog.info(`Found invocation: ${invocation.invocation_uuid}`)

  // 3. List all files attached to that invocation
  const files = await listExecutionFiles(invocation.invocation_uuid)

  if (!files.length) {
    userLog.warning('No files found for invocation')
    return returnSkipped([])
  }

  // 4. Find the newest file by created_time
  const newestFile = files.reduce((latest, file) =>
    file.created_time > latest.created_time ? file : latest
  )
  userLog.info(`Newest file: ${newestFile.file_name} (created ${newestFile.created_time})`)

  // 5. Download the file content and get a file object
  const fileObject = await getExecutionFile({
    invocation_uuid: newestFile.invocation_uuid,
    time_and_hash: newestFile.time_and_hash
  })

  // Return the downloaded file as the processor output
  return returnSuccess([fileObject])
})()
