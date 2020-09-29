export default class Log {
  static trigger(scope, detail, dispatcher=document) {
    const message = `${performance.now().toFixed(1)} ms: ${scope}`
    /* eslint-disable no-console */
    console.log(message)
    /* eslint-disable */
    this.appendToElement(message, detail)
    const event = new CustomEvent(scope, { bubbles: true, detail })
    dispatcher.dispatchEvent(event)
  }

  static appendToElement(message, detail) {
    const el = document.querySelector("#debug")

    if (el) {
      const detailString = Object.values(detail || []).join(" ")
      if (detailString.length > 0){
        message += ` - ${ detailString }`
      }
      el.insertAdjacentHTML("afterbegin", `${message}<br/>`)
    }
  }
}
