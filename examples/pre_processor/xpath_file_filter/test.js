const fs = require('fs')
const { runCode, UserLog, createPayloadFromDir } = require('../../../utils')

const samplePayloadFiles = {

}
describe('Test xpath_file_filter preprocessor', () => {
  let processorSource
  let sourceFiles
  let userLog
  let file1
  let file2

  beforeEach(() => {
    userLog = new UserLog()
    processorSource = fs.readFileSync(__dirname + '/processor.js', 'utf8')
    file1 = {
      type: 'file',
      file_name: 'file_1.xml',
      body: `
<events>
  <master_bill>MBOL123</master_bill>
  <event>
    <code>Arrival</code>
  </event>
  <event>
    <code>Departure</code>
  </event>
</events>`
    }
    file2 = {
      type: 'file',
      file_name: 'file_2.xml',
      body: `
<events>
  <master_bill>MBOL100</master_bill>
  <event>
    <code>Arrival</code>
  </event>
</events>`
    }

    sourceFiles = [file1, file2]
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

  it('should only return files with both an arrival and destination event', async () => {
    const result = await runCode(processorSource, userLog, { sourceFiles })
    expect(result).toEqual([
      file1
    ])
    expect(userLog.getMessages()).toEqual({
      info: [
        "File file_1.xml (#0) satisfied all xpaths. File will be included in payload",
        "File file_2.xml (#1) did not satisfy xpath //event/code[text()=\"Departure\"]. File will not be included in payload"
      ],
      warning: [],
      error: []
    })
  })

  it('should consider invalid xml as not matching xpaths and filter file out', async () => {
    sourceFiles[0].body = '<bad'
    const result = await runCode(processorSource, userLog, { sourceFiles })
    expect(result).toEqual([])
    expect(userLog.getMessages()).toEqual({
      info: [
        'File file_2.xml (#1) did not satisfy xpath //event/code[text()=\"Departure\"]. File will not be included in payload'
      ],
      warning: [
        'File file_1.xml (#0) could not be parsed as XML. File will not be included in payload.',
      ],
      error: [],
    })
  })

})
