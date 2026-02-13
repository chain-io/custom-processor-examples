/**
 * Chain.io Pre-Processor for X12 997 EDI Acknowledgment Files
 *
 * Features:
 * - Dynamically parses delimiters from ISA segment (element, segment)
 * - Extracts ISA13 (Interchange Control Number) and GS06 (Group Control Number) and publishes as data tags
 * - Checks AK9 (Functional Group Acknowledge Code):
 *     - If 'A' - records file as accepted
 *     - If !'A' - records file as not accepted
 * - Iterates AK2/AK3/AK4/AK5/AK9 loops, logs consolidated errors per transaction
 * - Publishes original GS06 value from Ack'ed EDI files as data tag
 * - Handles multiple files, robust error handling and logging
 * - If any files are not accepted, the execution status will be an error
 * - If all files are accepted, the execution status will be success
 */

const AK3_ERROR_ENUM = {
  1: 'Unrecognized segment ID',
  2: 'Unexpected segment',
  3: 'Mandatory segment missing',
  4: 'Loop occurs over maximum times',
  5: 'Segment exceeds maximum use',
  6: 'Segment not in defined transaction set',
  7: 'Segment not in proper sequence',
  8: 'Segment has data element errors'
}

const AK4_ERROR_ENUM = {
  1: 'Mandatory data element missing',
  2: 'Conditional required data element missing',
  3: 'Too many data elements',
  4: 'Data element too short',
  5: 'Data element too long',
  6: 'Invalid character in data element',
  7: 'Invalid code value',
  8: 'Invalid date',
  9: 'Invalid time',
  10: 'Exclusion condition violated',
  12: 'Too many repetitions',
  13: 'Too many components',
  16: 'Composite data structure contains excess trailing delimiters'
}

const AK5_CODE_ENUM = {
  A: 'Accepted',
  E: 'Accepted but errors were noted',
  M: 'Rejected, message authentication code (MAC) failed',
  R: 'Rejected',
  W: 'Rejected, assurance failed validity tests',
  X: 'Rejected, content after decryption could not be analyzed'
}

const AK9_CODE_ENUM = {
  A: 'Accepted',
  E: 'Accepted but errors were noted',
  P: 'Partially accepted',
  R: 'Rejected'
}

const parseDelimiters = (edi) => {
  const elementSep = edi[3]
  const subElementSep = edi[104]
  let segmentTerminator = edi[105]
  if (edi[106] === '\n' || edi[106] === '\r') {
    segmentTerminator += edi[106]
  }
  return { elementSep, subElementSep, segmentTerminator }
}

const safeSplit = (str, sep, index) => {
  const splitSegment = str ? str.split(sep) : []
  if (index !== undefined) {
    return splitSegment[index] || ''
  }

  return splitSegment
}

