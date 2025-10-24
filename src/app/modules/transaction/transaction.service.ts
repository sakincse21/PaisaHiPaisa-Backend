import { JwtPayload } from "jsonwebtoken";
import { Transaction } from "./transaction.model";
import AppError from "../../errorHelpers/appErrorHandler";
import httpStatus from "http-status";
import { IRole, IStatus } from "../user/user.interface";
import {
  ITransaction,
  ITransactionStatus,
  ITransactionType,
} from "./transaction.interface";
import { User } from "../user/user.model";
import { agentValidator, userValidator } from "./transaction.utils";
import { Wallet } from "../wallet/wallet.model";
import { amountCheck } from "../../utils/amountChecker";
import { QueryBuilder } from "../../utils/queryBuilder";
import { transactionSearchableFields } from "./transaction.constant";
import { feesRate } from "../fees/fees.constant";
import { Fees } from "../fees/fees.model";

import { SslCommerzPayment } from "@dmasifur/sslcommerz-ts";
import type { PaymentData } from "@dmasifur/sslcommerz-ts";
import { envVars } from "../../config/env";
import { sendEmail } from "../../utils/nodemailer";

//anyone can get his own transaction or the admin can get any transaction
const getSingleTransaction = async (
  transactionId: string,
  decodedToken: JwtPayload
) => {
  const ifTransactionExists = await Transaction.findById(transactionId);
  if (!ifTransactionExists) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Transaction ID does not exist."
    );
  }
  if (
    ifTransactionExists.from.toString() !== decodedToken.userId &&
    ifTransactionExists.to.toString() !== decodedToken.userId
  ) {
    if (
      decodedToken.role !== IRole.ADMIN &&
      decodedToken.role !== IRole.SUPER_ADMIN
    ) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "You are not permitted for this operation."
      );
    }
  }
  return ifTransactionExists.toObject();
};
//anyone can get his own transaction or the admin can get any transaction
const getSummary = async (decodedToken: JwtPayload) => {
  const userId = decodedToken.userId;
  const ifUserExists = await User.findById(userId);
  if (!ifUserExists) {
    throw new AppError(httpStatus.BAD_REQUEST, "User does not exists.");
  }
  const walletId = ifUserExists.phoneNo;
  // const userTransactions = Transaction.find({
  //     $or: [{ from: walletId }, { to: walletId }],
  //   });
  const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const summaryData = await Transaction.aggregate([
    //search user
    {
      $match: {
        $and: [
          { $or: [{ from: walletId }, { to: walletId }] },
          { updatedAt: { $gte: pastDate } },
        ],
      },
    },
    //grouping based on type
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
    //projection with field names
    {
      $project: {
        Label: "$_id",
        Amount: "$totalAmount",
        Volume: "$count",
        _id: 0,
      },
    },
  ]);
  return summaryData;
};

//anyone can get his own transaction or the admin can get any transaction
const getAdminSummary = async (decodedToken: JwtPayload) => {
  const userId = decodedToken.userId;
  const ifUserExists = await User.findById(userId);
  if (!ifUserExists) {
    throw new AppError(httpStatus.BAD_REQUEST, "User does not exists.");
  }

  // console.log(ifUserExists)

  const initialFilter = {
    $or: [{ role: IRole.USER }, { role: IRole.AGENT }],
  };

  const agentCount = await User.find(initialFilter).countDocuments({
    role: IRole.AGENT,
  });
  const userCount = await User.find(initialFilter).countDocuments({
    role: IRole.USER,
  });
  const totalUsersCount = await User.countDocuments(initialFilter);
  // const verifiedCount = await User.find(initialFilter).countDocuments({isVerified:true});
  // const unverifiedCount = await User.find(initialFilter).countDocuments({isVerified: false});
  const suspendedCount = await User.find(initialFilter).countDocuments({
    status: IStatus.SUSPENDED,
  });
  const activeCount = await User.find(initialFilter).countDocuments({
    status: IStatus.ACTIVE,
  });
  const deletedCount = await User.find(initialFilter).countDocuments({
    status: IStatus.DELETE,
  });
  const blockedCount = await User.find(initialFilter).countDocuments({
    status: IStatus.BLOCKED,
  });

  // const usersSummaryData = await U

  const usersAllCount = [
    // {
    //   Label: 'Verified',
    //   Amount: verifiedCount
    // },
    // {
    //   Label: 'Unverified',
    //   Amount: unverifiedCount
    // },
    {
      Label: "Suspended",
      Amount: suspendedCount,
    },
    {
      Label: "Active",
      Amount: activeCount,
    },
    {
      Label: "Deleted",
      Amount: deletedCount,
    },
    {
      Label: "Blocked",
      Amount: blockedCount,
    },
    {
      Label: "Total",
      Amount: totalUsersCount,
    },
  ];

  const roleData = [
    {
      Label: "Agents",
      Amount: agentCount,
    },
    {
      Label: "Users",
      Amount: userCount,
    },
  ];

  // console.log(usersAllCount)

  const summaryTransactionData = await Transaction.aggregate([
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
    //projection with field names
    {
      $project: {
        Label: "$_id",
        Amount: "$totalAmount",
        Volume: "$count",
        _id: 0,
      },
    },
  ]);
  return [usersAllCount, summaryTransactionData, roleData];
};

