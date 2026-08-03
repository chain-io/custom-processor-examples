# executionSearchByIntegration() - Flow Execution Search

## Overview

The `executionSearchByIntegration()` function allows you to search for previous flow execution records within your custom processors. This function provides programmatic access to the same execution data you can view in the **Flow Execution Search screen** in the Chain.io portal.

Think of it as bringing the portal's search functionality directly into your custom processor code, enabling you to:
- Look up previous executions from any integration in your workspace
- Access execution metadata (status, timestamps, data tags, messages)
- Filter by date ranges and data tags
- Build data enrichment logic based on execution history

## Function Signature

```javascript
executionSearchByIntegration(integrationId, args)
```

### Returns
A **Promise** that resolves to a search results object (see [Return Value Structure](#return-value-structure) below).

⚠️ **Important**: Because this returns a Promise, you must use the [async wrapper pattern](#using-the-async-wrapper) in your processor.

## Parameters

### `integrationId` (string, required)

The ID of the integration whose executions you want to search.

**How to find the integration ID:**
1. Open a flow execution in the Chain.io portal
2. Look at the URL: `https://portal.chain.io/c/[workspace-id]/tp/[integration-id]/[flow-execution-id]`
3. The integration ID is the segment after `/tp/`

**Example:**
```javascript
const integrationId = '12345678-1234-1234-1234-123456789abc'
const results = await executionSearchByIntegration(integrationId)
```

### `args` (object, optional)

An optional object containing search filters. If omitted, the search returns recent executions without filters (similar to viewing the execution screen without applying any filters).

#### Available Filter Options

##### `startDateAfter` (string, optional)

Filter to only include executions that started **after** this date/time.

**Format:** ISO 8601 date-time string (e.g., `"2024-01-15T10:30:00Z"`)

**Portal Equivalent:** This is like setting the "From" date in the execution search screen's date range filter.

**Example:**
```javascript
const results = await executionSearchByIntegration(integrationId, {
  startDateAfter: '2024-01-01T00:00:00Z'  // Only executions from Jan 1, 2024 onwards
})
```

**Use Cases:**
- Get executions from the last 24 hours
- Find executions since a specific deployment
- Retrieve data from the current month only

```javascript
// Last 24 hours
const yesterday = DateTime.now().minus({ days: 1 }).toISO()
const results = await executionSearchByIntegration(integrationId, {
  startDateAfter: yesterday
})

// Current month
const monthStart = DateTime.now().startOf('month').toISO()
const results = await executionSearchByIntegration(integrationId, {
  startDateAfter: monthStart
})
```

##### `startDateBefore` (string, optional)

Filter to only include executions that started **before** this date/time.

**Format:** ISO 8601 date-time string (e.g., `"2024-12-31T23:59:59Z"`)

**Portal Equivalent:** This is like setting the "To" date in the execution search screen's date range filter.

**Example:**
```javascript
const results = await executionSearchByIntegration(integrationId, {
  startDateBefore: '2024-12-31T23:59:59Z'  // Only executions before end of 2024
})
```

**Combining Date Filters:**
You can use both `startDateAfter` and `startDateBefore` together to define a specific date range:

```javascript
// Get all executions from January 2024
const results = await executionSearchByIntegration(integrationId, {
  startDateAfter: '2024-01-01T00:00:00Z',
  startDateBefore: '2024-01-31T23:59:59Z'
})
```

##### `dataTag` (string, optional)

Filter executions by a specific data tag value.

**Portal Equivalent:** This searches the "Data Tags" column in the execution screen. Data tags are custom key-value pairs that flows can publish during execution (using `publishDataTags()`) for tracking and filtering purposes.

**Example:**
```javascript
const results = await executionSearchByIntegration(integrationId, {
  dataTag: 'ORDER_BATCH_123'
})
```

**How Data Tags Work:**
- Data tags are published during flow execution using `publishDataTags([{ label: 'Batch ID', value: 'ORDER_BATCH_123' }])`
- The search matches against the **value** portion of the tag
- Useful for tracking related executions (batch IDs, order numbers, invoice numbers, etc.)

**Use Cases:**
```javascript
// Find all executions for a specific order number
const results = await executionSearchByIntegration(integrationId, {
  dataTag: 'ORD-2024-001'
})

// Find executions with a specific batch ID
const results = await executionSearchByIntegration(integrationId, {
  dataTag: 'BATCH_20240115_001'
})

// Combine with date filters
const results = await executionSearchByIntegration(integrationId, {
  dataTag: 'INVOICE_BATCH',
  startDateAfter: '2024-01-01T00:00:00Z'
})
```

##### `flow_id` (string, optional)

Filter executions to a specific flow within the integration.

**Format:** UUID string (e.g., `"87654321-4321-4321-4321-210987654321"`)

**Portal Equivalent:** This is like selecting a specific flow in the execution search screen when an integration has multiple flows.

**Example:**
```javascript
const results = await executionSearchByIntegration(integrationId, {
  flow_id: '87654321-4321-4321-4321-210987654321'
})
```

⚠️ **The flow must belong to `integrationId`.** If it doesn't, the search rejects rather than returning results — a mismatched pair is a configuration error, not an empty result set. `integrationId` remains required either way. The rejection arrives as a thrown `Error` whose message is prefixed by the wrapper:

```
Flow execution search failed: Flow <flow_id> does not belong to integration <integrationId>
```

Match on a substring (or just log `error.message`) rather than comparing the whole string — the prefix is added by the search wrapper and the suffix comes from the server.

**How to find the flow ID:**
1. Open the flow's configuration in the Chain.io portal
2. Look at the URL: `https://portal.chain.io/c/[workspace-id]/settings/tp/[integration-id]/fc/[flow-id]`
3. The flow ID is the segment after `/fc/`

**Use Cases:**
- Narrow results when an integration has multiple flows and you only care about one
- Combine with date filters to find executions for a specific flow in a date range

```javascript
// Executions for a specific flow in the last 7 days
const results = await executionSearchByIntegration(integrationId, {
  flow_id: '87654321-4321-4321-4321-210987654321',
  startDateAfter: DateTime.now().minus({ days: 7 }).toISO()
})
```

**Why this beats filtering the results yourself:** a search scans up to 2000 index records and returns at most 200. Filtering an integration-wide search down to one flow in your own code means the flow you want can be pushed off the page by other flows' executions. `flow_id` scopes the query itself, so the cap applies to that one flow's executions.

⚠️ **Do not reuse a `cursor` across searches that differ in `flow_id`.** Cursors encode the position of the underlying query, which changes when `flow_id` is added or removed. Paginate with the filter held constant.

##### `cursor` (string, optional)

Pagination cursor for retrieving additional results when there are more records than fit in a single response.

**Portal Equivalent:** Like clicking "Load More" or "Next Page" in the execution search screen.

**How Pagination Works:**
1. Each returned row carries its own `cursor` marking its position in the result set
2. If `hasMoreRecords` is `true`, pass the **last row's** `cursor` to fetch the next page
3. Repeat until `hasMoreRecords` is `false`

⚠️ **The cursor is on each row, not on the response.** There is no `results.cursor` — reading one yields `undefined`, which restarts the search from the beginning and loops until the 10-search rate limit is hit. Always take it from `results.data[results.data.length - 1].cursor`.

**Example:**
```javascript
(async () => {
  let allExecutions = []
  let cursor = null
  let hasMore = true

  // Fetch all pages
  while (hasMore) {
    const results = await executionSearchByIntegration(integrationId, {
      startDateAfter: '2024-01-01T00:00:00Z',
      cursor: cursor  // undefined on first call, then the last row's cursor
    })

    allExecutions = allExecutions.concat(results.data)
    hasMore = results.hasMoreRecords

    // Advance from the last row of this page; bail out if the page was empty,
    // otherwise hasMoreRecords could spin the loop forever.
    const lastRow = results.data[results.data.length - 1]
    if (!lastRow || !lastRow.cursor) break
    cursor = lastRow.cursor

    userLog.info(`Fetched ${results.data.length} executions, total so far: ${allExecutions.length}`)
  }

  userLog.info(`Retrieved all ${allExecutions.length} executions`)

  // Process your data
  return returnSuccess(sourceFiles)
})()
```

⚠️ **Rate Limit Warning**: Remember that you're limited to 10 searches per execution. Be mindful when paginating through large result sets.

## Return Value Structure

The function returns a Promise that resolves to an object with the following structure:

```javascript
{
  data: [
    {
      invocation_id: "550e8400-e29b-41d4-a716-446655440000",
      integration_id: "12345678-1234-1234-1234-123456789abc",
      flow_id: "87654321-4321-4321-4321-210987654321",
      start_date: "2024-01-15T10:30:00.000Z",
      ended_date: "2024-01-15T10:30:45.123Z",
      flow_status: "success",
      summary_message: "Processed 150 orders successfully",
      data_tags: [
        { label: "Batch ID", value: "BATCH_001" },
        { label: "Order Count", value: "150" }
      ],
      cursor: "eyJwayI6IlBBUnwxMjM0NTY3OCJ9",  // this row's pagination position
      // ... additional fields
    },
    // ... more execution records
  ],
  recordsReturned: 1,
  hasMoreRecords: false
}
```

The envelope has exactly three keys: `data`, `recordsReturned`, and `hasMoreRecords`. There is no top-level `cursor`, `totalRecords`, or `searchCapped` — the cursor lives on each row.

### Response Fields

#### `data` (array)
Array of execution record objects. Each object represents one flow execution.

**Common Execution Record Fields:**

- **`invocation_id`** (string): Unique identifier for this specific execution
- **`integration_id`** (string): ID of the integration
- **`flow_id`** (string): ID of the flow that was executed
- **`start_date`** (string): ISO timestamp when execution started
- **`ended_date`** (string): ISO timestamp when execution completed
- **`flow_status`** (string): Execution status. The stored values do not match the portal's labels, so compare against the value, not the label you see on screen:

  | Value | Portal label |
  |-------|--------------|
  | `success` | Success |
  | `warning` | Success w/ Warning |
  | `logical_fail` | Error (caused by input data) |
  | `bug` | Technical Error |
  | `skipped` | Skipped |
  | `pending_ack` | Pending Acknowledgement |

  An execution that has not finished usually has no `flow_status` at all: its lifecycle state (`IN_PROGRESS`, `SUBMITTED`, `COMPLETED`, `FAILED`) is stored on a separate `status` field that the search does not return. Treat a missing `flow_status` as "not finished yet", not as a failure.

  **Two values mean success and two mean failure**, so a single-value equality check will silently miss half of each case. Compare against groups:

  ```javascript
  const SUCCEEDED = ['success', 'warning']     // "warning" is Success w/ Warning
  const FAILED = ['logical_fail', 'bug']       // data-driven Error, and Technical Error

  const succeeded = results.data.filter(e => SUCCEEDED.includes(e.flow_status))
  const failed = results.data.filter(e => FAILED.includes(e.flow_status))
  ```

  Checking only `=== 'success'` treats a run that succeeded with warnings as a failure; checking only `=== 'logical_fail'` misses every technical error.
- **`summary_message`** (string): Human-readable summary of the execution result (truncated to 1000 characters)
- **`data_tags`** (array): Array of `{ label, value }` objects published during execution

⚠️ **Fields are omitted, not nulled.** Any field missing from the underlying execution record is left off the row entirely rather than returned as `null` — so use `if ('flow_status' in row)` or optional chaining rather than assuming a key exists.

**Example - Accessing Execution Data:**
```javascript
(async () => {
  const results = await executionSearchByIntegration(integrationId)

  results.data.forEach(execution => {
    userLog.info(`Execution ${execution.invocation_id}:`)
    userLog.info(`  Status: ${execution.flow_status}`)
    userLog.info(`  Started: ${execution.start_date}`)
    userLog.info(`  Message: ${execution.summary_message}`)

    // Check data tags
    if (execution.data_tags && execution.data_tags.length > 0) {
      execution.data_tags.forEach(tag => {
        userLog.info(`  ${tag.label}: ${tag.value}`)
      })
    }
  })

  return returnSuccess(sourceFiles)
})()
```

#### `recordsReturned` (number)
Number of execution records in `data` for this page.

#### `hasMoreRecords` (boolean)
Indicates whether there are additional results available beyond the current page.

- `true`: More records exist, use the last row's `cursor` to fetch the next page
- `false`: This is the last page of results

#### `cursor` (string, per row)
Each row in `data` carries a `cursor` marking its position. To page forward, pass the **last** row's cursor as the `cursor` argument of the next search. The response envelope itself has no `cursor` field.

## Using the Async Wrapper

Because `executionSearchByIntegration()` returns a Promise, you **must** wrap your entire processor script in an async IIFE (Immediately Invoked Function Expression).

### ❌ This Will NOT Work:
```javascript
// ERROR: await outside async function
const results = await executionSearchByIntegration(integrationId)
returnSuccess(sourceFiles)
```

### ✅ This WILL Work:
```javascript
(async () => {
  const results = await executionSearchByIntegration(integrationId)
  return returnSuccess(sourceFiles)  // Note: use "return"
})()
```

### Key Rules:
1. Wrap everything in `(async () => { ... })()`
2. Use `return` before `returnSuccess()`, `returnError()`, or `returnSkipped()`
3. The `()` at the end immediately invokes the function

## Rate Limiting

⚠️ **Maximum 10 searches per execution**

You are limited to 10 calls to `executionSearchByIntegration()` within a single processor execution. This prevents performance issues and excessive load.

**What counts as a search:**
- Each call to `executionSearchByIntegration()` counts as one search
- This includes pagination requests (each page fetch counts separately)

**Best Practices:**
- Use specific filters to reduce the number of results
- Cache results in variables if you need to reference them multiple times
- Avoid searching in loops unless absolutely necessary
- Consider if you really need to paginate through all results

**Example - Efficient Search:**
```javascript
(async () => {
  // ✅ Good: One targeted search with filters
  const results = await executionSearchByIntegration(integrationId, {
    dataTag: 'BATCH_001',
    startDateAfter: DateTime.now().minus({ days: 7 }).toISO()
  })

  // Cache the results for multiple uses
  const successfulExecutions = results.data.filter(e => ['success', 'warning'].includes(e.flow_status))
  const errorExecutions = results.data.filter(e => ['logical_fail', 'bug'].includes(e.flow_status))

  userLog.info(`Found ${successfulExecutions.length} successful executions`)
  userLog.info(`Found ${errorExecutions.length} failed executions`)

  // Use the cached results throughout your processor
  // ...

  return returnSuccess(sourceFiles)
})()
```

**Example - Inefficient (Avoid):**
```javascript
(async () => {
  // ❌ Bad: Searching in a loop
  const processedFiles = []

  for (const file of sourceFiles) {
    const data = JSON.parse(file.body)

    // This could hit rate limit quickly!
    const results = await executionSearchByIntegration(integrationId, {
      dataTag: data.orderId
    })

    // Process with results...
  }

  return returnSuccess(processedFiles)
})()
```

## Timeout Considerations

All custom processors have a **60-second timeout** limit. This includes time spent:
- Executing your JavaScript code
- Waiting for `executionSearchByIntegration()` calls to complete
- Any other processing

**Tips:**
- Search calls typically complete in 1-3 seconds
- Multiple searches add up - 10 searches could take 10-30 seconds
- Leave enough time for your actual data processing
- Test with realistic data volumes

## Common Use Cases

### 1. Check for Duplicate Processing

Prevent processing the same data twice by checking previous executions:

```javascript
(async () => {
  const data = JSON.parse(sourceFiles[0].body)
  const orderId = data.order_id

  // Search for previous executions with this order ID
  const results = await executionSearchByIntegration(integrationId, {
    dataTag: orderId,
    startDateAfter: DateTime.now().minus({ days: 30 }).toISO()
  })

  // "warning" counts as processed too — the run delivered, it just logged warnings
  const alreadyProcessed = results.data.some(exec =>
    ['success', 'warning'].includes(exec.flow_status) && exec.invocation_id !== currentInvocationId
  )

  if (alreadyProcessed) {
    userLog.warning(`Order ${orderId} was already processed, skipping`)
    return returnSkipped([])
  }

  // Process normally
  return returnSuccess(sourceFiles)
})()
```

### 2. Data Enrichment from Previous Executions

Use historical execution data to enrich current processing:

```javascript
(async () => {
  // Get executions from the last 7 days
  const results = await executionSearchByIntegration(integrationId, {
    startDateAfter: DateTime.now().minus({ days: 7 }).toISO()
  })

  // Calculate statistics over finished executions only, and guard the divide so an
  // empty window yields "n/a" rather than "NaN%"
  const totalExecutions = results.data.length
  const finishedExecutions = results.data.filter(e => e.flow_status).length
  const successfulExecutions = results.data.filter(e => ['success', 'warning'].includes(e.flow_status)).length
  const successRate = finishedExecutions
    ? (successfulExecutions / finishedExecutions * 100).toFixed(1)
    : 'n/a'

  // Add context to current data
  const processedFiles = sourceFiles.map(file => {
    const data = JSON.parse(file.body)

    data.execution_context = {
      recent_executions: totalExecutions,
      success_rate: successRate === 'n/a' ? 'n/a' : `${successRate}%`,
      last_execution: results.data[0]?.start_date
    }

    return {
      ...file,
      body: JSON.stringify(data)
    }
  })

  userLog.info(`Enriched data with execution history: ${successRate}% success rate`)
  return returnSuccess(processedFiles)
})()
```

### 3. Conditional Processing Based on History

Adjust processing logic based on recent execution patterns:

```javascript
(async () => {
  // Check recent executions
  const results = await executionSearchByIntegration(integrationId, {
    startDateAfter: DateTime.now().minus({ hours: 24 }).toISO()
  })

  const recentErrors = results.data.filter(e => ['logical_fail', 'bug'].includes(e.flow_status)).length

  if (recentErrors > 5) {
    userLog.warning(`High error rate detected: ${recentErrors} errors in last 24 hours`)

    // Apply more conservative processing
    const processedFiles = sourceFiles.map(file => {
      // Add extra validation, logging, etc.
      return file
    })

    return returnSuccess(processedFiles)
  }

  // Normal processing
  return returnSuccess(sourceFiles)
})()
```

### 4. Find Related Executions by Batch

Track and correlate executions that are part of the same batch:

```javascript
(async () => {
  const currentData = JSON.parse(sourceFiles[0].body)
  const batchId = currentData.batch_id

  // Find all executions for this batch
  const results = await executionSearchByIntegration(integrationId, {
    dataTag: batchId
  })

  userLog.info(`Found ${results.data.length} executions for batch ${batchId}`)

  // Check if this is the last file in the batch
  const expectedCount = currentData.total_files_in_batch
  const processedCount = results.data.filter(e => ['success', 'warning'].includes(e.flow_status)).length

  if (processedCount + 1 >= expectedCount) {
    userLog.info(`This is the final file in batch ${batchId}`)
    // Trigger batch completion logic
  }

  return returnSuccess(sourceFiles)
})()
```

## Relationship to Portal Execution Search

The `executionSearchByIntegration()` function provides programmatic access to the same data you see in the Chain.io portal's Flow Execution Search screen.

### Portal Features and Their Code Equivalents

| Portal Feature | Code Equivalent |
|----------------|-----------------|
| Partner dropdown | `integrationId` parameter |
| Flow dropdown | `flow_id` argument |
| Date range "From" | `startDateAfter` argument |
| Date range "To" | `startDateBefore` argument |
| Data Tags filter | `dataTag` argument |
| Execution list | `results.data` array |
| Status column | `execution.flow_status` field |
| Start Time column | `execution.start_date` field |
| Message column | `execution.summary_message` field |
| Load More button | `cursor` pagination |

### What You Can Access

✅ **Available in search results:**
- Execution metadata (UUIDs, timestamps, status)
- Summary messages
- Data tags published during execution
- Basic execution statistics

❌ **Not available in search results:**
- Actual file contents processed during execution (use `listExecutionFiles()` + `getExecutionFile()` for this)
- Detailed execution logs
- Internal processing steps

The search function gives you **metadata about executions**. To access the actual files, use `listExecutionFiles()` and `getExecutionFile()` — see [EXECUTION_FILES.md](EXECUTION_FILES.md). The execution search is perfect for:
- Tracking execution history
- Detecting patterns
- Preventing duplicates
- Building execution statistics
- Finding the right execution before downloading its files

## Complete Working Example

See [`log_another_flow_with_search.js`](example_scripts/log_another_flow_with_search.js) in this repository for a complete, tested example.

Here's a comprehensive example showing multiple features:

```javascript
(async () => {
  // Configuration
  const integrationId = '12345678-1234-1234-1234-123456789abc'
  const lookbackDays = 7

  try {
    // Search for recent executions
    const results = await executionSearchByIntegration(integrationId, {
      startDateAfter: DateTime.now().minus({ days: lookbackDays }).toISO()
    })

    userLog.info(`Found ${results.data.length} executions in last ${lookbackDays} days`)

    // Analyze execution patterns. Rows with no flow_status have not finished, so
    // bucket them explicitly instead of creating an "undefined" key.
    const statusCounts = {}
    results.data.forEach(exec => {
      const status = exec.flow_status || 'unfinished'
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })

    userLog.info(`Status breakdown: ${JSON.stringify(statusCounts)}`)

    // Check for recent errors - both data-driven and technical
    const recentErrors = results.data.filter(e => ['logical_fail', 'bug'].includes(e.flow_status))
    if (recentErrors.length > 0) {
      userLog.warning(`Found ${recentErrors.length} recent errors`)
      recentErrors.slice(0, 3).forEach(error => {
        userLog.warning(`  - ${error.start_date}: ${error.summary_message}`)
      })
    }

    // Process current files with context
    const processedFiles = sourceFiles.map(file => {
      const data = JSON.parse(file.body)

      // Add execution history context
      data.metadata = {
        execution_history: {
          total_recent: results.data.length,
          successful: (statusCounts.success || 0) + (statusCounts.warning || 0),
          errors: (statusCounts.logical_fail || 0) + (statusCounts.bug || 0),
          timestamp: DateTime.now().toISO()
        }
      }

      return {
        ...file,
        body: JSON.stringify(data)
      }
    })

    // Publish summary as data tags
    const finished = results.data.length - (statusCounts.unfinished || 0)
    const succeeded = (statusCounts.success || 0) + (statusCounts.warning || 0)
    publishDataTags([
      { label: 'Recent Executions', value: results.data.length.toString() },
      { label: 'Success Rate', value: finished ? `${(succeeded / finished * 100).toFixed(1)}%` : 'n/a' }
    ])

    return returnSuccess(processedFiles)

  } catch (error) {
    userLog.error(`Execution search failed: ${error.message}`)
    // Continue processing without enrichment
    return returnSuccess(sourceFiles)
  }
})()
```

## Troubleshooting

### "await is only valid in async function"

**Problem:** You're using `await` without the async wrapper.

**Solution:** Wrap your entire script:
```javascript
(async () => {
  // Your code here
  return returnSuccess(sourceFiles)
})()
```

### Rate Limit Exceeded

**Problem:** You've made more than 10 searches in one execution.

**Solution:**
- Reduce the number of search calls
- Cache search results in variables
- Use more specific filters to get the data you need in fewer searches

### Timeout After 60 Seconds

**Problem:** Your processor is taking too long, including search time.

**Solution:**
- Reduce the number of searches
- Use date filters to limit result set size
- Avoid paginating through large result sets
- Optimize your data processing logic

### Empty Results

**Problem:** Search returns no results when you expect some.

**Solution:**
- Verify the `integrationId` is correct (check the URL in the portal)
- Check your date filters - are they too restrictive?
- Verify the `dataTag` value matches exactly (case-sensitive)
- Check the portal execution screen to confirm executions exist

### Cannot Access File Contents via executionSearchByIntegration

**Problem:** You want to retrieve the actual files from previous executions, but `executionSearchByIntegration()` only returns metadata.

**Solution:** Use `listExecutionFiles()` and `getExecutionFile()` to access the actual files from a previous execution:

```javascript
(async () => {
  // 1. Find the execution you want
  const results = await executionSearchByIntegration(integrationId, {
    dataTag: 'MY_BATCH'
  })
  const invocation = results.data[0]

  // 2. List the files from that execution
  const files = await listExecutionFiles(invocation.invocation_id)

  // 3. Download a specific file
  const fileObject = await getExecutionFile({
    invocationId: files[0].invocation_id,
    fileId: files[0].file_id
  })

  return returnSuccess([fileObject])
})()
```

See [EXECUTION_FILES.md](EXECUTION_FILES.md) for complete documentation on these functions.

## Best Practices Summary

1. ✅ **Always use the async wrapper** - `(async () => { ... })()`
2. ✅ **Use specific filters** - Reduce result set size with date ranges and data tags
3. ✅ **Cache results** - Store search results in variables for reuse
4. ✅ **Handle errors** - Wrap searches in try-catch blocks
5. ✅ **Mind the rate limit** - Maximum 10 searches per execution
6. ✅ **Watch the timeout** - Keep total execution under 60 seconds
7. ✅ **Log your searches** - Help with debugging and monitoring
8. ✅ **Test with real data** - Verify your filters return expected results

## Related Documentation

- [README.md](README.md) - Main custom processor documentation
- [EXECUTION_FILES.md](EXECUTION_FILES.md) - Guide for downloading files from previous executions
- [Example: log_another_flow_with_search.js](example_scripts/log_another_flow_with_search.js) - Working code example
- [Example: get_newest_file_from_previous_execution.js](example_scripts/get_newest_file_from_previous_execution.js) - End-to-end example combining search and file download
- [Using Async Operations](README.md#using-async-operations) - Detailed async wrapper guide

---

*For questions or issues with execution search functionality, consult your Chain.io support team or check the execution logs in the portal for detailed error messages.*
