(async () => { // when using await you need to wrap the code in an async function
  // Partner UUID and data tag value to search for (find the partner UUID in the url of the flow after the /tp/)
  const partnerUUID = '00000000-0000-0000-0000-000000000000'
  const dataTagValue = 'abcdefghijk'

  // Search for executions with the specified data tag value
  const results = await executionSearchByPartner(partnerUUID, {
    dataTag: dataTagValue
  })

  if (results.data && results.data.length > 0) {
    // Log the JSON of the first data response
    userLog.info('First execution search result: ' + JSON.stringify(results.data[0], null, 2))
  } else {
    userLog.info(`No executions found for partner ${partnerUUID} with data tag value ${dataTagValue}`)
  }

  // Always return the original sourceFiles
  return returnSuccess(sourceFiles)
})() // don't forget to call the function with () at the end