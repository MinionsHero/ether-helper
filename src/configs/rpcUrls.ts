import { random } from "lodash"
import { Network } from "./networks"

export const RPCUrls: Record<Network, string[]> = {
    // ethereum mainnet
    [Network.ETHEREUM]: [
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
}

export function getRandomRpcUrl(network: Network) {
    const r = random(0, RPCUrls[network].length - 1)
    return RPCUrls[network][r]
}