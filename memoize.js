module.exports = {
  memoize(fn) {
    let cache = {};
    return (...args) => {
      let key = JSON.stringify(args);
      if (key in cache) {
        return cache[key];
      } else {
        let result = fn(...args);
        cache[key] = result;
        return result;
      }
    }
  }
};
