# listExecutionFiles() and getExecutionFile() - Accessing Files from Previous Executions

## Overview

The `listExecutionFiles()` and `getExecutionFile()` functions allow you to access files that were produced by previous flow executions. Together with `executionSearchByPartner()`, they give you a complete workflow for finding an execution and retrieving its files:

1. **`executionSearchByPartner()`** — Find the execution you're interested in
2. **`listExecutionFiles()`** — Discover what files are available from that execution
3. **`getExecutionFile()`** — Download a specific file to use in your processor

This is useful for scenarios like:
- Pulling data from a partner's previous delivery into your current processing
- Comparing current data against a previously processed file
- Re-processing or forwarding a file from an earlier execution

## Function Signatures

```javascript
listExecutionFiles(invocationUUID)
getExecutionFile({ invocation_uuid, time_and_hash })
```

Both functions return **Promises**, so you must use the [async wrapper pattern](#using-the-async-wrapper) in your processor.

---

## `listExecutionFiles(invocationUUID)`

Lists all files attached to a specific flow execution.

### Parameters

#### `invocationUUID` (string, required)

The unique identifier of the flow execution whose files you want to list.

**How to obtain this:**
- From `executionSearchByPartner()` results: each record in `results.data` has an `invocation_uuid` field
- From the Chain.io portal: the execution UUID appears in the execution detail URL

**Example:**
```javascript
(async () => {
  const results = await executionSearchByPartner('partner-uuid-here')
  const invocationUUID = results.data[0].invocation_uuid

  const files = await listExecutionFiles(invocationUUID)
  userLog.info(`Found ${files.length} files`)

  return returnSuccess(sourceFiles)
})()
```

### Return Value

Returns a Promise that resolves to an **array of file metadata objects**. Each object describes one file:

```javascript
[
  {
    invocation_uuid: "550e8400-e29b-41d4-a716-446655440000",
    file_name: "orders.xml",
    created_time: "2024-01-15T10:30:00.000Z",
    time_and_hash: "2024-01-15T10:30:00.000Z~abc123def456",
    file_hash: "abc123def456",
    file_size: 8192,
    file_tags: [
      { name: "Source", value: "Partner EDI" }
    ]
  },
  // ... more files
]
```

### File Metadata Fields

- **`invocation_uuid`** (string): The execution this file belongs to
- **`file_name`** (string): The original filename including extension
- **`created_time`** (string): ISO timestamp when the file was created
- **`time_and_hash`** (string): Unique identifier for this file — required by `getExecutionFile()`
- **`file_hash`** (string): Content hash of the file
- **`file_size`** (number): File size in bytes
- **`file_tags`** (array): Array of `{ name, value }` tag objects associated with this file

### Rate Limiting

⚠️ **Maximum 10 calls per execution**

Each call to `listExecutionFiles()` counts against its own independent limit (separate from `executionSearchByPartner()` and `getExecutionFile()` limits).

---

## `getExecutionFile({ invocation_uuid, time_and_hash })`

Downloads a specific file from a flow execution and returns it as a standard file object.

### Parameters

An object with:

#### `invocation_uuid` (string, required)

The invocation UUID of the execution that produced the file. Obtain this from `listExecutionFiles()` results (the `invocation_uuid` field on each file metadata object).

#### `time_and_hash` (string, required)

The unique identifier for the specific file to download. Obtain this from `listExecutionFiles()` results (the `time_and_hash` field on each file metadata object).

**Example:**
```javascript
(async () => {
  const results = await executionSearchByPartner('partner-uuid-here')
  const files = await listExecutionFiles(results.data[0].invocation_uuid)

  const fileObject = await getExecutionFile({
    invocation_uuid: files[0].invocation_uuid,
    time_and_hash: files[0].time_and_hash
  })

  userLog.info(`Downloaded: ${fileObject.file_name}`)
  return returnSuccess([fileObject])
})()
```

### Return Value

Returns a Promise that resolves to a **file object** matching the standard [File Object Structure](README.md#file-object-structure):

```javascript
{
  uuid: "550e8400-e29b-41d4-a716-446655440000",
  type: "file",
  file_name: "orders.xml",
  format: "xml",
  mime_type: "text/xml",
  body: "<root>...</root>"
}
```

#### File Content Encoding

- **Text files** (JSON, CSV, XML, TXT, HTML): `body` is a plain UTF-8 string
- **Binary files** (Excel, PDF, ZIP, etc.): `body` is a base64-encoded string

This matches the same encoding convention used for `sourceFiles` and `destinationFiles`, so you can pass the downloaded file directly to `XLSX.read()`, `JSON.parse()`, etc. without any special handling.

**Examples of working with the downloaded file:**

```javascript
// JSON file
const data = JSON.parse(fileObject.body)

// XML file
const xmlDoc = xml.XmlParser.parseFromString(fileObject.body)

// Excel file
const workbook = XLSX.read(fileObject.body, { type: 'base64' })

// Pass directly as output
return returnSuccess([fileObject])
```

### Rate Limiting

⚠️ **Maximum 10 calls per execution**

Each call to `getExecutionFile()` counts against its own independent limit (separate from `executionSearchByPartner()` and `listExecutionFiles()` limits).

---

## Using the Async Wrapper

Both functions return Promises, so you **must** wrap your entire processor in an async IIFE.

### ❌ This Will NOT Work:
```javascript
// ERROR: await outside async function
const files = await listExecutionFiles(invocationUUID)
returnSuccess(sourceFiles)
```

### ✅ This WILL Work:
```javascript
(async () => {
  const files = await listExecutionFiles(invocationUUID)
  return returnSuccess(sourceFiles)  // Note: use "return"
})()
```

### Key Rules:
1. Wrap everything in `(async () => { ... })()`
2. Use `return` before `returnSuccess()`, `returnError()`, or `returnSkipped()`
3. The `()` at the end immediately invokes the function

---

## Rate Limiting

Each of the three execution access functions has its own independent rate limit:

| Function | Limit |
|---|---|
| `executionSearchByPartner()` | 10 calls per execution |
| `listExecutionFiles()` | 10 calls per execution |
| `getExecutionFile()` | 10 calls per execution |

These limits are tracked independently, so you can make up to 10 calls to each function within a single processor execution.

**Best Practices:**
- Cache results in variables if you need to reference them multiple times
- Filter your execution search specifically so you're listing files for the right execution
- If you need files from multiple executions, plan your calls to stay within limits

---

## Timeout Considerations

All custom processors have a **60-second timeout**. File download time varies by file size:
- Small files (< 100 KB): typically under 1 second
- Medium files (100 KB – 1 MB): typically 1–3 seconds
- Large files: longer — plan accordingly

Multiple downloads add up. Leave enough time for your actual data processing after downloading.

---

## Common Use Cases

### 1. Download the Newest File from a Partner

Find a partner's most recent tagged execution and retrieve its newest file:

```javascript
(async () => {
  // Search for executions tagged with a specific batch ID
  const results = await executionSearchByPartner('partner-uuid-here', {
    dataTag: 'DAILY_REPORT'
  })

  if (!results.data.length) {
    userLog.warning('No executions found')
    return returnSkipped([])
  }

  // Get files from the most recent execution
  const files = await listExecutionFiles(results.data[0].invocation_uuid)

  if (!files.length) {
    userLog.warning('No files found for this execution')
    return returnSkipped([])
  }

  // Find the newest file by creation time
  const newest = files.reduce((latest, f) =>
    f.created_time > latest.created_time ? f : latest
  )

  // Download and return it
  const fileObject = await getExecutionFile({
    invocation_uuid: newest.invocation_uuid,
    time_and_hash: newest.time_and_hash
  })

  userLog.info(`Downloaded ${fileObject.file_name} (${newest.file_size} bytes)`)
  return returnSuccess([fileObject])
})()
```

### 2. Download a Specific File by Name

Find and download a file with a particular name from a previous execution:

```javascript
(async () => {
  const results = await executionSearchByPartner('partner-uuid-here')

  if (!results.data.length) {
    return returnSkipped([])
  }

  const files = await listExecutionFiles(results.data[0].invocation_uuid)

  // Find the file you want by name
  const targetFile = files.find(f => f.file_name === 'manifest.json')

  if (!targetFile) {
    userLog.warning('manifest.json not found in this execution')
    return returnSkipped([])
  }

  const fileObject = await getExecutionFile({
    invocation_uuid: targetFile.invocation_uuid,
    time_and_hash: targetFile.time_and_hash
  })

  const manifest = JSON.parse(fileObject.body)
  userLog.info(`Loaded manifest with ${manifest.items.length} items`)

  // Use manifest to enrich current files
  const processedFiles = sourceFiles.map(file => {
    // Your enrichment logic here
    return file
  })

  return returnSuccess(processedFiles)
})()
```

### 3. Download Multiple Files from an Execution

Download all XML files from a previous execution:

```javascript
(async () => {
  const results = await executionSearchByPartner('partner-uuid-here', {
    dataTag: 'BATCH_2024_001'
  })

  if (!results.data.length) {
    return returnSkipped([])
  }

  const files = await listExecutionFiles(results.data[0].invocation_uuid)

  // Filter to XML files only
  const xmlFiles = files.filter(f => f.file_name.endsWith('.xml'))
  userLog.info(`Found ${xmlFiles.length} XML files`)

  // Download each file (be mindful of the 10-call limit)
  const downloadedFiles = []
  for (const fileMeta of xmlFiles) {
    const fileObject = await getExecutionFile({
      invocation_uuid: fileMeta.invocation_uuid,
      time_and_hash: fileMeta.time_and_hash
    })
    downloadedFiles.push(fileObject)
  }

  return returnSuccess(downloadedFiles)
})()
```

### 4. Compare Current Data Against a Previous File

Use a previously processed file to validate or enrich the current execution:

```javascript
(async () => {
  // Get the most recent previous execution
  const results = await executionSearchByPartner('partner-uuid-here', {
    startDateBefore: DateTime.now().minus({ hours: 1 }).toISO()
  })

  if (results.data.length === 0) {
    userLog.info('No previous execution found, processing normally')
    return returnSuccess(sourceFiles)
  }

  const files = await listExecutionFiles(results.data[0].invocation_uuid)
  const previousFile = files.find(f => f.file_name.endsWith('.json'))

  if (!previousFile) {
    return returnSuccess(sourceFiles)
  }

  const previousData = await getExecutionFile({
    invocation_uuid: previousFile.invocation_uuid,
    time_and_hash: previousFile.time_and_hash
  })

  const previousRecords = JSON.parse(previousData.body)
  const previousIds = new Set(previousRecords.map(r => r.id))

  // Filter current files to only new records
  const processedFiles = sourceFiles.map(file => {
    const currentRecords = JSON.parse(file.body)
    const newRecords = currentRecords.filter(r => !previousIds.has(r.id))
    userLog.info(`Found ${newRecords.length} new records (${currentRecords.length - newRecords.length} already seen)`)

    return { ...file, body: JSON.stringify(newRecords) }
  })

  return returnSuccess(processedFiles)
})()
```

---

## Troubleshooting

### "await is only valid in async function"

**Problem:** Using `await` without the async wrapper.

**Solution:** Wrap your entire script:
```javascript
(async () => {
  // Your code here
  return returnSuccess(sourceFiles)
})()
```

### Rate Limit Exceeded

**Problem:** More than 10 calls to a single function in one execution.

**Solution:**
- Cache results: list files once, then loop through the cached array
- Use `executionSearchByPartner()` filters to target the specific execution you need
- If downloading many files, ensure you stay within the 10-call limit per function

### Empty File List

**Problem:** `listExecutionFiles()` returns an empty array.

**Solution:**
- Verify the `invocation_uuid` is correct
- Confirm the execution actually produced files by checking the portal
- Some executions may complete without producing files (e.g., skipped runs)

### File Not Found

**Problem:** `getExecutionFile()` throws an error for a specific file.

**Solution:**
- Ensure you're using the `time_and_hash` value directly from the `listExecutionFiles()` response without modification
- Verify the `invocation_uuid` matches the execution that produced the file
- Files from very old executions may no longer be available

### Timeout

**Problem:** Processor exceeds the 60-second timeout when downloading files.

**Solution:**
- Download only the files you need (filter by name or file type before calling `getExecutionFile()`)
- Be aware that large files take longer to download
- Reduce the number of files downloaded if possible

---

## Best Practices

1. ✅ **Always use the async wrapper** — `(async () => { ... })()`
2. ✅ **Filter before downloading** — Use `listExecutionFiles()` to identify the right file before calling `getExecutionFile()`
3. ✅ **Handle empty results** — Check array length before accessing `files[0]`
4. ✅ **Handle errors** — Wrap in try-catch to handle network or access issues gracefully
5. ✅ **Mind the rate limits** — Each function has a separate 10-call limit
6. ✅ **Watch the timeout** — File downloads count toward the 60-second total
7. ✅ **Log what you're doing** — Helps with debugging and monitoring

---

## Related Documentation

- [README.md](README.md) - Main custom processor documentation
- [EXECUTION_SEARCH.md](EXECUTION_SEARCH.md) - Guide for searching previous executions (prerequisite for getting file UUIDs)
- [Example: get_newest_file_from_partner_execution.js](example_scripts/get_newest_file_from_partner_execution.js) - Complete end-to-end working example
- [Using Async Operations](README.md#using-async-operations) - Detailed async wrapper guide

---

*For questions or issues with execution file access, consult your Chain.io support team or check the execution logs in the portal for detailed error messages.*
