"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionServices = void 0;
const transaction_model_1 = require("./transaction.model");
const appErrorHandler_1 = __importDefault(require("../../errorHelpers/appErrorHandler"));
const http_status_1 = __importDefault(require("http-status"));
const user_interface_1 = require("../user/user.interface");
const transaction_interface_1 = require("./transaction.interface");
const user_model_1 = require("../user/user.model");
const transaction_utils_1 = require("./transaction.utils");
const wallet_model_1 = require("../wallet/wallet.model");
const amountChecker_1 = require("../../utils/amountChecker");
const queryBuilder_1 = require("../../utils/queryBuilder");
const transaction_constant_1 = require("./transaction.constant");
const fees_constant_1 = require("../fees/fees.constant");
const fees_model_1 = require("../fees/fees.model");
const sslcommerz_ts_1 = require("@dmasifur/sslcommerz-ts");
const env_1 = require("../../config/env");
const nodemailer_1 = require("../../utils/nodemailer");
//anyone can get his own transaction or the admin can get any transaction
const getSingleTransaction = (transactionId, decodedToken) => __awaiter(void 0, void 0, void 0, function* () {
    const ifTransactionExists = yield transaction_model_1.Transaction.findById(transactionId);
    if (!ifTransactionExists) {
        throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Transaction ID does not exist.");
    }
    if (ifTransactionExists.from.toString() !== decodedToken.userId &&
        ifTransactionExists.to.toString() !== decodedToken.userId) {
        if (decodedToken.role !== user_interface_1.IRole.ADMIN &&
            decodedToken.role !== user_interface_1.IRole.SUPER_ADMIN) {
            throw new appErrorHandler_1.default(http_status_1.default.UNAUTHORIZED, "You are not permitted for this operation.");
        }
    }
    return ifTransactionExists.toObject();
});
//anyone can get his own transaction or the admin can get any transaction
const getSummary = (decodedToken) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = decodedToken.userId;
    const ifUserExists = yield user_model_1.User.findById(userId);
    if (!ifUserExists) {
        throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "User does not exists.");
    }
    const walletId = ifUserExists.phoneNo;
    // const userTransactions = Transaction.find({
    //     $or: [{ from: walletId }, { to: walletId }],
    //   });
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const summaryData = yield transaction_model_1.Transaction.aggregate([
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
});
//anyone can get his own transaction or the admin can get any transaction
const getAdminSummary = (decodedToken) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = decodedToken.userId;
    const ifUserExists = yield user_model_1.User.findById(userId);
    if (!ifUserExists) {
        throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "User does not exists.");
    }
    // console.log(ifUserExists)
    const initialFilter = {
        $or: [{ role: user_interface_1.IRole.USER }, { role: user_interface_1.IRole.AGENT }],
    };
    const agentCount = yield user_model_1.User.find(initialFilter).countDocuments({
        role: user_interface_1.IRole.AGENT,
    });
    const userCount = yield user_model_1.User.find(initialFilter).countDocuments({
        role: user_interface_1.IRole.USER,
    });
    const totalUsersCount = yield user_model_1.User.countDocuments(initialFilter);
    // const verifiedCount = await User.find(initialFilter).countDocuments({isVerified:true});
    // const unverifiedCount = await User.find(initialFilter).countDocuments({isVerified: false});
    const suspendedCount = yield user_model_1.User.find(initialFilter).countDocuments({
        status: user_interface_1.IStatus.SUSPENDED,
    });
    const activeCount = yield user_model_1.User.find(initialFilter).countDocuments({
        status: user_interface_1.IStatus.ACTIVE,
    });
    const deletedCount = yield user_model_1.User.find(initialFilter).countDocuments({
        status: user_interface_1.IStatus.DELETE,
    });
    const blockedCount = yield user_model_1.User.find(initialFilter).countDocuments({
        status: user_interface_1.IStatus.BLOCKED,
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
    const summaryTransactionData = yield transaction_model_1.Transaction.aggregate([
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
});
//admins can get all the transactions or users can view their own all transactions
const getAllTransactions = (decodedToken, query) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = decodedToken.userId;
    const ifUserExists = yield user_model_1.User.findById(userId);
    if (!ifUserExists) {
        throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "User does not exists.");
    }
    const walletId = ifUserExists.phoneNo;
    // let allTransactions;
    let params;
    if (decodedToken.role === user_interface_1.IRole.ADMIN ||
        decodedToken.role === user_interface_1.IRole.SUPER_ADMIN) {
        // allTransactions = await Transaction.find({});
        params = {};
    }
    else {
        // allTransactions = await Transaction.find({
        //   $or: [{ from: walletId }, { to: walletId }],
        // });
        params = {
            $or: [{ from: walletId }, { to: walletId }],
        };
    }
    const queryBuilder = new queryBuilder_1.QueryBuilder(transaction_model_1.Transaction.find(params), query);
    const usersData = queryBuilder
        .filter()
        .search(transaction_constant_1.transactionSearchableFields)
        .sort()
        .fields()
        .paginate();
    const [data, meta] = yield Promise.all([
        usersData.build(),
        queryBuilder.getMeta(),
    ]);
    return { data, meta };
    // return allTransactions;
});
//users can request for add money to any agent. if agent accepts, transaction completes
const addMoney = (payload, decodedToken) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield user_model_1.User.startSession();
    session.startTransaction();
    try {
        const { type, amount } = payload;
        (0, amountChecker_1.amountCheck)(amount);
        if (type !== transaction_interface_1.ITransactionType.ADD_MONEY) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Your operation is not correct.");
        }
        const user = yield user_model_1.User.findById(decodedToken.userId);
        const userWallet = yield wallet_model_1.Wallet.findById(user === null || user === void 0 ? void 0 : user.walletId);
        const transaction = yield transaction_model_1.Transaction.create([
            {
                to: userWallet === null || userWallet === void 0 ? void 0 : userWallet.walletId,
                from: "SSLCommerez",
                amount,
                type,
                status: transaction_interface_1.ITransactionStatus.FAILED,
            },
        ], { session });
        userWallet === null || userWallet === void 0 ? void 0 : userWallet.transactionId.push(transaction[0]._id);
        const sslCommerzPayment = new sslcommerz_ts_1.SslCommerzPayment(String(env_1.envVars.SSL.STORE_ID), String(env_1.envVars.SSL.STORE_PASSWORD), false);
        const data = {
            total_amount: amount,
            currency: "BDT",
            tran_id: String(transaction[0]._id),
            success_url: `${env_1.envVars.SSL.SUCCESS_URL}?trans_id=${transaction[0]._id}`,
            fail_url: `${env_1.envVars.SSL.FAIL_URL}?trans_id=${transaction[0]._id}`,
            cancel_url: `${env_1.envVars.SSL.CANCEL_URL}?trans_id=${transaction[0]._id}`,
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
        const apiResponse = yield sslCommerzPayment.init(data);
        if (!apiResponse.GatewayPageURL) {
            throw new appErrorHandler_1.default(http_status_1.default.SERVICE_UNAVAILABLE, 'Server error make a new request.');
        }
        yield (userWallet === null || userWallet === void 0 ? void 0 : userWallet.save({ session }));
        yield session.commitTransaction();
        session.endSession();
        return Object.assign({ paymentUrl: apiResponse.GatewayPageURL }, transaction[0].toObject());
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        throw error;
    }
});
const addMoneySuccess = (trans_id) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield user_model_1.User.startSession();
    session.startTransaction();
    try {
        const ifTransactionExists = yield transaction_model_1.Transaction.findById(trans_id);
        if (!ifTransactionExists) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Transaction does not exist.");
        }
        if (ifTransactionExists.status === transaction_interface_1.ITransactionStatus.COMPLETED) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Transaction is already processed.");
        }
        const userWallet = yield wallet_model_1.Wallet.findOne({
            walletId: ifTransactionExists === null || ifTransactionExists === void 0 ? void 0 : ifTransactionExists.to,
        });
        if (!userWallet) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "User wallet does not exist.");
        }
        ifTransactionExists.status = transaction_interface_1.ITransactionStatus.COMPLETED;
        userWallet.balance += ifTransactionExists.amount;
        yield ifTransactionExists.save({ session });
        yield (userWallet === null || userWallet === void 0 ? void 0 : userWallet.save({ session }));
        yield session.commitTransaction();
        const user = yield user_model_1.User.findOne({ phoneNo: userWallet.walletId });
        if (!user) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "User does not exist.");
        }
        yield (0, nodemailer_1.sendEmail)(user.email, "Add Money Successful", `Your transaction has been completed successfully. ${ifTransactionExists.amount}BDT added to your account. Your new balance is ${userWallet.balance}BDT.`);
        session.endSession();
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        throw error;
    }
});
const addMoneyFail = (trans_id) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield user_model_1.User.startSession();
    session.startTransaction();
    try {
        const ifTransactionExists = yield transaction_model_1.Transaction.findById(trans_id);
        if (!ifTransactionExists) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Transaction does not exist.");
        }
        if (ifTransactionExists.status === transaction_interface_1.ITransactionStatus.COMPLETED) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Transaction is already processed.");
        }
        ifTransactionExists.status = transaction_interface_1.ITransactionStatus.FAILED;
        yield ifTransactionExists.save({ session });
        yield session.commitTransaction();
        const user = yield user_model_1.User.findOne({ phoneNo: ifTransactionExists.to });
        if (!user) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "User does not exist.");
        }
        yield (0, nodemailer_1.sendEmail)(user.email, "Add Money Failed", `Your transaction has failed. ${ifTransactionExists.amount}BDT was not added to your account.`);
        session.endSession();
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        throw error;
    }
});
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
const addMoneyConfirm = (transactionId, decodedToken, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield user_model_1.User.startSession();
    session.startTransaction();
    try {
        const ifTransactionExists = yield transaction_model_1.Transaction.findById(transactionId);
        if ((ifTransactionExists === null || ifTransactionExists === void 0 ? void 0 : ifTransactionExists.type) !== transaction_interface_1.ITransactionType.ADD_MONEY) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Your operation is not correct.");
        }
        if ((ifTransactionExists === null || ifTransactionExists === void 0 ? void 0 : ifTransactionExists.status) !== transaction_interface_1.ITransactionStatus.PENDING) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Your operation is already processed.");
        }
        const user = yield user_model_1.User.findOne({ phoneNo: ifTransactionExists.from });
        yield (0, transaction_utils_1.userValidator)(user);
        const userWallet = yield wallet_model_1.Wallet.findById(user === null || user === void 0 ? void 0 : user.walletId);
        if (!userWallet) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "User wallet does not exist.");
        }
        const agent = yield user_model_1.User.findById(decodedToken.userId);
        yield (0, transaction_utils_1.agentValidator)(agent);
        if (ifTransactionExists.to !== (agent === null || agent === void 0 ? void 0 : agent.phoneNo)) {
            throw new appErrorHandler_1.default(http_status_1.default.UNAUTHORIZED, "This transaction is not made to you.");
        }
        const agentWallet = yield wallet_model_1.Wallet.findById(agent === null || agent === void 0 ? void 0 : agent.walletId);
        if (!agentWallet) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Your wallet does not exist.");
        }
        if (!payload.consent) {
            ifTransactionExists.status = transaction_interface_1.ITransactionStatus.FAILED;
        }
        else {
            if (ifTransactionExists.amount > agentWallet.balance) {
                ifTransactionExists.status = transaction_interface_1.ITransactionStatus.FAILED;
                yield ifTransactionExists.save();
                throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "You do not have sufficient balance.");
            }
            userWallet.balance = userWallet.balance + ifTransactionExists.amount;
            agentWallet.balance = agentWallet.balance - ifTransactionExists.amount;
            ifTransactionExists.status = transaction_interface_1.ITransactionStatus.COMPLETED;
            yield agentWallet.save({ session });
            yield userWallet.save({ session });
        }
        yield ifTransactionExists.save({ session });
        yield session.commitTransaction();
        session.endSession();
        return ifTransactionExists.toObject();
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        throw error;
    }
});
//any user can withdraw money anytime through an agent number
const withdrawMoney = (payload, decodedToken) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield user_model_1.User.startSession();
    session.startTransaction();
    try {
        const { to: toPhone, type, amount } = payload;
        (0, amountChecker_1.amountCheck)(amount);
        const ifAgentExists = yield user_model_1.User.findOne({ phoneNo: toPhone });
        yield (0, transaction_utils_1.agentValidator)(ifAgentExists);
        if (type !== transaction_interface_1.ITransactionType.WITHDRAW) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Your operation is not correct.");
        }
        const user = yield user_model_1.User.findById(decodedToken.userId);
        if (!user) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "User does not exist.");
        }
        const userWallet = yield wallet_model_1.Wallet.findById(user === null || user === void 0 ? void 0 : user.walletId);
        if (!userWallet) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Your wallet does not exist.");
        }
        if (amount > userWallet.balance) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "You do not have sufficient balance.");
        }
        const agentWallet = yield wallet_model_1.Wallet.findById(ifAgentExists === null || ifAgentExists === void 0 ? void 0 : ifAgentExists.walletId);
        if (!agentWallet) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Agent wallet does not exist.");
        }
        const feesAmount = amount * fees_constant_1.feesRate;
        const transaction = yield transaction_model_1.Transaction.create([
            {
                from: userWallet.walletId,
                to: agentWallet.walletId,
                amount,
                type,
                status: transaction_interface_1.ITransactionStatus.COMPLETED,
                fees: feesAmount,
            },
        ], { session });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const fees = yield fees_model_1.Fees.create([
            {
                transactionId: transaction[0]._id,
                amount: feesAmount,
            },
        ], { session });
        userWallet.balance = userWallet.balance - amount - feesAmount;
        agentWallet.balance = agentWallet.balance + amount + feesAmount;
        yield agentWallet.save({ session });
        yield userWallet.save({ session });
        yield session.commitTransaction();
        yield (0, nodemailer_1.sendEmail)(user.email, "Money Withdrawn Successfully", `Your transaction has been completed successfully. ${transaction[0].amount}BDT withdrawn and ${feesAmount}BDT charge deducted from your account. Your new balance is ${userWallet.balance}BDT.`);
        session.endSession();
        return transaction[0].toObject();
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        throw error;
    }
});
//an agent can cash in the money to any user anytime
const cashIn = (payload, decodedToken) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield user_model_1.User.startSession();
    session.startTransaction();
    try {
        const { to: toPhone, type, amount } = payload;
        (0, amountChecker_1.amountCheck)(amount);
        const ifUserExists = yield user_model_1.User.findOne({ phoneNo: toPhone });
        if (!ifUserExists) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "User does not exist.");
        }
        yield (0, transaction_utils_1.userValidator)(ifUserExists);
        if (type !== transaction_interface_1.ITransactionType.CASH_IN) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Your operation is not correct.");
        }
        const agent = yield user_model_1.User.findById(decodedToken.userId);
        if (!agent) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Agent does not exist.");
        }
        const agentWallet = yield wallet_model_1.Wallet.findById(agent === null || agent === void 0 ? void 0 : agent.walletId);
        if (!agentWallet) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Your wallet does not exist.");
        }
        if (amount > agentWallet.balance) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "You do not have sufficient balance.");
        }
        const userWallet = yield wallet_model_1.Wallet.findById(ifUserExists === null || ifUserExists === void 0 ? void 0 : ifUserExists.walletId);
        if (!userWallet) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "User wallet does not exist.");
        }
        const transaction = yield transaction_model_1.Transaction.create([
            {
                from: agentWallet.walletId,
                to: userWallet.walletId,
                amount,
                type,
                status: transaction_interface_1.ITransactionStatus.COMPLETED,
            },
        ], { session });
        userWallet.balance = userWallet.balance + amount;
        agentWallet.balance = agentWallet.balance - amount;
        yield agentWallet.save({ session });
        yield userWallet.save({ session });
        yield session.commitTransaction();
        yield (0, nodemailer_1.sendEmail)(agent.email, "Cash In Successful", `Your transaction has been completed successfully. ${transaction[0].amount}BDT cashed in to ${userWallet.walletId} from your account. Your new balance is ${agentWallet.balance}BDT.`);
        yield (0, nodemailer_1.sendEmail)(ifUserExists.email, "Cash In Successful", `Your transaction has been completed successfully. ${transaction[0].amount}BDT cashed in to your account from ${agentWallet.walletId}. Your new balance is ${userWallet.balance}BDT.`);
        session.endSession();
        return transaction[0].toObject();
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        throw error;
    }
});
//sendMoney can send any amount to anyone of his role if balance is equal or more.
const sendMoney = (payload, decodedToken) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield user_model_1.User.startSession();
    session.startTransaction();
    try {
        const { to: toPhone, type, amount } = payload;
        const ifReceiverExists = yield user_model_1.User.findOne({ phoneNo: toPhone });
        if (!ifReceiverExists) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Receiver does not exist.");
        }
        if (decodedToken.role === user_interface_1.IRole.AGENT) {
            yield (0, transaction_utils_1.agentValidator)(ifReceiverExists);
        }
        else {
            yield (0, transaction_utils_1.userValidator)(ifReceiverExists);
        }
        if (decodedToken.userId === (ifReceiverExists === null || ifReceiverExists === void 0 ? void 0 : ifReceiverExists._id.toString())) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "You cannot send money to your own wallet.");
        }
        if (type !== transaction_interface_1.ITransactionType.SEND_MONEY) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Your operation is not correct.");
        }
        if (decodedToken.role !== (ifReceiverExists === null || ifReceiverExists === void 0 ? void 0 : ifReceiverExists.role.toString())) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, `${decodedToken.role} can only send money to another ${decodedToken.role}`);
        }
        const sender = yield user_model_1.User.findById(decodedToken.userId);
        if (!sender) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "User does not exist.");
        }
        const senderWallet = yield wallet_model_1.Wallet.findById(sender === null || sender === void 0 ? void 0 : sender.walletId);
        if (!senderWallet) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Your wallet does not exist.");
        }
        if (amount > senderWallet.balance) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "You do not have sufficient balance.");
        }
        const receiverWallet = yield wallet_model_1.Wallet.findById(ifReceiverExists === null || ifReceiverExists === void 0 ? void 0 : ifReceiverExists.walletId);
        if (!receiverWallet) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Receiver wallet does not exist.");
        }
        const transaction = yield transaction_model_1.Transaction.create([
            {
                from: senderWallet.walletId,
                to: receiverWallet.walletId,
                amount,
                type,
                status: transaction_interface_1.ITransactionStatus.COMPLETED,
            },
        ], { session });
        receiverWallet.balance = receiverWallet.balance + amount;
        senderWallet.balance = senderWallet.balance - amount;
        yield senderWallet.save({ session });
        yield receiverWallet.save({ session });
        yield session.commitTransaction();
        yield (0, nodemailer_1.sendEmail)(sender.email, "Money Sent Successfully", `Your transaction has been completed successfully. ${transaction[0].amount}BDT sent from your account to ${receiverWallet.walletId}. Your new balance is ${senderWallet.balance}BDT.`);
        yield (0, nodemailer_1.sendEmail)(ifReceiverExists.email, "Money Received Successfully", `You have received ${transaction[0].amount}BDT to your account from ${senderWallet.walletId}. Your new balance is ${receiverWallet.balance}BDT.`);
        session.endSession();
        return transaction[0].toObject();
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        throw error;
    }
});
//payment can send any amount to anyone of his role if balance is equal or more.
const payment = (payload, decodedToken) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield user_model_1.User.startSession();
    session.startTransaction();
    try {
        const { to: toPhone, type, amount } = payload;
        const ifReceiverExists = yield user_model_1.User.findOne({ phoneNo: toPhone });
        if (!ifReceiverExists) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Receiver does not exist.");
        }
        if (ifReceiverExists.role !== user_interface_1.IRole.MERCHANT) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Payment can only be made to a merchant.");
        }
        if (type !== transaction_interface_1.ITransactionType.PAYMENT) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Your operation is not correct.");
        }
        // if (decodedToken.role !== ifReceiverExists?.role.toString()) {
        //   throw new AppError(
        //     httpStatus.BAD_REQUEST,
        //     `${decodedToken.role} can only send money to another ${decodedToken.role}`
        //   );
        // }
        const sender = yield user_model_1.User.findById(decodedToken.userId);
        if (!sender) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "User does not exist.");
        }
        const senderWallet = yield wallet_model_1.Wallet.findById(sender === null || sender === void 0 ? void 0 : sender.walletId);
        if (!senderWallet) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Your wallet does not exist.");
        }
        if (amount > senderWallet.balance) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "You do not have sufficient balance.");
        }
        const receiverWallet = yield wallet_model_1.Wallet.findById(ifReceiverExists === null || ifReceiverExists === void 0 ? void 0 : ifReceiverExists.walletId);
        if (!receiverWallet) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Merchant wallet does not exist.");
        }
        const transaction = yield transaction_model_1.Transaction.create([
            {
                from: senderWallet.walletId,
                to: receiverWallet.walletId,
                amount,
                type,
                status: transaction_interface_1.ITransactionStatus.COMPLETED,
                fees: amount * fees_constant_1.feesRate,
            },
        ], { session });
        receiverWallet.balance = receiverWallet.balance + (amount - (amount * fees_constant_1.feesRate));
        senderWallet.balance = senderWallet.balance - amount;
        yield senderWallet.save({ session });
        yield receiverWallet.save({ session });
        yield session.commitTransaction();
        yield (0, nodemailer_1.sendEmail)(sender.email, "Money Paid Successfully", `Your transaction has been completed successfully. ${transaction[0].amount}BDT paid from your account to merchant ${receiverWallet.walletId}. Your new balance is ${senderWallet.balance}BDT.`);
        yield (0, nodemailer_1.sendEmail)(ifReceiverExists.email, "Money Received Successfully", `You have received ${transaction[0].amount}BDT to your merchant account from ${senderWallet.walletId}. Your new balance is ${receiverWallet.balance}BDT.`);
        session.endSession();
        return transaction[0].toObject();
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        throw error;
    }
});
//admins can proceed to refund any completed transactions
const refund = (transactionId) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield user_model_1.User.startSession();
    session.startTransaction();
    try {
        const ifTransactionExists = yield transaction_model_1.Transaction.findById(transactionId);
        if (!ifTransactionExists) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Transaction does not exist.");
        }
        if (ifTransactionExists.type === transaction_interface_1.ITransactionType.ADD_MONEY) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Refund for add money is not supported.");
        }
        const { from: to, to: from, status, amount, type } = ifTransactionExists;
        // const ifReceiverExists = await User.findOne({phoneNo:to})
        // await anyValidator(ifReceiverExists);
        // const ifSenderExists = await User.findOne({phoneNo:from})
        // await anyValidator(ifSenderExists);
        if (status === transaction_interface_1.ITransactionStatus.PENDING ||
            status === transaction_interface_1.ITransactionStatus.REFUNDED ||
            status === transaction_interface_1.ITransactionStatus.FAILED) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Your operation is not correct.");
        }
        const sender = yield user_model_1.User.findOne({ phoneNo: from });
        if (!sender) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Original sender does not exist.");
        }
        const senderWallet = yield wallet_model_1.Wallet.findOne({ walletId: from });
        if (!senderWallet) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Original receiver wallet does not exist.");
        }
        if (amount > senderWallet.balance) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Original receiver do not have sufficient balance for refund.");
        }
        const receiver = yield user_model_1.User.findOne({ phoneNo: to });
        if (!receiver) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Original receiver does not exist.");
        }
        const receiverWallet = yield wallet_model_1.Wallet.findOne({ walletId: to });
        if (!receiverWallet) {
            throw new appErrorHandler_1.default(http_status_1.default.BAD_REQUEST, "Original sender wallet does not exist.");
        }
        let feesAmount = 0;
        if (type === transaction_interface_1.ITransactionType.WITHDRAW) {
            feesAmount = amount * fees_constant_1.feesRate;
        }
        receiverWallet.balance = receiverWallet.balance + amount + feesAmount;
        senderWallet.balance = senderWallet.balance - amount - feesAmount;
        ifTransactionExists.status = transaction_interface_1.ITransactionStatus.REFUNDED;
        yield ifTransactionExists.save({ session });
        yield senderWallet.save({ session });
        yield receiverWallet.save({ session });
        yield session.commitTransaction();
        yield (0, nodemailer_1.sendEmail)(receiver.email, "Money Refunded Successfully", `Your transaction has been refunded successfully. ${ifTransactionExists.amount}BDT refunded to your account. Your new balance is ${receiverWallet.balance}BDT.`);
        yield (0, nodemailer_1.sendEmail)(sender.email, "Money Deducted for Refund", `Your account has been deducted for a refund transaction. ${ifTransactionExists.amount}BDT deducted from your account. Your new balance is ${senderWallet.balance}BDT.`);
        session.endSession();
        return ifTransactionExists.toObject();
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        throw error;
    }
});
exports.TransactionServices = {
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
    payment
};
