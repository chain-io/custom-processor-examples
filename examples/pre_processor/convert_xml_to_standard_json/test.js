const fs = require('fs')
const { runCode, UserLog, createPayloadFromDir } = require('../../../utils')
const { create } = require('lodash')

describe('Test convert_xml_to_standard_json preprocessor', () => {
  let processorSource
  let sourceFiles
  let userLog

  beforeEach(() => {
    userLog = new UserLog()
    processorSource = fs.readFileSync(__dirname + '/processor.js', 'utf8')

    // Create a payload that simulates what the script would get
    // if the flow received a number of files from, for example, an sftp directory
    // this makes it easy to test a wide variety of scenarios
    sourceFiles = createPayloadFromDir(__dirname + '/input_test_files')
    expectedResult = createPayloadFromDir(__dirname + '/expected_json_output_files')
  })

  it('should execute without errors on an empty payload', async () => {
    const result = await runCode(processorSource, userLog, { sourceFiles: [] })
    expect(result).toEqual([])
    expect(userLog.getMessages()).toEqual({
      info: [],
      warning: [],
      error: []
    })
  })

  it('should convert input xml files output json files', async () => {
    const result = await runCode(processorSource, userLog, { sourceFiles })

    //easier to do the comparison in json
    expectedResult = expectedResult.map(file => {
      return {
        ...file,
        body: JSON.parse(file.body)
      }
    })
    const resultWithJson = result.map(file => {
      return {
        ...file,
        body: JSON.parse(file.body)
      }
    })

    expect(resultWithJson).toEqual(expectedResult)

    expect(userLog.getMessages()).toEqual({
      info: [],
      warning: ["shipment_3.xml: No events found, file will not be included in output payload"],
      error: []
    })
  })

  it('should throw an error if the xml is invalid', async () => {
    expect.hasAssertions()
    sourceFiles[0].body = '<invalid xml'

    await expect(runCode(processorSource, userLog, { sourceFiles })).rejects.toThrow(/xmldom error/)
  })

})
