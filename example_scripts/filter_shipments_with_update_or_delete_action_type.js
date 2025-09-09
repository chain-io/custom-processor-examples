/**
 * This script will filter out files with action_type update or delete and return
 * a Skipped status if no files remain.  
 * 
 * It assumes the input files will be Chain.io standard shipment JSON.
 * 
 * https://docs.chain.io/specs/shipment_json
 */
const remainingFiles = sourceFiles.map((sf) => {
  try {
    const body = JSON.parse(sf.body)
    const actionType = lodash.get(body, 'shipments[0].action_type')
    if (actionType === 'update' || actionType === 'delete') {
      userLog.info(`skipping file ${sf.name} with action_type ${actionType}`)
      return null
    }
    return sf
  } catch (err) {
    userLog.error(`unexpected error parsing json ${err.message}, returning file as is`)
    return sf
  }
}).filter(x => x)

if (remainingFiles.length === 0) {
  returnSkipped([])
} else {
  returnSuccess(remainingFiles)
}
