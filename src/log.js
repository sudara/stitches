export default class Log {
  static trigger(scope) {
    const message = `${ performance.now().toFixed(1) } ms: ${ scope }`
    /* eslint-disable no-console */
    console.log(message)
    /* eslint-disable */
    document.body.insertAdjacentHTML("beforeend", `${message}<br/>`)
    const event = new CustomEvent(scope, { bubbles: true })
    document.dispatchEvent(event)
  }
}
