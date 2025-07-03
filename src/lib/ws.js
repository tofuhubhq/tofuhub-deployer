export const logClients = [];

export const sendToClients = (msg) => {
  if (!logClients) return;
  for (const client of logClients) {
      client.send(msg);
  }
};