//admins can get all the transactions or users can view their own all transactions
const getAllTransactions = async (
  decodedToken: JwtPayload,
  query: Record<string, string>
) => {
  const userId = decodedToken.userId;
  const ifUserExists = await User.findById(userId);
  if (!ifUserExists) {
    throw new AppError(httpStatus.BAD_REQUEST, "User does not exists.");
  }
  const walletId = ifUserExists.phoneNo;
  // let allTransactions;
  let params;
  if (
    decodedToken.role === IRole.ADMIN ||
    decodedToken.role === IRole.SUPER_ADMIN
  ) {
    // allTransactions = await Transaction.find({});
    params = {};
  } else {
    // allTransactions = await Transaction.find({
    //   $or: [{ from: walletId }, { to: walletId }],
    // });
    params = {
      $or: [{ from: walletId }, { to: walletId }],
    };
  }
  const queryBuilder = new QueryBuilder(Transaction.find(params), query);
  const usersData = queryBuilder
    .filter()
    .search(transactionSearchableFields)
    .sort()
    .fields()
    .paginate();

  const [data, meta] = await Promise.all([
    usersData.build(),
    queryBuilder.getMeta(),
  ]);

  return { data, meta };

  // return allTransactions;
};

//users can request for add money to any agent. if agent accepts, transaction completes
const addMoney = async (payload: ITransaction, decodedToken: JwtPayload) => {
  const session = await User.startSession();
  session.startTransaction();
  try {
    const { type, amount } = payload;
    amountCheck(amount);
    if (type !== ITransactionType.ADD_MONEY) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Your operation is not correct."
      );
    }
    const user = await User.findById(decodedToken.userId);
    const userWallet = await Wallet.findById(user?.walletId);


    const transaction = await Transaction.create(
      [
        {
          to: userWallet?.walletId,
          from: "SSLCommerez",
          amount,
          type,
          status: ITransactionStatus.FAILED,
        },
      ],
      { session }
    );
    userWallet?.transactionId.push(transaction[0]._id);

    const sslCommerzPayment = new SslCommerzPayment(
      String(envVars.SSL.STORE_ID),
      String(envVars.SSL.STORE_PASSWORD),
      false
    );

    const data: PaymentData = {
      total_amount: amount,
      currency: "BDT",
      tran_id: String(transaction[0]._id),
      success_url: `${envVars.SSL.SUCCESS_URL}?trans_id=${transaction[0]._id}`,
      fail_url: `${envVars.SSL.FAIL_URL}?trans_id=${transaction[0]._id}`,
      cancel_url: `${envVars.SSL.CANCEL_URL}?trans_id=${transaction[0]._id}`,
      shipping_method: "N/A",
      product_name: "Add Money",
      product_category: "General",
      product_profile: "general",
      cus_name: "User",
      cus_email: "test@example.com",
      cus_add1: "Dhaka",
      cus_city: "Dhaka",
      cus_postcode: "1000",
      cus_country: "Bangladesh",
      cus_phone: "01711111111",
      num_of_item: 1,
      ship_name: "test_ship",
      ship_add1: "ship_addr",
      ship_city: "ship_city",
      ship_postcode: "1111",
      ship_country: "ship_country",
    };

    const apiResponse = await sslCommerzPayment.init(data);
    if (!apiResponse.GatewayPageURL) {
      throw new AppError(httpStatus.SERVICE_UNAVAILABLE, 'Server error make a new request.')
    }

    await userWallet?.save({ session });
    await session.commitTransaction();
    session.endSession();
    return {
      paymentUrl: apiResponse.GatewayPageURL,
      ...transaction[0].toObject(),
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const addMoneySuccess = async (trans_id: string) => {
  const session = await User.startSession();
  session.startTransaction();
  try {
    const ifTransactionExists = await Transaction.findById(trans_id);
    if (!ifTransactionExists) {
      throw new AppError(httpStatus.BAD_REQUEST, "Transaction does not exist.");
    }
    if (ifTransactionExists.status === ITransactionStatus.COMPLETED) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Transaction is already processed."
      );
    }
    const userWallet = await Wallet.findOne({
      walletId: ifTransactionExists?.to,
    });

    if (!userWallet) {
      throw new AppError(httpStatus.BAD_REQUEST, "User wallet does not exist.");
    }

    ifTransactionExists.status = ITransactionStatus.COMPLETED;
    userWallet.balance += ifTransactionExists.amount;

    await ifTransactionExists.save({ session });
    await userWallet?.save({ session });
    await session.commitTransaction();

    const user = await User.findOne({ phoneNo: userWallet.walletId });
    if(!user){
      throw new AppError(httpStatus.BAD_REQUEST, "User does not exist.");
    }
    await sendEmail(
      user.email,
      "Add Money Successful",
      `Your transaction has been completed successfully. ${ifTransactionExists.amount}BDT added to your account. Your new balance is ${userWallet.balance}BDT.`
    );

    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const addMoneyFail = async (trans_id: string) => {
  const session = await User.startSession();
  session.startTransaction();
  try {
    const ifTransactionExists = await Transaction.findById(trans_id);
    if (!ifTransactionExists) {
      throw new AppError(httpStatus.BAD_REQUEST, "Transaction does not exist.");
    }

    if (ifTransactionExists.status === ITransactionStatus.COMPLETED) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Transaction is already processed."
      );
    }

    ifTransactionExists.status = ITransactionStatus.FAILED;

    await ifTransactionExists.save({ session });
    await session.commitTransaction();

    const user = await User.findOne({ phoneNo: ifTransactionExists.to });
    if(!user){
      throw new AppError(httpStatus.BAD_REQUEST, "User does not exist.");
    }

    await sendEmail(
      user.email,
      "Add Money Failed",
      `Your transaction has failed. ${ifTransactionExists.amount}BDT was not added to your account.`
    );


    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

//users can request for add money to any agent. if agent accepts, transaction completes
// const addMoney = async (payload: ITransaction, decodedToken: JwtPayload) => {
//   const session = await User.startSession();
//   session.startTransaction();
//   try {
//     const { to: toPhone, type, amount } = payload;
//     amountCheck(amount);
//     const ifAgentExists = await User.findOne({ phoneNo: toPhone });
//     await agentValidator(ifAgentExists);
//     const agentWallet = await Wallet.findById(ifAgentExists?.walletId);
//     if (type !== ITransactionType.ADD_MONEY) {
//       throw new AppError(
//         httpStatus.BAD_REQUEST,
//         "Your operation is not correct."
//       );
//     }
//     const user = await User.findById(decodedToken.userId);
//     const userWallet = await Wallet.findById(user?.walletId);

//     const transaction = await Transaction.create(
//       [
//         {
//           from: userWallet?.walletId,
//           to: agentWallet?.walletId,
//           amount,
//           type,
//         },
//       ],
//       { session }
//     );
//     userWallet?.transactionId.push(transaction[0]._id);
//     agentWallet?.transactionId.push(transaction[0]._id);
//     await userWallet?.save({ session });
//     await agentWallet?.save({ session });
//     await session.commitTransaction();
//     session.endSession();
//     return transaction[0].toObject();
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     throw error;
//   }
// };

//agent can confirm the add money request send to him from any user.
const addMoneyConfirm = async (
  transactionId: string,
  decodedToken: JwtPayload,
  payload: { consent: string }
) => {
  const session = await User.startSession();
  session.startTransaction();
  try {
    const ifTransactionExists = await Transaction.findById(transactionId);
    if (ifTransactionExists?.type !== ITransactionType.ADD_MONEY) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Your operation is not correct."
      );
    }
    if (ifTransactionExists?.status !== ITransactionStatus.PENDING) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Your operation is already processed."
      );
    }
    const user = await User.findOne({ phoneNo: ifTransactionExists.from });
    await userValidator(user);
    const userWallet = await Wallet.findById(user?.walletId);

    if (!userWallet) {
      throw new AppError(httpStatus.BAD_REQUEST, "User wallet does not exist.");
    }
    const agent = await User.findById(decodedToken.userId);
    await agentValidator(agent);

    if (ifTransactionExists.to !== agent?.phoneNo) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "This transaction is not made to you."
      );
    }

    const agentWallet = await Wallet.findById(agent?.walletId);

    if (!agentWallet) {
      throw new AppError(httpStatus.BAD_REQUEST, "Your wallet does not exist.");
    }

    if (!payload.consent) {
      ifTransactionExists.status = ITransactionStatus.FAILED;
    } else {
      if (ifTransactionExists.amount > agentWallet.balance) {
        ifTransactionExists.status = ITransactionStatus.FAILED;

        await ifTransactionExists.save();

        throw new AppError(
          httpStatus.BAD_REQUEST,
          "You do not have sufficient balance."
        );
      }

      userWallet.balance = userWallet.balance + ifTransactionExists.amount;
      agentWallet.balance = agentWallet.balance - ifTransactionExists.amount;
      ifTransactionExists.status = ITransactionStatus.COMPLETED;
      await agentWallet.save({ session });
      await userWallet.save({ session });
    }

    await ifTransactionExists.save({ session });

    await session.commitTransaction();
    session.endSession();

    return ifTransactionExists.toObject();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

