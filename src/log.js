export default class Log {
  static trigger(scope, detail) {
    const message = `${performance.now().toFixed(1)} ms: ${scope}`
    /* eslint-disable no-console */
    console.log(message)
    /* eslint-disable */
    this.appendToElement(message, detail)
    const event = new CustomEvent(scope, { bubbles: true, detail })
    document.dispatchEvent(event)
  }

  static appendToElement(message, detail) {
    const el = document.querySelector("#debug")

    if (el) {
      let detailString = ""
      if (detail) {
        Object.values(detail).map(value => {
          detailString = `${detailString.trim()} ${value.trim()}`
        })
      }

      el.insertAdjacentHTML("afterbegin", `${message} - ${detailString}<br/>`)
    }
  }
}
