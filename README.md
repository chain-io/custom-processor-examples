# Chain.io Custom Processor Examples

A comprehensive collection of custom processor examples and practical guide for business analysts and JavaScript developers to create custom data transformations in Chain.io flows.

## 📁 Repository Contents

This repository contains:
- **Real-world examples** - Production-ready custom processors (see `.js` files in this repo)
- **Complete documentation** - Everything you need to get started
- **Best practices** - Proven patterns from the Chain.io community

### Example Files in This Repository
- [`alphabetically_sort_xml.js`](example_scripts/alphabetically_sort_xml.js) - Sort XML elements alphabetically to support testing
- [`excel_to_csv.js`](example_scripts/excel_to_csv.js) - Convert Excel files to CSV format
- [`filter_shipments_with_update_or_delete_action_type.js`](example_scripts/filter_shipments_with_update_or_delete_action_type.js) - Filter shipments by action type
- [`overwrite_output_field_with_mapping.js`](example_scripts/overwrite_output_field_with_mapping.js) - Map field values using lookup tables
- [`error_edi_810_cancel_files.js`](example_scripts/error_edi_810_cancel_files.js) - Handle EDI cancellation files
- [`nonstandard_edi_value_replace.js`](example_scripts/nonstandard_edi_value_replace.js) - Replace non-standard EDI values
- [`port_of_discharge_to_port_of_destination.js`](example_scripts/port_of_discharge_to_port_of_destination.js) - Port mapping logic

