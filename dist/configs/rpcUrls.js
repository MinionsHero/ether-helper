"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomRpcUrl = exports.RPCUrls = void 0;
const lodash_1 = require("lodash");
const networks_1 = require("./networks");
exports.RPCUrls = {
    // ethereum mainnet
    [networks_1.Network.ETHEREUM]: [
        'https://eth-mainnet.nodereal.io/v1/1659dfb40aa24bbb8153a677b98064d7',
        'https://cloudflare-eth.com',
        'https://eth-mainnet.gateway.pokt.network/v1/5f3453978e354ab992c4da79',
        'https://main-rpc.linkpool.io',
        'https://eth-rpc.gateway.pokt.network',
        'https://ethereumnodelight.app.runonflux.io',
        'https://eth-mainnet.public.blastapi.io',
        'https://rpc.flashbots.net',
        'https://rpc.ankr.com/eth',
    ]
};
function getRandomRpcUrl(network) {
    const r = (0, lodash_1.random)(0, exports.RPCUrls[network].length - 1);
    return exports.RPCUrls[network][r];
}
exports.getRandomRpcUrl = getRandomRpcUrl;
//# sourceMappingURL=rpcUrls.js.map