const handleFile = (file) => {
  const orders = JSON.parse(file.body)
  const orderNumber = orders.orderNumber

  const orderReference = executionContext[orderNumber].orderReference
  const orderCount = executionContext[orderNumber].orderCount
  const totalValue = executionContext[orderNumber].totalValue
  const processedAt = executionContext[orderNumber].processedAt

  userLog(`Processed ${orderCount} order(s) ${orderNumber} with a total value of ${totalValue} at ${processedAt}`)

  return { ...file, file_name: `${orderReference}_processed.json` }
}

const updatedFiles = destinationFiles.map(handleFile).filter(x => x)

if (updatedFiles.length === 0) {
  returnSkipped([])
} else {
  returnSuccess(updatedFiles)
}