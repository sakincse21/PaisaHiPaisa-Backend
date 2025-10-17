"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Fees = void 0;
const mongoose_1 = require("mongoose");
const FeesSchema = new mongoose_1.Schema({
    transactionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true
    },
    amount: {
        type: Number,
        required: true
    }
}, {
    timestamps: true,
    versionKey: false
});
exports.Fees = (0, mongoose_1.model)("Fees", FeesSchema);
