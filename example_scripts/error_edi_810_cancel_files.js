/**
 * This pre-processor looks for EDI 810 files with a (3) cancel status in the BIG09 Element
 * and causes them to error while writing a data tag with the order number from the BIG02
 * 
 * Use this along with a notifier to alert your operations when a customer attempts to 
 * cancel an invoice instead of sending it into your TMS so they can take action offline
 */

function isCancel(body) {
  return !!body.match(/BIG\*.*\*3~/g)
}

function getOrderNumber(body) {
  return body.match(/BIG\*[0-9]*\*[a-zA-Z0-9]*/).toString().split('*')[2]
}

const cancelFound = sourceFiles.find(file => {
  const { body } = file
  if (isCancel(body)) {
    return body
  }
})

if (cancelFound) {
  const orderNumber = getOrderNumber(cancelFound.body)
  publishDataTags({ label: 'Cancelled Order', value: orderNumber })
  userLog.info(`Cancel found for order ${orderNumber}, failing preprocessor`)
  returnError()
} else {
  returnSuccess(sourceFiles)
}