const parse997File = (file) => {
  try {
    const body = file.body
    const isaStart = body.indexOf('ISA')
    if (isaStart === -1) {
      return { is997: false, file }
    }
    const isaSeg = body.substr(isaStart, 106)
    const { elementSep, segmentTerminator } = parseDelimiters(isaSeg)

    const rawSegments = body.split(segmentTerminator)
      .filter(s => s.trim().length > 0)

    const st01 = safeSplit(rawSegments.find(s => s.startsWith('ST')), elementSep, 1)

    if (st01 !== '997') {
      return { is997: false, file }
    }

    const isa13 = safeSplit(isaSeg, elementSep, 13)
    const gs06 = safeSplit(rawSegments.find(s => s.startsWith('GS')), elementSep, 6)
    publishDataTags([
      { label: '997 Ack File Interchange Control Number', value: isa13 },
      { label: '997 Ack File Group Control Number', value: gs06 }
    ])

    // Track current transaction and accumulate errors
    let currentDocType = ''
    let currentControlNumber = ''
    let currentSegmentErrors = [] // Array of { segId, segPos, loopId, segError, elementErrors: [] }
    let currentSegment = null
    let overallStatus = 'A'

    const flushTransaction = (ackCode) => {
      if (!currentDocType) return

      const ackDesc = AK5_CODE_ENUM[ackCode] || ackCode
      let message = `Transaction ${currentDocType} #${currentControlNumber}: ${ackDesc}`

      if (currentSegmentErrors.length > 0) {
        message += '\n'
        currentSegmentErrors.forEach((segErr, idx) => {
          const loopInfo = segErr.loopId ? ` (loop ${segErr.loopId})` : ''
          message += `  Segment ${segErr.segId} at position ${segErr.segPos}${loopInfo}: ${segErr.segError}`
          if (segErr.elementErrors.length > 0) {
            segErr.elementErrors.forEach(elemErr => {
              message += `\n    Element ${elemErr.pos}: ${elemErr.error}${elemErr.value ? ` [value: "${elemErr.value}"]` : ''}`
            })
          }
          if (idx < currentSegmentErrors.length - 1) message += '\n'
        })
      }

      if (ackCode === 'R') {
        userLog.error(message)
      } else {
        userLog.info(message)
      }

      // Reset for next transaction
      currentDocType = ''
      currentControlNumber = ''
      currentSegmentErrors = []
      currentSegment = null
    }

    let ak102
    for (const seg of rawSegments) {
      if (seg.startsWith('AK1')) {
        const elements = safeSplit(seg, elementSep)
        ak102 = elements[2] || ''
        publishDataTags([
          { label: '997 Acked Group Control Number', value: ak102 }
        ])
      } else if (seg.startsWith('AK2')) {
        const elements = safeSplit(seg, elementSep)
        currentDocType = elements[1] || ''
        currentControlNumber = elements[2] || ''
        currentSegmentErrors = []
        currentSegment = null
      } else if (seg.startsWith('AK3')) {
        const elements = safeSplit(seg, elementSep)
        const segId = elements[1] || ''
        const segPos = elements[2] || ''
        const loopId = elements[3] || ''
        const errorCode = elements[4] || ''
        const errorDesc = AK3_ERROR_ENUM[errorCode] || `Error code ${errorCode}`

        currentSegment = {
          segId,
          segPos,
          loopId,
          segError: errorDesc,
          elementErrors: []
        }
        currentSegmentErrors.push(currentSegment)
      } else if (seg.startsWith('AK4')) {
        const elements = safeSplit(seg, elementSep)
        const elementPos = elements[1] || ''
        const elementRef = elements[2] || ''
        const errorCode = elements[3] || ''
        const badValue = elements[4] || ''
        const errorDesc = AK4_ERROR_ENUM[errorCode] || `Error code ${errorCode}`

        if (currentSegment) {
          currentSegment.elementErrors.push({
            pos: elementRef || elementPos,
            error: errorDesc,
            value: badValue
          })
        }
      } else if (seg.startsWith('AK5')) {
        const elements = safeSplit(seg, elementSep)
        const ackCode = elements[1] || ''
        flushTransaction(ackCode)
      } else if (seg.startsWith('AK9')) {
        const elements = safeSplit(seg, elementSep)
        const ak901 = elements[1] || ''
        const ackDesc = AK9_CODE_ENUM[ak901] || ak901
        const received = elements[3] || '0'
        const accepted = elements[4] || '0'
        userLog.info(`Functional Group Result for ${ak102}: ${ackDesc} - ${accepted}/${received} transactions accepted`)

        if (ak901?.toUpperCase() !== 'A' && overallStatus === 'A') {
          overallStatus = ak901
          userLog.error(`997 acknowledging Group Control Number ${ak102} Not Accepted (AK901=${ak901}) in file ${file.file_name}`)
        } else {
          userLog.info(`997 acknowledging Group Control Number ${ak102} ${ackDesc} (AK901=${ak901}) in file ${file.file_name}.`)
        }
      }
    }

    return { is997: true, file, status: overallStatus }
  } catch (err) {
    userLog.error(`Error processing file ${file.file_name}: ${err.message}`)
    return { is997: false, file }
  }
}

const payload = []
const accepted = []
const rejected = []
for (const sourceFile of sourceFiles) {
  const result = parse997File(sourceFile)
  if (result.is997 && result.file) {
    payload.push(result.file)
    if (result.status === 'A') {
      accepted.push(result.file)
    } else {
      rejected.push(result.file)
    }
  }
}

if (payload.length === 0) {
  // No 997's found
  returnSkipped([])
} else if (rejected.length > 0) {
  // Found some 997's that were not accepted
  returnError(rejected)
} else {
  // All 997's were accepted
  returnSuccess(accepted)
}
