/* eslint-disable @typescript-eslint/no-unused-vars */
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { Request, Response, NextFunction } from "express";
import { TransactionServices } from "./transaction.service";
import { SslCommerzPayment } from "@dmasifur/sslcommerz-ts";
import { envVars } from "../../config/env";

const getSingleTransaction = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const transactionId = req.params.id;
    const decodedToken = req.user;
    const transaction = await TransactionServices.getSingleTransaction(
      transactionId,
      decodedToken
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Transaction Fetched Successfully",
      data: transaction,
    });
  }
);

const getSummary = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const decodedToken = req.user;
    const transaction = await TransactionServices.getSummary(decodedToken);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Transactions Summary Fetched Successfully",
      data: transaction,
    });
  }
);

const getAdminSummary = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const decodedToken = req.user;
    const summaryData = await TransactionServices.getAdminSummary(decodedToken);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Transactions Summary Fetched Successfully",
      data: summaryData,
    });
  }
);

const getAllTransactions = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const decodedToken = req.user;
    const query = req.query;
    const allTransactions = await TransactionServices.getAllTransactions(
      decodedToken,
      query as Record<string, string>
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Transactions Fetched Successfully",
      data: allTransactions,
    });
  }
);

const addMoney = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const decodedToken = req.user;
    const payload = req.body;
    const transaction = await TransactionServices.addMoney(
      payload,
      decodedToken
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Transaction Created Successfully. Proceed to pay.",
      data: transaction,
    });
  }
);

const addMoneySuccess = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { trans_id } = req.query;
    await TransactionServices.addMoneySuccess(trans_id as string);

    res.status(200).redirect(`${envVars.FRONTEND_URL}${envVars.SSL.REDIRECT_URL}/success`)
  }
);

const addMoneyFail = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { trans_id } = req.query;

    const payload = req.body;
    await TransactionServices.addMoneyFail(trans_id as string);

    res.status(200).redirect(`${envVars.FRONTEND_URL}${envVars.SSL.REDIRECT_URL}/failed`)
  }
);

const addMoneyConfirm = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const decodedToken = req.user;
    const transactionId = req.params.id;
    const payload = req.body;
    const transaction = await TransactionServices.addMoneyConfirm(
      transactionId,
      decodedToken,
      payload
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Added money successfully.",
      data: transaction,
    });
  }
);

const withdrawMoney = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const decodedToken = req.user;
    const payload = req.body;
    const transaction = await TransactionServices.withdrawMoney(
      payload,
      decodedToken
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Money withdrawn successfully.",
      data: transaction,
    });
  }
);

const cashIn = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const decodedToken = req.user;
    const payload = req.body;
    const transaction = await TransactionServices.cashIn(payload, decodedToken);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Money Cashed In successfully.",
      data: transaction,
    });
  }
);

const sendMoney = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const decodedToken = req.user;
    const payload = req.body;
    const transaction = await TransactionServices.sendMoney(
      payload,
      decodedToken
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Money Sent successfully.",
      data: transaction,
    });
  }
);

const payment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const decodedToken = req.user;
    const payload = req.body;
    const transaction = await TransactionServices.payment(
      payload,
      decodedToken
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Payment processed successfully.",
      data: transaction,
    });
  }
);

const refund = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const transactionId = req.params.id;
    const transaction = await TransactionServices.refund(transactionId);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Money Refunded successfully.",
      data: transaction,
    });
  }
);

export const TransactionControllers = {
  getSingleTransaction,
  addMoney,
  getAllTransactions,
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
