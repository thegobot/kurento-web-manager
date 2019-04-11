let servers = [
    {host: "127.0.0.1", port: 7777}
]

let config = {
    servers: {}
};

servers.forEach((host) => {
    config.servers[host.host] = host;
});

module.exports = config;