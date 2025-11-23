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
  
  const getAllIdsCallData = encodeFunctionData({
    abi: RecurringPayments,
    functionName: "getAllRecordIds",
    args: [],
  });

  const idsResponse = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: evmConfig.recurringPaymentsAddress as `0x${string}`,
        data: getAllIdsCallData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result();

  const allRecordIds = decodeFunctionResult({
    abi: RecurringPayments,
    functionName: "getAllRecordIds",
    data: bytesToHex(idsResponse.data),
  }) as bigint[];

  runtime.log(`Found ${allRecordIds.length} records to process`);

  const recordsProcessed: { id: number; executed: boolean }[] = [];
  let executedPayments = 0;

  // Step 2: Process each record
  for (const recordId of allRecordIds) {
    runtime.log(`\n--- Processing Record ID: ${recordId} ---`);
    
    // Get record details
    const getRecordCallData = encodeFunctionData({
      abi: RecurringPayments,
      functionName: "getRecord",
      args: [recordId],
    });

    const recordResponse = evmClient
      .callContract(runtime, {
        call: encodeCallMsg({
          from: zeroAddress,
          to: evmConfig.recurringPaymentsAddress as `0x${string}`,
          data: getRecordCallData,
        }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result();

    const recordData = decodeFunctionResult({
      abi: RecurringPayments,
      functionName: "getRecord",
      data: bytesToHex(recordResponse.data),
    }) as [string, string, bigint, bigint, bigint, bigint, bigint, boolean];

    const installmentsPaid = recordData[5];
    const totalInstallments = recordData[6];
    const isActive = recordData[7];
    const timesRemaining = totalInstallments - installmentsPaid;

    runtime.log(`  Sender: ${recordData[0]}`);
    runtime.log(`  Receiver: ${recordData[1]}`);
    runtime.log(`  Amount: ${recordData[2]}`);
    runtime.log(`  Installments Paid: ${installmentsPaid}`);
    runtime.log(`  Total Installments: ${totalInstallments}`);
    runtime.log(`  Times Remaining: ${timesRemaining}`);
    runtime.log(`  Is Active: ${isActive}`);

    // Step 3: Check if payment should be executed
    if (timesRemaining > 0n) {
      runtime.log(`  ❌ Skipping - No installments remaining`);
      recordsProcessed.push({ id: Number(recordId), executed: false });
      continue;
    }

    if (!isActive) {
      runtime.log(`  ❌ Skipping - Record is not active`);
      recordsProcessed.push({ id: Number(recordId), executed: false });
      continue;
    }

    // Execute payment
    runtime.log(`  ✅ Executing payment for record ${recordId}`);
    const txHash = executePayInstallment(runtime, evmConfig, recordId);
    runtime.log(`  Transaction: ${txHash}`);
    
    recordsProcessed.push({ id: Number(recordId), executed: true });
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

function executePayInstallment(
  runtime: Runtime<Config>,
  evmConfig: EvmConfig,
  agreementId: bigint
): string {
  runtime.log(`Executing payInstallment for agreement ID: ${agreementId}`);

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

  // Encode the payInstallment function call
  const payInstallmentData = encodeFunctionData({
    abi: RecurringPayments,
    functionName: "payInstallment",
    args: [agreementId],
  });

  runtime.log(`Preparing to call payInstallment for ID: ${agreementId}`);
  runtime.log(`Calldata: ${payInstallmentData}`);

  // Encode the report data with the full calldata
  const reportData = payInstallmentData;

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
