let confirmHandler = null;

export const registerConfirmHandler = (handler) => {
  confirmHandler = handler;
  return () => {
    if (confirmHandler === handler) {
      confirmHandler = null;
    }
  };
};

export const confirmDialog = (options) => {
  if (!confirmHandler) {
    return Promise.resolve(false);
  }

  const dialogOptions =
    typeof options === 'string'
      ? { message: options }
      : { ...(options || {}) };

  return confirmHandler(dialogOptions);
};