//any user can withdraw money anytime through an agent number
const withdrawMoney = async (
  payload: ITransaction,
  decodedToken: JwtPayload
) => {
  const session = await User.startSession();
  session.startTransaction();
  try {
    const { to: toPhone, type, amount } = payload;
    amountCheck(amount);
    const ifAgentExists = await User.findOne({ phoneNo: toPhone });
    await agentValidator(ifAgentExists);
    if (type !== ITransactionType.WITHDRAW) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Your operation is not correct."
      );
    }
    const user = await User.findById(decodedToken.userId);

    if (!user) {
      throw new AppError(httpStatus.BAD_REQUEST, "User does not exist.");
    }

    const userWallet = await Wallet.findById(user?.walletId);
    if (!userWallet) {
      throw new AppError(httpStatus.BAD_REQUEST, "Your wallet does not exist.");
    }
    if (amount > userWallet.balance) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You do not have sufficient balance."
      );
    }
    const agentWallet = await Wallet.findById(ifAgentExists?.walletId);
    if (!agentWallet) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Agent wallet does not exist."
      );
    }

    const feesAmount = amount * feesRate;
    const transaction = await Transaction.create(
      [
        {
          from: userWallet.walletId,
          to: agentWallet.walletId,
          amount,
          type,
          status: ITransactionStatus.COMPLETED,
          fees: feesAmount,
        },
      ],
      { session }
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fees = await Fees.create(
      [
        {
          transactionId: transaction[0]._id,
          amount: feesAmount,
        },
      ],
      { session }
    );

    userWallet.balance = userWallet.balance - amount - feesAmount;
    agentWallet.balance = agentWallet.balance + amount + feesAmount;

    await agentWallet.save({ session });
    await userWallet.save({ session });

    await session.commitTransaction();

    await sendEmail(
      user.email,
      "Money Withdrawn Successfully",
      `Your transaction has been completed successfully. ${transaction[0].amount}BDT withdrawn and ${feesAmount}BDT charge deducted from your account. Your new balance is ${userWallet.balance}BDT.`
    );

    session.endSession();
    return transaction[0].toObject();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

//an agent can cash in the money to any user anytime
const cashIn = async (payload: ITransaction, decodedToken: JwtPayload) => {
  const session = await User.startSession();
  session.startTransaction();
  try {
    const { to: toPhone, type, amount } = payload;
    amountCheck(amount);
    const ifUserExists = await User.findOne({ phoneNo: toPhone });
    if(!ifUserExists){
      throw new AppError(httpStatus.BAD_REQUEST, "User does not exist.");
    }
    await userValidator(ifUserExists);
    if (type !== ITransactionType.CASH_IN) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Your operation is not correct."
      );
    }
    const agent = await User.findById(decodedToken.userId);

    if(!agent){
      throw new AppError(httpStatus.BAD_REQUEST, "Agent does not exist.");
    }

    const agentWallet = await Wallet.findById(agent?.walletId);
    if (!agentWallet) {
      throw new AppError(httpStatus.BAD_REQUEST, "Your wallet does not exist.");
    }
    if (amount > agentWallet.balance) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You do not have sufficient balance."
      );
    }
    const userWallet = await Wallet.findById(ifUserExists?.walletId);
    if (!userWallet) {
      throw new AppError(httpStatus.BAD_REQUEST, "User wallet does not exist.");
    }

    const transaction = await Transaction.create(
      [
        {
          from: agentWallet.walletId,
          to: userWallet.walletId,
          amount,
          type,
          status: ITransactionStatus.COMPLETED,
        },
      ],
      { session }
    );

    userWallet.balance = userWallet.balance + amount;
    agentWallet.balance = agentWallet.balance - amount;

    await agentWallet.save({ session });
    await userWallet.save({ session });
    await session.commitTransaction();

    await sendEmail(
      agent.email,
      "Cash In Successful",
      `Your transaction has been completed successfully. ${transaction[0].amount}BDT cashed in to ${userWallet.walletId} from your account. Your new balance is ${agentWallet.balance}BDT.`
    );

    await sendEmail(
      ifUserExists.email,
      "Cash In Successful",
      `Your transaction has been completed successfully. ${transaction[0].amount}BDT cashed in to your account from ${agentWallet.walletId}. Your new balance is ${userWallet.balance}BDT.`
    );

    session.endSession();
    return transaction[0].toObject();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

