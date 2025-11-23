import {
  cre,
  Runner,
  type Runtime,
  getNetwork,
  LAST_FINALIZED_BLOCK_NUMBER,
  encodeCallMsg,
  bytesToHex,
  hexToBase64,
} from "@chainlink/cre-sdk";
import { encodeFunctionData, decodeFunctionResult, zeroAddress, encodeAbiParameters, parseAbiParameters } from "viem";
import { RecurringPayments } from "../contracts/abi";

// EvmConfig defines the configuration for a single EVM chain.
type EvmConfig = {
  recurringPaymentsAddress: string;
  chainName: string;
  gasLimit: string;
};

type Config = {
  schedule: string;
  evms: EvmConfig[];
};

type AgreementData = {
  sender: string;
  receiver: string;
  amount: bigint;
  interval: bigint;
  nextPayment: bigint;
  installmentsPaid: bigint;
  totalInstallments: bigint;
  isActive: boolean;
  timesRemaining: bigint;
};

type MyResult = {
  processedRecords: number;
  executedPayments: number;
  recordsProcessed: {
    id: number;
    executed: boolean;
  }[];
};

const onCronTrigger = (runtime: Runtime<Config>): MyResult => {
  runtime.log("Workflow triggered - Processing all recurring payment records");

  const evmConfig = runtime.config.evms[0];

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainName,
    isTestnet: true,
  });

  if (!network) {
    throw new Error(`Unknown chain name: ${evmConfig.chainName}`);
  }

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

  // Step 1: Get all record IDs
  runtime.log("Step 1: Fetching all record IDs from contract");
  runtime.log(`Contract address: ${evmConfig.recurringPaymentsAddress}`);
  runtime.log(`Chain: ${evmConfig.chainName}`);
  
  const getAllIdsCallData = encodeFunctionData({
    abi: RecurringPayments,
    functionName: "getAllUids",
    args: [],
  });

  runtime.log(`Encoded call data: ${getAllIdsCallData}`);

  let idsResponse;
  try {
    idsResponse = evmClient
      .callContract(runtime, {
        call: encodeCallMsg({
          from: zeroAddress,
          to: evmConfig.recurringPaymentsAddress as `0x${string}`,
          data: getAllIdsCallData,
        }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result();
  } catch (error) {
    runtime.log(`Error calling getAllUids: ${error}`);
    throw error;
  }

  runtime.log(`Response received, decoding...`);

  const allRecordIds = decodeFunctionResult({
    abi: RecurringPayments,
    functionName: "getAllUids",
    data: bytesToHex(idsResponse.data),
  }) as bigint[];

  runtime.log(`Found ${allRecordIds.length} records to process`);

  const recordsProcessed: { id: number; executed: boolean }[] = [];
  let executedPayments = 0;

  // Step 2: Process each record - Execute payment directly
  for (const uid of allRecordIds) {
    runtime.log(`\n--- Processing UID: ${uid} ---`);
    
    // Execute payment directly without validations (contract handles them)
    runtime.log(`  ✅ Executing payment for UID ${uid}`);
    const txHash = executePayment(runtime, evmConfig, uid);
    runtime.log(`  Transaction: ${txHash}`);
    
    recordsProcessed.push({ id: Number(uid), executed: true });
    executedPayments++;
  }

  runtime.log(`\n=== Summary ===`);
  runtime.log(`Total Records Processed: ${allRecordIds.length}`);
  runtime.log(`Payments Executed: ${executedPayments}`);

  return {
    processedRecords: allRecordIds.length,
    executedPayments,
    recordsProcessed,
  };
};

function executePayment(
  runtime: Runtime<Config>,
  evmConfig: EvmConfig,
  uid: bigint
): string {
  runtime.log(`Executing executePayment for UID: ${uid}`);

  // Get network info from evmConfig
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainName,
    isTestnet: true,
  });

  if (!network) {
    throw new Error(`Unknown chain name: ${evmConfig.chainName}`);
  }

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

  // Encode the executePayment function call
  const executePaymentData = encodeFunctionData({
    abi: RecurringPayments,
    functionName: "executePayment",
    args: [uid],
  });

  runtime.log(`Preparing to call executePayment for UID: ${uid}`);
  runtime.log(`Calldata: ${executePaymentData}`);

  // Encode the report data with the full calldata
  const reportData = executePaymentData;

  // Generate a signed report with the calldata
  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result();

  runtime.log(`Report generated with signature`);

  // Submit the report to execute payInstallment
  const writeReportResult = evmClient
    .writeReport(runtime, {
      receiver: evmConfig.recurringPaymentsAddress,
      report: reportResponse,
      gasConfig: {
        gasLimit: evmConfig.gasLimit,
      },
    })
    .result();

  runtime.log("Transaction submitted, waiting for confirmation");

  const txHash = bytesToHex(writeReportResult.txHash || new Uint8Array(32));
  runtime.log(`Payment transaction hash: ${txHash}`);
  runtime.log(`View transaction at https://sepolia.etherscan.io/tx/${txHash}`);
  
  return txHash;
}

const initWorkflow = (config: Config) => {
  const cron = new cre.capabilities.CronCapability();

  return [
    cre.handler(
      cron.trigger(
        { schedule: "*/30 * * * * *" } // Every 30 seconds (minimum interval)
      ), 
      onCronTrigger
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}

main();
