/**
 * Chain.io Pre-Processor for storing input file values for accessibility in post-processor
 *
 * Features:
 * - Parse the JSON body of each file
 * - Store the reference, order count, total value, and processed timestamp for each order by order number in executionContext
 */
const storeValues = (file) => {
  const orders = JSON.parse(file.body)

  const orderNumber = orders.orderNumber

  executionContext[orderNumber].orderReference = orders.reference
  executionContext[orderNumber].orderCount = orders.length
  executionContext[orderNumber].totalValue = orders.reduce((sum, order) => sum + (order.value || 0), 0)
  executionContext[orderNumber].processedAt = new Date().toISOString()
}

for (const sourceFile of sourceFiles) {
  storeValues(sourceFile)
}

returnSuccess(sourceFiles)