//sendMoney can send any amount to anyone of his role if balance is equal or more.
const sendMoney = async (payload: ITransaction, decodedToken: JwtPayload) => {
  const session = await User.startSession();
  session.startTransaction();
  try {
    const { to: toPhone, type, amount } = payload;
    const ifReceiverExists = await User.findOne({ phoneNo: toPhone });
    if(!ifReceiverExists){
      throw new AppError(httpStatus.BAD_REQUEST, "Receiver does not exist.");
    }
    if (decodedToken.role === IRole.AGENT) {
      await agentValidator(ifReceiverExists);
    } else {
      await userValidator(ifReceiverExists);
    }

    if (decodedToken.userId === ifReceiverExists?._id.toString()) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You cannot send money to your own wallet."
      );
    }
    if (type !== ITransactionType.SEND_MONEY) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Your operation is not correct."
      );
    }
    if (decodedToken.role !== ifReceiverExists?.role.toString()) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `${decodedToken.role} can only send money to another ${decodedToken.role}`
      );
    }
    const sender = await User.findById(decodedToken.userId);

    if (!sender) {
      throw new AppError(httpStatus.BAD_REQUEST, "User does not exist.");
    }

    const senderWallet = await Wallet.findById(sender?.walletId);
    if (!senderWallet) {
      throw new AppError(httpStatus.BAD_REQUEST, "Your wallet does not exist.");
    }
    if (amount > senderWallet.balance) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You do not have sufficient balance."
      );
    }
    const receiverWallet = await Wallet.findById(ifReceiverExists?.walletId);
    if (!receiverWallet) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Receiver wallet does not exist."
      );
    }

    const transaction = await Transaction.create(
      [
        {
          from: senderWallet.walletId,
          to: receiverWallet.walletId,
          amount,
          type,
          status: ITransactionStatus.COMPLETED,
        },
      ],
      { session }
    );

    receiverWallet.balance = receiverWallet.balance + amount;
    senderWallet.balance = senderWallet.balance - amount;

    await senderWallet.save({ session });
    await receiverWallet.save({ session });
    await session.commitTransaction();

    await sendEmail(
      sender.email,
      "Money Sent Successfully",
      `Your transaction has been completed successfully. ${transaction[0].amount}BDT sent from your account to ${receiverWallet.walletId}. Your new balance is ${senderWallet.balance}BDT.`
    );

    await sendEmail(
      ifReceiverExists.email,
      "Money Received Successfully",
      `You have received ${transaction[0].amount}BDT to your account from ${senderWallet.walletId}. Your new balance is ${receiverWallet.balance}BDT.`
    );

    session.endSession();
    return transaction[0].toObject();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