## Table of Contents
- [Quick Start](#quick-start)
- [What Are Custom Processors?](#what-are-custom-processors)
- [When to Use Custom Processors](#when-to-use-custom-processors)
- [Setting Up Your First Custom Processor](#setting-up-your-first-custom-processor)
- [Available Tools and Libraries](#available-tools-and-libraries)
- [Common Use Cases with Examples](#common-use-cases-with-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Advanced Examples](#advanced-examples)
- [Contributing](#contributing)

## Quick Start

**What you need to know:**
- Basic JavaScript knowledge (variables, functions, arrays, objects)
- Understanding of JSON and CSV data formats
- 5 minutes to read this guide

**What you can accomplish:**
- Transform data between different formats
- Add calculated fields to your data
- Filter and validate data
- Enrich data with custom business logic

## What Are Custom Processors?

Custom processors are JavaScript scripts that run within your Chain.io flows to transform data. Think of them as your personal data transformation assistants that can:

- **Pre-processors**: Modify data *before* it goes through Chain.io's main processing
- **Post-processors**: Modify data *after* Chain.io processes it but before final delivery

### Key Benefits
- ✅ No server setup required - runs in Chain.io's cloud
- ✅ Secure sandboxed environment
- ✅ Built-in logging and error handling
- ✅ Access to powerful libraries (Excel, XML, date handling)

## When to Use Custom Processors

### Perfect for:
- **Data Enrichment**: Adding calculated fields, lookups, or business rules
- **Format Conversion**: Converting between JSON, CSV, XML formats
- **Data Validation**: Checking data quality and completeness
- **Field Mapping**: Renaming or restructuring data fields
- **Conditional Logic**: Processing data based on business rules

### Not suitable for:
- ❌ External API calls (not allowed)
- ❌ Database connections (not supported)
- ❌ File system operations (sandboxed environment)
- ❌ Long-running processes (60-second timeout)

## Setting Up Your First Custom Processor

### Step 1: Access the Custom Processor Section
1. Open your Chain.io flow
2. Navigate to the "Edit Flow" screen
3. Find the "Custom Processors" section
4. Choose either "Pre-processor" or "Post-processor"

### Step 2: Write Your First Script

Here's a simple example that adds a timestamp to every record:

```javascript
// Add current timestamp to each file
const processedFiles = sourceFiles.map(file => {
  // Parse the JSON data
  const data = JSON.parse(file.body)
  
  // Add timestamp
  data.processed_at = DateTime.now().toISO()
  
  // Return the modified file
  return {
    ...file,
    body: JSON.stringify(data)
  }
})

// Log what we did
userLog.info(`Added timestamps to ${processedFiles.length} files`)

// Return the processed files
returnSuccess(processedFiles)
```

### Step 3: Test and Deploy
1. Save your script
2. Deploy your flow
3. Monitor the execution logs for any issues

## Available Tools and Libraries

Your custom processors have access to these powerful tools:

### Core Variables
- `sourceFiles` (pre-processors): Array of incoming files
- `destinationFiles` (post-processors): Array of processed files
- `userLog`: For logging messages (`userLog.info()`, `userLog.warning()`, `userLog.error()`)

### Built-in Libraries
- [`lodash`](https://lodash.com/) (v4.17.21): Utility functions for arrays and objects
- [`DateTime`](https://moment.github.io/luxon/) (Luxon v3.3.0): Date and time manipulation
- `uuid()`: Generate unique identifiers (Node.js built-in)
- [`XLSX`](https://sheetjs.com/) (SheetJS v0.20.3): Read and write Excel files
- `xml` (Chain.io v0.3.0): XML parsing and manipulation - see [XML_LIBRARY.md](XML_LIBRARY.md) for detailed documentation
- [`xmldom`](https://www.npmjs.com/package/@xmldom/xmldom) (v0.8.8) & [`xpath`](https://www.npmjs.com/package/xpath) (v0.0.32): Advanced XML processing

### Return Functions
- `returnSuccess(files)`: Process completed successfully
- `returnError(files)`: Process failed with error
- `returnSkipped(files)`: Skip this execution

## Common Use Cases with Examples

### 1. Adding Calculated Fields

**Scenario**: Add total price calculation to order data

```javascript
const processedFiles = sourceFiles.map(file => {
  const orders = JSON.parse(file.body)
  
  // Add total calculation to each order
  orders.forEach(order => {
    order.total = order.quantity * order.unit_price
    order.total_with_tax = order.total * 1.08 // 8% tax
  })
  
  return {
    ...file,
    body: JSON.stringify(orders)
  }
})

userLog.info(`Calculated totals for ${processedFiles.length} order files`)
returnSuccess(processedFiles)
```

### 2. Data Validation and Filtering

**Scenario**: Only process orders above a certain value

> 💡 **See also**: [`filter_shipments_with_update_or_delete_action_type.js`](filter_shipments_with_update_or_delete_action_type.js) for filtering shipments by action type

```javascript
const processedFiles = sourceFiles.map(file => {
  const orders = JSON.parse(file.body)
  
  // Filter orders above $100
  const validOrders = orders.filter(order => {
    const total = order.quantity * order.unit_price
    if (total < 100) {
      userLog.warning(`Skipping order ${order.id}: total $${total} below minimum`)
      return false
    }
    return true
  })
  
  return {
    ...file,
    body: JSON.stringify(validOrders)
  }
})

userLog.info(`Filtered to high-value orders only`)
returnSuccess(processedFiles)
```

### 3. Format Conversion (CSV to JSON)

**Scenario**: Convert CSV data to structured JSON

```javascript
const processedFiles = sourceFiles.map(file => {
  // Assuming CSV content in file.body
  const lines = file.body.split('\n')
  const headers = lines[0].split(',')
  
  const jsonData = lines.slice(1).map(line => {
    const values = line.split(',')
    const record = {}
    
    headers.forEach((header, index) => {
      record[header.trim()] = values[index]?.trim()
    })
    
    return record
  })
  
  return {
    ...file,
    body: JSON.stringify(jsonData),
    file_name: file.file_name.replace('.csv', '.json')
  }
})

userLog.info(`Converted ${processedFiles.length} CSV files to JSON`)
returnSuccess(processedFiles)
```

### 4. Working with Excel Files

**Scenario**: Extract data from Excel spreadsheet

> 💡 **See also**: [`excel_to_csv.js`](excel_to_csv.js) in this repository for a production example

```javascript
const processedFiles = sourceFiles.map(file => {
  // Skip non-Excel files (like the example in this repo)
  if (!file.file_name?.match(/\.xls[xbm]$/)) return null
  
  // Parse Excel file - note: use 'base64' type for binary data
  const workbook = XLSX.read(file.body, { type: 'base64' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  
  // Convert to JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet)
  
  // Add processing metadata
  jsonData.forEach(row => {
    row.source_sheet = sheetName
    row.processed_date = DateTime.now().toISODate()
  })
  
  return {
    uuid: uuid(),
    type: 'file',
    body: JSON.stringify(jsonData),
    file_name: file.file_name.replace(/\.xls[xbm]$/, '.json'),
    format: 'json',
    mime_type: 'application/json'
  }
}).filter(x => x) // Remove null entries

userLog.info(`Processed ${processedFiles.length} Excel files`)
returnSuccess(processedFiles)
```

### 5. XML Data Processing

**Scenario**: Extract specific data from XML files

```javascript
const processedFiles = sourceFiles.map(file => {
  try {
    // Parse XML
    const xmlDoc = xml.XmlParser.parseFromString(file.body)
    
    // Extract order information
    const orders = xml.elements(xmlDoc, '//order').map(orderElement => ({
      id: xml.text(orderElement, 'id'),
      customer: xml.text(orderElement, 'customer'),
      amount: parseFloat(xml.text(orderElement, 'amount')),
      date: xml.text(orderElement, 'date')
    }))
    
    return {
      ...file,
      body: JSON.stringify(orders),
      file_name: file.file_name.replace('.xml', '.json')
    }
  } catch (error) {
    userLog.error(`Failed to process XML file ${file.file_name}: ${error.message}`)
    return file // Return original file if processing fails
  }
})

userLog.info(`Processed ${processedFiles.length} XML files`)
returnSuccess(processedFiles)
```

### 6. Data Enrichment with Lookups

**Scenario**: Add customer information based on customer ID

> 💡 **See also**: [`overwrite_output_field_with_mapping.js`](overwrite_output_field_with_mapping.js) for XML field mapping and [`port_of_discharge_to_port_of_destination.js`](port_of_discharge_to_port_of_destination.js) for port lookups

```javascript
// Sample customer lookup data
const customerLookup = {
  'CUST001': { name: 'Acme Corp', tier: 'Premium' },
  'CUST002': { name: 'Beta Inc', tier: 'Standard' },
  'CUST003': { name: 'Gamma LLC', tier: 'Premium' }
}

const processedFiles = sourceFiles.map(file => {
  const orders = JSON.parse(file.body)
  
  // Enrich each order with customer data
  orders.forEach(order => {
    const customer = customerLookup[order.customer_id]
    if (customer) {
      order.customer_name = customer.name
      order.customer_tier = customer.tier
      
      // Apply tier-based discount
      if (customer.tier === 'Premium') {
        order.discount_percent = 10
        order.discounted_total = order.total * 0.9
      }
    } else {
      userLog.warning(`Unknown customer ID: ${order.customer_id}`)
    }
  })
  
  return {
    ...file,
    body: JSON.stringify(orders)
  }
})

userLog.info(`Enriched orders with customer data`)
returnSuccess(processedFiles)
```

## Best Practices

### 1. Always Handle Errors
```javascript
try {
  // Your processing logic here
  const data = JSON.parse(file.body)
  // ... process data
} catch (error) {
  userLog.error(`Processing failed: ${error.message}`)
  return file // Return original file or handle appropriately
}
```

### 2. Use Descriptive Logging
```javascript
userLog.info(`Starting to process ${sourceFiles.length} files`)
userLog.info(`Successfully processed ${validRecords.length} records`)
userLog.warning(`Skipped ${skippedRecords.length} invalid records`)
```

### 3. Validate Your Data
```javascript
// Check if required fields exist
if (!order.customer_id || !order.amount) {
  userLog.warning(`Invalid order missing required fields: ${JSON.stringify(order)}`)
  return null // Skip this record
}
```

### 4. Keep It Simple
- Break complex logic into smaller functions
- Use meaningful variable names
- Comment your code for future reference

### 5. Test with Small Data Sets
- Start with a few records to test your logic
- Gradually increase data volume once working

## Troubleshooting

### Common Issues and Solutions

**Issue**: "Invalid processor output"
```javascript
// ❌ Wrong - not returning files properly
return data

// ✅ Correct - always return file objects
returnSuccess(processedFiles)
```

**Issue**: "Timeout after 60 seconds"
```javascript
// ❌ Avoid complex loops on large datasets
sourceFiles.forEach(file => {
  // Expensive operation on every record
})

// ✅ Use efficient processing
const processedFiles = sourceFiles.map(file => {
  // Quick transformation
  return transformFile(file)
})
```

**Issue**: "Cannot parse JSON"
```javascript
// ❌ Assuming data is always valid JSON
const data = JSON.parse(file.body)

// ✅ Handle parsing errors
try {
  const data = JSON.parse(file.body)
  // Process data
} catch (error) {
  userLog.error(`Invalid JSON in file ${file.file_name}`)
  return file // Return original or skip
}
```

### Debugging Tips

1. **Use console logging**: `userLog.info(JSON.stringify(data, null, 2))`
2. **Check file structure**: Log the file object to understand its properties
3. **Validate step by step**: Add logging at each major step
4. **Test with minimal data**: Use simple test cases first

## Advanced Examples

### Working with Multiple File Types

```javascript
const processedFiles = sourceFiles.map(file => {
  // Handle different file types
  if (file.file_name.endsWith('.json')) {
    return processJsonFile(file)
  } else if (file.file_name.endsWith('.csv')) {
    return processCsvFile(file)
  } else if (file.file_name.endsWith('.xml')) {
    return processXmlFile(file)
  } else {
    userLog.warning(`Unsupported file type: ${file.file_name}`)
    return file
  }
})

function processJsonFile(file) {
  const data = JSON.parse(file.body)
  // JSON-specific processing
  return { ...file, body: JSON.stringify(data) }
}

function processCsvFile(file) {
  // CSV processing logic
  return file
}

function processXmlFile(file) {
  // XML processing logic
  return file
}

returnSuccess(processedFiles)
```

### Publishing Custom Data Tags

Data tags appear in the Flow Execution Screen for tracking and monitoring:

```javascript
// Process your data
const processedFiles = sourceFiles.map(file => {
  const orders = JSON.parse(file.body)
  
  // Calculate summary statistics
  const totalOrders = orders.length
  const totalValue = orders.reduce((sum, order) => sum + order.total, 0)
  
  // Publish data tags for monitoring
  publishDataTags([
    { label: 'Total Orders', value: totalOrders.toString() },
    { label: 'Total Value', value: `$${totalValue.toFixed(2)}` },
    { label: 'Processing Date', value: DateTime.now().toISODate() }
  ])
  
  return { ...file, body: JSON.stringify(orders) }
})

returnSuccess(processedFiles)
```

### Conditional Flow Control

```javascript
const processedFiles = sourceFiles.map(file => {
  const data = JSON.parse(file.body)
  
  // Check if data meets processing criteria
  if (data.length === 0) {
    userLog.warning('No data to process')
    return null
  }
  
  if (data.some(record => !record.required_field)) {
    userLog.error('Data missing required fields')
    return null
  }
  
  // Process valid data
  return { ...file, body: JSON.stringify(data) }
}).filter(file => file !== null) // Remove null entries

if (processedFiles.length === 0) {
  userLog.warning('No valid files to process')
  returnSkipped([])
} else {
  returnSuccess(processedFiles)
}
```

## File Compatibility

### Supported Formats
- ✅ **JSON**: Full read/write support
- ✅ **CSV**: Parse and generate CSV data
- ✅ **XML**: Parse, query, and generate XML
- ✅ **Excel**: Read .xlsx files, extract data

### EDI Files
- ❌ Cannot be processed in custom processors (though you can make minor edits to individual fields like changing charge codes)
- ✅ Use Chain.io's Custom Mapping Tool instead
- ✅ Process EDI after conversion to JSON

## Limitations to Remember

- **No async operations**: No `async/await`, `Promise`, `setTimeout`
- **No external libraries**: Cannot `require()` or `import` additional packages
- **60-second timeout**: Keep processing efficient
- **10,000 character limit**: Per processor (pre and post can each be 10,000 characters)
- **No Symbol object access**: Security restriction

## Getting Help

### When You're Stuck
1. **Check the execution logs** in Chain.io for error messages
2. **Start simple** - test with minimal data first
3. **Use logging extensively** to understand data flow
4. **Review the examples** in this guide for similar use cases

### Common Questions

**Q: Can I call external APIs?**
A: No, custom processors run in a sandboxed environment without external network access.

**Q: How do I handle large files?**
A: Process data in chunks and use efficient algorithms. Consider splitting large files before processing.

**Q: Can I save state between executions?**
A: No, each execution is independent.

**Q: What happens if my code has errors?**
A: The flow will fail with an error status, and details will appear in the execution logs.

## Contributing

We welcome contributions from the Chain.io community! 

### How to Contribute

1. **Fork this repository** - Click the "Fork" button at the top of this page
2. **Add your example** - Create a new `.js` file with a descriptive name
3. **Follow the pattern** - Look at existing examples for structure and commenting style
4. **Test your code** - Make sure it works in your Chain.io environment
5. **Submit a pull request** - [Create a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork) with your changes

### Example Contribution Guidelines

- **Use descriptive filenames** - `convert_xml_to_json.js` instead of `processor.js`
- **Add comments** - Explain what your processor does and any assumptions
- **Include error handling** - Show how to handle edge cases
- **Keep it focused** - One clear use case per example
- **Test with real data** - Ensure your example works in production

### Need Help?

- Review existing examples in this repository
- Ask questions in your pull request - the community is here to help!

---

*This repository contains practical examples and comprehensive documentation for Chain.io custom processors. For specific business requirements or complex scenarios, consider consulting with your development team or Chain.io support.*
