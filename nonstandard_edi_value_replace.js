/**
 * Mapping of placeholder codes to their actual values.
 * Used to replace placeholder charge codes with their real values in EDI documents.
 */
const PLACEHOLDER_TO_VALUE = {
  "AAA": "TROA"
}

/**
 * EDI delimiters used to parse and reconstruct the document.
 * ELEMENT_DELIMITER separates elements within a segment.
 * SEGMENT_DELIMITER separates segments within the document.
 */
const ELEMENT_DELIMITER = '*'
const SEGMENT_DELIMITER = '~'

/**
 * Checks if a segment matches the specified segment type.
 * 
 * @param {string} segment - The segment string to check
 * @param {string} segmentType - The segment type identifier to match against
 * @returns {string|null} - Returns the segment if it matches, otherwise null
 */
const findSegment = (segment, segmentType) => {
  if (segment.match(new RegExp(`^${segmentType}${ELEMENT_DELIMITER}`))) {
    return segment
  }
  return null
}

/**
 * Processes a segment to replace placeholder charge codes with actual values.
 * Only processes segments that start with 'L1'. For these segments, checks if the
 * charge code (element 8) is a placeholder and replaces it if necessary.
 * 
 * @param {string} segmentStr - The segment string to process
 * @returns {string} - The processed segment string
 */
const cleanSegment = (segmentStr) => {
  const segment = findSegment(segmentStr, 'L1')
  if (!segment) {
    return segmentStr
  }

  const elements = segmentStr.split(ELEMENT_DELIMITER)
  // applies the change to the 8th element in the EDI segment
  const chargeCode = elements[8]
  const newChargeCode = PLACEHOLDER_TO_VALUE[chargeCode]
  if (newChargeCode) {
    userLog.info(`Replacing placeholder charge code ${chargeCode} with ${newChargeCode}`)
    elements[8] = newChargeCode
  }
  return elements.join(ELEMENT_DELIMITER)
}

/**
 * Processes the entire EDI document body.
 * Splits the document into segments, processes each segment to replace
 * placeholder values, then rejoins the segments into a complete document.
 * 
 * @param {string} body - The EDI document body to process
 * @returns {string} - The processed EDI document body
 */
const process = (body) => {
  const segments = body.split(SEGMENT_DELIMITER)
  const cleanSegments = segments.map(cleanSegment)
  return cleanSegments.join(SEGMENT_DELIMITER)
}

/**
 * Main execution flow:
 * 1. Maps through all destination files
 * 2. Processes each file's body to replace placeholder values
 * 3. Returns the updated files with the same structure but modified body content
 */
const res = destinationFiles.map((f) => {
  return {
    ...f,
    body: process(f.body)
  }
})

// Return the processed files to the Chain.io platform
returnSuccess(res)