//admins can proceed to refund any completed transactions
const refund = async (transactionId: string) => {
  const session = await User.startSession();
  session.startTransaction();
  try {
    const ifTransactionExists = await Transaction.findById(transactionId);
    if (!ifTransactionExists) {
      throw new AppError(httpStatus.BAD_REQUEST, "Transaction does not exist.");
    }
    if(ifTransactionExists.type === ITransactionType.ADD_MONEY){
      throw new AppError(httpStatus.BAD_REQUEST, "Refund for add money is not supported.")
    }
    const { from: to, to: from, status, amount, type } = ifTransactionExists;
    // const ifReceiverExists = await User.findOne({phoneNo:to})
    // await anyValidator(ifReceiverExists);
    // const ifSenderExists = await User.findOne({phoneNo:from})
    // await anyValidator(ifSenderExists);

    if (
      status === ITransactionStatus.PENDING ||
      status === ITransactionStatus.REFUNDED ||
      status === ITransactionStatus.FAILED
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Your operation is not correct."
      );
    }
    const sender = await User.findOne({ phoneNo: from });
    if (!sender) {
      throw new AppError(httpStatus.BAD_REQUEST, "Original sender does not exist.");
    }
    const senderWallet = await Wallet.findOne({ walletId: from });
    if (!senderWallet) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Original receiver wallet does not exist."
      );
    }
    if (amount > senderWallet.balance) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Original receiver do not have sufficient balance for refund."
      );
    }
    
    const receiver = await User.findOne({ phoneNo: to });
    if (!receiver) {
      throw new AppError(httpStatus.BAD_REQUEST, "Original receiver does not exist.");
    }
    const receiverWallet = await Wallet.findOne({ walletId: to });
    if (!receiverWallet) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Original sender wallet does not exist."
      );
    }

    let feesAmount = 0;

    if (type === ITransactionType.WITHDRAW) {
      feesAmount = amount * feesRate;
    }

    receiverWallet.balance = receiverWallet.balance + amount + feesAmount;
    senderWallet.balance = senderWallet.balance - amount - feesAmount;
    ifTransactionExists.status = ITransactionStatus.REFUNDED;

    await ifTransactionExists.save({ session });
    await senderWallet.save({ session });
    await receiverWallet.save({ session });
    await session.commitTransaction();

    await sendEmail(
      receiver.email,
      "Money Refunded Successfully",
      `Your transaction has been refunded successfully. ${ifTransactionExists.amount}BDT refunded to your account. Your new balance is ${receiverWallet.balance}BDT.`
    );

    await sendEmail(
      sender.email,
      "Money Deducted for Refund",
      `Your account has been deducted for a refund transaction. ${ifTransactionExists.amount}BDT deducted from your account. Your new balance is ${senderWallet.balance}BDT.`
    );

    session.endSession();
    return ifTransactionExists.toObject();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const TransactionServices = {
  getSingleTransaction,
  getAllTransactions,
  addMoney,
  withdrawMoney,
  cashIn,
  sendMoney,
  addMoneyConfirm,
  refund,
  getSummary,
  getAdminSummary,
  addMoneySuccess,
  addMoneyFail,
};
