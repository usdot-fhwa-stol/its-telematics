const NATS = require("nats");
require("dotenv").config();
const natsServers = process.env.NATS_SERVERS;
const opts = { servers: natsServers, maxReconnectAttempts: -1 };

exports.createNatsConn = async () => {
  let natsConn;
  try {
    natsConn = await NATS.connect(opts);
  } catch (err) {
    throw new Error(`Error connecting to NATS: ${err.message}`);
  }
  console.info(`Connected ${natsConn.getServer()}`);
  return natsConn;
};
