module.exports = {
  debounce(fn, waitMs) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        timeout = undefined;
        fn(...args);
      }, waitMs);
    };
  }
};