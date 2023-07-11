/**
 * @class UserLog
 * @description A class to simulate the userLog object passed to your script in the
 * server environment. You can use this to test that your script is logging the correct
 * values
 **/
module.exports = class UserLog {
  constructor() {
    this.messages = {
      info: [],
      warning: [],
      error: []
    }
  }

  info(message) {
    this.messages.info.push(message)
  }

  warning(message) {
    this.messages.warning.push(message)
  }

  error(message) {
    this.messages.error.push(message)
  }
  getMessages() {
    return this.messages
  }
}
