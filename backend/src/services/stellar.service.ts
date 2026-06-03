import {
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { env } from "../config/env.js";

type StellarSubmitResult = {
  txHash: string;
  ledger?: number;
  explorerUrl?: string;
  network: string;
  sourcePublicKey: string;
};

function networkPassphrase() {
  if (env.STELLAR_NETWORK === "mainnet") return Networks.PUBLIC;
  return Networks.TESTNET;
}

function assertConfigured() {
  if (!env.STELLAR_SOURCE_PUBLIC_KEY || !env.STELLAR_SOURCE_SECRET_KEY) {
    throw new Error("Faltan STELLAR_SOURCE_PUBLIC_KEY o STELLAR_SOURCE_SECRET_KEY en backend/.env.");
  }
}

function rootHashBuffer(rootHash: string) {
  if (!/^[a-f0-9]{64}$/i.test(rootHash)) {
    throw new Error("El root hash debe ser SHA-256 hexadecimal de 64 caracteres.");
  }
  return Buffer.from(rootHash, "hex");
}

export const stellarService = {
  isConfigured: () => Boolean(env.STELLAR_SOURCE_PUBLIC_KEY && env.STELLAR_SOURCE_SECRET_KEY),

  submitAnchor: async (batchId: string, rootHash: string): Promise<StellarSubmitResult> => {
    assertConfigured();

    const server = new Horizon.Server(env.STELLAR_HORIZON_URL);
    const keypair = Keypair.fromSecret(env.STELLAR_SOURCE_SECRET_KEY);
    const sourcePublicKey = keypair.publicKey();

    if (sourcePublicKey !== env.STELLAR_SOURCE_PUBLIC_KEY) {
      throw new Error("La public key de Stellar no coincide con la secret key configurada.");
    }

    const account = await server.loadAccount(sourcePublicKey);
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: networkPassphrase(),
    })
      .addOperation(
        Operation.manageData({
          name: `oberyn:${batchId.slice(0, 12)}`,
          value: rootHashBuffer(rootHash),
        }),
      )
      .setTimeout(45)
      .build();

    transaction.sign(keypair);
    const result = await server.submitTransaction(transaction);
    const txHash = String(result.hash);
    const ledger = typeof result.ledger === "number" ? result.ledger : undefined;

    return {
      txHash,
      ledger,
      explorerUrl: `${env.STELLAR_EXPLORER_BASE_URL}/${txHash}`,
      network: env.STELLAR_NETWORK,
      sourcePublicKey,
    };
  },
};
