const map = require('./import-map.json')

module.exports = function (importName) {
  const file = map[importName]
  if (file === void 0) {
    throw new Error('Unknown import from Quasar: ' + importName)
  }
  return 'quasar/' + file
}
