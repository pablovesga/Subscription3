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
};

type MyResult = {
  agreementId: bigint;
  agreementData: AgreementData;
  txHash: string;
};

const onCronTrigger = (runtime: Runtime<Config>): MyResult => {
  runtime.log("Workflow triggered - Reading agreement data and executing payment");

  // Get the first EVM configuration from the list.
  const evmConfig = runtime.config.evms[0];

  // Convert the human-readable chain name to a chain selector
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainName,
    isTestnet: true,
  });

  if (!network) {
    throw new Error(`Unknown chain name: ${evmConfig.chainName}`);
  }

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

  // Agreement ID to process
  const agreementId = 1n;

  // Step 1: Read agreement data first
  const callData = encodeFunctionData({
    abi: RecurringPayments,
    functionName: "getRecord",
    args: [agreementId],
  });

  runtime.log(`Reading agreement ID: ${agreementId}`);

  const contractCall = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: evmConfig.recurringPaymentsAddress as `0x${string}`,
        data: callData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result();

  // Decode the result
  const agreementData = decodeFunctionResult({
    abi: RecurringPayments,
    functionName: "getRecord",
    data: bytesToHex(contractCall.data),
  }) as [string, string, bigint, bigint, bigint, bigint, bigint, boolean];

  const result: AgreementData = {
    sender: agreementData[0],
    receiver: agreementData[1],
    amount: agreementData[2],
    interval: agreementData[3],
    nextPayment: agreementData[4],
    installmentsPaid: agreementData[5],
    totalInstallments: agreementData[6],
    isActive: agreementData[7],
  };

  runtime.log(`Agreement Data:`);
  runtime.log(`  Sender: ${result.sender}`);
  runtime.log(`  Receiver: ${result.receiver}`);
  runtime.log(`  Amount: ${result.amount}`);
  runtime.log(`  Interval: ${result.interval} seconds`);
  runtime.log(`  Next Payment: ${result.nextPayment} (timestamp)`);
  runtime.log(`  Installments Paid: ${result.installmentsPaid}`);
  runtime.log(`  Total Installments: ${result.totalInstallments}`);
  runtime.log(`  Is Active: ${result.isActive}`);

  // Step 2: Execute payInstallment
  const txHash = executePayInstallment(
    runtime,
    network.chainSelector.selector,
    evmConfig,
    agreementId
  );

  return {
    agreementId,
    agreementData: result,
    txHash,
  };
};

function executePayInstallment(
  runtime: Runtime<Config>,
  chainSelector: bigint,
  evmConfig: EvmConfig,
  agreementId: bigint
): string {
  runtime.log(`Executing payInstallment for agreement ID: ${agreementId}`);

  const evmClient = new cre.capabilities.EVMClient(chainSelector);

  // Encode the payInstallment function call
  const payInstallmentData = encodeFunctionData({
    abi: RecurringPayments,
    functionName: "payInstallment",
    args: [agreementId],
  });

  // Encode the report data (the function call)
  const reportData = encodeAbiParameters(
    parseAbiParameters("uint256 id"),
    [agreementId]
  );

  runtime.log(`Preparing to call payInstallment for ID: ${agreementId}`);

  // Generate a signed report
  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result();

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

  runtime.log("Waiting for transaction confirmation");

  const txHash = bytesToHex(writeReportResult.txHash || new Uint8Array(32));
  runtime.log(`Payment transaction succeeded: ${txHash}`);
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
