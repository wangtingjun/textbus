module.exports = function test(source, sourceMap) {
  this.cacheable && this.cacheable();
  const newSource = `
  var result = '${source}';
  export default result;
  `;

  if (this.callback) {
    this.callback(null,  newSource, sourceMap);
  }
  return newSource;
};
