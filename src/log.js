export default class Log {
  static trigger(scope) {
    const message = `${ performance.now().toFixed(1) } ms: ${ scope }`
    /* eslint-disable no-console */
    console.log(message)
    /* eslint-disable */
    this.appendToElement(message)
    const event = new CustomEvent(scope, { bubbles: true })
    document.dispatchEvent(event)
  }

  static appendToElement(message){
    const el = document.querySelector('#debug')
    el.insertAdjacentHTML("beforeend", `${message}<br/>`)
  }
}
