const fs = require('fs')
const { runCode, UserLog } = require('../../../utils')
describe('Test sequentially_name_files preprocessor', () => {
  let processorSource
  let destinationFiles
  let userLog

  beforeEach(() => {
    userLog = new UserLog()
    processorSource = fs.readFileSync(__dirname + '/processor.js', 'utf8')
    destinationFiles = [{
      type: 'file',
      body: 'test body'
    },
    {
      type: 'file',
      body: 'test body 2'
    }]
  })

  it('should execute without errors on an empty payload', async () => {
    const result = await runCode(processorSource, userLog, { destinationFiles: [] })
    expect(result).toEqual([])
    expect(userLog.getMessages()).toEqual({
      info: [],
      warning: [],
      error: []
    })
  })

  it('should add sequential file names', async () => {
    const result = await runCode(processorSource, userLog, { destinationFiles })
    expect(result).toEqual([
      {
        type: 'file',
        body: 'test body',
        file_name: 'file_1.txt'
      },
      {
        type: 'file',
        body: 'test body 2',
        file_name: 'file_2.txt'
      }
    ])

    expect(userLog.getMessages()).toEqual({
      info: [],
      warning: [],
      error: []
    })
  })

  it('should overwrite the file_name property if present and log message about it', async () => {
    destinationFiles[0].file_name = 'test.txt'
    const result = await runCode(processorSource, userLog, { destinationFiles })
    expect(result).toEqual([
      {
        type: 'file',
        body: 'test body',
        file_name: 'file_1.txt'
      },
      {
        type: 'file',
        body: 'test body 2',
        file_name: 'file_2.txt'
      }
    ])
    expect(userLog.getMessages()).toEqual({
      info: [
        'Overwriting file_name test.txt to file_1.txt',
      ],
      warning: [],
      error: []
    })
  })

})
