// 404 handler — avoids echoing the requested URL back to the client to
// prevent information leakage (path enumeration, internal route discovery).
export const notFoundHandler = (request, response) => {
  response.status(404).json({
    message: 'Resource not found.',
  });
};

