let idCounter = 0

export default function uniqueId() {
  idCounter += 1
  return `${idCounter}`
}
