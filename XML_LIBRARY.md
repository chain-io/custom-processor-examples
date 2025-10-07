# Chain.io XML Library Documentation

The Chain.io XML library (`xml`) provides a comprehensive set of tools for parsing, manipulating, and generating XML documents within custom processors. This library wraps standard DOM interfaces with convenient helper methods optimized for data transformation workflows.

## Table of Contents
- [Quick Reference](#quick-reference)
- [Parsing XML](#parsing-xml)
- [Extracting Data](#extracting-data)
- [Building and Modifying XML](#building-and-modifying-xml)
- [Serializing XML](#serializing-xml)
- [Working with Namespaces](#working-with-namespaces)
- [Advanced XPath Operations](#advanced-xpath-operations)
- [Common Patterns](#common-patterns)
- [Error Handling](#error-handling)

## Quick Reference

### Core Classes and Functions
```javascript
// Import the library (available globally in custom processors)
const { 
  XmlParser,      // Parse XML strings into DOM documents
  XmlSerializer,  // Convert DOM documents back to XML strings
  Document,       // Create new XML documents
  text,           // Extract text content via XPath
  integer,        // Extract integer values via XPath
  decimal,        // Extract decimal values via XPath (returns Decimal.js object)
  date,           // Extract dates via XPath (returns Luxon DateTime)
  boolean,        // Extract boolean values via XPath
  element,        // Find single element via XPath
  elements,       // Find multiple elements via XPath
  evaluate,       // Advanced XPath evaluation
  XPath           // Namespaced XPath operations
} = xml
```

### Most Common Operations
```javascript
// Parse XML
const document = xml.XmlParser.parseFromString(xmlString)

// Extract data
const name = xml.text(document, '//customer/name')
const age = xml.integer(document, '//customer/age')
const orders = xml.elements(document, '//order')

// Modify XML
const customer = xml.element(document, '//customer')
customer.appendChild('email', 'john@example.com')

// Output XML
const outputXml = new xml.XmlSerializer().serializeToString(document)
```

## Parsing XML

### Basic Parsing
```javascript
const xmlString = `
<?xml version="1.0" encoding="UTF-8"?>
<orders>
  <order id="123">
    <customer>John Doe</customer>
    <amount>150.50</amount>
    <date>2024-01-15T10:30:00Z</date>
    <shipped>true</shipped>
  </order>
</orders>`

// Parse with default settings (namespaces stripped)
const document = xml.XmlParser.parseFromString(xmlString)

// Parse preserving namespaces
const namespacedDoc = xml.XmlParser.parseFromString(xmlString, { strip_namespaces: false })
```

### Error Handling During Parsing
```javascript
try {
  const document = xml.XmlParser.parseFromString(file.body)
  // Process document
} catch (error) {
  userLog.error(`Invalid XML in file ${file.file_name}: ${error.message}`)
  return file // Return original file or handle appropriately
}
```

## Extracting Data

### Text Content
```javascript
// Extract simple text values
const customerName = xml.text(document, '//order/customer')
const orderId = xml.text(document, '//order/@id')

// Returns undefined if element not found
const missingField = xml.text(document, '//order/nonexistent') // undefined
```

### Numeric Values
```javascript
// Extract integers
const quantity = xml.integer(document, '//order/quantity')
const orderIdNum = xml.integer(document, '//order/@id')

// Extract decimals (returns Decimal.js object for precision)
const amount = xml.decimal(document, '//order/amount')
const amountAsNumber = amount?.toNumber() // Convert to JavaScript number if needed

// Returns null for non-numeric values
const invalidNumber = xml.integer(document, '//order/customer') // null
```

### Dates and Booleans
```javascript
// Extract dates (returns Luxon DateTime object)
const orderDate = xml.date(document, '//order/date')
const formattedDate = orderDate?.toISODate() // "2024-01-15"

// Extract booleans (accepts: true/1/yes for true, false/0/no for false)
const isShipped = xml.boolean(document, '//order/shipped')

// Custom date parsing
const customDate = xml.date(document, '//order/date', { 
  parser: (dateString) => DateTime.fromISO(dateString) 
})
```

### Finding Elements
```javascript
// Find single element
const firstOrder = xml.element(document, '//order')
const customerElement = xml.element(firstOrder, 'customer')

// Find multiple elements
const allOrders = xml.elements(document, '//order')
const orderData = allOrders.map(order => ({
  id: xml.text(order, '@id'),
  customer: xml.text(order, 'customer'),
  amount: xml.decimal(order, 'amount')?.toNumber()
}))

// Returns undefined/empty array if not found
const missing = xml.element(document, '//nonexistent') // undefined
const noResults = xml.elements(document, '//missing') // []
```

## Building and Modifying XML

### Adding Elements and Content
```javascript
const order = xml.element(document, '//order')

// Add simple text element
order.appendChild('status', 'processing')

// Add element with attributes
const shipping = order.appendChild('shipping')
shipping.setAttribute('method', 'express')
shipping.setAttribute('cost', '15.99')

// Add nested elements
const address = shipping.appendChild('address')
address.appendChild('street', '123 Main St')
address.appendChild('city', 'Anytown')
address.appendChild('zip', '12345')
```

### Conditional Content Addition
```javascript
// Only add element if value is not empty
order.appendText('notes', customerNotes) // No-op if customerNotes is empty

// Add nested elements conditionally
order.appendDescendantText(['shipping', 'tracking'], trackingNumber)
// Creates: <shipping><tracking>ABC123</tracking></shipping> only if trackingNumber exists
```

### Modifying Existing Content
```javascript
const customer = xml.element(document, '//order/customer')

// Change text content
customer.setTextContent('Jane Smith')

// Add/modify attributes
customer.setAttribute('type', 'premium')

// Remove elements
const oldNotes = xml.element(document, '//order/notes')
oldNotes?.remove()
```

### Working with Parent/Child Relationships
```javascript
const address = xml.element(document, '//shipping/address')

// Get parent element
const shipping = address.parent()

// Navigate and modify
const order = shipping.parent()
order.appendChild('priority', 'high')
```

## Serializing XML

### Basic Serialization
```javascript
// Compact output (default)
const compactSerializer = new xml.XmlSerializer()
const compactXml = compactSerializer.serializeToString(document)

// Serialize just an element
const orderElement = xml.element(document, '//order')
const orderXml = compactSerializer.serializeToString(orderElement)
```

### Pretty-Printed Output
```javascript
// Pretty print with default formatting
const prettySerializer = new xml.XmlSerializer({ format: {} })
const prettyXml = prettySerializer.serializeToString(document)

// Custom formatting
const customSerializer = new xml.XmlSerializer({ 
  format: { 
    indentation: '    ', // 4 spaces
    newline: '\n' 
  }
})
const customXml = customSerializer.serializeToString(document)

// Shortcut for pretty printing
const quickPretty = new xml.XmlSerializer({ format: 'pretty' })
```

## Working with Namespaces

### Namespace-Aware Parsing
```javascript
const namespacedXml = `
<?xml version="1.0"?>
<orders xmlns="http://company.com/orders" xmlns:ship="http://company.com/shipping">
  <order>
    <customer>John Doe</customer>
    <ship:method>express</ship:method>
  </order>
</orders>`

// Parse preserving namespaces
const doc = xml.XmlParser.parseFromString(namespacedXml, { strip_namespaces: false })

// Create namespaced XPath helper
const { text, element, elements } = new xml.XPath({
  ord: 'http://company.com/orders',
  ship: 'http://company.com/shipping'
}).exports()

// Use namespaced XPath expressions
const customer = text(doc, '/ord:orders/ord:order/ord:customer')
const shippingMethod = text(doc, '/ord:orders/ord:order/ship:method')
```

### Adding Namespaced Elements
```javascript
const order = element(doc, '/ord:orders/ord:order')

// Add element in default namespace
order.appendChild('status', 'confirmed')

// Add element in specific namespace
order.appendElement('ship:priority', 'high', 'http://company.com/shipping')
```

## Advanced XPath Operations

### Using the Evaluate Function
```javascript
// Count elements
const orderCount = xml.evaluate(document, 'count(//order)').numberValue()

// String manipulation via XPath
const upperName = xml.evaluate(document, 'translate(//customer, "abcdefghijklmnopqrstuvwxyz", "ABCDEFGHIJKLMNOPQRSTUVWXYZ")').stringValue()

// Boolean tests
const hasOrders = xml.evaluate(document, '//order').booleanValue()

// Get all results as array
const customerNames = xml.evaluate(document, '//order/customer/text()').toArray()

// Get first result
const firstCustomer = xml.evaluate(document, '//order/customer/text()').first()

// Check result count
const resultCount = xml.evaluate(document, '//order/customer').size()
```

### Complex XPath Expressions
```javascript
// Find orders over $100
const highValueOrders = xml.elements(document, '//order[amount > 100]')

// Find orders by specific customer
const johnOrders = xml.elements(document, '//order[customer="John Doe"]')

// Find orders with shipping
const shippedOrders = xml.elements(document, '//order[shipping]')

// Get attribute values
const orderIds = xml.evaluate(document, '//order/@id').toArray()
  .map(attr => attr.value())
```

## Common Patterns

### Converting XML to JSON
```javascript
const processedFiles = sourceFiles.map(file => {
  try {
    const document = xml.XmlParser.parseFromString(file.body)
    
    const orders = xml.elements(document, '//order').map(order => ({
      id: xml.text(order, '@id'),
      customer: xml.text(order, 'customer'),
      amount: xml.decimal(order, 'amount')?.toNumber(),
      date: xml.date(order, 'date')?.toISO(),
      shipped: xml.boolean(order, 'shipped'),
      items: xml.elements(order, 'items/item').map(item => ({
        name: xml.text(item, 'name'),
        quantity: xml.integer(item, 'quantity'),
        price: xml.decimal(item, 'price')?.toNumber()
      }))
    }))
    
    return {
      ...file,
      body: JSON.stringify({ orders }),
      file_name: file.file_name.replace('.xml', '.json')
    }
  } catch (error) {
    userLog.error(`Failed to process XML file ${file.file_name}: ${error.message}`)
    return file
  }
})
```

### Transforming XML Structure
```javascript
const processedFiles = sourceFiles.map(file => {
  const document = xml.XmlParser.parseFromString(file.body)
  
  // Find all orders and restructure
  xml.elements(document, '//order').forEach(order => {
    // Add calculated total
    const items = xml.elements(order, 'items/item')
    const total = items.reduce((sum, item) => {
      const price = xml.decimal(item, 'price')?.toNumber() || 0
      const qty = xml.integer(item, 'quantity') || 0
      return sum + (price * qty)
    }, 0)
    
    order.appendChild('calculatedTotal', total.toFixed(2))
    
    // Add processing timestamp
    order.appendChild('processedAt', DateTime.now().toISO())
    
    // Move customer info to separate section
    const customerName = xml.text(order, 'customer')
    const customerElement = xml.element(order, 'customer')
    customerElement.remove()
    
    const customerInfo = order.appendChild('customerInfo')
    customerInfo.appendChild('name', customerName)
    customerInfo.appendChild('type', 'standard') // Default value
  })
  
  return {
    ...file,
    body: new xml.XmlSerializer({ format: {} }).serializeToString(document)
  }
})
```

### Creating XML from JSON
```javascript
const processedFiles = sourceFiles.map(file => {
  const data = JSON.parse(file.body)
  
  // Create new XML document
  const document = xml.Document.createDocument('orders')
  const root = document.rootElement()
  root.setAttribute('generated', DateTime.now().toISO())
  
  data.orders.forEach(orderData => {
    const order = root.appendChild('order')
    order.setAttribute('id', orderData.id)
    
    order.appendChild('customer', orderData.customer)
    order.appendChild('amount', orderData.amount.toString())
    order.appendChild('date', orderData.date)
    
    if (orderData.items && orderData.items.length > 0) {
      const items = order.appendChild('items')
      orderData.items.forEach(itemData => {
        const item = items.appendChild('item')
        item.appendChild('name', itemData.name)
        item.appendChild('quantity', itemData.quantity.toString())
        item.appendChild('price', itemData.price.toString())
      })
    }
  })
  
  return {
    ...file,
    body: new xml.XmlSerializer({ format: {} }).serializeToString(document),
    file_name: file.file_name.replace('.json', '.xml')
  }
})
```

## Error Handling

### Robust XML Processing
```javascript
const processXmlFile = (file) => {
  let document
  
  try {
    document = xml.XmlParser.parseFromString(file.body)
  } catch (parseError) {
    userLog.error(`XML parsing failed for ${file.file_name}: ${parseError.message}`)
    return null
  }
  
  try {
    // Validate expected structure
    const rootElement = document.rootElement()
    if (!rootElement || rootElement.localName() !== 'orders') {
      userLog.warning(`Unexpected XML structure in ${file.file_name}, expected <orders> root`)
      return null
    }
    
    // Check for required elements
    const orders = xml.elements(document, '//order')
    if (orders.length === 0) {
      userLog.info(`No orders found in ${file.file_name}, skipping`)
      return null
    }
    
    // Process each order with error handling
    orders.forEach((order, index) => {
      try {
        const orderId = xml.text(order, '@id')
        if (!orderId) {
          userLog.warning(`Order ${index + 1} missing ID attribute`)
        }
        
        // Add validation and processing logic here
        
      } catch (orderError) {
        userLog.error(`Error processing order ${index + 1}: ${orderError.message}`)
      }
    })
    
    return {
      ...file,
      body: new xml.XmlSerializer().serializeToString(document)
    }
    
  } catch (processingError) {
    userLog.error(`Processing failed for ${file.file_name}: ${processingError.message}`)
    return file // Return original file
  }
}

const processedFiles = sourceFiles
  .map(processXmlFile)
  .filter(file => file !== null)
```

### Data Type Validation
```javascript
// Safe numeric extraction with defaults
const getNumericValue = (element, xpath, defaultValue = 0) => {
  const value = xml.decimal(element, xpath)
  return value ? value.toNumber() : defaultValue
}

// Safe date extraction
const getDateValue = (element, xpath) => {
  const dateValue = xml.date(element, xpath)
  if (!dateValue || !dateValue.isValid) {
    userLog.warning(`Invalid date found at ${xpath}`)
    return null
  }
  return dateValue
}

// Safe text extraction with trimming
const getTextValue = (element, xpath, required = false) => {
  const value = xml.text(element, xpath)
  if (!value || value.trim().length === 0) {
    if (required) {
      throw new Error(`Required field missing: ${xpath}`)
    }
    return null
  }
  return value.trim()
}
```

---

*This documentation covers the Chain.io XML library available in custom processors. The library provides powerful XML manipulation capabilities while maintaining type safety and error handling best practices.*
