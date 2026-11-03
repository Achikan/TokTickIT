import http from "node:http";
import net from "node:net";

delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;
delete process.env.ALL_PROXY;
delete process.env.all_proxy;
process.env.NO_PROXY = "*";
process.env.no_proxy = "*";

http.globalAgent.createConnection = function (...args: any[]) {
  return (net.createConnection as any)(...args);
};
(http.Agent.prototype as any).createConnection = function (...args: any[]) {
  return (net.createConnection as any)(...args);
};

