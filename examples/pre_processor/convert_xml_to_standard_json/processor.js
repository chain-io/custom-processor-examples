// Script to convert XML to Chain.io standard JSON

function makeEventJS(event, masterBill) {

  // read the date as a string value
  const actual = xpath.select('./actual', event)[0].firstChild.data

  // convert the date to ISO format
  const actualDate = DateTime.fromSeconds(parseInt(actual, 10)).toUTC().toISO()

  const code = xpath.select('./code', event)[0].firstChild.data

  return {
    actual_date: actualDate,
    event_code: code,
    master_bill: masterBill
  }
}

function handleFile(file, index) {
  // get the body
  const source = file.body

  // if the file has a file_name property, use it, otherwise create one
  const fileName = (file.file_name) ? file.file_name : `file_${index}.xml`

  // parse the xml, this will throw an error if the xml is invalid
  const xml = new xmldom.DOMParser({
    errorHandler: {
      error: (msg) => { throw new Error(msg) },
      fatalError: (msg) => { throw new Error(msg) }
    }
  }).parseFromString(source)

  // use xpath to get all the events
  const events = xpath.select('/events/event', xml)

  if (events.length === 0) {
    userLog.warning(`${fileName}: No events found, file will not be included in output payload`)
    return null
  }

  const masterBill = xpath.select('/events/master_bill', xml)[0].firstChild.data

  // create the JSON representation of the events
  const eventJS = events.map(event => makeEventJS(event, masterBill))

  // create Chain.io standard event json structure
  const standardJSON = {
    doc_type: 'event_json',
    events: eventJS
  }

  // replace the body with the standard json and return the file
  return {
    ...file,
    file_name: fileName.replace('.xml', '.json'),
    body: JSON.stringify(standardJSON)
  }
}

// apply conversion logic to each file
const files = lodash.map(sourceFiles, handleFile).filter(file => file !== null)
// the last statement should be the return value of the processor
files
