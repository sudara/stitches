let idCounter = 0;

export default function uniqueId() {
  return ++idCounter + ''
}
