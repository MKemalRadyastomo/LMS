module.exports = async () => {
  // Close server if it exists
  if (global.__SERVER__) {
    await new Promise(resolve => global.__SERVER__.close(resolve));
  }

  // Close database connection if it exists
  if (global.__DB__) {
    await global.__DB__.pool.end();
  }
};
