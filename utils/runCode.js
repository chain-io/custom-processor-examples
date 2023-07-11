const { VM } = require('vm2')
const lodash = require('lodash')
const xmldom = require('@xmldom/xmldom')
const xpath = require('xpath')
const { DateTime } = require('luxon')
const { v4: uuid } = require('uuid')

const AVAILABLE_LIBRARIES = {
  lodash,
  xmldom,
  xpath,
  DateTime,
  uuid,
  console
}

/**
 * Runs the given code in a sandboxed VM that simulates the environment on the server
 * Note: console is included in the sandbox so you can use console.log() to debug your code,
 * but it will not be included in the server environment
 * @param {string} code - The code to run, the last statement should be the return value of the processor
 * @param {UserLog} userLog - The userLog to use for logging, this will be passed into your code.
 * You can test the contents by using userLog.getMessages()
 * @param {object} context - The context to pass into the sandbox, this will be available in your code
 * If you are testing a preprocessor, you should pass in a sourceFiles property
 * if you are testing a postprocessor, you should pass in a destinationFiles property
 * @returns {Promise<Array>} - The result of the code execution
 */
async function run(code, userLog, context = {}) {
  const vmParams = {
    timeout: parseInt(process.env.VM_TIMEOUT_MS || '30000', 10),
    allowAsync: false,
    sandbox: Object.assign({}, context, { userLog })
  }
  return new Promise((resolve, reject) => {
    const vm = new VM(vmParams)
    lodash.keys(AVAILABLE_LIBRARIES).forEach((libName) => {
      vm.freeze(AVAILABLE_LIBRARIES[libName], libName)
    })
    const returned = vm.run(code)
    if (!lodash.isArray(returned)) {
      console.log('Rejecting code execution because result is not an Array', {
        type: typeof returned,
        stringEval: returned?.toString()
      })
      return reject(new Error(`Result must be an array got ${typeof returned}`))
    }
    return resolve(returned)
  })
}

module.exports = run
